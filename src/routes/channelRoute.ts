import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { PASSPORT_TWITCH_STRATEGY } from "../config/passport";
import {
  updateChannelDiscordWebhook,
  registerDiscordWebhook,
  getModeratedChannels,
} from "../controllers/channelController";
import { bffAuthMiddleware } from "../middlewares/bffAuthMiddleware";
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

router.put(
  "/me/discord-webhook",
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      logger.debug("Register discord webhook route hit", {
        method: req.method,
        path: req.path,
      });
      next();
    } catch (error) {
      next(error);
    }
  },
  bffAuthMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    registerDiscordWebhook(req, res, next).catch(next);
  },
);

router.get(
  "/me/moderated",
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      logger.debug("Get moderated channels route hit", {
        method: req.method,
        path: req.path,
      });
      next();
    } catch (error) {
      next(error);
    }
  },
  bffAuthMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    getModeratedChannels(req, res, next).catch(next);
  },
);

export default router;
