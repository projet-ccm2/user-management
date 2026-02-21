import { Request, Response, NextFunction } from "express";
import { config } from "../config/environment";
import { logger } from "../utils/logger";

export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  );
  next();
};

export const corsValidator = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const origin = req.headers.origin;

  if (req.method === "OPTIONS") {
    if (origin && config.cors.allowedOrigins.includes(origin)) {
      logger.debug("CORS: OPTIONS preflight allowed", { origin });
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Origin",
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      res.status(200).end();
      return;
    }
    if (origin) {
      logger.warn("CORS: OPTIONS preflight rejected", {
        origin,
        allowedOrigins: config.cors.allowedOrigins,
      });
    }
  }

  if (!origin) {
    next();
    return;
  }

  if (config.cors.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Origin",
    );
    next();
    return;
  }

  logger.warn("CORS: origin rejected", {
    origin,
    allowedOrigins: config.cors.allowedOrigins,
    method: req.method,
    path: req.path,
  });
  res.status(403).json({
    error: "Origin not allowed by CORS policy",
    status: 403,
  });
};
