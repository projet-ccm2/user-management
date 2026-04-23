import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/environment";
import { CustomError } from "./errorHandler";
import { logger } from "../utils/logger";

interface TwitchExtensionPayload {
  user_id: string;
  channel_id: string;
  opaque_user_id: string;
  role: string;
  exp: number;
}

export const twitchExtensionAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next(new CustomError("Missing or invalid Authorization header", 401));
    return;
  }

  const token = authHeader.slice(7);
  const secret = Buffer.from(config.twitch.extensionSecret, "base64");

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as TwitchExtensionPayload;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = {
      opaqueUserId: decoded.opaque_user_id,
      userId: decoded.user_id,
      channelId: decoded.channel_id,
      role: decoded.role,
    };
    next();
  } catch (error) {
    logger.warn("Twitch Extension JWT validation failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    next(new CustomError("Unauthorized: invalid extension token", 401));
  }
};
