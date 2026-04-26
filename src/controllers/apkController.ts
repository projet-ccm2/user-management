import { Request, Response, NextFunction } from "express";
import { bucketManagerService } from "../services/bucketManagerService";

export const getApkDownloadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { url } = await bucketManagerService.getApkUrl();

    res.status(200).json({ success: true, url });
  } catch (error) {
    next(error);
  }
};
