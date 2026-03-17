import { Request, Response } from "express";
import { updateChannelDiscordWebhook } from "../../../controllers/channelController";
import { dbGatewayService } from "../../../services/dbGatewayService";
import type { TwitchPassportUser } from "../../../strategies/twitchTokenStrategy";

jest.mock("../../../services/dbGatewayService");

const mockDbGatewayService = dbGatewayService as jest.Mocked<
  typeof dbGatewayService
>;

describe("channelController", () => {
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
      body: {},
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockDbGatewayService.updateChannel = jest.fn().mockResolvedValue({
      id: "12345",
      name: "TestUser",
      discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateChannelDiscordWebhook", () => {
    it("should successfully update channel with valid URL", async () => {
      (mockRequest as Request).body = {
        discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
      };

      await updateChannelDiscordWebhook(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.updateChannel).toHaveBeenCalledWith(
        "12345",
        { discordWebhookUrl: "https://discord.com/api/webhooks/123/abc" },
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        channel: {
          id: "12345",
          name: "TestUser",
          discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
        },
      });
    });

    it("should successfully update channel with null to remove webhook", async () => {
      (mockRequest as Request).body = { discordWebhookUrl: null };
      mockDbGatewayService.updateChannel.mockResolvedValueOnce({
        id: "12345",
        name: "TestUser",
        discordWebhookUrl: null,
      });

      await updateChannelDiscordWebhook(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.updateChannel).toHaveBeenCalledWith(
        "12345",
        { discordWebhookUrl: null },
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        channel: {
          id: "12345",
          name: "TestUser",
          discordWebhookUrl: null,
        },
      });
    });

    it("should call next with CustomError 401 when user is missing", async () => {
      mockRequest.user = undefined;

      await updateChannelDiscordWebhook(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication required",
          statusCode: 401,
        }),
      );
      expect(mockDbGatewayService.updateChannel).not.toHaveBeenCalled();
    });

    it("should call next with CustomError 400 when discordWebhookUrl is absent", async () => {
      (mockRequest as Request).body = {};

      await updateChannelDiscordWebhook(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Validation failed: Field 'discordWebhookUrl' is required",
          statusCode: 400,
        }),
      );
      expect(mockDbGatewayService.updateChannel).not.toHaveBeenCalled();
    });

    it("should call next with CustomError 400 when discordWebhookUrl is not string or null", async () => {
      (mockRequest as Request).body = { discordWebhookUrl: 123 };

      await updateChannelDiscordWebhook(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Validation failed: 'discordWebhookUrl' must be a string or null",
          statusCode: 400,
        }),
      );
      expect(mockDbGatewayService.updateChannel).not.toHaveBeenCalled();
    });

    it("should call next with CustomError 400 when discordWebhookUrl is invalid URL", async () => {
      (mockRequest as Request).body = {
        discordWebhookUrl: "not-a-valid-url",
      };

      await updateChannelDiscordWebhook(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Validation failed: 'discordWebhookUrl' must be a valid URL",
          statusCode: 400,
        }),
      );
      expect(mockDbGatewayService.updateChannel).not.toHaveBeenCalled();
    });
  });
});
