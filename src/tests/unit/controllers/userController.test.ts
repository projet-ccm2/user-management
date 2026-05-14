import { Request, Response } from "express";
import { getUserById } from "../../../controllers/userController";
import { dbGatewayService } from "../../../services/dbGatewayService";
import "../../../config/environment";
import { logger } from "../../../utils/logger";
import { CustomError } from "../../../middlewares/errorHandler";
import type { TwitchPassportUser } from "../../../strategies/twitchTokenStrategy";

jest.mock("../../../services/dbGatewayService");
jest.mock("../../../config/environment");
jest.mock("../../../utils/logger");

const mockDbGatewayService = dbGatewayService as jest.Mocked<
  typeof dbGatewayService
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("userController", () => {
  let mockRequest: Partial<Request & { user?: TwitchPassportUser }>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
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
      params: { id: "67890" },
      method: "GET",
      path: "/67890",
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe("getUserById", () => {
    it("should return user when found", async () => {
      const dbUser = {
        id: "67890",
        username: "testuser",
        profileImageUrl: "https://example.com/img.png",
        channelDescription: "A test channel",
        scope: "user:read:email",
        lastUpdateTimestamp: "2024-01-15T10:30:00.000Z",
        xp: 42,
      };

      mockDbGatewayService.getUserById.mockResolvedValue(dbUser);

      await getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.getUserById).toHaveBeenCalledWith("67890");
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: dbUser,
      });
    });

    it("should call next with 404 when user not found", async () => {
      mockDbGatewayService.getUserById.mockResolvedValue(null);

      await getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.getUserById).toHaveBeenCalledWith("67890");
      expect(mockNext).toHaveBeenCalledWith(expect.any(CustomError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
    });

    it("should call next with 401 when no authenticated user", async () => {
      mockRequest.user = undefined;

      await getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(CustomError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Get user called without authenticated user",
        expect.objectContaining({
          method: "GET",
          path: "/67890",
        }),
      );
    });

    it("should call next with 500 on unexpected error", async () => {
      mockDbGatewayService.getUserById.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(CustomError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error fetching user",
        expect.objectContaining({
          error: "DB connection failed",
        }),
      );
    });

    it("should propagate CustomError from dbGatewayService", async () => {
      const customError = new CustomError("Database gateway error: 502", 502);
      mockDbGatewayService.getUserById.mockRejectedValue(customError);

      await getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(customError);
    });
  });
});
