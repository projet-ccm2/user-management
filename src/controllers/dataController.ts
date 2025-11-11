import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";
import type {TwitchPassportUser} from "../strategies/twitchTokenStrategy";

type setRewardsData = {
    userId: string;
    rewardsId: number[];
}

type setRewardsRequest = Request & { data?: setRewardsData};

export const callbackSetReward = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    console.log("Received setReward");
    const { data } = req as setRewardsRequest;

    if(!data || data.rewardsId.length === 0) {
        throw new CustomError("")
    }


  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }

    logger.error("Unexpected error in authentication callback", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new CustomError("Authentication failed due to internal error", 500);
  }
};
