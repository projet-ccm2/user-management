import { Request, Response, NextFunction } from "express";
import {
  validateAndParseTwitchTokens,
  TwitchAuthInfo,
} from "../services/twitchAuthService";
import type { TwitchUser } from "../services/twitchUserService";
import { config } from "../config/environment";
import { CustomError } from "./errorHandler";
import { logger } from "../utils/logger";

export type RequestWithTwitchUser = Request & { twitchUser: TwitchUser };

export const twitchAccessTokenAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (config.gcp.skipAuth) {
    logger.debug("Skipping Twitch auth (NODE_ENV=development)");
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(
      new CustomError("Missing or invalid Authorization header", 401),
    );
  }

  const idToken = authHeader.slice(7);

  try {
    const info = new TwitchAuthInfo({ accessToken: "", idToken });
    const { userId, claims } = validateAndParseTwitchTokens(info, {
      clientId: config.twitch.clientId,
      issuer: config.twitch.issuer,
    });

    if (!userId) {
      return next(
        new CustomError("Unauthorized: missing user ID in token", 401),
      );
    }

    const twitchUser: TwitchUser = {
      id: userId,
      login:
        typeof claims.preferred_username === "string"
          ? claims.preferred_username
          : "",
      display_name:
        typeof claims.preferred_username === "string"
          ? claims.preferred_username
          : "",
      type: "",
      broadcaster_type: "",
      description: "",
      profile_image_url:
        typeof claims.picture === "string" ? claims.picture : "",
      offline_image_url: "",
      created_at: "",
    };

    (req as RequestWithTwitchUser).twitchUser = twitchUser;
    return next();
  } catch (error) {
    if (error instanceof CustomError) return next(error);
    logger.warn("Twitch id token validation failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return next(new CustomError("Unauthorized: invalid Twitch token", 401));
  }
};
