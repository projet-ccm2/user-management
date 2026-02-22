import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";
import type { TwitchModeratedChannel } from "./types/twitchModeration/ModeratedChannel";
import type { TwitchModerator } from "./types/twitchModeration/Moderator";

const TWITCH_HELIX_BASE = "https://api.twitch.tv/helix";
const TIMEOUT_MS = 10000;

function twitchHeaders(accessToken: string, clientId: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Client-Id": clientId,
    Accept: "application/json",
  };
}

type TwitchPaginatedResponse<T> = {
  data: T[];
  pagination?: { cursor?: string };
};

async function twitchGet<T>(
  url: string,
  accessToken: string,
  clientId: string,
): Promise<TwitchPaginatedResponse<T>> {
  const response = await fetch(url, {
    method: "GET",
    headers: twitchHeaders(accessToken, clientId),
    signal: AbortSignal.timeout(TIMEOUT_MS),
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

  try {
    return JSON.parse(body) as TwitchPaginatedResponse<T>;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown";
    throw new CustomError(`Invalid Twitch API response: ${reason}`, 502);
  }
}

export async function getModeratedChannels(
  accessToken: string,
  clientId: string,
  userId: string,
): Promise<TwitchModeratedChannel[]> {
  if (!accessToken?.trim() || !clientId?.trim()) {
    throw new CustomError("Access token and client ID are required", 400);
  }

  const all: TwitchModeratedChannel[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${TWITCH_HELIX_BASE}/moderation/channels`);
    url.searchParams.set("user_id", userId);
    if (cursor) url.searchParams.set("after", cursor);

    const result = await twitchGet<TwitchModeratedChannel>(
      url.toString(),
      accessToken,
      clientId,
    );

    if (result.data?.length) all.push(...result.data);
    cursor = result.pagination?.cursor;
  } while (cursor);

  logger.info("Fetched moderated channels from Twitch", {
    userId,
    count: all.length,
  });
  return all;
}

export async function getModerators(
  accessToken: string,
  clientId: string,
  broadcasterId: string,
): Promise<TwitchModerator[]> {
  if (!accessToken?.trim() || !clientId?.trim()) {
    throw new CustomError("Access token and client ID are required", 400);
  }

  const all: TwitchModerator[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${TWITCH_HELIX_BASE}/moderation/moderators`);
    url.searchParams.set("broadcaster_id", broadcasterId);
    if (cursor) url.searchParams.set("after", cursor);

    const result = await twitchGet<TwitchModerator>(
      url.toString(),
      accessToken,
      clientId,
    );

    if (result.data?.length) all.push(...result.data);
    cursor = result.pagination?.cursor;
  } while (cursor);

  logger.info("Fetched channel moderators from Twitch", {
    broadcasterId,
    count: all.length,
  });
  return all;
}
