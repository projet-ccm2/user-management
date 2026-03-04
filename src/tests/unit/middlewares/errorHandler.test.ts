import { Request, Response } from "express";
import {
  CustomError,
  errorHandler,
  notFoundHandler,
} from "../../../middlewares/errorHandler";
import { logger } from "../../../utils/logger";

jest.mock("../../../utils/logger");

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("ErrorHandler", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      url: "/test",
      method: "GET",
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe("CustomError", () => {
    it("should create CustomError with default status code", () => {
      const error = new CustomError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it("should create CustomError with custom status code", () => {
      const error = new CustomError("Not found", 404);

      expect(error.message).toBe("Not found");
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });
  });

  describe("errorHandler", () => {
    it("should handle CustomError", () => {
      const error = new CustomError("Test error", 400);

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Test error",
        expect.objectContaining({
          statusCode: 400,
          url: "/test",
          method: "GET",
          stack: expect.any(String),
        }),
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Test error",
        status: 400,
        timestamp: expect.any(String),
      });
    });

    it("should handle regular Error with default status code", () => {
      const error = new Error("Regular error");

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Regular error",
        expect.objectContaining({
          statusCode: 500,
          url: "/test",
          method: "GET",
          stack: expect.any(String),
        }),
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Regular error",
        status: 500,
        timestamp: expect.any(String),
      });
    });

    it("should handle error without statusCode", () => {
      const error = { message: "Error without statusCode" } as any;

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Error without statusCode",
        status: 500,
        timestamp: expect.any(String),
      });
    });

    it("should handle error without message", () => {
      const error = { statusCode: 400 } as any;

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: undefined,
        status: 400,
        timestamp: expect.any(String),
      });
    });

    it("should not send response when headers already sent", () => {
      const error = new CustomError("Test error", 400);
      (mockRes as any).headersSent = true;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should handle handler failure and send 500 when headers not sent", () => {
      const error = new CustomError("Test error", 400);
      const mockEnd = jest.fn();
      (mockRes as any).end = mockEnd;
      (mockRes.json as jest.Mock).mockImplementation(() => {
        throw new Error("JSON serialization failed");
      });

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error handler failed",
        expect.objectContaining({
          originalError: "Test error",
          handlerError: "JSON serialization failed",
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockEnd).toHaveBeenCalledWith("Internal Server Error");
    });

    it("should handle handler failure when error is not Error instance", () => {
      const error = "string error";
      (mockRes as any).end = jest.fn();
      (mockRes.json as jest.Mock).mockImplementation(() => {
        throw new Error("Handler failed");
      });

      errorHandler(
        error as any,
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error handler failed",
        expect.objectContaining({
          originalError: "string error",
          handlerError: "Handler failed",
        }),
      );
    });

    it("should not call res.end when handler fails but headers already sent", () => {
      const error = new CustomError("Test error", 400);
      const mockEnd = jest.fn();
      (mockRes as any).end = mockEnd;
      (mockRes.status as jest.Mock).mockImplementation((code: number) => {
        (mockRes as any).headersSent = true;
        return mockRes;
      });
      (mockRes.json as jest.Mock).mockImplementation(() => {
        throw new Error("Handler failed");
      });

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error handler failed",
        expect.objectContaining({
          originalError: "Test error",
          handlerError: "Handler failed",
        }),
      );
      expect(mockEnd).not.toHaveBeenCalled();
    });
  });

  describe("notFoundHandler", () => {
    it("should return 404 for any route", () => {
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Route GET /test not found",
        status: 404,
        timestamp: expect.any(String),
      });
    });

    it("should handle different HTTP methods", () => {
      mockReq.method = "POST";
      mockReq.url = "/api/users";

      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Route POST /api/users not found",
        status: 404,
        timestamp: expect.any(String),
      });
    });
  });
});
