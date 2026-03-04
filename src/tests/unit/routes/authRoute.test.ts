import request from "supertest";
import app from "../../../index";
import authRoutes from "../../../routes/authRoute";
import { logger } from "../../../utils/logger";

jest.mock("../../../config/environment");
jest.mock("../../../utils/logger");

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("authRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export router as default", () => {
    expect(authRoutes).toBeDefined();
    expect(typeof authRoutes).toBe("function");
  });

  it("should have middleware stack", () => {
    const routes = authRoutes.stack;
    expect(routes.length).toBeGreaterThan(0);
  });

  it("should be a valid Express router", () => {
    expect(authRoutes).toBeDefined();
    expect(typeof authRoutes).toBe("function");
  });

  it("should log debug when auth callback route is hit with body", async () => {
    await request(app)
      .post("/auth/callback")
      .send({ accessToken: "token", idToken: "id" })
      .expect(400);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Auth callback route hit",
      expect.objectContaining({
        method: "POST",
        path: "/callback",
        hasBody: true,
      }),
    );
  });

  it("should log debug with hasBody false when auth callback has empty body", async () => {
    await request(app).post("/auth/callback").send({}).expect(400);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Auth callback route hit",
      expect.objectContaining({
        method: "POST",
        path: "/callback",
        hasBody: false,
      }),
    );
  });
});
