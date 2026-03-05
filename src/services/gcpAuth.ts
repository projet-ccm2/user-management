import { GoogleAuth } from "google-auth-library";
import { config } from "../config/environment";
import { logger } from "../utils/logger";

const clientCache = new Map<
  string,
  Awaited<ReturnType<GoogleAuth["getIdTokenClient"]>>
>();

export async function getGcpIdToken(
  targetUrl: string,
): Promise<string | null> {
  if (config.gcp.skipAuth) return null;

  let client = clientCache.get(targetUrl);
  if (!client) {
    const auth = new GoogleAuth();
    client = await auth.getIdTokenClient(targetUrl);
    clientCache.set(targetUrl, client);
    logger.info("GCP identity token client initialized", { targetUrl });
  }

  const headers = await client.getRequestHeaders(targetUrl);
  return (headers as unknown as Record<string, string>)["Authorization"] ?? null;
}
