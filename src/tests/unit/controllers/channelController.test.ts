import { Request, Response } from "express";
import {
  updateChannelDiscordWebhook,
  registerDiscordWebhook,
  getModeratedChannels,
} from "../../../controllers/channelController";
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

  describe("registerDiscordWebhook", () => {
    let mockBffRequest: Partial<Request>;

    beforeEach(() => {
      mockBffRequest = {
        body: {
          channelId: "12345",
          discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
        },
      };
    });

    it("should successfully register webhook with valid channelId and URL", async () => {
      await registerDiscordWebhook(
        mockBffRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.updateChannel).toHaveBeenCalledWith("12345", {
        discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
      });
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

    it("should successfully register with null to remove webhook", async () => {
      mockBffRequest.body = { channelId: "12345", discordWebhookUrl: null };
      mockDbGatewayService.updateChannel.mockResolvedValueOnce({
        id: "12345",
        name: "TestUser",
        discordWebhookUrl: null,
      });

      await registerDiscordWebhook(
        mockBffRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.updateChannel).toHaveBeenCalledWith("12345", {
        discordWebhookUrl: null,
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        channel: { id: "12345", name: "TestUser", discordWebhookUrl: null },
      });
    });

    it("should call next with CustomError 400 when channelId is missing", async () => {
      mockBffRequest.body = {
        discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
      };

      await registerDiscordWebhook(
        mockBffRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation failed: Field 'channelId' is required",
          statusCode: 400,
        }),
      );
      expect(mockDbGatewayService.updateChannel).not.toHaveBeenCalled();
    });

    it("should call next with CustomError 400 when discordWebhookUrl is absent", async () => {
      mockBffRequest.body = { channelId: "12345" };

      await registerDiscordWebhook(
        mockBffRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation failed: Field 'discordWebhookUrl' is required",
          statusCode: 400,
        }),
      );
      expect(mockDbGatewayService.updateChannel).not.toHaveBeenCalled();
    });

    it("should call next with CustomError 400 when discordWebhookUrl is not string or null", async () => {
      mockBffRequest.body = { channelId: "12345", discordWebhookUrl: 123 };

      await registerDiscordWebhook(
        mockBffRequest as Request,
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
      mockBffRequest.body = {
        channelId: "12345",
        discordWebhookUrl: "not-a-valid-url",
      };

      await registerDiscordWebhook(
        mockBffRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation failed: 'discordWebhookUrl' must be a valid URL",
          statusCode: 400,
        }),
      );
      expect(mockDbGatewayService.updateChannel).not.toHaveBeenCalled();
    });
  });

  describe("getModeratedChannels", () => {
    let mockBffRequest: Partial<Request>;

    beforeEach(() => {
      mockBffRequest = { query: { userId: "12345" } };

      mockDbGatewayService.getAreByUser = jest
        .fn()
        .mockResolvedValue([
          { userId: "12345", channelId: "999", userType: "moderator" },
        ]);
    });

    it("should return moderatedChannels array on success", async () => {
      await getModeratedChannels(
        mockBffRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockDbGatewayService.getAreByUser).toHaveBeenCalledWith(
        "12345",
        "moderator",
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ moderatedChannels: ["999"] });
    });

    it("should return empty moderatedChannels array when user has no moderated channels", async () => {
      mockDbGatewayService.getAreByUser = jest.fn().mockResolvedValue([]);

      await getModeratedChannels(
        mockBffRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ moderatedChannels: [] });
    });

    it("should call next with CustomError 400 when userId is missing", async () => {
      mockBffRequest.query = {};

      await getModeratedChannels(
        mockBffRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation failed: Field 'userId' is required",
          statusCode: 400,
        }),
      );
      expect(mockDbGatewayService.getAreByUser).not.toHaveBeenCalled();
    });
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

      expect(mockDbGatewayService.updateChannel).toHaveBeenCalledWith("12345", {
        discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
      });
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

      expect(mockDbGatewayService.updateChannel).toHaveBeenCalledWith("12345", {
        discordWebhookUrl: null,
      });
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
          message: "Validation failed: Field 'discordWebhookUrl' is required",
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
          message: "Validation failed: 'discordWebhookUrl' must be a valid URL",
          statusCode: 400,
        }),
      );
      expect(mockDbGatewayService.updateChannel).not.toHaveBeenCalled();
    });
  });
});
