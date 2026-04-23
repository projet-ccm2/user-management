import { Request, Response, NextFunction } from "express";
import type { TwitchPassportUser } from "../strategies/twitchTokenStrategy";
import { dbGatewayService } from "../services/dbGatewayService";
import { CustomError } from "../middlewares/errorHandler";

type AuthenticatedRequest = Request & { user?: TwitchPassportUser };

type ExtensionAuthenticatedRequest = Request & {
  user?: { opaqueUserId: string; userId: string; channelId: string; role: string };
};

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const registerDiscordWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as ExtensionAuthenticatedRequest;

    if (!user?.channelId) {
      next(new CustomError("Authentication required", 401));
      return;
    }

    if (user.role !== "broadcaster") {
      next(new CustomError("Only broadcasters can register a Discord webhook", 403));
      return;
    }

    const { discordWebhookUrl } = req.body ?? {};

    if (discordWebhookUrl === undefined) {
      next(
        new CustomError(
          "Validation failed: Field 'discordWebhookUrl' is required",
          400,
        ),
      );
      return;
    }

    if (discordWebhookUrl !== null && typeof discordWebhookUrl !== "string") {
      next(
        new CustomError(
          "Validation failed: 'discordWebhookUrl' must be a string or null",
          400,
        ),
      );
      return;
    }

    if (
      typeof discordWebhookUrl === "string" &&
      discordWebhookUrl.length > 0 &&
      !isValidUrl(discordWebhookUrl)
    ) {
      next(
        new CustomError(
          "Validation failed: 'discordWebhookUrl' must be a valid URL",
          400,
        ),
      );
      return;
    }

    const channel = await dbGatewayService.updateChannel(user.channelId, {
      discordWebhookUrl: discordWebhookUrl ?? null,
    });

    res.status(200).json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        discordWebhookUrl: channel.discordWebhookUrl ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateChannelDiscordWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;

    if (!user?.userId) {
      next(new CustomError("Authentication required", 401));
      return;
    }

    const { discordWebhookUrl } = req.body ?? {};

    if (discordWebhookUrl === undefined) {
      next(
        new CustomError(
          "Validation failed: Field 'discordWebhookUrl' is required",
          400,
        ),
      );
      return;
    }

    if (discordWebhookUrl !== null && typeof discordWebhookUrl !== "string") {
      next(
        new CustomError(
          "Validation failed: 'discordWebhookUrl' must be a string or null",
          400,
        ),
      );
      return;
    }

    if (
      typeof discordWebhookUrl === "string" &&
      discordWebhookUrl.length > 0 &&
      !isValidUrl(discordWebhookUrl)
    ) {
      next(
        new CustomError(
          "Validation failed: 'discordWebhookUrl' must be a valid URL",
          400,
        ),
      );
      return;
    }

    const channel = await dbGatewayService.updateChannel(user.userId, {
      discordWebhookUrl: discordWebhookUrl ?? null,
    });

    res.status(200).json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        discordWebhookUrl: channel.discordWebhookUrl ?? null,
      },
    });
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
      return;
    }
    next(error);
  }
};
