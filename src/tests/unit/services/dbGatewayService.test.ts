import { DbGatewayService } from "../../../services/dbGatewayService";
import { logger } from "../../../utils/logger";
import { CustomError } from "../../../middlewares/errorHandler";
import User from "../../../models/user";

jest.mock("../../../utils/logger");
jest.mock("../../../services/tokenClient", () => ({
  getVpcToken: jest.fn().mockResolvedValue("mock-vpc-jwt-for-tests"),
}));

const MOCK_VPC_JWT = "mock-vpc-jwt-for-tests";
const mockGetGcpIdToken = jest.fn().mockResolvedValue(null);
jest.mock("../../../services/gcpAuth", () => ({
  getGcpIdToken: (...args: unknown[]) => mockGetGcpIdToken(...args),
}));

jest.mock("../../../config/environment", () => ({
  config: {
    dbGateway: {
      url: "http://localhost:3001",
    },
    user: {
      skipUpdateThresholdMs: 60 * 60 * 1000,
    },
  },
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("DbGatewayService", () => {
  let dbGatewayService: DbGatewayService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    dbGatewayService = new DbGatewayService();
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockUser = new User({
    username: "testuser",
    channel: {
      id: "123",
      name: "testuser",
      description: "Test user",
      profileImageUrl: "https://example.com/avatar.jpg",
    },
    channelsWhichIsMod: [],
    auth: {
      accessToken: "access_token",
      idToken: "id_token",
      tokenType: "Bearer",
      scope: ["user:read:email"],
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000),
      state: "random_state",
      approvedAt: new Date(),
    },
  });

  describe("getUserById", () => {
    it("should return user when GET returns 200", async () => {
      const mockDbResponse = {
        id: "123",
        username: "testuser",
        profileImageUrl: "https://example.com/avatar.jpg",
        channelDescription: "Test user",
        scope: "user:read:email",
        lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
        xp: 0,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockDbResponse),
      } as any);

      const result = await dbGatewayService.getUserById("123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/users/123",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${MOCK_VPC_JWT}`,
          }),
        }),
      );
      expect(result).toEqual(mockDbResponse);
    });

    it("should return null when GET returns 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      const result = await dbGatewayService.getUserById("123");

      expect(result).toBeNull();
    });

    it("should throw CustomError when GET returns 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Database error"),
      } as any);

      await expect(dbGatewayService.getUserById("123")).rejects.toThrow(
        CustomError,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Database gateway request failed",
        expect.objectContaining({
          status: 500,
          statusText: "Internal Server Error",
          error: "Database error",
        }),
      );
    });

    it("should throw CustomError on non-Error rejection", async () => {
      mockFetch.mockRejectedValue("string error");

      await expect(dbGatewayService.getUserById("123")).rejects.toThrow(
        CustomError,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to get user from database gateway",
        expect.objectContaining({ error: "Unknown error" }),
      );
    });
  });

  describe("updateUser", () => {
    it("should successfully update user in database gateway", async () => {
      const mockDbResponse = {
        id: "123",
        username: "testuser",
        profileImageUrl: "https://example.com/avatar.jpg",
        channelDescription: "Test user",
        scope: "user:read:email",
        lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
        xp: 0,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDbResponse),
      } as any);

      const result = await dbGatewayService.updateUser("123", mockUser);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/users/123",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${MOCK_VPC_JWT}`,
          }),
          body: expect.stringContaining('"lastUpdateTimestamp"'),
        }),
      );
      expect(result).toEqual(mockDbResponse);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "User successfully updated in database",
        expect.objectContaining({
          userId: "123",
          username: "testuser",
        }),
      );
    });

    it("should throw CustomError when PUT returns 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: jest.fn().mockResolvedValue("not found"),
      } as any);

      await expect(
        dbGatewayService.updateUser("123", mockUser),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Database gateway request failed",
        expect.objectContaining({
          status: 404,
          statusText: "Not Found",
        }),
      );
    });

    it("should throw CustomError when PUT returns 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Database error"),
      } as any);

      await expect(
        dbGatewayService.updateUser("123", mockUser),
      ).rejects.toThrow(CustomError);
    });

    it("should pass existing xp when updating user", async () => {
      const existingUser = {
        id: "123",
        username: "testuser",
        profileImageUrl: "https://example.com/avatar.jpg",
        channelDescription: "Test user",
        scope: "user:read:email",
        lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
        xp: 42,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(existingUser),
      } as any);

      await dbGatewayService.updateUser("123", mockUser, existingUser);

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(callBody.xp).toBe(42);
    });
  });

  describe("saveUser", () => {
    it("should successfully save user to database gateway", async () => {
      const mockDbResponse = {
        id: "db_user_123",
        username: "testuser",
        profileImageUrl: "https://example.com/avatar.jpg",
        channelDescription: "Test user",
        scope: "user:read:email",
        lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
        xp: 0,
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockDbResponse),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await dbGatewayService.saveUser(mockUser);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/users",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${MOCK_VPC_JWT}`,
          }),
          body: expect.stringContaining('"lastUpdateTimestamp"'),
        }),
      );
      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(callBody).toMatchObject({
        id: "123",
        username: "testuser",
        profileImageUrl: "https://example.com/avatar.jpg",
        channelDescription: "Test user",
        scope: "user:read:email",
        xp: 0,
      });

      expect(result).toEqual(mockDbResponse);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Sending user data to database gateway",
        expect.objectContaining({
          username: "testuser",
          channelId: "123",
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        "User successfully saved to database",
        expect.objectContaining({
          userId: "db_user_123",
          username: "testuser",
        }),
      );
    });

    it("should handle database gateway error", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Database error"),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(dbGatewayService.saveUser(mockUser)).rejects.toThrow(
        CustomError,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Database gateway request failed",
        expect.objectContaining({
          status: 500,
          statusText: "Internal Server Error",
          error: "Database error",
        }),
      );
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(dbGatewayService.saveUser(mockUser)).rejects.toThrow(
        CustomError,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to save user to database gateway",
        expect.objectContaining({
          error: "Network error",
          username: "testuser",
        }),
      );
    });

    it("should send null scope when user has no scope", async () => {
      const userWithoutScope = new User({
        username: "noscope",
        channel: {
          id: "456",
          name: "noscope",
          description: "",
          profileImageUrl: "",
        },
        channelsWhichIsMod: [],
        auth: {
          accessToken: "token",
          idToken: "id",
          tokenType: "Bearer",
          scope: [],
          expiresIn: 3600,
          expiresAt: new Date(),
          state: "state",
          approvedAt: new Date(),
        },
      });

      const mockResponse = {
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue({ id: "db_456", username: "noscope" }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await dbGatewayService.saveUser(userWithoutScope);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/users",
        expect.objectContaining({
          body: expect.stringContaining('"scope":null'),
        }),
      );
    });

    it("should handle timeout", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 100),
          ),
      );

      await expect(dbGatewayService.saveUser(mockUser)).rejects.toThrow(
        CustomError,
      );
    });

    it("should send null scope when auth.scope is empty", async () => {
      const userNoScope = new User({
        username: "testuser",
        channel: mockUser.channel,
        channelsWhichIsMod: [],
        auth: {
          ...mockUser.auth,
          scope: [],
        },
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: "123", username: "testuser" }),
      } as any);

      await dbGatewayService.saveUser(userNoScope);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/users",
        expect.objectContaining({
          body: expect.stringContaining('"scope":null'),
        }),
      );
    });
  });

  describe("getChannelById", () => {
    it("should return channel when GET returns 200", async () => {
      const mockChannel = { id: "channel-123", name: "testchannel" };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockChannel),
      } as any);

      const result = await dbGatewayService.getChannelById("channel-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/channels/channel-123",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual(mockChannel);
    });

    it("should return null when GET returns 404", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 } as any);

      const result = await dbGatewayService.getChannelById("channel-123");

      expect(result).toBeNull();
    });

    it("should throw CustomError when GET returns 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Database error"),
      } as any);

      await expect(
        dbGatewayService.getChannelById("channel-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw CustomError on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        dbGatewayService.getChannelById("channel-123"),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to get channel from database gateway",
        expect.objectContaining({ channelId: "channel-123" }),
      );
    });
  });

  describe("createChannel", () => {
    it("should successfully create channel", async () => {
      const mockChannel = { id: "channel-456", name: "newchannel" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockChannel),
      } as any);

      const result = await dbGatewayService.createChannel(
        "channel-456",
        "newchannel",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/channels",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ id: "channel-456", name: "newchannel" }),
        }),
      );
      expect(result).toEqual(mockChannel);
    });

    it("should throw CustomError when POST returns 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Database error"),
      } as any);

      await expect(
        dbGatewayService.createChannel("channel-456", "newchannel"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw CustomError on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        dbGatewayService.createChannel("channel-456", "newchannel"),
      ).rejects.toThrow(CustomError);
    });
  });

  describe("updateChannel", () => {
    it("should successfully update channel with discordWebhookUrl", async () => {
      const mockChannel = {
        id: "channel-456",
        name: "mychannel",
        discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockChannel),
      } as any);

      const result = await dbGatewayService.updateChannel("channel-456", {
        discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/channels/channel-456",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
          }),
        }),
      );
      expect(result).toEqual(mockChannel);
    });

    it("should successfully update channel with null to remove webhook", async () => {
      const mockChannel = {
        id: "channel-456",
        name: "mychannel",
        discordWebhookUrl: null,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockChannel),
      } as any);

      const result = await dbGatewayService.updateChannel("channel-456", {
        discordWebhookUrl: null,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/channels/channel-456",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ discordWebhookUrl: null }),
        }),
      );
      expect(result).toEqual(mockChannel);
    });

    it("should throw CustomError when PUT returns 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: jest.fn().mockResolvedValue("not found"),
      } as any);

      await expect(
        dbGatewayService.updateChannel("channel-456", {
          discordWebhookUrl: "https://example.com/webhook",
        }),
      ).rejects.toThrow(CustomError);
    });

    it("should throw CustomError on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        dbGatewayService.updateChannel("channel-456", {
          discordWebhookUrl: null,
        }),
      ).rejects.toThrow(CustomError);
    });
  });

  describe("getAre", () => {
    it("should return ARE when GET returns 200", async () => {
      const mockAre = {
        userId: "user-1",
        channelId: "channel-1",
        userType: "owner",
      };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockAre),
      } as any);

      const result = await dbGatewayService.getAre("user-1", "channel-1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/are?userId=user-1&channelId=channel-1"),
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual(mockAre);
    });

    it("should return null when GET returns 404", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 } as any);

      const result = await dbGatewayService.getAre("user-1", "channel-1");

      expect(result).toBeNull();
    });

    it("should throw CustomError when GET returns 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Database error"),
      } as any);

      await expect(
        dbGatewayService.getAre("user-1", "channel-1"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw CustomError on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        dbGatewayService.getAre("user-1", "channel-1"),
      ).rejects.toThrow(CustomError);
    });
  });

  describe("getAreByUser", () => {
    it("should call GET /are/user/:userId and return filtered array", async () => {
      const mockAres = [
        { userId: "user-1", channelId: "channel-1", userType: "moderator" },
        { userId: "user-1", channelId: "channel-2", userType: "owner" },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockAres),
      } as any);

      const result = await dbGatewayService.getAreByUser("user-1", "moderator");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/are/user/user-1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual([
        { userId: "user-1", channelId: "channel-1", userType: "moderator" },
      ]);
    });

    it("should return empty array when no entries match userType", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue([
          { userId: "user-1", channelId: "channel-1", userType: "owner" },
        ]),
      } as any);

      const result = await dbGatewayService.getAreByUser("user-1", "moderator");

      expect(result).toEqual([]);
    });

    it("should throw CustomError when GET returns 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Database error"),
      } as any);

      await expect(
        dbGatewayService.getAreByUser("user-1", "moderator"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw CustomError on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        dbGatewayService.getAreByUser("user-1", "moderator"),
      ).rejects.toThrow(CustomError);
    });
  });

  describe("createAre", () => {
    it("should successfully create ARE", async () => {
      const mockAre = {
        userId: "user-1",
        channelId: "channel-1",
        userType: "moderator",
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAre),
      } as any);

      const result = await dbGatewayService.createAre(
        "user-1",
        "channel-1",
        "moderator",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/are",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            userId: "user-1",
            channelId: "channel-1",
            userType: "moderator",
          }),
        }),
      );
      expect(result).toEqual(mockAre);
    });

    it("should throw CustomError when POST returns 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Database error"),
      } as any);

      await expect(
        dbGatewayService.createAre("user-1", "channel-1", "owner"),
      ).rejects.toThrow(CustomError);
    });
  });

  describe("deleteUserAllData", () => {
    it("should call DELETE /users/:id/all-data and return void on 204", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      } as any);

      await dbGatewayService.deleteUserAllData("user-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/users/user-123/all-data",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${MOCK_VPC_JWT}`,
          }),
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "User data successfully deleted",
        { userId: "user-123" },
      );
    });

    it("should throw CustomError when DELETE returns 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: jest.fn().mockResolvedValue("not found"),
      } as any);

      const error = await dbGatewayService
        .deleteUserAllData("user-123")
        .catch((e) => e);

      expect(error).toBeInstanceOf(CustomError);
      expect((error as CustomError).statusCode).toBe(404);
      expect((error as CustomError).message).toBe("User not found");
    });

    it("should throw CustomError when DELETE returns 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Database error"),
      } as any);

      await expect(
        dbGatewayService.deleteUserAllData("user-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw CustomError on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        dbGatewayService.deleteUserAllData("user-123"),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to delete user data from database gateway",
        expect.objectContaining({ userId: "user-123" }),
      );
    });
  });

  describe("checkHealth", () => {
    it("should return healthy with db gateway data when GET /health returns 200", async () => {
      const mockHealthResponse = {
        status: "healthy",
        timestamp: "2024-01-15T10:30:00.000Z",
        database: "connected",
      };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockHealthResponse),
      } as any);

      const result = await dbGatewayService.checkHealth();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/health",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_VPC_JWT}`,
          }),
        }),
      );
      expect(result).toEqual({
        status: "healthy",
        data: mockHealthResponse,
      });
    });

    it("should return unhealthy when GET /health returns 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue("Internal Server Error"),
      } as any);

      const result = await dbGatewayService.checkHealth();

      expect(result).toEqual({
        status: "unhealthy",
        error: expect.stringContaining("500"),
      });
    });

    it("should return unhealthy on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await dbGatewayService.checkHealth();

      expect(result).toEqual({
        status: "unhealthy",
        error: "Connection refused",
      });
    });
  });

  describe("double header (production mode)", () => {
    const MOCK_GCP_TOKEN = "Bearer gcp-identity-token-for-tests";

    beforeEach(() => {
      mockGetGcpIdToken.mockResolvedValue(MOCK_GCP_TOKEN);
    });

    afterEach(() => {
      mockGetGcpIdToken.mockResolvedValue(null);
    });

    it("should send GCP identity token in Authorization and app JWT in X-VPC-Token", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: "123",
          username: "testuser",
          profileImageUrl: null,
          channelDescription: null,
          scope: null,
          lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
          xp: 0,
        }),
      } as any);

      await dbGatewayService.getUserById("123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/users/123",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: MOCK_GCP_TOKEN,
            "X-VPC-Token": MOCK_VPC_JWT,
          }),
        }),
      );
    });

    it("should not include app JWT in Authorization header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: "123",
          username: "testuser",
          profileImageUrl: null,
          channelDescription: null,
          scope: null,
          lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
          xp: 0,
        }),
      } as any);

      await dbGatewayService.getUserById("123");

      const headers = (mockFetch.mock.calls[0][1] as RequestInit)
        .headers as Record<string, string>;
      expect(headers.Authorization).toBe(MOCK_GCP_TOKEN);
      expect(headers.Authorization).not.toContain(MOCK_VPC_JWT);
    });

    it("should call getGcpIdToken with the db-gateway URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: "123",
          username: "testuser",
          profileImageUrl: null,
          channelDescription: null,
          scope: null,
          lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
          xp: 0,
        }),
      } as any);

      await dbGatewayService.getUserById("123");

      expect(mockGetGcpIdToken).toHaveBeenCalledWith("http://localhost:3001");
    });

    it("should use double headers for health check", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest
          .fn()
          .mockResolvedValue({ status: "healthy", timestamp: "2026-01-01" }),
      } as any);

      await dbGatewayService.checkHealth();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/health",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: MOCK_GCP_TOKEN,
            "X-VPC-Token": MOCK_VPC_JWT,
          }),
        }),
      );
    });
  });
});
