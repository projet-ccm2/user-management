import { logger } from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";
import { config } from "../config/environment";
import User, { UserChannelInfo } from "../models/user";
import type { DbGatewayResponse } from "./types/dbGatewayService/DbGatewayResponse";
import type { DbGatewayUserData } from "./types/dbGatewayService/DbGatewayUserData";
import type { UserChannelsResponse } from "./types/dbGatewayService/UserChannelsResponse";
import type { ChannelUsersResponse } from "./types/dbGatewayService/ChannelUsersResponse";

export class DbGatewayService {
  private readonly dbGatewayUrl: string;
  private readonly timeout: number;

  constructor() {
    this.dbGatewayUrl = config.dbGateway.url;
    this.timeout = 10000;
  }

  private async fetchUserChannel(userId: string): Promise<UserChannelInfo> {
    const response = await fetch(`${this.dbGatewayUrl}/users/${userId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn("User channel not found in database gateway", { userId });
        throw new CustomError("User channel not found", 404);
      }

      const errorText = await response.text();
      logger.error("Database gateway request failed", {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 500),
        userId,
      });
      throw new CustomError(
        `Database gateway error: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const userData: DbGatewayUserData = await response.json();

    return {
      id: userData.id,
      username: userData.username,
      channelDescription: userData.channelDescription,
      profileImageUrl: userData.profileImageUrl,
    };
  }

  private async fetchUserChannelsWhichIsMod(
    userId: string,
  ): Promise<UserChannelInfo[]> {
    const channelsResponse = await fetch(
      `${this.dbGatewayUrl}/users/${userId}/channel`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(this.timeout),
      },
    );

    if (!channelsResponse.ok) {
      if (channelsResponse.status === 404) {
        logger.warn("User channels not found in database gateway", { userId });
        return [];
      }

      const errorText = await channelsResponse.text();
      logger.error("Database gateway request failed for user channels", {
        status: channelsResponse.status,
        statusText: channelsResponse.statusText,
        error: errorText.substring(0, 500),
        userId,
      });
      throw new CustomError(
        `Database gateway error: ${channelsResponse.status} ${channelsResponse.statusText}`,
        channelsResponse.status,
      );
    }

    const channelsData: UserChannelsResponse = await channelsResponse.json();

    const moderatorChannels = channelsData.channels.filter(
      (channel) => channel.userType === "moderator",
    );

    if (moderatorChannels.length === 0) {
      logger.info("No moderator channels found for user", { userId });
      return [];
    }

    const channelsWhichIsMod: UserChannelInfo[] = [];

    for (const channel of moderatorChannels) {
      try {
        const usersResponse = await fetch(
          `${this.dbGatewayUrl}/channels/${channel.id}/users`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(this.timeout),
          },
        );

        if (!usersResponse.ok) {
          logger.warn("Failed to fetch users for channel", {
            channelId: channel.id,
            status: usersResponse.status,
          });
          continue;
        }

        const usersData: ChannelUsersResponse = await usersResponse.json();

        if (usersData.users && usersData.users.length > 0) {
          const firstUser = usersData.users[0];
          channelsWhichIsMod.push({
            id: firstUser.id,
            username: firstUser.username,
            channelDescription: firstUser.channelDescription,
            profileImageUrl: firstUser.profileImageUrl,
          });
        }
      } catch (error) {
        logger.error("Error fetching users for channel", {
          channelId: channel.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return channelsWhichIsMod;
  }

  async saveUser(user: User): Promise<DbGatewayResponse> {
    try {
      logger.info("Sending user data to database gateway", {
        username: user.username,
        channelId: user.channel.id,
      });

      const userData = {
        username: user.username,
        channel: user.channel,
        channelsWhichIsMod: user.channelsWhichIsMod,
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
        });
        throw new CustomError(
          `Database gateway error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      const result = await response.json();

      logger.info("User successfully saved to database", {
        userId: result.userId,
        username: user.username,
      });

      return result;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }

      logger.error("Failed to save user to database gateway", {
        error: error instanceof Error ? error.message : "Unknown error",
        username: user.username,
      });

      throw new CustomError("Failed to save user data", 502);
    }
  }

  async getAllDataUserById(userId: string): Promise<User> {
    try {
      logger.info("Fetching user data from database gateway", {
        userId,
      });

      const channel = await this.fetchUserChannel(userId);
      const channelsWhichIsMod = await this.fetchUserChannelsWhichIsMod(userId);

      logger.info("User successfully fetched from database", {
        userId: channel.id,
        username: channel.username,
        channelsWhichIsModCount: channelsWhichIsMod.length,
      });

      return new User({
        username: channel.username,
        channel: channel,
        channelsWhichIsMod: channelsWhichIsMod,
      });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }

      logger.error("Failed to fetch user from database gateway", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });

      throw new CustomError("Failed to fetch user data", 502);
    }
  }
}

export const dbGatewayService = new DbGatewayService();
