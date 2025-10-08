import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";

const TWITCH_USERS_ENDPOINT = "https://api.twitch.tv/helix/users";

export type TwitchUser = {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  email?: string;
  created_at: string;
};

type TwitchUsersResponse = {
  data?: TwitchUser[];
};

async function requestWithFetch(
  url: string,
  headers: Record<string, string>,
): Promise<string> {
  try {
    logger.debug("Making request to Twitch API", {
      url,
      headers: { ...headers, Authorization: "[REDACTED]" },
    });

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    const body = await response.text();

    if (!response.ok) {
      logger.error("Twitch API request failed", {
        status: response.status,
        statusText: response.statusText,
        body: body.substring(0, 500),
      });
      throw new CustomError(
        `Twitch API error: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    return body;
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }

    logger.error("Network error when calling Twitch API", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new CustomError("Failed to connect to Twitch API", 502);
  }
}

async function requestTwitchUsers(
  url: string,
  headers: Record<string, string>,
): Promise<TwitchUsersResponse> {
  const raw = await requestWithFetch(url, headers);

  try {
    const parsed = JSON.parse(raw) as TwitchUsersResponse;
    logger.debug("Successfully parsed Twitch API response");
    return parsed;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    logger.error("Failed to parse Twitch API response", {
      error: reason,
      response: raw.substring(0, 200),
    });
    throw new CustomError(`Invalid response from Twitch API: ${reason}`, 502);
  }
}

export async function fetchTwitchUser(
  accessToken: string,
  clientId: string,
): Promise<TwitchUser> {
  if (!accessToken?.trim()) {
    throw new CustomError("Access token is required", 400);
  }

  if (!clientId?.trim()) {
    throw new CustomError("Client ID is required", 400);
  }

  logger.info("Fetching Twitch user data");

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Client-Id": clientId,
    Accept: "application/json",
  };

  try {
    const payload = await requestTwitchUsers(TWITCH_USERS_ENDPOINT, headers);

    if (!payload.data || payload.data.length === 0) {
      logger.warn("No user data returned from Twitch API");
      throw new CustomError("No user data found in Twitch response", 404);
    }

    const user = payload.data[0];
    logger.info("Successfully fetched Twitch user", {
      userId: user.id,
      username: user.login,
    });

    return user;
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }

    logger.error("Unexpected error while fetching Twitch user", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new CustomError("Failed to fetch user data from Twitch", 502);
  }
}
