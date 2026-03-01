import { Request, Response, NextFunction } from "express";
import type { TwitchPassportUser } from "../strategies/twitchTokenStrategy";
import User, { type UserAuthApproval } from "../models/user";
import { fetchTwitchUser } from "../services/twitchUserService";
import { dbGatewayService } from "../services/dbGatewayService";
import { syncChannelsAndAreAfterAuth } from "../services/syncChannelsAndAreService";
import { config } from "../config/environment";
import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";

type AuthenticatedRequest = Request & { user?: TwitchPassportUser };

export const callbackConnexion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;

    if (!user) {
      logger.error(
        "Authentication callback called without user in request context",
        {
          method: req.method,
          path: req.path,
          hasBody: !!req.body && Object.keys(req.body || {}).length > 0,
        },
      );
      next(new CustomError("Authentication failed: user context missing", 401));
      return;
    }

    const { tokens } = user;

    if (!tokens?.accessToken || !tokens.idToken) {
      logger.error("Authentication callback called with incomplete tokens", {
        hasAccessToken: !!tokens?.accessToken,
        hasIdToken: !!tokens?.idToken,
      });
      next(
        new CustomError("Authentication failed: incomplete token data", 401),
      );
      return;
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
        name: username,
        description: twitchUser.description,
        profileImageUrl: twitchUser.profile_image_url,
      },
      channelsWhichIsMod: [],
      auth: authInfo,
    });

    logger.info("User authentication successful", {
      userId: twitchUser.id,
      username: username,
    });

    const existing = await dbGatewayService.getUserById(userModel.channel.id);
    const isRecentlyUpdated =
      existing !== null &&
      Date.now() - new Date(existing.lastUpdateTimestamp).getTime() <
        config.user.skipUpdateThresholdMs;

    let dbResult;
    if (existing === null) {
      dbResult = await dbGatewayService.saveUser(userModel);
    } else if (isRecentlyUpdated) {
      dbResult = existing;
    } else {
      dbResult = await dbGatewayService.updateUser(
        userModel.channel.id,
        userModel,
      );
    }

    logger.info("User saved or updated in database", {
      userId: dbResult.id,
      username: username,
    });

    try {
      await syncChannelsAndAreAfterAuth(
        dbResult.id,
        userModel,
        tokens.accessToken,
        config.twitch.clientId,
      );
    } catch (error_) {
      logger.error("Sync channels/ARE failed (auth still successful)", {
        error: error_ instanceof Error ? error_.message : "Unknown error",
        userId: dbResult.id,
      });
    }

    res.status(200).json({
      success: true,
      user: userModel.getAllWithoutAuth(),
      userId: dbResult.id,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
      return;
    }

    logger.error("Unexpected error in authentication callback", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(new CustomError("Authentication failed due to internal error", 500));
  }
};
