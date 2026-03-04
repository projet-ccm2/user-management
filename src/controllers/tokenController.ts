import { Request, Response } from "express";
import { generateVpcToken } from "../services/tokenService";

export const createToken = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const token = generateVpcToken();
  res.status(200).json({ token });
};
