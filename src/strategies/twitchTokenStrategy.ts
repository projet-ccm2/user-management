import type { Request } from "express";
import passport from "passport";
import {
  TwitchAuthInfo,
  validateAndParseTwitchTokens,
  type TwitchIdTokenClaims,
} from "../services/twitchAuthService";
import { logger } from "../utils/logger";

export type TwitchPassportUser = {
  userId?: string;
  claims: TwitchIdTokenClaims;
  tokens: TwitchAuthInfo;
};

export type TwitchTokenStrategyOptions = {
  clientId?: string;
  issuer?: string;
};

export class TwitchTokenStrategy extends passport.Strategy {
  name = "twitch-token";

  private readonly clientId?: string;
  private readonly issuer?: string;

  constructor(options: TwitchTokenStrategyOptions) {
    super();
    this.clientId = options.clientId;
    this.issuer = options.issuer;
  }

  authenticate(req: Request): void {
    const { accessToken, idToken, tokenType, expiresIn, scope, state } =
      req.body ?? {};

    if (!this.clientId) {
      logger.error("TwitchTokenStrategy: missing TWITCH_CLIENT_ID", {
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
      });
      this.error(
        new Error(
          "Missing env var TWITCH_CLIENT_ID. Configure it to validate id_token audience.",
        ),
      );
      return;
    }

    if (!accessToken || !idToken) {
      logger.warn("TwitchTokenStrategy: missing required tokens", {
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
      });
      this.fail(
        {
          message:
            "Missing required fields: 'accessToken' and 'idToken' are mandatory",
        },
        400,
      );
      return;
    }

    const payload = new TwitchAuthInfo({
      accessToken: String(accessToken),
      idToken: String(idToken),
      tokenType: tokenType ? String(tokenType) : undefined,
      expiresIn: typeof expiresIn === "number" ? expiresIn : undefined,
      scope: Array.isArray(scope) ? scope.map(String) : undefined,
      state: state ? String(state) : undefined,
    });

    try {
      const result = validateAndParseTwitchTokens(payload, {
        clientId: this.clientId,
        issuer: this.issuer,
      });

      const user: TwitchPassportUser = {
        userId: result.userId,
        claims: result.claims,
        tokens: payload,
      };

      logger.debug("TwitchTokenStrategy: token validation successful", {
        userId: result.userId,
        preferredUsername: result.claims.preferred_username,
      });
      this.success(user);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during Twitch token validation";
      logger.warn("TwitchTokenStrategy: token validation failed", {
        error: message,
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
      });
      this.fail({ message }, 400);
    }
  }
}
