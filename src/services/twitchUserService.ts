import https from "node:https";

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

function isFetchAvailable(): boolean {
  return typeof fetch === "function";
}

async function requestWithFetch(url: string, headers: Record<string, string>): Promise<string> {
  const response = await fetch(url, { headers });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`[Twitch] HTTP ${response.status}: ${body}`);
  }

  return body;
}

function requestWithHttps(url: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", headers }, (res) => {
      const chunks: Buffer[] = [];

      res.on("data", (chunk: string | Buffer) => {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        const statusCode = res.statusCode ?? 500;

        if (statusCode >= 200 && statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`[Twitch] HTTP ${statusCode}: ${body}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function requestTwitchUsers(url: string, headers: Record<string, string>): Promise<TwitchUsersResponse> {
  const raw = isFetchAvailable()
    ? await requestWithFetch(url, headers)
    : await requestWithHttps(url, headers);

  try {
    return JSON.parse(raw) as TwitchUsersResponse;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    throw new Error(`Unable to parse Twitch response: ${reason}`);
  }
}

export async function fetchTwitchUser(accessToken: string, clientId: string): Promise<TwitchUser> {
  if (!accessToken) {
    throw new Error("Missing access token to fetch Twitch user");
  }

  if (!clientId) {
    throw new Error("Missing client ID to fetch Twitch user");
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Client-Id": clientId,
    Accept: "application/json",
  };

  const payload = await requestTwitchUsers(TWITCH_USERS_ENDPOINT, headers);

  if (!payload.data || payload.data.length === 0) {
    throw new Error("No Twitch user data returned");
  }

  return payload.data[0];
}
