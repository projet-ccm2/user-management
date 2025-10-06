import { TwitchTokenStrategy } from "../strategies/twitchTokenStrategy";
import passport from "passport";
import { config } from "./environment";
import { logger } from "../utils/logger";

export const PASSPORT_TWITCH_STRATEGY = "twitch-token";

let isConfigured = false;

export const configurePassport = (): void => {
  if (isConfigured) {
    return;
  }

  try {
    passport.use(
      new TwitchTokenStrategy({
        clientId: config.twitch.clientId,
        issuer: config.twitch.issuer,
      }),
    );

    logger.info("Passport configured successfully", {
      strategy: PASSPORT_TWITCH_STRATEGY,
      issuer: config.twitch.issuer,
    });

    isConfigured = true;
  } catch (error) {
    logger.error("Failed to configure Passport", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
};
