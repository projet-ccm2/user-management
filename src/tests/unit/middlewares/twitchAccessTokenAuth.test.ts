import { Request, Response } from "express";
import { twitchAccessTokenAuth } from "../../../middlewares/twitchAccessTokenAuth";
import {
  validateAndParseTwitchTokens,
  TwitchAuthInfo,
} from "../../../services/twitchAuthService";
import { CustomError } from "../../../middlewares/errorHandler";

jest.mock("../../../services/twitchAuthService");
jest.mock("../../../utils/logger", () => ({
  logger: { debug: jest.fn(), warn: jest.fn() },
}));
jest.mock("../../../config/environment", () => ({
  config: {
    gcp: { skipAuth: false },
    twitch: {
      clientId: "test-client-id",
      issuer: "https://id.twitch.tv/oauth2",
    },
  },
}));

const mockValidate = validateAndParseTwitchTokens as jest.MockedFunction<
  typeof validateAndParseTwitchTokens
>;

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
    expect(mockValidate).not.toHaveBeenCalled();
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
    expect(mockValidate).not.toHaveBeenCalled();
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
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("should attach twitchUser to req and call next on valid token", async () => {
    /* eslint-disable camelcase */
    mockValidate.mockReturnValueOnce({
      userId: "12345",
      claims: { sub: "12345", preferred_username: "testuser", picture: "" },
    });
    /* eslint-enable camelcase */

    const req = {
      headers: { authorization: "Bearer valid-id-token" },
    } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockValidate).toHaveBeenCalledWith(expect.any(TwitchAuthInfo), {
      clientId: "test-client-id",
      issuer: "https://id.twitch.tv/oauth2",
    });
    expect((req as any).twitchUser).toEqual(
      expect.objectContaining({ id: "12345", login: "testuser" }),
    );
    expect(mockNext).toHaveBeenCalledWith();
  });

  it("should call next with 401 when userId is missing from claims", async () => {
    mockValidate.mockReturnValueOnce({
      userId: undefined,
      claims: {},
    });

    const req = {
      headers: { authorization: "Bearer valid-id-token" },
    } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Unauthorized: missing user ID in token",
      }),
    );
  });

  it("should propagate CustomError from validateAndParseTwitchTokens", async () => {
    const customError = new CustomError(
      "Invalid audience (aud) in id_token",
      401,
    );
    mockValidate.mockImplementationOnce(() => {
      throw customError;
    });

    const req = {
      headers: { authorization: "Bearer bad-token" },
    } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(customError);
  });

  it("should call next with 401 on unexpected Error from validateAndParseTwitchTokens", async () => {
    mockValidate.mockImplementationOnce(() => {
      throw new Error("Decode error");
    });

    const req = {
      headers: { authorization: "Bearer bad-token" },
    } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Unauthorized: invalid Twitch token",
      }),
    );
  });

  it("should call next with 401 on non-Error rejection from validateAndParseTwitchTokens", async () => {
    mockValidate.mockImplementationOnce(() => {
      throw "unexpected string error";
    });

    const req = {
      headers: { authorization: "Bearer bad-token" },
    } as Request;

    await twitchAccessTokenAuth(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Unauthorized: invalid Twitch token",
      }),
    );
  });
});
