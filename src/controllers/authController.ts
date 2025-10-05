import { Request, Response } from "express";
import type { TwitchPassportUser } from "../strategies/twitchTokenStrategy";
import User, { type UserAuthApproval } from "../models/user";
import { fetchTwitchUser } from "../services/twitchUserService";

type AuthenticatedRequest = Request & { user?: TwitchPassportUser };

export const callbackConnexion = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthenticatedRequest;

  if (!user) {
    res.status(500).json({
      error: "Authenticated user missing from request context",
    });
    return;
  }

  const { tokens } = user;

  if (!tokens?.accessToken || !tokens.idToken) {
    res.status(500).json({
      error: "Missing Twitch tokens to retrieve user information",
    });
    return;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!clientId) {
    res.status(500).json({
      error: "Missing env var TWITCH_CLIENT_ID, cannot contact Twitch API",
    });
    return;
  }

  const authInfo: UserAuthApproval = {
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    tokenType: tokens.tokenType,
    scope: tokens.scope,
    expiresIn: tokens.expiresIn,
    expiresAt: typeof tokens.expiresIn === "number" ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
    state: tokens.state,
    approvedAt: new Date(),
  };

  try {
    const twitchUser = await fetchTwitchUser(tokens.accessToken, clientId);
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

    // send to db gateway

    res.status(200).json({
      ok: true,
      user: userModel.getAllWithoutAuth(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch Twitch user profile";
    res.status(502).json({
      error: message,
    });
  }
};
