import { Request, Response } from "express";
import { twitchAccessTokenAuth } from "../../../middlewares/twitchAccessTokenAuth";
import { fetchTwitchUser } from "../../../services/twitchUserService";
import { CustomError } from "../../../middlewares/errorHandler";

jest.mock("../../../services/twitchUserService");
jest.mock("../../../utils/logger", () => ({
  logger: { debug: jest.fn(), warn: jest.fn() },
}));
jest.mock("../../../config/environment", () => ({
  config: {
    gcp: { skipAuth: false },
    twitch: { clientId: "test-client-id" },
  },
}));

const mockFetchTwitchUser = fetchTwitchUser as jest.MockedFunction<
  typeof fetchTwitchUser
>;

/* eslint-disable camelcase */
const mockTwitchUser = {
  id: "12345",
  login: "testuser",
  display_name: "TestUser",
  type: "",
  broadcaster_type: "",
  description: "",
  profile_image_url: "",
  offline_image_url: "",
  created_at: "2020-01-01T00:00:00Z",
};
/* eslint-enable camelcase */

const mockNext = jest.fn();
const mockRes = {} as Response;

describe("twitchAccessTokenAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { config } = require("../../../config/environment") as {
      config: { gcp: { skipAuth: boolean } };
    };
    config.gcp.skipAuth = false;
  });

  it("should call next without validation when skipAuth is true", async () => {
    const { config } = require("../../../config/environment") as {
      config: { gcp: { skipAuth: boolean } };
    };
    config.gcp.skipAuth = true;

    const req = { headers: {} } as Request;
    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockFetchTwitchUser).not.toHaveBeenCalled();
  });

  it("should call next with 401 when Authorization header is missing", async () => {
    const req = { headers: {} } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Missing or invalid Authorization header",
      }),
    );
    expect(mockFetchTwitchUser).not.toHaveBeenCalled();
  });

  it("should call next with 401 when Authorization header does not start with Bearer", async () => {
    const req = { headers: { authorization: "Basic sometoken" } } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Missing or invalid Authorization header",
      }),
    );
    expect(mockFetchTwitchUser).not.toHaveBeenCalled();
  });

  it("should attach twitchUser to req and call next on valid token", async () => {
    mockFetchTwitchUser.mockResolvedValueOnce(mockTwitchUser);
    const req = { headers: { authorization: "Bearer valid-token" } } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockFetchTwitchUser).toHaveBeenCalledWith(
      "valid-token",
      "test-client-id",
    );
    expect((req as any).twitchUser).toEqual(mockTwitchUser);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it("should propagate CustomError from fetchTwitchUser", async () => {
    const customError = new CustomError("Failed to connect to Twitch API", 502);
    mockFetchTwitchUser.mockRejectedValueOnce(customError);
    const req = { headers: { authorization: "Bearer bad-token" } } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(customError);
  });

  it("should call next with 401 on unexpected Error from fetchTwitchUser", async () => {
    mockFetchTwitchUser.mockRejectedValueOnce(new Error("Network error"));
    const req = { headers: { authorization: "Bearer bad-token" } } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Unauthorized: invalid Twitch token",
      }),
    );
  });

  it("should call next with 401 on non-Error rejection from fetchTwitchUser", async () => {
    mockFetchTwitchUser.mockRejectedValueOnce("unexpected string error");
    const req = { headers: { authorization: "Bearer bad-token" } } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Unauthorized: invalid Twitch token",
      }),
    );
  });
});
