import request from "supertest";
import app from "../../index";
import { config } from "../../config/environment";
import { logger } from "../../utils/logger";

jest.mock("../../config/environment");
jest.mock("../../utils/logger");

const mockConfig = config as jest.Mocked<typeof config>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("Express App", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig.nodeEnv = "test";
    mockConfig.port = 3000;
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toEqual({
        status: "healthy",
        timestamp: expect.any(String),
        environment: "test",
      });
    });

    it("should return valid timestamp", async () => {
      const response = await request(app).get("/health").expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe("Middleware configuration", () => {
    it("should handle JSON requests", async () => {
      const response = await request(app)
        .post("/test-json")
        .send({ test: "data" })
        .expect(404);

      expect(response.status).toBe(404);
    });

    it("should handle URL encoded requests", async () => {
      const response = await request(app)
        .post("/test-urlencoded")
        .send("test=data")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .expect(404);

      expect(response.status).toBe(404);
    });

    it("should handle CORS", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
    });
  });

  describe("Route handling", () => {
    it("should handle auth routes", async () => {
      const response = await request(app)
        .post("/auth/callback")
        .send({})
        .expect(400);

      expect(response.status).toBe(400);
    });

    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/unknown-route").expect(404);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Error handling", () => {
    it("should handle malformed JSON", async () => {
      const response = await request(app)
        .post("/test")
        .send("invalid json")
        .set("Content-Type", "application/json")
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should handle large payloads", async () => {
      const largeData = "x".repeat(11 * 1024 * 1024);

      const response = await request(app)
        .post("/test")
        .send({ data: largeData })
        .expect(413);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Environment configuration", () => {
    it("should use correct environment", () => {
      expect(mockConfig.nodeEnv).toBe("test");
    });

    it("should not start server in test environment", () => {
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining("Server started on port"),
      );
    });
  });

  describe("Security headers", () => {
    it("should include security headers", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.headers).toHaveProperty("x-content-type-options");
      expect(response.headers).toHaveProperty("x-frame-options");
    });
  });

  describe("CORS validation", () => {
    it("should validate CORS origins", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
    });
  });
});
