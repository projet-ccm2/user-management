/* eslint-disable camelcase */
import { fetchTwitchUser } from "../../../services/twitchUserService";
import { logger } from "../../../utils/logger";
import { CustomError } from "../../../middlewares/errorHandler";

jest.mock("../../../utils/logger");

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("TwitchUserService", () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("fetchTwitchUser", () => {
    const validAccessToken = "valid_access_token";
    const validClientId = "valid_client_id";

    it("should successfully fetch Twitch user data", async () => {
      const mockTwitchResponse = {
        data: [
          {
            id: "twitch_123",
            login: "testuser",
            display_name: "TestUser",
            type: "user",
            broadcaster_type: "",
            description: "Test user description",
            profile_image_url: "https://example.com/avatar.jpg",
            offline_image_url: "https://example.com/offline.jpg",
            created_at: "2020-01-01T00:00:00Z",
          },
        ],
      };

      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockTwitchResponse)),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await fetchTwitchUser(validAccessToken, validClientId);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.twitch.tv/helix/users",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer valid_access_token",
            "Client-Id": "valid_client_id",
            Accept: "application/json",
          },
          signal: expect.any(AbortSignal),
        }),
      );

      expect(result).toEqual(mockTwitchResponse.data[0]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Fetching Twitch user data",
        expect.objectContaining({ clientId: expect.any(String) }),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Making request to Twitch API",
        expect.objectContaining({
          url: "https://api.twitch.tv/helix/users",
          headers: expect.objectContaining({
            Authorization: "[REDACTED]",
          }),
        }),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Successfully parsed Twitch API response",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Successfully fetched Twitch user",
        { userId: "twitch_123", username: "testuser" },
      );
    });

    it("should throw error for missing access token", async () => {
      await expect(fetchTwitchUser("", validClientId)).rejects.toThrow(
        CustomError,
      );
      await expect(fetchTwitchUser("   ", validClientId)).rejects.toThrow(
        CustomError,
      );
    });

    it("should throw error for missing client ID", async () => {
      await expect(fetchTwitchUser(validAccessToken, "")).rejects.toThrow(
        CustomError,
      );
      await expect(fetchTwitchUser(validAccessToken, "   ")).rejects.toThrow(
        CustomError,
      );
    });

    it("should handle Twitch API error response", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: jest.fn().mockResolvedValue("Invalid token"),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(
        fetchTwitchUser(validAccessToken, validClientId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Twitch API request failed",
        expect.objectContaining({
          status: 401,
          statusText: "Unauthorized",
          body: "Invalid token",
        }),
      );
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        fetchTwitchUser(validAccessToken, validClientId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Network error when calling Twitch API",
        expect.objectContaining({
          error: "Network error",
          url: "https://api.twitch.tv/helix/users",
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

      await expect(
        fetchTwitchUser(validAccessToken, validClientId),
      ).rejects.toThrow(CustomError);
    });

    it("should handle invalid JSON response", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue("invalid json"),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(
        fetchTwitchUser(validAccessToken, validClientId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to parse Twitch API response",
        expect.objectContaining({
          error: expect.any(String),
          response: "invalid json",
        }),
      );
    });

    it("should handle empty data response", async () => {
      const mockTwitchResponse = {
        data: [],
      };

      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockTwitchResponse)),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(
        fetchTwitchUser(validAccessToken, validClientId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "No user data returned from Twitch API",
        expect.objectContaining({ responseKeys: expect.any(Array) }),
      );
    });

    it("should handle null data response", async () => {
      const mockTwitchResponse = {
        data: null,
      };

      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockTwitchResponse)),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(
        fetchTwitchUser(validAccessToken, validClientId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "No user data returned from Twitch API",
        expect.objectContaining({ responseKeys: expect.any(Array) }),
      );
    });

    it("should handle undefined data response", async () => {
      const mockTwitchResponse = {};

      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockTwitchResponse)),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(
        fetchTwitchUser(validAccessToken, validClientId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "No user data returned from Twitch API",
        expect.objectContaining({ responseKeys: expect.any(Array) }),
      );
    });

    it("should handle unexpected error", async () => {
      mockFetch.mockRejectedValue("Unexpected error");

      await expect(
        fetchTwitchUser(validAccessToken, validClientId),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Network error when calling Twitch API",
        expect.objectContaining({
          error: "Unknown error",
          url: "https://api.twitch.tv/helix/users",
        }),
      );
    });
  });
});
