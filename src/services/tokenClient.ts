import { GoogleAuth } from "google-auth-library";
import { config } from "../config/environment";
import { logger } from "../utils/logger";

interface TokenResponse {
  token: string;
}

let cachedToken: string | null = null;
let cachedExpiry = 0;
const REFRESH_BUFFER_SECONDS = 60;

/**
 * Calls POST /tokens on user-management to obtain a JWT for VPC access.
 * Used by user-management (auto-call) and by the second BFF.
 * When SKIP_GCP_AUTH=true, calls without GCP identity token (local dev).
 * Caches the token and refreshes when close to expiry.
 *
 * @returns JWT to use in Authorization header for db gateway requests
 */
export async function getVpcToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedExpiry > now + REFRESH_BUFFER_SECONDS) {
    return cachedToken;
  }
  const baseUrl = config.userManagement.url.replace(/\/$/, "");
  const url = `${baseUrl}/tokens`;

  let token: string;

  if (config.gcp.skipAuth) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const text = await response.text();
      logger.error("Token request failed (skip auth)", {
        status: response.status,
        error: text.substring(0, 200),
      });
      throw new Error(`Failed to get VPC token: ${response.status}`);
    }
    const data = (await response.json()) as TokenResponse;
    token = data.token;
  } else {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(config.gcp.serviceUrl);
    const res = await client.request<TokenResponse>({
      url,
      method: "POST",
      responseType: "json",
    });

    if (!res.data?.token) {
      logger.error("Token response missing token field", { status: res.status });
      throw new Error("Invalid token response");
    }
    token = res.data.token;
  }

  cachedToken = token;
  cachedExpiry = now + config.token.jwtExpiresInSeconds - REFRESH_BUFFER_SECONDS;
  return token;
}
