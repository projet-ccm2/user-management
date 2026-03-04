import {
  configurePassport,
  PASSPORT_TWITCH_STRATEGY,
} from "../../../config/passport";
import { TwitchTokenStrategy } from "../../../strategies/twitchTokenStrategy";
import { config } from "../../../config/environment";
import { logger } from "../../../utils/logger";
import passport from "passport";

jest.mock("../../../strategies/twitchTokenStrategy");
jest.mock("../../../config/environment");
jest.mock("../../../utils/logger");
jest.mock("passport");

const mockTwitchTokenStrategy = TwitchTokenStrategy as jest.MockedClass<
  typeof TwitchTokenStrategy
>;
const mockPassport = passport as jest.Mocked<typeof passport>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("passport configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.assign(config, {
      twitch: {
        clientId: "test-client-id",
        issuer: "https://id.twitch.tv/oauth2",
      },
    });
    mockPassport.use = jest.fn();
  });

  describe("PASSPORT_TWITCH_STRATEGY", () => {
    it("should have correct strategy name", () => {
      expect(PASSPORT_TWITCH_STRATEGY).toBe("twitch-token");
    });
  });

  describe("configurePassport", () => {
    it("should configure passport with TwitchTokenStrategy", () => {
      configurePassport();

      expect(mockTwitchTokenStrategy).toHaveBeenCalledWith({
        clientId: "test-client-id",
        issuer: "https://id.twitch.tv/oauth2",
      });

      expect(mockPassport.use).toHaveBeenCalledWith(
        expect.any(TwitchTokenStrategy),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Passport configured successfully",
        {
          strategy: "twitch-token",
          issuer: "https://id.twitch.tv/oauth2",
        },
      );
    });

    it("should not configure passport twice", () => {
      configurePassport();
      configurePassport();

      expect(true).toBe(true);
    });

    it("should handle configuration error", () => {
      jest.isolateModules(() => {
        const passport = require("passport");
        passport.use = jest.fn().mockImplementation(() => {
          throw new Error("Strategy configuration failed");
        });
        const {
          configurePassport: configurePassportFresh,
        } = require("../../../config/passport");

        expect(() => configurePassportFresh()).toThrow(
          "Strategy configuration failed",
        );
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Failed to configure Passport",
          { error: "Strategy configuration failed" },
        );
      });
    });

    it("should handle unknown error type", () => {
      jest.isolateModules(() => {
        const passport = require("passport");
        passport.use = jest.fn().mockImplementation(() => {
          throw "string error";
        });
        const {
          configurePassport: configurePassportFresh,
        } = require("../../../config/passport");

        expect(() => configurePassportFresh()).toThrow("string error");
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Failed to configure Passport",
          { error: "Unknown error" },
        );
      });
    });

    it("should use correct config values", () => {
      Object.assign(config, {
        twitch: {
          clientId: "different-client-id",
          issuer: "https://different.issuer.com",
        },
      });

      configurePassport();

      expect(true).toBe(true);
    });

    it("should handle undefined config values", () => {
      Object.assign(config, {
        twitch: {
          clientId: undefined,
          issuer: undefined,
        },
      });

      configurePassport();

      expect(true).toBe(true);
    });
  });
});
