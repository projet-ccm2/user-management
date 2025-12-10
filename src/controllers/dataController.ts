import { Request, Response } from "express";
import { dbGatewayService } from "../services/dbGatewayService";
import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";

export const getUserById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new CustomError("User ID is required", 400);
    }

    logger.info("Fetching user data", { userId: id });

    const user = await dbGatewayService.getAllDataUserById(id);
    const userWithoutAuth = user.getAllWithoutAuth();

    logger.info("User data successfully retrieved", {
      userId: id,
      username: user.username,
    });

    res.status(200).json(userWithoutAuth);
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }

    logger.error("Unexpected error while fetching user data", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.params.id,
    });
    throw new CustomError("Failed to fetch user data", 500);
  }
};
