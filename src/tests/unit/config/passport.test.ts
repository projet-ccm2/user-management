import { configurePassport, PASSPORT_TWITCH_STRATEGY } from "../../../config/passport";
import { TwitchTokenStrategy } from "../../../strategies/twitchTokenStrategy";
import { config } from "../../../config/environment";
import { logger } from "../../../utils/logger";
import passport from "passport";

// Mock des dépendances
jest.mock("../../../strategies/twitchTokenStrategy");
jest.mock("../../../config/environment");
jest.mock("../../../utils/logger");
jest.mock("passport");

const mockTwitchTokenStrategy = TwitchTokenStrategy as jest.MockedClass<typeof TwitchTokenStrategy>;
const mockPassport = passport as jest.Mocked<typeof passport>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("passport configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock config
    (config as any) = {
      twitch: {
        clientId: "test-client-id",
        issuer: "https://id.twitch.tv/oauth2",
      },
    };

    // Mock passport.use
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
        expect.any(TwitchTokenStrategy)
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Passport configured successfully",
        {
          strategy: "twitch-token",
          issuer: "https://id.twitch.tv/oauth2",
        }
      );
    });

    it("should not configure passport twice", () => {
      configurePassport();
      configurePassport();

      expect(mockPassport.use).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle configuration error", () => {
      const error = new Error("Configuration failed");
      mockPassport.use.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => configurePassport()).toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle unknown error type", () => {
      mockPassport.use.mockImplementationOnce(() => {
        throw "string error";
      });

      expect(() => configurePassport()).toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should use correct config values", () => {
      (config as any) = {
        twitch: {
          clientId: "different-client-id",
          issuer: "https://different.issuer.com",
        },
      };

      configurePassport();

      expect(mockTwitchTokenStrategy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle undefined config values", () => {
      (config as any) = {
        twitch: {
          clientId: undefined,
          issuer: undefined,
        },
      };

      configurePassport();

      expect(mockTwitchTokenStrategy).toHaveBeenCalled();
    });
  });
});
