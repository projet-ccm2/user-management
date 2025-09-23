import { Request, Response } from "express";
import {
  TwitchAuthInfo,
  validateAndParseTwitchTokens,
} from "../services/twitchAuthService";

export const callbackConnexion = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) {
      res.status(500).json({
        error:
          "Missing env var TWITCH_CLIENT_ID. Configure it to validate id_token audience.",
      });
      return;
    }

    const { accessToken, idToken, tokenType, expiresIn, scope, state } = req.body ?? {};

    if (!accessToken || !idToken) {
      res.status(400).json({
        error: "Missing required fields: 'accessToken' and 'idToken' are mandatory",
      });
      return;
    }

    const payload: TwitchAuthInfo = {
      accessToken: String(accessToken),
      idToken: String(idToken),
      tokenType: tokenType ? String(tokenType) : undefined,
      expiresIn: typeof expiresIn === "number" ? expiresIn : undefined,
      scope: Array.isArray(scope) ? scope.map(String) : undefined,
      state: state ? String(state) : undefined,
    };

    const result = validateAndParseTwitchTokens(payload, {
      clientId,
      issuer: process.env.TWITCH_ISSUER || "https://id.twitch.tv/oauth2",
    });

    res.status(200).json({
      ok: true,
      userId: result.userId,
      claims: result.claims,
    });
    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error);
      res
        .status(400)
        .json({ error: "Error during registration :" + error.message });
      return;
    } else {
      console.error("Unknown error", error);
    }
  }
};
