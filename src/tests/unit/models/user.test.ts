import User from "../../../models/user";

describe("User model", () => {
  const baseChannel = {
    id: "123",
    name: "testuser",
    description: "Test",
    profileImageUrl: "https://example.com/avatar.jpg",
  };
  const baseAuth = {
    accessToken: "token",
    idToken: "id",
    approvedAt: new Date(),
  };

  it("should create user with channelsWhichIsMod when provided", () => {
    const user = new User({
      username: "testuser",
      channel: baseChannel,
      channelsWhichIsMod: ["channel1", "channel2"],
      auth: baseAuth,
    });

    expect(user.channelsWhichIsMod).toEqual(["channel1", "channel2"]);
  });

  it("should create user with empty channelsWhichIsMod when not provided", () => {
    const user = new User({
      username: "testuser",
      channel: baseChannel,
      auth: baseAuth,
    });

    expect(user.channelsWhichIsMod).toEqual([]);
  });

  it("should create user with scope when provided in auth", () => {
    const user = new User({
      username: "testuser",
      channel: baseChannel,
      auth: { ...baseAuth, scope: ["user:read:email", "channel:moderate"] },
    });

    expect(user.auth.scope).toEqual(["user:read:email", "channel:moderate"]);
  });

  it("should create user with undefined scope when not provided in auth", () => {
    const user = new User({
      username: "testuser",
      channel: baseChannel,
      auth: baseAuth,
    });

    expect(user.auth.scope).toBeUndefined();
  });

  it("should return getAllWithoutAuth without auth data", () => {
    const user = new User({
      username: "testuser",
      channel: baseChannel,
      auth: baseAuth,
    });

    const result = user.getAllWithoutAuth();

    expect(result).toEqual({
      username: "testuser",
      channel: baseChannel,
      channelsWhichIsMod: [],
    });
    expect(result).not.toHaveProperty("auth");
  });
});
