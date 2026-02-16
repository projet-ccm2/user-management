import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";
import { config } from "../config/environment";
import User from "../models/user";
import type { DbGatewayResponse } from "./types/dbGatewayService/DbGatewayResponse";
import type { ChannelResponse } from "./types/dbGatewayService/ChannelResponse";
import type { AreResponse } from "./types/dbGatewayService/AreResponse";

export class DbGatewayService {
  private readonly dbGatewayUrl: string;
  private readonly timeout: number;

  private readonly headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  constructor() {
    this.dbGatewayUrl = config.dbGateway.url;
    this.timeout = 10000;
  }

  async getUserById(id: string): Promise<DbGatewayResponse | null> {
    try {
      const response = await fetch(
        `${this.dbGatewayUrl}/users/${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers: this.headers,
          signal: AbortSignal.timeout(this.timeout),
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Database gateway request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
        });
        throw new CustomError(
          `Database gateway error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      return (await response.json()) as DbGatewayResponse;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error("Failed to get user from database gateway", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: id,
      });
      throw new CustomError("Failed to get user data", 502);
    }
  }

  async saveUser(user: User): Promise<DbGatewayResponse> {
    try {
      logger.info("Sending user data to database gateway", {
        username: user.username,
        channelId: user.channel.id,
      });

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
        headers: this.headers,
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

  async updateUser(id: string, user: User): Promise<DbGatewayResponse> {
    try {
      logger.info("Updating user in database gateway", {
        username: user.username,
        channelId: id,
      });

      const scopeString =
        user.auth.scope && user.auth.scope.length > 0
          ? user.auth.scope.join(" ")
          : null;

      const body = {
        username: user.username,
        profileImageUrl: user.channel.profileImageUrl || null,
        channelDescription: user.channel.description || null,
        scope: scopeString,
      };

      const response = await fetch(
        `${this.dbGatewayUrl}/users/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: this.headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeout),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Database gateway request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
        });
        throw new CustomError(
          `Database gateway error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      const result: DbGatewayResponse = await response.json();

      logger.info("User successfully updated in database", {
        userId: result.id,
        username: user.username,
      });

      return result;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error("Failed to update user in database gateway", {
        error: error instanceof Error ? error.message : "Unknown error",
        username: user.username,
      });
      throw new CustomError("Failed to update user data", 502);
    }
  }

  async getChannelById(id: string): Promise<ChannelResponse | null> {
    try {
      const response = await fetch(
        `${this.dbGatewayUrl}/channels/${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers: this.headers,
          signal: AbortSignal.timeout(this.timeout),
        },
      );

      if (response.status === 404) return null;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Database gateway request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
        });
        throw new CustomError(
          `Database gateway error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      return (await response.json()) as ChannelResponse;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      logger.error("Failed to get channel from database gateway", {
        error: error instanceof Error ? error.message : "Unknown error",
        channelId: id,
      });
      throw new CustomError("Failed to get channel data", 502);
    }
  }

  async createChannel(name: string): Promise<ChannelResponse> {
    try {
      const response = await fetch(`${this.dbGatewayUrl}/channels`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ name }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Database gateway request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
        });
        throw new CustomError(
          `Database gateway error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      return (await response.json()) as ChannelResponse;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      logger.error("Failed to create channel in database gateway", {
        error: error instanceof Error ? error.message : "Unknown error",
        name,
      });
      throw new CustomError("Failed to create channel", 502);
    }
  }

  async getAre(userId: string, channelId: string): Promise<AreResponse | null> {
    try {
      const url = new URL(`${this.dbGatewayUrl}/are`);
      url.searchParams.set("userId", userId);
      url.searchParams.set("channelId", channelId);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.headers,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (response.status === 404) return null;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Database gateway request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
        });
        throw new CustomError(
          `Database gateway error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      return (await response.json()) as AreResponse;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      logger.error("Failed to get ARE from database gateway", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        channelId,
      });
      throw new CustomError("Failed to get ARE data", 502);
    }
  }

  async createAre(
    userId: string,
    channelId: string,
    userType: string,
  ): Promise<AreResponse> {
    try {
      const response = await fetch(`${this.dbGatewayUrl}/are`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ userId, channelId, userType }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Database gateway request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
        });
        throw new CustomError(
          `Database gateway error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      return (await response.json()) as AreResponse;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      logger.error("Failed to create ARE in database gateway", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        channelId,
      });
      throw new CustomError("Failed to create ARE", 502);
    }
  }
}

export const dbGatewayService = new DbGatewayService();
