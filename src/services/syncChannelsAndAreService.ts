import { logger } from "../utils/logger";
import User from "../models/user";
import { dbGatewayService } from "./dbGatewayService";
import { getModeratedChannels, getModerators } from "./twitchModerationService";

export async function syncChannelsAndAreAfterAuth(
  dbUserId: string,
  userModel: User,
  accessToken: string,
  clientId: string,
): Promise<void> {
  let ownChannelId: string;
  try {
    const ownChannel = await dbGatewayService.createChannel(userModel.username);
    ownChannelId = ownChannel.id;
  } catch (err) {
    logger.warn(
      "Could not ensure owner channel (create may have failed for duplicate name)",
      {
        username: userModel.username,
        error: err instanceof Error ? err.message : "Unknown error",
      },
    );
    return;
  }

  const existingOwnerAre = await dbGatewayService.getAre(
    dbUserId,
    ownChannelId,
  );
  if (!existingOwnerAre) {
    await dbGatewayService.createAre(dbUserId, ownChannelId, "owner");
    logger.info("Created owner ARE link", {
      userId: dbUserId,
      channelId: ownChannelId,
    });
  }

  let moderatedChannels: Awaited<ReturnType<typeof getModeratedChannels>> = [];
  let myModerators: Awaited<ReturnType<typeof getModerators>> = [];

  try {
    moderatedChannels = await getModeratedChannels(
      accessToken,
      clientId,
      userModel.channel.id,
    );
  } catch (err) {
    logger.warn(
      "Could not fetch moderated channels from Twitch (scope or token)",
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
    );
  }

  try {
    myModerators = await getModerators(
      accessToken,
      clientId,
      userModel.channel.id,
    );
  } catch (err) {
    logger.warn(
      "Could not fetch channel moderators from Twitch (scope or token)",
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
    );
  }

  for (const mod of myModerators) {
    const modDbUser = await dbGatewayService.getUserById(mod.user_id);
    if (!modDbUser) continue;

    const existing = await dbGatewayService.getAre(modDbUser.id, ownChannelId);
    if (!existing) {
      await dbGatewayService.createAre(modDbUser.id, ownChannelId, "moderator");
      logger.info("Created moderator ARE link (mod of my channel)", {
        userId: modDbUser.id,
        channelId: ownChannelId,
      });
    }
  }
}
