import { Request, Response, NextFunction } from "express";
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
  _next: NextFunction,
): void => {
  try {
    const { statusCode = 500, message } = error;

    logger.error(message, {
      statusCode,
      url: req.url,
      path: req.path,
      method: req.method,
      stack: error.stack,
      isOperational: error.isOperational,
    });

    if (!res.headersSent) {
      res.status(statusCode).json({
        error: message,
        status: statusCode,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (handlerError) {
    logger.error("Error handler failed", {
      originalError: error instanceof Error ? error.message : String(error),
      handlerError:
        handlerError instanceof Error
          ? handlerError.message
          : String(handlerError),
    });
    if (!res.headersSent) {
      res.status(500).end("Internal Server Error");
    }
  }
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
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
  } catch (error) {
    next(error);
  }
};
