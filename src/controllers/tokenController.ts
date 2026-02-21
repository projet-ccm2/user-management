import { Request, Response } from "express";
import { generateVpcToken } from "../services/tokenService";

/**
 * Emits a JWT for VPC access (db gateway).
 * Called by bastions (user-management via auto-call, or second BFF) after bffAuthMiddleware validates the GCP identity token.
 */
export const createToken = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const token = generateVpcToken();
  res.status(200).json({ token });
};
