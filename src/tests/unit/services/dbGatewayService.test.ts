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
              name: "testuser",
              description: "Test user",
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
});
