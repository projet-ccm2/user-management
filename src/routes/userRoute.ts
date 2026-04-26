import { Router, Request, Response, NextFunction } from "express";
import { getUserById } from "../controllers/userController";
import { twitchExtensionAuth } from "../middlewares/twitchExtensionAuth";
import { logger } from "../utils/logger";

const router = Router();

router.get(
  "/:id",
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      logger.debug("Get user route hit", {
        method: req.method,
        path: req.path,
      });
      next();
    } catch (error) {
      next(error);
    }
  },
  twitchExtensionAuth,
  (req: Request, res: Response, next: NextFunction) => {
    getUserById(req, res, next).catch(next);
  },
);

export default router;
