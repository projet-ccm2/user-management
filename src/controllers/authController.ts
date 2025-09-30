import { Request, Response } from "express";
import type { TwitchPassportUser } from "../strategies/twitchTokenStrategy";

type AuthenticatedRequest = Request & { user?: TwitchPassportUser };

export const callbackConnexion = (req: Request, res: Response): void => {
  const { user } = req as AuthenticatedRequest;

  if (!user) {
    res.status(500).json({
      error: "Authenticated user missing from request context",
    });
    return;
  }
  
  res.status(200).json({
    ok: true,
    userId: user.userId,
    claims: user.claims,
  });
};
