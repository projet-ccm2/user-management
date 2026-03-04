/* eslint-disable camelcase */
import {
  TwitchAuthInfo,
  validateAndParseTwitchTokens,
  type TwitchIdTokenClaims,
} from "../../../services/twitchAuthService";

describe("TwitchAuthService", () => {
  describe("TwitchAuthInfo", () => {
    it("should create instance with all properties", () => {
      const authInfo = new TwitchAuthInfo({
        accessToken: "test-access-token",
        idToken: "test-id-token",
        tokenType: "Bearer",
        expiresIn: 3600,
        scope: ["user:read:email"],
        state: "test-state",
      });

      expect(authInfo.accessToken).toBe("test-access-token");
      expect(authInfo.idToken).toBe("test-id-token");
      expect(authInfo.tokenType).toBe("Bearer");
      expect(authInfo.expiresIn).toBe(3600);
      expect(authInfo.scope).toEqual(["user:read:email"]);
      expect(authInfo.state).toBe("test-state");
    });

    it("should create instance with required properties only", () => {
      const authInfo = new TwitchAuthInfo({
        accessToken: "test-access-token",
        idToken: "test-id-token",
      });

      expect(authInfo.accessToken).toBe("test-access-token");
      expect(authInfo.idToken).toBe("test-id-token");
      expect(authInfo.tokenType).toBeUndefined();
      expect(authInfo.expiresIn).toBeUndefined();
      expect(authInfo.scope).toBeUndefined();
      expect(authInfo.state).toBeUndefined();
    });
  });

  describe("validateAndParseTwitchTokens", () => {
    const createValidJWT = (
      claims: Partial<TwitchIdTokenClaims> = {},
    ): string => {
      const header = { alg: "RS256", typ: "JWT" };
      const payload = {
        iss: "https://id.twitch.tv/oauth2",
        sub: "12345",
        aud: "test-client-id",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        ...claims,
      };

      const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
        "base64url",
      );
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        "base64url",
      );
      const signature = "test-signature";

      return `${encodedHeader}.${encodedPayload}.${signature}`;
    };

    const createAuthInfo = (idToken: string): TwitchAuthInfo => {
      return new TwitchAuthInfo({
        accessToken: "test-access-token",
        idToken,
      });
    };

    it("should validate tokens successfully", () => {
      const idToken = createValidJWT();
      const authInfo = createAuthInfo(idToken);

      const result = validateAndParseTwitchTokens(authInfo, {
        clientId: "test-client-id",
        issuer: "https://id.twitch.tv/oauth2",
      });

      expect(result.userId).toBe("12345");
      expect(result.claims.sub).toBe("12345");
      expect(result.claims.aud).toBe("test-client-id");
      expect(result.claims.iss).toBe("https://id.twitch.tv/oauth2");
    });

    it("should use default issuer when not provided", () => {
      const idToken = createValidJWT();
      const authInfo = createAuthInfo(idToken);

      const result = validateAndParseTwitchTokens(authInfo, {
        clientId: "test-client-id",
      });

      expect(result.userId).toBe("12345");
      expect(result.claims.iss).toBe("https://id.twitch.tv/oauth2");
    });

    it("should handle custom issuer", () => {
      const idToken = createValidJWT({ iss: "https://custom.issuer.com" });
      const authInfo = createAuthInfo(idToken);

      const result = validateAndParseTwitchTokens(authInfo, {
        clientId: "test-client-id",
        issuer: "https://custom.issuer.com",
      });

      expect(result.userId).toBe("12345");
      expect(result.claims.iss).toBe("https://custom.issuer.com");
    });

    it("should handle array audience", () => {
      const idToken = createValidJWT({
        aud: ["test-client-id", "other-client"],
      });
      const authInfo = createAuthInfo(idToken);

      const result = validateAndParseTwitchTokens(authInfo, {
        clientId: "test-client-id",
      });

      expect(result.userId).toBe("12345");
    });

    it("should throw error for invalid JWT format", () => {
      const authInfo = createAuthInfo("invalid.jwt");

      expect(() => {
        validateAndParseTwitchTokens(authInfo, {
          clientId: "test-client-id",
        });
      }).toThrow("Invalid id_token: cannot decode claims");
    });

    it("should throw error for invalid base64", () => {
      const authInfo = createAuthInfo("header.invalid-payload.signature");

      expect(() => {
        validateAndParseTwitchTokens(authInfo, {
          clientId: "test-client-id",
        });
      }).toThrow("Invalid id_token: cannot decode claims");
    });

    it("should throw error for wrong issuer", () => {
      const idToken = createValidJWT({ iss: "https://wrong.issuer.com" });
      const authInfo = createAuthInfo(idToken);

      expect(() => {
        validateAndParseTwitchTokens(authInfo, {
          clientId: "test-client-id",
          issuer: "https://id.twitch.tv/oauth2",
        });
      }).toThrow(
        "Invalid issuer: expected 'https://id.twitch.tv/oauth2', got 'https://wrong.issuer.com'",
      );
    });

    it("should throw error for wrong audience (string)", () => {
      const idToken = createValidJWT({ aud: "wrong-client-id" });
      const authInfo = createAuthInfo(idToken);

      expect(() => {
        validateAndParseTwitchTokens(authInfo, {
          clientId: "test-client-id",
        });
      }).toThrow("Invalid audience (aud) in id_token");
    });

    it("should throw error for wrong audience (array)", () => {
      const idToken = createValidJWT({
        aud: ["wrong-client-id", "other-client"],
      });
      const authInfo = createAuthInfo(idToken);

      expect(() => {
        validateAndParseTwitchTokens(authInfo, {
          clientId: "test-client-id",
        });
      }).toThrow("Client ID not in id_token audience");
    });

    it("should throw error for missing audience", () => {
      const idToken = createValidJWT({ aud: undefined });
      const authInfo = createAuthInfo(idToken);

      expect(() => {
        validateAndParseTwitchTokens(authInfo, {
          clientId: "test-client-id",
        });
      }).toThrow("Missing audience (aud) in id_token");
    });

    it("should throw error for expired token", () => {
      const idToken = createValidJWT({
        exp: Math.floor(Date.now() / 1000) - 3600,
      });
      const authInfo = createAuthInfo(idToken);

      expect(() => {
        validateAndParseTwitchTokens(authInfo, {
          clientId: "test-client-id",
        });
      }).toThrow("id_token is expired");
    });

    it("should handle missing exp claim", () => {
      const idToken = createValidJWT({ exp: undefined });
      const authInfo = createAuthInfo(idToken);

      const result = validateAndParseTwitchTokens(authInfo, {
        clientId: "test-client-id",
      });

      expect(result.userId).toBe("12345");
    });

    it("should handle missing sub claim", () => {
      const idToken = createValidJWT({ sub: undefined });
      const authInfo = createAuthInfo(idToken);

      const result = validateAndParseTwitchTokens(authInfo, {
        clientId: "test-client-id",
      });

      expect(result.userId).toBeUndefined();
    });

    it("should handle non-string sub claim", () => {
      const idToken = createValidJWT({ sub: 12345 as any });
      const authInfo = createAuthInfo(idToken);

      const result = validateAndParseTwitchTokens(authInfo, {
        clientId: "test-client-id",
      });

      expect(result.userId).toBeUndefined();
    });

    it("should handle missing issuer claim", () => {
      const idToken = createValidJWT({ iss: undefined });
      const authInfo = createAuthInfo(idToken);

      const result = validateAndParseTwitchTokens(authInfo, {
        clientId: "test-client-id",
        issuer: "https://id.twitch.tv/oauth2",
      });

      expect(result.userId).toBe("12345");
    });

    it("should handle additional claims", () => {
      const idToken = createValidJWT({
        email: "test@example.com",
        email_verified: true,
        preferred_username: "testuser",
        picture: "https://example.com/avatar.jpg",
        custom_claim: "custom_value",
      });
      const authInfo = createAuthInfo(idToken);

      const result = validateAndParseTwitchTokens(authInfo, {
        clientId: "test-client-id",
      });

      expect(result.claims.email).toBe("test@example.com");
      expect(result.claims.email_verified).toBe(true);
      expect(result.claims.preferred_username).toBe("testuser");
      expect(result.claims.picture).toBe("https://example.com/avatar.jpg");
      expect(result.claims.custom_claim).toBe("custom_value");
    });
  });
});
