import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";
import { config } from "../config/environment";
import { getVpcToken } from "./tokenClient";
import { getGcpIdToken } from "./gcpAuth";

interface ApkUrlResponse {
  url: string;
}

export class BucketManagerService {
  private readonly bucketManagerUrl: string;
  private readonly timeout: number;

  private readonly baseHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  private async getHeaders(): Promise<Record<string, string>> {
    const appJwt = await getVpcToken();
    const gcpIdToken = await getGcpIdToken(this.bucketManagerUrl);

    if (gcpIdToken) {
      return {
        ...this.baseHeaders,
        Authorization: gcpIdToken,
        "X-VPC-Token": appJwt,
      };
    }

    return {
      ...this.baseHeaders,
      Authorization: `Bearer ${appJwt}`,
    };
  }

  constructor() {
    this.bucketManagerUrl = config.bucketManager.url;
    this.timeout = 10000;
  }

  async getApkUrl(): Promise<ApkUrlResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.bucketManagerUrl}/bucket/apk`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Bucket manager APK request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
        });
        throw new CustomError(
          `Bucket manager error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      return (await response.json()) as ApkUrlResponse;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      logger.error("Failed to get APK URL from bucket manager", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new CustomError("Failed to retrieve APK download URL", 502);
    }
  }
}

export const bucketManagerService = new BucketManagerService();
