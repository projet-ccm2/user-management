/* eslint-disable camelcase */
import { Request, Response } from "express";
import {
  callbackConnexion,
  deleteAccount,
} from "../../../controllers/authController";
import { fetchTwitchUser } from "../../../services/twitchUserService";
import { dbGatewayService } from "../../../services/dbGatewayService";
import { syncChannelsAndAreAfterAuth } from "../../../services/syncChannelsAndAreService";
import "../../../config/environment";
import { logger } from "../../../utils/logger";
import { CustomError } from "../../../middlewares/errorHandler";
import type { TwitchPassportUser } from "../../../strategies/twitchTokenStrategy";

jest.mock("../../../services/twitchUserService");
jest.mock("../../../services/dbGatewayService");
jest.mock("../../../services/syncChannelsAndAreService", () => ({
  syncChannelsAndAreAfterAuth: jest.fn().mockResolvedValue(undefined),
}));
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
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
    mockJson = jest.fn().mockReturnThis();
    mockSend = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson, send: mockSend });

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
      user: {
        skipUpdateThresholdMs: 60 * 60 * 1000,
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

    mockDbGatewayService.getUserById = jest.fn().mockResolvedValue(null);
    mockDbGatewayService.saveUser = jest.fn().mockResolvedValue({
      id: "12345",
      username: "TestUser",
      profileImageUrl: "https://example.com/avatar.jpg",
      channelDescription: "Test description",
      scope: "user:read:email",
      lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
      xp: 0,
    });
    mockDbGatewayService.updateUser = jest.fn().mockResolvedValue({
      id: "12345",
      username: "TestUser",
      profileImageUrl: "https://example.com/avatar.jpg",
      channelDescription: "Test description",
      scope: "user:read:email",
      lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
      xp: 0,
    });
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("callbackConnexion", () => {
    it("should successfully process authentication callback", async () => {
      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockFetchTwitchUser).toHaveBeenCalledWith(
        "test-access-token",
        "test-client-id",
      );
      expect(mockDbGatewayService.getUserById).toHaveBeenCalledWith("12345");
      expect(mockDbGatewayService.saveUser).toHaveBeenCalled();
      expect(mockDbGatewayService.updateUser).not.toHaveBeenCalled();
      expect(syncChannelsAndAreAfterAuth).toHaveBeenCalledWith(
        "12345",
        expect.any(Object),
        "test-access-token",
        "test-client-id",
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: expect.any(Object),
        userId: "12345",
      });
    });

    it("should create user when getUserById returns null", async () => {
      mockDbGatewayService.getUserById.mockResolvedValueOnce(null);

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.getUserById).toHaveBeenCalledWith("12345");
      expect(mockDbGatewayService.saveUser).toHaveBeenCalled();
      expect(mockDbGatewayService.updateUser).not.toHaveBeenCalled();
    });

    it("should update user when getUserById returns existing user with old lastUpdateTimestamp", async () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      const existingUser = {
        id: "12345",
        username: "TestUser",
        profileImageUrl: "https://example.com/avatar.jpg",
        channelDescription: "Test description",
        scope: "user:read:email",
        lastUpdateTimestamp: twoHoursAgo,
        xp: 10,
      };
      mockDbGatewayService.getUserById.mockResolvedValueOnce(existingUser);

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.getUserById).toHaveBeenCalledWith("12345");
      expect(mockDbGatewayService.updateUser).toHaveBeenCalledWith(
        "12345",
        expect.any(Object),
        existingUser,
      );
      expect(mockDbGatewayService.saveUser).not.toHaveBeenCalled();
    });

    it("should skip update when existing user has lastUpdateTimestamp < 1h", async () => {
      const thirtyMinutesAgo = new Date(
        Date.now() - 30 * 60 * 1000,
      ).toISOString();
      const existingUser = {
        id: "12345",
        username: "TestUser",
        profileImageUrl: "https://example.com/avatar.jpg",
        channelDescription: "Test description",
        scope: "user:read:email",
        lastUpdateTimestamp: thirtyMinutesAgo,
        xp: 0,
      };
      mockDbGatewayService.getUserById.mockResolvedValueOnce(existingUser);

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.getUserById).toHaveBeenCalledWith("12345");
      expect(mockDbGatewayService.updateUser).not.toHaveBeenCalled();
      expect(mockDbGatewayService.saveUser).not.toHaveBeenCalled();
      expect(syncChannelsAndAreAfterAuth).toHaveBeenCalledWith(
        "12345",
        expect.any(Object),
        "test-access-token",
        "test-client-id",
      );
    });

    it("should call next with CustomError when user is missing", async () => {
      mockRequest.user = undefined;

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication failed: user context missing",
          statusCode: 401,
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Authentication callback called without user in request context",
        expect.objectContaining({
          hasBody: false,
        }),
      );
    });

    it("should call next with CustomError when accessToken is missing", async () => {
      mockRequest.user!.tokens.accessToken = undefined as any;

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication failed: incomplete token data",
          statusCode: 401,
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Authentication callback called with incomplete tokens",
        {
          hasAccessToken: false,
          hasIdToken: true,
        },
      );
    });

    it("should call next with CustomError when idToken is missing", async () => {
      mockRequest.user!.tokens.idToken = undefined as any;

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication failed: incomplete token data",
          statusCode: 401,
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Authentication callback called with incomplete tokens",
        {
          hasAccessToken: true,
          hasIdToken: false,
        },
      );
    });

    it("should call next with CustomError when fetchTwitchUser fails", async () => {
      const error = new Error("Twitch API error");
      mockFetchTwitchUser.mockRejectedValueOnce(error);

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication failed due to internal error",
          statusCode: 500,
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error in authentication callback",
        expect.objectContaining({
          error: "Twitch API error",
          stack: expect.any(String),
        }),
      );
    });

    it("should call next with CustomError when dbGatewayService fails", async () => {
      const error = new Error("Database error");
      mockDbGatewayService.getUserById.mockResolvedValueOnce(null);
      mockDbGatewayService.saveUser.mockRejectedValueOnce(error);

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication failed due to internal error",
          statusCode: 500,
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error in authentication callback",
        expect.objectContaining({
          error: "Database error",
          stack: expect.any(String),
        }),
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

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

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

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "testuser",
        }),
      );
    });

    it("should handle expiresIn as number", async () => {
      mockRequest.user!.tokens.expiresIn = 7200;

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

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

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: expect.objectContaining({
            expiresAt: undefined,
          }),
        }),
      );
    });

    it("should pass CustomError to next without wrapping", async () => {
      const customError = new CustomError("Custom error", 400);
      mockFetchTwitchUser.mockRejectedValueOnce(customError);

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(customError);
    });

    it("should handle unknown error types", async () => {
      mockFetchTwitchUser.mockRejectedValueOnce("string error");

      await callbackConnexion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication failed due to internal error",
          statusCode: 500,
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error in authentication callback",
        {
          error: "Unknown error",
        },
      );
    });
  });

  describe("deleteAccount", () => {
    beforeEach(() => {
      mockFetchTwitchUser.mockResolvedValue({
        id: "12345",
        login: "testuser",
        display_name: "TestUser",
        type: "user",
        broadcaster_type: "",
        description: "",
        profile_image_url: "",
        offline_image_url: "",
        created_at: "2020-01-01T00:00:00Z",
      });
    });

    it("should verify token matches user, then call deleteUserAllData and return 204", async () => {
      mockDbGatewayService.deleteUserAllData = jest
        .fn()
        .mockResolvedValue(undefined);

      await deleteAccount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockFetchTwitchUser).toHaveBeenCalledWith(
        "test-access-token",
        "test-client-id",
      );
      expect(mockDbGatewayService.deleteUserAllData).toHaveBeenCalledWith(
        "12345",
      );
      expect(mockStatus).toHaveBeenCalledWith(204);
      expect(mockSend).toHaveBeenCalled();
    });

    it("should call next with CustomError when user is missing", async () => {
      mockRequest.user = undefined;

      await deleteAccount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.deleteUserAllData).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication required",
          statusCode: 401,
        }),
      );
    });

    it("should call next with CustomError when userId is missing", async () => {
      mockRequest.user = { ...mockRequest.user!, userId: undefined };

      await deleteAccount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.deleteUserAllData).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication required",
          statusCode: 401,
        }),
      );
    });

    it("should pass CustomError from deleteUserAllData to next", async () => {
      const customError = new CustomError("User not found", 404);
      mockDbGatewayService.deleteUserAllData = jest
        .fn()
        .mockRejectedValue(customError);

      await deleteAccount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(customError);
    });

    it("should call next with 500 when deleteUserAllData throws unknown error", async () => {
      mockDbGatewayService.deleteUserAllData = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));

      await deleteAccount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Account deletion failed",
          statusCode: 500,
        }),
      );
    });

    it("should call next with 403 when accessToken user does not match idToken user", async () => {
      mockFetchTwitchUser.mockResolvedValueOnce({
        id: "99999",
        login: "otheruser",
        display_name: "OtherUser",
        type: "user",
        broadcaster_type: "",
        description: "",
        profile_image_url: "",
        offline_image_url: "",
        created_at: "2020-01-01T00:00:00Z",
      });

      await deleteAccount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.deleteUserAllData).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Token does not match user",
          statusCode: 403,
        }),
      );
    });

    it("should call next with 401 when accessToken is missing", async () => {
      mockRequest.user!.tokens.accessToken = undefined as any;

      await deleteAccount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockFetchTwitchUser).not.toHaveBeenCalled();
      expect(mockDbGatewayService.deleteUserAllData).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Access token required",
          statusCode: 401,
        }),
      );
    });
  });
});
