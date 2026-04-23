import { Request, Response, NextFunction } from "express";
import { bucketManagerService } from "../services/bucketManagerService";
import { CustomError } from "../middlewares/errorHandler";

export const getApkDownloadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user as
      | {
          opaqueUserId: string;
          userId: string;
          channelId: string;
          role: string;
        }
      | undefined;

    if (!user) {
      next(new CustomError("Authentication required", 401));
      return;
    }

    const { url } = await bucketManagerService.getApkUrl();

    res.status(200).json({ success: true, url });
  } catch (error) {
    next(error);
  }
};
