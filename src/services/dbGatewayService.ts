import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";
import { config } from "../config/environment";
import User from "../models/user";
import { getVpcToken } from "./tokenClient";
import type { DbGatewayResponse } from "./types/dbGatewayService/DbGatewayResponse";
import type { ChannelResponse } from "./types/dbGatewayService/ChannelResponse";
import type { AreResponse } from "./types/dbGatewayService/AreResponse";

export class DbGatewayService {
  private readonly dbGatewayUrl: string;
  private readonly timeout: number;

  private readonly baseHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  private async getHeaders(): Promise<Record<string, string>> {
    const jwt = await getVpcToken();
    return {
      ...this.baseHeaders,
      Authorization: `Bearer ${jwt}`,
    };
  }

  constructor() {
    this.dbGatewayUrl = config.dbGateway.url;
    this.timeout = 10000;
  }

  private async throwIfNotOk(response: Response): Promise<void> {
    if (response.ok) return;
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

  private handleFetchError(
    error: unknown,
    logMessage: string,
    logContext: Record<string, unknown>,
    errorMessage: string,
  ): never {
    if (error instanceof CustomError) throw error;
    logger.error(logMessage, {
      ...logContext,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new CustomError(errorMessage, 502);
  }

  private getScopeString(user: User): string | null {
    return user.auth.scope && user.auth.scope.length > 0
      ? user.auth.scope.join(" ")
      : null;
  }

  async getUserById(id: string): Promise<DbGatewayResponse | null> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${this.dbGatewayUrl}/users/${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(this.timeout),
        },
      );

      if (response.status === 404) return null;

      await this.throwIfNotOk(response);
      return (await response.json()) as DbGatewayResponse;
    } catch (error) {
      this.handleFetchError(
        error,
        "Failed to get user from database gateway",
        { userId: id },
        "Failed to get user data",
      );
    }
  }

  async saveUser(user: User): Promise<DbGatewayResponse> {
    try {
      logger.info("Sending user data to database gateway", {
        username: user.username,
        channelId: user.channel.id,
      });

      const userData = {
        id: user.channel.id,
        username: user.username,
        profileImageUrl: user.channel.profileImageUrl || null,
        channelDescription: user.channel.description || null,
        scope: this.getScopeString(user),
        lastUpdateTimestamp: new Date().toISOString(),
      };

      const headers = await this.getHeaders();
      const response = await fetch(`${this.dbGatewayUrl}/users`, {
        method: "POST",
        headers,
        body: JSON.stringify(userData),
        signal: AbortSignal.timeout(this.timeout),
      });

      await this.throwIfNotOk(response);
      const result: DbGatewayResponse = await response.json();

      logger.info("User successfully saved to database", {
        userId: result.id,
        username: user.username,
      });

      return result;
    } catch (error) {
      this.handleFetchError(
        error,
        "Failed to save user to database gateway",
        { username: user.username },
        "Failed to save user data",
      );
    }
  }

  async updateUser(id: string, user: User): Promise<DbGatewayResponse> {
    try {
      logger.info("Updating user in database gateway", {
        username: user.username,
        channelId: id,
      });

      const body = {
        username: user.username,
        profileImageUrl: user.channel.profileImageUrl || null,
        channelDescription: user.channel.description || null,
        scope: this.getScopeString(user),
        lastUpdateTimestamp: new Date().toISOString(),
      };

      const headers = await this.getHeaders();
      const response = await fetch(
        `${this.dbGatewayUrl}/users/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeout),
        },
      );

      await this.throwIfNotOk(response);
      const result: DbGatewayResponse = await response.json();

      logger.info("User successfully updated in database", {
        userId: result.id,
        username: user.username,
      });

      return result;
    } catch (error) {
      this.handleFetchError(
        error,
        "Failed to update user in database gateway",
        { username: user.username },
        "Failed to update user data",
      );
    }
  }

  async getChannelById(id: string): Promise<ChannelResponse | null> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${this.dbGatewayUrl}/channels/${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(this.timeout),
        },
      );

      if (response.status === 404) return null;

      await this.throwIfNotOk(response);
      return (await response.json()) as ChannelResponse;
    } catch (error) {
      this.handleFetchError(
        error,
        "Failed to get channel from database gateway",
        { channelId: id },
        "Failed to get channel data",
      );
    }
  }

  async createChannel(id: string, name: string): Promise<ChannelResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.dbGatewayUrl}/channels`, {
        method: "POST",
        headers,
        body: JSON.stringify({ id, name }),
        signal: AbortSignal.timeout(this.timeout),
      });

      await this.throwIfNotOk(response);
      return (await response.json()) as ChannelResponse;
    } catch (error) {
      this.handleFetchError(
        error,
        "Failed to create channel in database gateway",
        { id, name },
        "Failed to create channel",
      );
    }
  }

  async getAre(userId: string, channelId: string): Promise<AreResponse | null> {
    try {
      const url = new URL(`${this.dbGatewayUrl}/are`);
      url.searchParams.set("userId", userId);
      url.searchParams.set("channelId", channelId);

      const headers = await this.getHeaders();
      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (response.status === 404) return null;

      await this.throwIfNotOk(response);
      return (await response.json()) as AreResponse;
    } catch (error) {
      this.handleFetchError(
        error,
        "Failed to get ARE from database gateway",
        { userId, channelId },
        "Failed to get ARE data",
      );
    }
  }

  async createAre(
    userId: string,
    channelId: string,
    userType: string,
  ): Promise<AreResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.dbGatewayUrl}/are`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId, channelId, userType }),
        signal: AbortSignal.timeout(this.timeout),
      });

      await this.throwIfNotOk(response);
      return (await response.json()) as AreResponse;
    } catch (error) {
      this.handleFetchError(
        error,
        "Failed to create ARE in database gateway",
        { userId, channelId },
        "Failed to create ARE",
      );
    }
  }

  async checkHealth(): Promise<
    | { status: "healthy"; data: Record<string, unknown> }
    | { status: "unhealthy"; error: string }
  > {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.dbGatewayUrl}/health`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn("Database gateway health check failed", {
          status: response.status,
          error: errorText.substring(0, 200),
        });
        return {
          status: "unhealthy",
          error: `Database gateway returned ${response.status}: ${errorText.substring(0, 100)}`,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;
      return { status: "healthy", data };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.warn("Database gateway health check failed", { error: message });
      return { status: "unhealthy", error: message };
    }
  }
}

export const dbGatewayService = new DbGatewayService();
