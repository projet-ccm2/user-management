/* eslint-disable camelcase -- Twitch API responses use snake_case */
import {
  getModeratedChannels,
  getModerators,
} from "../../../services/twitchModerationService";
import { logger } from "../../../utils/logger";
import { CustomError } from "../../../middlewares/errorHandler";

jest.mock("../../../utils/logger");

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("TwitchModerationService", () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    jest.clearAllMocks();
    mockLogger.info = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getModeratedChannels", () => {
    it("should throw when accessToken is missing", async () => {
      await expect(
        getModeratedChannels("", "client-id", "user-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw when clientId is missing", async () => {
      await expect(
        getModeratedChannels("token", "", "user-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw when accessToken is whitespace only", async () => {
      await expect(
        getModeratedChannels("   ", "client-id", "user-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should return moderated channels on success", async () => {
      const mockData = [
        {
          broadcaster_id: "ch1",
          broadcaster_login: "channel1",
          broadcaster_name: "Channel1",
        },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: mockData })),
      } as any);

      const result = await getModeratedChannels(
        "access-token",
        "client-id",
        "user-123",
      );

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("user_id=user-123"),
        expect.any(Object),
      );
    });

    it("should return empty array when data is empty", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      } as any);

      const result = await getModeratedChannels(
        "access-token",
        "client-id",
        "user-123",
      );

      expect(result).toEqual([]);
    });

    it("should throw CustomError when Twitch API returns error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve("Unauthorized"),
      } as any);

      await expect(
        getModeratedChannels("token", "client-id", "user-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw CustomError when response is invalid JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("not valid json {{{"),
      } as any);

      await expect(
        getModeratedChannels("token", "client-id", "user-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should handle pagination when cursor is present", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                data: [
                  {
                    broadcaster_id: "ch1",
                    broadcaster_login: "c1",
                    broadcaster_name: "C1",
                  },
                ],
                pagination: { cursor: "next-page" },
              }),
            ),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                data: [
                  {
                    broadcaster_id: "ch2",
                    broadcaster_login: "c2",
                    broadcaster_name: "C2",
                  },
                ],
              }),
            ),
        } as any);

      const result = await getModeratedChannels(
        "access-token",
        "client-id",
        "user-123",
      );

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getModerators", () => {
    it("should throw when accessToken is missing", async () => {
      await expect(
        getModerators("", "client-id", "broadcaster-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should throw when clientId is missing", async () => {
      await expect(
        getModerators("token", "", "broadcaster-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should return moderators on success", async () => {
      const mockData = [
        { user_id: "mod-1", user_login: "moderator1", user_name: "Moderator1" },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: mockData })),
      } as any);

      const result = await getModerators(
        "access-token",
        "client-id",
        "broadcaster-123",
      );

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("broadcaster_id=broadcaster-123"),
        expect.any(Object),
      );
    });

    it("should throw CustomError when Twitch API returns error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: () => Promise.resolve("Forbidden"),
      } as any);

      await expect(
        getModerators("token", "client-id", "broadcaster-123"),
      ).rejects.toThrow(CustomError);
    });

    it("should handle pagination when cursor is present", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                data: [{ user_id: "m1", user_login: "m1", user_name: "M1" }],
                pagination: { cursor: "next" },
              }),
            ),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                data: [{ user_id: "m2", user_login: "m2", user_name: "M2" }],
              }),
            ),
        } as any);

      const result = await getModerators(
        "access-token",
        "client-id",
        "broadcaster-123",
      );

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
