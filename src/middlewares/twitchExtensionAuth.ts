/* eslint-disable camelcase -- Twitch JWT payload uses snake_case */
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

const createTwitchExtensionAuth =
  (headerName = "authorization") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const raw = req.headers[headerName];
    const headerValue = Array.isArray(raw) ? raw[0] : raw;
    if (!headerValue?.startsWith("Bearer ")) {
      next(new CustomError("Missing or invalid Authorization header", 401));
      return;
    }

    const token = headerValue.slice(7);
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

export const twitchExtensionAuth = createTwitchExtensionAuth();
