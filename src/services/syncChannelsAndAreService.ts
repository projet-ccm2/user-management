import { logger } from "../utils/logger";
import User from "../models/user";
import { dbGatewayService } from "./dbGatewayService";
import { getModeratedChannels, getModerators } from "./twitchModerationService";

async function syncModeratedChannelAre(
  dbUserId: string,
  modChannel: Awaited<ReturnType<typeof getModeratedChannels>>[number],
): Promise<void> {
  const channelInDb = await dbGatewayService.getChannelById(
    modChannel.broadcaster_id,
  );
  if (!channelInDb) return;

  const existing = await dbGatewayService.getAre(dbUserId, channelInDb.id);
  if (!existing) {
    await dbGatewayService.createAre(dbUserId, channelInDb.id, "moderator");
    logger.info("Created moderator ARE link (channel which I moderate)", {
      userId: dbUserId,
      channelId: channelInDb.id,
    });
  }
}

async function syncModeratorAre(
  mod: Awaited<ReturnType<typeof getModerators>>[number],
  ownChannelId: string,
): Promise<void> {
  const modDbUser = await dbGatewayService.getUserById(mod.user_id);
  if (!modDbUser) return;

  const existing = await dbGatewayService.getAre(modDbUser.id, ownChannelId);
  if (!existing) {
    await dbGatewayService.createAre(modDbUser.id, ownChannelId, "moderator");
    logger.info("Created moderator ARE link (mod of my channel)", {
      userId: modDbUser.id,
      channelId: ownChannelId,
    });
  }
}

export async function syncChannelsAndAreAfterAuth(
  dbUserId: string,
  userModel: User,
  accessToken: string,
  clientId: string,
): Promise<void> {
  let ownChannelId: string;
  try {
    const existingChannel = await dbGatewayService.getChannelById(
      userModel.channel.id,
    );
    const ownChannel =
      existingChannel ??
      (await dbGatewayService.createChannel(
        userModel.channel.id,
        userModel.username,
      ));
    ownChannelId = ownChannel.id;
  } catch (err) {
    logger.warn("Could not ensure owner channel", {
      username: userModel.username,
      error: err instanceof Error ? err.message : "Unknown error",
    });
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

  for (const modChannel of moderatedChannels) {
    await syncModeratedChannelAre(dbUserId, modChannel);
  }

  let myModerators: Awaited<ReturnType<typeof getModerators>> = [];
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
    await syncModeratorAre(mod, ownChannelId);
  }
}
