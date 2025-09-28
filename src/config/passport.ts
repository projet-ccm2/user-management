import passport from "passport";
import { TwitchTokenStrategy } from "../strategies/twitchTokenStrategy";

export const PASSPORT_TWITCH_STRATEGY = "twitch-token";

let isConfigured = false;

export const configurePassport = (): void => {
  if (isConfigured) {
    return;
  }

  passport.use(
    new TwitchTokenStrategy({
      clientId: process.env.TWITCH_CLIENT_ID,
      issuer: process.env.TWITCH_ISSUER || "https://id.twitch.tv/oauth2",
    }),
  );

  isConfigured = true;
};
