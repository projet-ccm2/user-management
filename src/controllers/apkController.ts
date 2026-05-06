import { Request, Response, NextFunction } from "express";
import { bucketManagerService } from "../services/bucketManagerService";
import { CustomError } from "../middlewares/errorHandler";

export const getApkDownloadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new CustomError("Authentication required", 401));
    }

    const { url } = await bucketManagerService.getApkUrl();

    res.status(200).json({ success: true, url });
  } catch (error) {
    next(error);
  }
};
