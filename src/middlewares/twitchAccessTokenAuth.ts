import { Request, Response, NextFunction } from "express";
import { fetchTwitchUser, type TwitchUser } from "../services/twitchUserService";
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
    return next(new CustomError("Missing or invalid Authorization header", 401));
  }

  const accessToken = authHeader.slice(7);

  try {
    const twitchUser = await fetchTwitchUser(accessToken, config.twitch.clientId);
    (req as RequestWithTwitchUser).twitchUser = twitchUser;
    return next();
  } catch (error) {
    if (error instanceof CustomError) return next(error);
    logger.warn("Twitch access token validation failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return next(new CustomError("Unauthorized: invalid Twitch token", 401));
  }
};
