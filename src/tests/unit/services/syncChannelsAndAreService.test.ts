/* eslint-disable camelcase -- Twitch API responses use snake_case */
import { syncChannelsAndAreAfterAuth } from "../../../services/syncChannelsAndAreService";
import { dbGatewayService } from "../../../services/dbGatewayService";
import {
  getModeratedChannels,
  getModerators,
} from "../../../services/twitchModerationService";
import { logger } from "../../../utils/logger";
import User from "../../../models/user";

jest.mock("../../../services/dbGatewayService");
jest.mock("../../../services/twitchModerationService");
jest.mock("../../../utils/logger");

const mockDbGatewayService = dbGatewayService as jest.Mocked<
  typeof dbGatewayService
>;
const mockGetModeratedChannels = getModeratedChannels as jest.MockedFunction<
  typeof getModeratedChannels
>;
const mockGetModerators = getModerators as jest.MockedFunction<
  typeof getModerators
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("syncChannelsAndAreService", () => {
  const mockUser = new User({
    username: "TestUser",
    channel: {
      id: "12345",
      name: "TestUser",
      description: "Test",
      profileImageUrl: "https://example.com/avatar.jpg",
    },
    channelsWhichIsMod: [],
    auth: {
      accessToken: "token",
      idToken: "id_token",
      tokenType: "Bearer",
      scope: ["user:read:email"],
      expiresIn: 3600,
      expiresAt: new Date(),
      state: "state",
      approvedAt: new Date(),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbGatewayService.createChannel = jest.fn().mockResolvedValue({
      id: "channel-123",
      name: "TestUser",
    });
    mockDbGatewayService.getAre = jest.fn().mockResolvedValue(null);
    mockDbGatewayService.createAre = jest.fn().mockResolvedValue({});
    mockDbGatewayService.getUserById = jest.fn().mockResolvedValue(null);
    mockGetModeratedChannels.mockResolvedValue([]);
    mockGetModerators.mockResolvedValue([]);
    mockLogger.warn = jest.fn();
    mockLogger.info = jest.fn();
  });

  it("should create channel and owner ARE when no existing owner link", async () => {
    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockDbGatewayService.createChannel).toHaveBeenCalledWith(
      "12345",
      "TestUser",
    );
    expect(mockDbGatewayService.getAre).toHaveBeenCalledWith(
      "12345",
      "channel-123",
    );
    expect(mockDbGatewayService.createAre).toHaveBeenCalledWith(
      "12345",
      "channel-123",
      "owner",
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Created owner ARE link",
      expect.objectContaining({ userId: "12345", channelId: "channel-123" }),
    );
  });

  it("should not create owner ARE when link already exists", async () => {
    mockDbGatewayService.getAre = jest.fn().mockResolvedValue({
      userId: "12345",
      channelId: "channel-123",
      userType: "owner",
    });

    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockDbGatewayService.createAre).not.toHaveBeenCalledWith(
      "12345",
      "channel-123",
      "owner",
    );
  });

  it("should return early when createChannel fails", async () => {
    mockDbGatewayService.createChannel = jest
      .fn()
      .mockRejectedValue(new Error("Duplicate name"));

    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Could not ensure owner channel (create may have failed for duplicate name)",
      expect.any(Object),
    );
    expect(mockDbGatewayService.getAre).not.toHaveBeenCalled();
  });

  it("should handle non-Error rejection from createChannel", async () => {
    mockDbGatewayService.createChannel = jest
      .fn()
      .mockRejectedValue("string error");

    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Could not ensure owner channel (create may have failed for duplicate name)",
      expect.objectContaining({ error: "Unknown error" }),
    );
  });

  it("should create moderator ARE for mods that exist in DB", async () => {
    mockDbGatewayService.getUserById = jest
      .fn()
      .mockImplementation((id: string) => {
        if (id === "mod-123")
          return Promise.resolve({
            id: "mod-123",
            username: "ModUser",
            lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
            xp: 0,
          });
        return Promise.resolve(null);
      });
    mockGetModerators.mockResolvedValue([
      { user_id: "mod-123", user_login: "moduser", user_name: "ModUser" },
    ]);

    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockDbGatewayService.getUserById).toHaveBeenCalledWith("mod-123");
    expect(mockDbGatewayService.createAre).toHaveBeenCalledWith(
      "mod-123",
      "channel-123",
      "moderator",
    );
  });

  it("should skip mods that do not exist in DB", async () => {
    mockDbGatewayService.getUserById = jest.fn().mockResolvedValue(null);
    mockGetModerators.mockResolvedValue([
      { user_id: "unknown-mod", user_login: "unknown", user_name: "Unknown" },
    ]);

    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockDbGatewayService.createAre).toHaveBeenCalledTimes(1); // only owner
  });

  it("should not create moderator ARE when link already exists", async () => {
    mockDbGatewayService.getUserById = jest.fn().mockResolvedValue({
      id: "mod-123",
      username: "ModUser",
      lastUpdateTimestamp: "2026-02-20T12:00:00.000Z",
      xp: 0,
    });
    mockDbGatewayService.getAre = jest
      .fn()
      .mockImplementation((userId: string) => {
        if (userId === "12345") return Promise.resolve(null);
        return Promise.resolve({
          userId,
          channelId: "channel-123",
          userType: "moderator",
        });
      });
    mockGetModerators.mockResolvedValue([
      { user_id: "mod-123", user_login: "moduser", user_name: "ModUser" },
    ]);

    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockDbGatewayService.createAre).toHaveBeenCalledTimes(1); // only owner
  });

  it("should not fail when getModeratedChannels throws", async () => {
    mockGetModeratedChannels.mockRejectedValue(new Error("Scope missing"));

    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Could not fetch moderated channels from Twitch (scope or token)",
      expect.any(Object),
    );
  });

  it("should not fail when getModerators throws", async () => {
    mockGetModerators.mockRejectedValue(new Error("Scope missing"));

    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Could not fetch channel moderators from Twitch (scope or token)",
      expect.any(Object),
    );
  });

  it("should handle non-Error from getModeratedChannels", async () => {
    mockGetModeratedChannels.mockRejectedValue("string error");

    await syncChannelsAndAreAfterAuth(
      "12345",
      mockUser,
      "access-token",
      "client-id",
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Could not fetch moderated channels from Twitch (scope or token)",
      expect.objectContaining({ error: "Unknown error" }),
    );
  });
});
