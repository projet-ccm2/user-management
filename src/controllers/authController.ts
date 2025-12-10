import { Request, Response } from "express";
import type { TwitchPassportUser } from "../strategies/twitchTokenStrategy";
import User, { type UserAuthApproval } from "../models/user";
import { fetchTwitchUser } from "../services/twitchUserService";
import { dbGatewayService } from "../services/dbGatewayService";
import { config } from "../config/environment";
import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";

type AuthenticatedRequest = Request & { user?: TwitchPassportUser };

export const callbackConnexion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;

    if (!user) {
      logger.error(
        "Authentication callback called without user in request context",
      );
      throw new CustomError("Authentication failed: user context missing", 401);
    }

    const { tokens } = user;

    if (!tokens?.accessToken || !tokens.idToken) {
      logger.error("Authentication callback called with incomplete tokens", {
        hasAccessToken: !!tokens?.accessToken,
        hasIdToken: !!tokens?.idToken,
      });
      throw new CustomError(
        "Authentication failed: incomplete token data",
        401,
      );
    }

    logger.info("Processing Twitch authentication callback", {
      userId: user.userId,
    });

    const authInfo: UserAuthApproval = {
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
      tokenType: tokens.tokenType,
      scope: tokens.scope,
      expiresIn: tokens.expiresIn,
      expiresAt:
        typeof tokens.expiresIn === "number"
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : undefined,
      state: tokens.state,
      approvedAt: new Date(),
    };

    const twitchUser = await fetchTwitchUser(
      tokens.accessToken,
      config.twitch.clientId,
    );
    const username = twitchUser.display_name || twitchUser.login;

    const userModel = new User({
      username,
      channel: {
        id: twitchUser.id,
        username: username,
        channelDescription: twitchUser.description || "",
        profileImageUrl: twitchUser.profile_image_url,
      },
      channelsWhichIsMod: [],
      auth: authInfo,
    });

    logger.info("User authentication successful", {
      userId: twitchUser.id,
      username: username,
    });

    const dbResult = await dbGatewayService.saveUser(userModel);

    logger.info("User saved to database", {
      userId: dbResult.userId,
      username: username,
    });

    res.status(200).json({
      success: true,
      user: userModel.getAllWithoutAuth(),
      userId: dbResult.userId,
    });
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
