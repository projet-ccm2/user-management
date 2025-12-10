import { DbGatewayService } from "../../../services/dbGatewayService";
import { logger } from "../../../utils/logger";
import { CustomError } from "../../../middlewares/errorHandler";
import User from "../../../models/user";

jest.mock("../../../utils/logger");
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

  describe("saveUser", () => {
    const mockUser = new User({
      username: "testuser",
      channel: {
        id: "123",
        username: "testuser",
        channelDescription: "Test user",
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

    it("should successfully save user to database gateway", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          userId: "db_user_123",
          message: "User created successfully",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await dbGatewayService.saveUser(mockUser);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/users",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: "testuser",
            channel: {
              id: "123",
              username: "testuser",
              channelDescription: "Test user",
              profileImageUrl: "https://example.com/avatar.jpg",
            },
            channelsWhichIsMod: [],
          }),
        }),
      );

      expect(result).toEqual({
        success: true,
        userId: "db_user_123",
        message: "User created successfully",
      });

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
  });

  describe("getAllDataUserById", () => {
    it("should successfully fetch user data with channel and channelsWhichIsMod", async () => {
      const userId = "user_123";

      const mockUserChannelResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: userId,
          username: "testuser",
          channelDescription: "Test description",
          profileImageUrl: "https://example.com/avatar.jpg",
        }),
      };

      const mockChannelsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          channels: [
            {
              id: "channel_1",
              name: "channel1",
              userType: "moderator",
            },
            {
              id: "channel_2",
              name: "channel2",
              userType: "admin",
            },
          ],
        }),
      };

      const mockChannelUsersResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          users: [
            {
              id: "user_456",
              username: "channeluser",
              twitchUserId: "789",
              profileImageUrl: "https://example.com/channel.jpg",
              channelDescription: "Channel description",
              scope: "chat:read",
            },
          ],
        }),
      };

      mockFetch
        .mockResolvedValueOnce(mockUserChannelResponse as any)
        .mockResolvedValueOnce(mockChannelsResponse as any)
        .mockResolvedValueOnce(mockChannelUsersResponse as any);

      const result = await dbGatewayService.getAllDataUserById(userId);

      expect(result).toBeInstanceOf(User);
      expect(result.username).toBe("testuser");
      expect(result.channel.id).toBe(userId);
      expect(result.channel.username).toBe("testuser");
      expect(result.channelsWhichIsMod).toHaveLength(1);
      expect(result.channelsWhichIsMod[0].id).toBe("user_456");
      expect(result.channelsWhichIsMod[0].username).toBe("channeluser");

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3001/users/${userId}`,
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3001/users/${userId}/channel`,
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3001/channels/channel_1/users`,
        expect.any(Object),
      );
    });

    it("should return empty channelsWhichIsMod when no moderator channels", async () => {
      const userId = "user_123";

      const mockUserChannelResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: userId,
          username: "testuser",
          channelDescription: "Test description",
          profileImageUrl: "https://example.com/avatar.jpg",
        }),
      };

      const mockChannelsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          channels: [
            {
              id: "channel_1",
              name: "channel1",
              userType: "admin",
            },
          ],
        }),
      };

      mockFetch
        .mockResolvedValueOnce(mockUserChannelResponse as any)
        .mockResolvedValueOnce(mockChannelsResponse as any);

      const result = await dbGatewayService.getAllDataUserById(userId);

      expect(result.channelsWhichIsMod).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "No moderator channels found for user",
        { userId },
      );
    });

    it("should return empty channelsWhichIsMod when channels endpoint returns 404", async () => {
      const userId = "user_123";

      const mockUserChannelResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: userId,
          username: "testuser",
          channelDescription: "Test description",
          profileImageUrl: "https://example.com/avatar.jpg",
        }),
      };

      const mockChannelsResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      mockFetch
        .mockResolvedValueOnce(mockUserChannelResponse as any)
        .mockResolvedValueOnce(mockChannelsResponse as any);

      const result = await dbGatewayService.getAllDataUserById(userId);

      expect(result.channelsWhichIsMod).toHaveLength(0);
    });

    it("should handle error when user channel not found", async () => {
      const userId = "user_123";

      const mockUserChannelResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: jest.fn().mockResolvedValue("User not found"),
      };

      mockFetch.mockResolvedValue(mockUserChannelResponse as any);

      await expect(
        dbGatewayService.getAllDataUserById(userId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "User channel not found in database gateway",
        { userId },
      );
    });

    it("should handle error when user channel fetch returns non-404 error", async () => {
      const userId = "user_123";

      const mockUserChannelResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Server error"),
      };

      mockFetch.mockResolvedValue(mockUserChannelResponse as any);

      await expect(
        dbGatewayService.getAllDataUserById(userId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Database gateway request failed",
        expect.objectContaining({
          status: 500,
          statusText: "Internal Server Error",
        }),
      );
    });

    it("should handle error when channels endpoint fails", async () => {
      const userId = "user_123";

      const mockUserChannelResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: userId,
          username: "testuser",
          channelDescription: "Test description",
          profileImageUrl: "https://example.com/avatar.jpg",
        }),
      };

      const mockChannelsResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Server error"),
      };

      mockFetch
        .mockResolvedValueOnce(mockUserChannelResponse as any)
        .mockResolvedValueOnce(mockChannelsResponse as any);

      await expect(
        dbGatewayService.getAllDataUserById(userId),
      ).rejects.toThrow(CustomError);
    });

    it("should skip channel if users fetch fails", async () => {
      const userId = "user_123";

      const mockUserChannelResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: userId,
          username: "testuser",
          channelDescription: "Test description",
          profileImageUrl: "https://example.com/avatar.jpg",
        }),
      };

      const mockChannelsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          channels: [
            {
              id: "channel_1",
              name: "channel1",
              userType: "moderator",
            },
          ],
        }),
      };

      const mockChannelUsersResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      mockFetch
        .mockResolvedValueOnce(mockUserChannelResponse as any)
        .mockResolvedValueOnce(mockChannelsResponse as any)
        .mockResolvedValueOnce(mockChannelUsersResponse as any);

      const result = await dbGatewayService.getAllDataUserById(userId);

      expect(result.channelsWhichIsMod).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to fetch users for channel",
        expect.objectContaining({
          channelId: "channel_1",
        }),
      );
    });

    it("should handle exception when fetching users for channel", async () => {
      const userId = "user_123";

      const mockUserChannelResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: userId,
          username: "testuser",
          channelDescription: "Test description",
          profileImageUrl: "https://example.com/avatar.jpg",
        }),
      };

      const mockChannelsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          channels: [
            {
              id: "channel_1",
              name: "channel1",
              userType: "moderator",
            },
          ],
        }),
      };

      mockFetch
        .mockResolvedValueOnce(mockUserChannelResponse as any)
        .mockResolvedValueOnce(mockChannelsResponse as any)
        .mockRejectedValueOnce(new Error("Network error"));

      const result = await dbGatewayService.getAllDataUserById(userId);

      expect(result.channelsWhichIsMod).toHaveLength(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error fetching users for channel",
        expect.objectContaining({
          channelId: "channel_1",
          error: "Network error",
        }),
      );
    });

    it("should handle network error", async () => {
      const userId = "user_123";

      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        dbGatewayService.getAllDataUserById(userId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to fetch user from database gateway",
        expect.objectContaining({
          error: "Network error",
          userId,
        }),
      );
    });
  });
});
