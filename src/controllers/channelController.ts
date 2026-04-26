import { Request, Response, NextFunction } from "express";
import type { TwitchPassportUser } from "../strategies/twitchTokenStrategy";
import { dbGatewayService } from "../services/dbGatewayService";
import { CustomError } from "../middlewares/errorHandler";

type AuthenticatedRequest = Request & { user?: TwitchPassportUser };

type ExtensionAuthenticatedRequest = Request & {
  user?: {
    opaqueUserId: string;
    userId: string;
    channelId: string;
    role: string;
  };
};

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateDiscordWebhookUrl(
  value: unknown,
  next: NextFunction,
): value is string | null {
  if (value === undefined) {
    next(
      new CustomError(
        "Validation failed: Field 'discordWebhookUrl' is required",
        400,
      ),
    );
    return false;
  }
  if (value !== null && typeof value !== "string") {
    next(
      new CustomError(
        "Validation failed: 'discordWebhookUrl' must be a string or null",
        400,
      ),
    );
    return false;
  }
  if (typeof value === "string" && value.length > 0 && !isValidUrl(value)) {
    next(
      new CustomError(
        "Validation failed: 'discordWebhookUrl' must be a valid URL",
        400,
      ),
    );
    return false;
  }
  return true;
}

export const registerDiscordWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { channelId, discordWebhookUrl } = req.body ?? {};

    if (!channelId || typeof channelId !== "string") {
      next(
        new CustomError(
          "Validation failed: Field 'channelId' is required",
          400,
        ),
      );
      return;
    }

    if (!validateDiscordWebhookUrl(discordWebhookUrl, next)) return;

    const channel = await dbGatewayService.updateChannel(channelId, {
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

export const getModeratedChannels = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as ExtensionAuthenticatedRequest;

    if (!user?.userId) {
      next(new CustomError("Authentication required", 401));
      return;
    }

    const ares = await dbGatewayService.getAreByUser(user.userId, "moderator");

    res.status(200).json({
      moderatedChannels: ares.map((are) => are.channelId),
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
    if (!validateDiscordWebhookUrl(discordWebhookUrl, next)) return;

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
    next(error);
  }
};
