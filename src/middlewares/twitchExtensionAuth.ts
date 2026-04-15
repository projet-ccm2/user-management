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

    if (!decoded.user_id) {
      logger.warn("Twitch Extension JWT: user identity not shared");
      next(new CustomError("User identity not shared", 401));
      return;
    }

    if (decoded.user_id !== req.params.id) {
      logger.warn("Extension JWT user_id does not match route param", {
        tokenUserId: decoded.user_id,
        paramId: req.params.id,
      });
      next(new CustomError("Forbidden: user ID mismatch", 403));
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { userId: decoded.user_id };
    next();
  } catch (error) {
    logger.warn("Twitch Extension JWT validation failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    next(new CustomError("Unauthorized: invalid extension token", 401));
  }
};
