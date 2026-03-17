import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { PASSPORT_TWITCH_STRATEGY } from "../config/passport";
import { updateChannelDiscordWebhook } from "../controllers/channelController";
import { logger } from "../utils/logger";

const router = Router();

router.put(
  "/me",
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      logger.debug("Update channel route hit", {
        method: req.method,
        path: req.path,
      });
      next();
    } catch (error) {
      next(error);
    }
  },
  passport.authenticate(PASSPORT_TWITCH_STRATEGY, { session: false }),
  (req: Request, res: Response, next: NextFunction) => {
    updateChannelDiscordWebhook(req, res, next).catch(next);
  },
);

export default router;
