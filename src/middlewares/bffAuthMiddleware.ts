import { Request, Response, NextFunction } from "express";
import { GoogleAuth } from "google-auth-library";
import { config } from "../config/environment";
import { CustomError } from "./errorHandler";
import { logger } from "../utils/logger";

/**
 * Validates that the request comes from an authorized bastion (user-management or second BFF).
 * Expects Authorization: Bearer <gcp-identity-token>.
 * When NODE_ENV=development (local dev), skips validation.
 */
export const bffAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (config.gcp.skipAuth) {
    logger.debug("Skipping GCP auth (NODE_ENV=development)");
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(
      new CustomError("Missing or invalid Authorization header", 401),
    );
  }

  const token = authHeader.slice(7);

  try {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(config.gcp.serviceUrl);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.gcp.serviceUrl,
    });
    if (!ticket.getPayload()) {
      return next(new CustomError("Invalid identity token", 401));
    }
    return next();
  } catch (error) {
    if (error instanceof CustomError) return next(error);
    logger.warn("GCP identity token validation failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return next(new CustomError("Unauthorized: invalid identity token", 401));
  }
};
