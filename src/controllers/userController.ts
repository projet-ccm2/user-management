import { Request, Response, NextFunction } from "express";
import type { TwitchPassportUser } from "../strategies/twitchTokenStrategy";
import { dbGatewayService } from "../services/dbGatewayService";
import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";

type AuthenticatedRequest = Request & { user?: TwitchPassportUser };

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;

    if (!user) {
      logger.error("Get user called without authenticated user", {
        method: req.method,
        path: req.path,
      });
      next(new CustomError("Authentication required", 401));
      return;
    }

    const { id } = req.params;

    logger.debug("Fetching user by ID", { userId: id });

    const dbUser = await dbGatewayService.getUserById(id);

    if (!dbUser) {
      next(new CustomError("User not found", 404));
      return;
    }

    res.status(200).json({
      success: true,
      user: dbUser,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
      return;
    }

    logger.error("Unexpected error fetching user", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(new CustomError("Failed to fetch user", 500));
  }
};
