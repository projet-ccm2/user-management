import { DbGatewayService } from "../../../services/dbGatewayService";
import { logger } from "../../../utils/logger";
import { CustomError } from "../../../middlewares/errorHandler";
import User from "../../../models/user";

jest.mock("../../../utils/logger");
jest.mock("../../../services/tokenClient", () => ({
  getVpcToken: jest.fn().mockResolvedValue("mock-vpc-jwt-for-tests"),
}));

const MOCK_VPC_JWT = "mock-vpc-jwt-for-tests";
jest.mock("../../../config/environment", () => ({
  config: {
    dbGateway: {
      url: "http://localhost:3001",
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
          body: JSON.stringify({
            username: "testuser",
            profileImageUrl: "https://example.com/avatar.jpg",
            channelDescription: "Test user",
            scope: "user:read:email",
          }),
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
  });

  describe("saveUser", () => {
    it("should successfully save user to database gateway", async () => {
      const mockDbResponse = {
        id: "db_user_123",
        username: "testuser",
        profileImageUrl: "https://example.com/avatar.jpg",
        channelDescription: "Test user",
        scope: "user:read:email",
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
          body: JSON.stringify({
            id: "123",
            username: "testuser",
            profileImageUrl: "https://example.com/avatar.jpg",
            channelDescription: "Test user",
            scope: "user:read:email",
          }),
        }),
      );

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

      const result = await dbGatewayService.createChannel("newchannel");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/channels",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "newchannel" }),
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
        dbGatewayService.createChannel("newchannel"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw CustomError on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        dbGatewayService.createChannel("newchannel"),
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
});
