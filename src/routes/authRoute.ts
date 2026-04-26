import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { PASSPORT_TWITCH_STRATEGY } from "../config/passport";
import {
  callbackConnexion,
  deleteAccount,
} from "../controllers/authController";
import { logger } from "../utils/logger";

const router = Router();

router.post(
  "/delete-account",
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      logger.debug("Delete account route hit", {
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
    deleteAccount(req, res, next).catch(next);
  },
);

router.post(
  "/callback",
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      logger.debug("Auth callback route hit", {
        method: req.method,
        path: req.path,
        hasBody: !!req.body && Object.keys(req.body || {}).length > 0,
      });
      next();
    } catch (error) {
      next(error);
    }
  },
  passport.authenticate(PASSPORT_TWITCH_STRATEGY, { session: false }),
  (req: Request, res: Response, next: NextFunction) => {
    callbackConnexion(req, res, next).catch(next);
  },
);

export default router;
