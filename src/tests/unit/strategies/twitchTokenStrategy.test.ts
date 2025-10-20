import { TwitchTokenStrategy } from "../../../strategies/twitchTokenStrategy";
import { validateAndParseTwitchTokens } from "../../../services/twitchAuthService";
import { Request } from "express";

jest.mock("../../../services/twitchAuthService");

const mockValidateAndParseTwitchTokens =
  validateAndParseTwitchTokens as jest.MockedFunction<
    typeof validateAndParseTwitchTokens
  >;

describe("TwitchTokenStrategy", () => {
  let strategy: TwitchTokenStrategy;
  let mockRequest: Partial<Request>;
  let mockSuccess: jest.Mock;
  let mockFail: jest.Mock;
  let mockError: jest.Mock;

  beforeEach(() => {
    strategy = new TwitchTokenStrategy({
      clientId: "test-client-id",
      issuer: "https://id.twitch.tv/oauth2",
    });

    mockSuccess = jest.fn();
    mockFail = jest.fn();
    mockError = jest.fn();

    (strategy as any).success = mockSuccess;
    (strategy as any).fail = mockFail;
    (strategy as any).error = mockError;

    mockRequest = {
      body: {
        accessToken: "test-access-token",
        idToken: "test-id-token",
        tokenType: "Bearer",
        expiresIn: 3600,
        scope: ["user:read:email"],
        state: "test-state",
      },
    };

    mockValidateAndParseTwitchTokens.mockReturnValue({
      userId: "12345",
      claims: {
        sub: "12345",
        aud: "test-client-id",
        iss: "https://id.twitch.tv/oauth2",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should set name to 'twitch-token'", () => {
      expect(strategy.name).toBe("twitch-token");
    });

    it("should store clientId and issuer", () => {
      expect((strategy as any).clientId).toBe("test-client-id");
      expect((strategy as any).issuer).toBe("https://id.twitch.tv/oauth2");
    });
  });

  describe("authenticate", () => {
    it("should call error when clientId is missing", () => {
      const strategyWithoutClientId = new TwitchTokenStrategy({});
      (strategyWithoutClientId as any).success = mockSuccess;
      (strategyWithoutClientId as any).fail = mockFail;
      (strategyWithoutClientId as any).error = mockError;

      strategyWithoutClientId.authenticate(mockRequest as Request);

      expect(mockError).toHaveBeenCalledWith(
        new Error(
          "Missing env var TWITCH_CLIENT_ID. Configure it to validate id_token audience.",
        ),
      );
    });

    it("should call fail when accessToken is missing", () => {
      mockRequest.body = {
        idToken: "test-id-token",
      };

      strategy.authenticate(mockRequest as Request);

      expect(mockFail).toHaveBeenCalledWith(
        {
          message:
            "Missing required fields: 'accessToken' and 'idToken' are mandatory",
        },
        400,
      );
    });

    it("should call fail when idToken is missing", () => {
      mockRequest.body = {
        accessToken: "test-access-token",
      };

      strategy.authenticate(mockRequest as Request);

      expect(mockFail).toHaveBeenCalledWith(
        {
          message:
            "Missing required fields: 'accessToken' and 'idToken' are mandatory",
        },
        400,
      );
    });

    it("should call fail when both tokens are missing", () => {
      mockRequest.body = {};

      strategy.authenticate(mockRequest as Request);

      expect(mockFail).toHaveBeenCalledWith(
        {
          message:
            "Missing required fields: 'accessToken' and 'idToken' are mandatory",
        },
        400,
      );
    });

    it("should successfully authenticate with valid tokens", () => {
      strategy.authenticate(mockRequest as Request);

      expect(mockValidateAndParseTwitchTokens).toHaveBeenCalled();
      expect(mockSuccess).toHaveBeenCalled();
    });

    it("should handle string conversion for all fields", () => {
      mockRequest.body = {
        accessToken: 123,
        idToken: 456,
        tokenType: 789,
        expiresIn: "3600",
        scope: "user:read:email",
        state: 999,
      };

      strategy.authenticate(mockRequest as Request);

      expect(mockValidateAndParseTwitchTokens).toHaveBeenCalled();
    });

    it("should handle array scope conversion", () => {
      mockRequest.body = {
        accessToken: "test-access-token",
        idToken: "test-id-token",
        scope: ["user:read:email", "user:read:follows"],
      };

      strategy.authenticate(mockRequest as Request);

      expect(mockValidateAndParseTwitchTokens).toHaveBeenCalled();
    });

    it("should handle undefined optional fields", () => {
      mockRequest.body = {
        accessToken: "test-access-token",
        idToken: "test-id-token",
      };

      strategy.authenticate(mockRequest as Request);

      expect(mockValidateAndParseTwitchTokens).toHaveBeenCalled();
    });

    it("should call fail when validateAndParseTwitchTokens throws Error", () => {
      const error = new Error("Token validation failed");
      mockValidateAndParseTwitchTokens.mockImplementation(() => {
        throw error;
      });

      strategy.authenticate(mockRequest as Request);

      expect(mockFail).toHaveBeenCalledWith(
        { message: "Token validation failed" },
        400,
      );
    });

    it("should call fail when validateAndParseTwitchTokens throws unknown error", () => {
      mockValidateAndParseTwitchTokens.mockImplementation(() => {
        throw "string error";
      });

      strategy.authenticate(mockRequest as Request);

      expect(mockFail).toHaveBeenCalledWith(
        { message: "Unknown error during Twitch token validation" },
        400,
      );
    });

    it("should handle null body", () => {
      mockRequest.body = null;

      strategy.authenticate(mockRequest as Request);

      expect(mockFail).toHaveBeenCalledWith(
        {
          message:
            "Missing required fields: 'accessToken' and 'idToken' are mandatory",
        },
        400,
      );
    });

    it("should handle undefined body", () => {
      mockRequest.body = undefined;

      strategy.authenticate(mockRequest as Request);

      expect(mockFail).toHaveBeenCalledWith(
        {
          message:
            "Missing required fields: 'accessToken' and 'idToken' are mandatory",
        },
        400,
      );
    });
  });
});
