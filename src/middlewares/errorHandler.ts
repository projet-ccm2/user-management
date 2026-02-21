import { Request, Response } from "express";
import { logger } from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
): void => {
  const { statusCode = 500, message } = error;

  logger.error(message, {
    statusCode,
    url: req.url,
    path: req.path,
    method: req.method,
    stack: error.stack,
    isOperational: error.isOperational,
  });

  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString(),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn("Route not found", {
    method: req.method,
    url: req.url,
    path: req.path,
  });
  res.status(404).json({
    error: `Route ${req.method} ${req.url} not found`,
    status: 404,
    timestamp: new Date().toISOString(),
  });
};
