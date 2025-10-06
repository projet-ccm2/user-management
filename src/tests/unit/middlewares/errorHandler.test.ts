import { Request, Response, NextFunction } from "express";
import { CustomError, errorHandler, notFoundHandler } from "../../../middlewares/errorHandler";
import { logger } from "../../../utils/logger";

jest.mock("../../../utils/logger");

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("ErrorHandler", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      url: "/test",
      method: "GET"
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
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
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Test error",
        expect.objectContaining({
          statusCode: 400,
          url: "/test",
          method: "GET",
          stack: expect.any(String)
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Test error",
        status: 400,
        timestamp: expect.any(String)
      });
    });

    it("should handle regular Error with default status code", () => {
      const error = new Error("Regular error");
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Regular error",
        expect.objectContaining({
          statusCode: 500,
          url: "/test",
          method: "GET",
          stack: expect.any(String)
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Regular error",
        status: 500,
        timestamp: expect.any(String)
      });
    });

    it("should handle error without statusCode", () => {
      const error = { message: "Error without statusCode" } as any;
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Error without statusCode",
        status: 500,
        timestamp: expect.any(String)
      });
    });

    it("should handle error without message", () => {
      const error = { statusCode: 400 } as any;
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: undefined,
        status: 400,
        timestamp: expect.any(String)
      });
    });
  });

  describe("notFoundHandler", () => {
    it("should return 404 for any route", () => {
      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Route GET /test not found",
        status: 404,
        timestamp: expect.any(String)
      });
    });

    it("should handle different HTTP methods", () => {
      mockReq.method = "POST";
      mockReq.url = "/api/users";

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Route POST /api/users not found",
        status: 404,
        timestamp: expect.any(String)
      });
    });
  });
});
