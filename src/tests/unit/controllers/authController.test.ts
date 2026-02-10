/* eslint-disable camelcase */
import { Request, Response } from "express";
import { callbackConnexion } from "../../../controllers/authController";
import { fetchTwitchUser } from "../../../services/twitchUserService";
import { dbGatewayService } from "../../../services/dbGatewayService";
import "../../../config/environment";
import { logger } from "../../../utils/logger";
import { CustomError } from "../../../middlewares/errorHandler";
import type { TwitchPassportUser } from "../../../strategies/twitchTokenStrategy";

jest.mock("../../../services/twitchUserService");
jest.mock("../../../services/dbGatewayService");
jest.mock("../../../config/environment");
jest.mock("../../../utils/logger");

const mockFetchTwitchUser = fetchTwitchUser as jest.MockedFunction<
  typeof fetchTwitchUser
>;
const mockDbGatewayService = dbGatewayService as jest.Mocked<
  typeof dbGatewayService
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("authController", () => {
  let mockRequest: Partial<Request & { user?: TwitchPassportUser }>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      user: {
        userId: "12345",
        claims: {
          sub: "12345",
          aud: "test-client-id",
          iss: "https://id.twitch.tv/oauth2",
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
        tokens: {
          accessToken: "test-access-token",
          idToken: "test-id-token",
          tokenType: "Bearer",
          scope: ["user:read:email"],
          expiresIn: 3600,
          state: "test-state",
        },
      },
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    Object.assign(require("../../../config/environment").config, {
      twitch: {
        clientId: "test-client-id",
      },
    });
    mockFetchTwitchUser.mockResolvedValue({
      id: "12345",
      login: "testuser",
      display_name: "TestUser",
      type: "user",
      broadcaster_type: "",
      description: "Test description",
      profile_image_url: "https://example.com/avatar.jpg",
      offline_image_url: "https://example.com/offline.jpg",
      created_at: "2020-01-01T00:00:00Z",
    });

    mockDbGatewayService.saveUser = jest.fn().mockResolvedValue({
      id: "12345",
      username: "TestUser",
      twitchUserId: "12345",
      profileImageUrl: "https://example.com/avatar.jpg",
      channelDescription: "Test description",
      scope: "user:read:email",
    });
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("callbackConnexion", () => {
    it("should successfully process authentication callback", async () => {
      await callbackConnexion(mockRequest as Request, mockResponse as Response);

      expect(mockFetchTwitchUser).toHaveBeenCalledWith(
        "test-access-token",
        "test-client-id",
      );
      expect(mockDbGatewayService.saveUser).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: expect.any(Object),
        userId: "12345",
      });
    });

    it("should throw CustomError when user is missing", async () => {
      mockRequest.user = undefined;

      await expect(
        callbackConnexion(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Authentication callback called without user in request context",
      );
    });

    it("should throw CustomError when accessToken is missing", async () => {
      mockRequest.user!.tokens.accessToken = undefined as any;

      await expect(
        callbackConnexion(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Authentication callback called with incomplete tokens",
        {
          hasAccessToken: false,
          hasIdToken: true,
        },
      );
    });

    it("should throw CustomError when idToken is missing", async () => {
      mockRequest.user!.tokens.idToken = undefined as any;

      await expect(
        callbackConnexion(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Authentication callback called with incomplete tokens",
        {
          hasAccessToken: true,
          hasIdToken: false,
        },
      );
    });

    it("should handle fetchTwitchUser error", async () => {
      const error = new Error("Twitch API error");
      mockFetchTwitchUser.mockRejectedValueOnce(error);

      await expect(
        callbackConnexion(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error in authentication callback",
        {
          error: "Twitch API error",
        },
      );
    });

    it("should handle dbGatewayService error", async () => {
      const error = new Error("Database error");
      mockDbGatewayService.saveUser.mockRejectedValueOnce(error);

      await expect(
        callbackConnexion(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error in authentication callback",
        {
          error: "Database error",
        },
      );
    });

    it("should use display_name when available", async () => {
      mockFetchTwitchUser.mockResolvedValueOnce({
        id: "12345",
        login: "testuser",
        display_name: "DisplayName",
        type: "user",
        broadcaster_type: "",
        description: "Test description",
        profile_image_url: "https://example.com/avatar.jpg",
        offline_image_url: "https://example.com/offline.jpg",
        created_at: "2020-01-01T00:00:00Z",
      });

      await callbackConnexion(mockRequest as Request, mockResponse as Response);

      expect(mockDbGatewayService.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "DisplayName",
        }),
      );
    });

    it("should use login when display_name is not available", async () => {
      mockFetchTwitchUser.mockResolvedValueOnce({
        id: "12345",
        login: "testuser",
        display_name: null as any,
        type: "user",
        broadcaster_type: "",
        description: "Test description",
        profile_image_url: "https://example.com/avatar.jpg",
        offline_image_url: "https://example.com/offline.jpg",
        created_at: "2020-01-01T00:00:00Z",
      });

      await callbackConnexion(mockRequest as Request, mockResponse as Response);

      expect(mockDbGatewayService.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "testuser",
        }),
      );
    });

    it("should handle expiresIn as number", async () => {
      mockRequest.user!.tokens.expiresIn = 7200;

      await callbackConnexion(mockRequest as Request, mockResponse as Response);

      expect(mockDbGatewayService.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should handle expiresIn as undefined", async () => {
      mockRequest.user!.tokens.expiresIn = undefined;

      await callbackConnexion(mockRequest as Request, mockResponse as Response);

      expect(mockDbGatewayService.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: expect.objectContaining({
            expiresAt: undefined,
          }),
        }),
      );
    });

    it("should rethrow CustomError instances", async () => {
      const customError = new CustomError("Custom error", 400);
      mockFetchTwitchUser.mockRejectedValueOnce(customError);

      await expect(
        callbackConnexion(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(customError);
    });

    it("should handle unknown error types", async () => {
      mockFetchTwitchUser.mockRejectedValueOnce("string error");

      await expect(
        callbackConnexion(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error in authentication callback",
        {
          error: "Unknown error",
        },
      );
    });
  });
});
