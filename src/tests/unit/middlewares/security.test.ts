import { Request, Response, NextFunction } from "express";
import { securityHeaders, corsValidator } from "../../../middlewares/security";
import "../../../config/environment";
import { logger } from "../../../utils/logger";

jest.mock("../../../config/environment", () => ({
  config: {
    cors: {
      allowedOrigins: ["https://allowed.com", "http://localhost:3000"],
    },
  },
}));
jest.mock("../../../utils/logger");

describe("Security Middlewares", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };

    mockRes = {
      removeHeader: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("securityHeaders", () => {
    it("should call next with error when setHeader throws", () => {
      (mockRes.setHeader as jest.Mock).mockImplementation(() => {
        throw new Error("setHeader failed");
      });

      securityHeaders(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: "setHeader failed" }),
      );
    });

    it("should set all security headers", () => {
      securityHeaders(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.removeHeader).toHaveBeenCalledWith("X-Powered-By");
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-Content-Type-Options",
        "nosniff",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-XSS-Protection",
        "1; mode=block",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("corsValidator", () => {
    it("should allow requests without origin", () => {
      mockReq.headers = {};

      corsValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });

    it("should allow requests from allowed origins", () => {
      mockReq.headers = {
        origin: "https://allowed.com",
      };

      corsValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "https://allowed.com",
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow requests from localhost", () => {
      mockReq.headers = {
        origin: "http://localhost:3000",
      };

      corsValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "http://localhost:3000",
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should reject requests from disallowed origins", () => {
      mockReq.headers = {
        origin: "https://malicious.com",
      };

      corsValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Origin not allowed by CORS policy",
        status: 403,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle multiple allowed origins", () => {
      mockReq.headers = {
        origin: "https://allowed.com",
      };

      corsValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "https://allowed.com",
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow OPTIONS preflight from allowed origin", () => {
      mockReq.method = "OPTIONS";
      mockReq.headers = { origin: "https://allowed.com" };
      (mockRes as any).end = jest.fn();

      corsValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.debug).toHaveBeenCalledWith(
        "CORS: OPTIONS preflight allowed",
        { origin: "https://allowed.com" },
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "https://allowed.com",
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect((mockRes as any).end).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject OPTIONS preflight from disallowed origin", () => {
      mockReq.method = "OPTIONS";
      mockReq.headers = { origin: "https://disallowed.com" };
      (mockRes as any).end = jest.fn();

      corsValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        "CORS: OPTIONS preflight rejected",
        {
          origin: "https://disallowed.com",
          allowedOrigins: ["https://allowed.com", "http://localhost:3000"],
        },
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next with error when corsValidator throws", () => {
      mockReq.headers = { origin: "https://allowed.com" };
      (mockRes.setHeader as jest.Mock).mockImplementation(() => {
        throw new Error("setHeader failed");
      });

      corsValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: "setHeader failed" }),
      );
    });
  });
});
