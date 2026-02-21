import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";
import { config } from "../config/environment";
import User from "../models/user";
import type { DbGatewayResponse } from "./types/dbGatewayService/DbGatewayResponse";

export class DbGatewayService {
  private readonly dbGatewayUrl: string;
  private readonly timeout: number;

  constructor() {
    this.dbGatewayUrl = config.dbGateway.url;
    this.timeout = 10000;
  }

  async saveUser(user: User): Promise<DbGatewayResponse> {
    try {
      logger.info("Sending user data to database gateway", {
        username: user.username,
        channelId: user.channel.id,
      });

      // Convert scope array to string (OAuth scopes are space-separated)
      const scopeString =
        user.auth.scope && user.auth.scope.length > 0
          ? user.auth.scope.join(" ")
          : null;

      const userData = {
        id: user.channel.id,
        username: user.username,
        profileImageUrl: user.channel.profileImageUrl || null,
        channelDescription: user.channel.description || null,
        scope: scopeString,
      };

      const response = await fetch(`${this.dbGatewayUrl}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(userData),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Database gateway request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
          url: `${this.dbGatewayUrl}/users`,
          username: user.username,
        });
        throw new CustomError(
          `Database gateway error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      const result: DbGatewayResponse = await response.json();

      logger.info("User successfully saved to database", {
        userId: result.id,
        username: user.username,
      });

      return result;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }

      logger.error("Failed to save user to database gateway", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        username: user.username,
        channelId: user.channel.id,
      });

      throw new CustomError("Failed to save user data", 502);
    }
  }
}

export const dbGatewayService = new DbGatewayService();
