export type TwitchIdTokenClaims = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  email?: string;
  email_verified?: boolean;
  preferred_username?: string;
  picture?: string;
  [key: string]: unknown;
};

export class TwitchAuthInfo {
  accessToken: string;
  idToken: string;
  tokenType?: string;
  expiresIn?: number;
  scope?: string[];
  state?: string;

  constructor(params: {
    accessToken: string;
    idToken: string;
    tokenType?: string;
    expiresIn?: number;
    scope?: string[];
    state?: string;
  }) {
    this.accessToken = params.accessToken;
    this.idToken = params.idToken;
    this.tokenType = params.tokenType;
    this.expiresIn = params.expiresIn;
    this.scope = params.scope;
    this.state = params.state;
  }
}

type ValidationConfig = {
  clientId: string;
  issuer?: string;
};

export function validateAndParseTwitchTokens(
  info: TwitchAuthInfo,
  cfg: ValidationConfig,
): { userId: string | undefined; claims: TwitchIdTokenClaims } {
  const issuer = cfg.issuer || "https://id.twitch.tv/oauth2";

  // Decode the JWT (without signature verification due to no external deps)
  const claims = decodeJwtClaims(info.idToken);

  // Basic claim checks
  if (!claims) {
    throw new Error("Invalid id_token: cannot decode claims");
  }

  if (claims.iss && claims.iss !== issuer) {
    throw new Error(`Invalid issuer: expected '${issuer}', got '${claims.iss}'`);
  }

  // Validate 'aud' includes our client id
  if (typeof claims.aud === "string") {
    if (claims.aud !== cfg.clientId) {
      throw new Error("Invalid audience (aud) in id_token");
    }
  } else if (Array.isArray(claims.aud)) {
    if (!claims.aud.includes(cfg.clientId)) {
      throw new Error("Client ID not in id_token audience");
    }
  } else {
    throw new Error("Missing audience (aud) in id_token");
  }

  // Expiration check if present
  if (typeof claims.exp === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      throw new Error("id_token is expired");
    }
  }

  // At this stage, signature is NOT verified (no external jwt lib). For production,
  // verify against Twitch JWKS at TWITCH_JWKS_URL.

  return {
    userId: typeof claims.sub === "string" ? claims.sub : undefined,
    claims,
  };
}

function decodeJwtClaims(token: string): TwitchIdTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = parts[1];
  try {
    const json = base64UrlDecode(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): string {
  // Replace URL-safe chars
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  // Pad with '=' to multiple of 4
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  else if (pad !== 0) throw new Error("Invalid base64url string");
  // Decode
  const buff = Buffer.from(base64, "base64");
  return buff.toString("utf8");
}

