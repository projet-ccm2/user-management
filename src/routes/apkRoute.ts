import { Router, Request, Response, NextFunction } from "express";
import { bffAuthMiddleware } from "../middlewares/bffAuthMiddleware";
import { getApkDownloadUrl } from "../controllers/apkController";
import { logger } from "../utils/logger";

const router = Router();

router.get(
  "/download",
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      logger.debug("Get APK download URL route hit", {
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
    getApkDownloadUrl(req, res, next).catch(next);
  },
);

export default router;
