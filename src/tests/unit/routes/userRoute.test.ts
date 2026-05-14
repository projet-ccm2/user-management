import request from "supertest";
import app from "../../../index";
import userRoutes from "../../../routes/userRoute";
import { logger } from "../../../utils/logger";

jest.mock("../../../config/environment");
jest.mock("../../../utils/logger");

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("userRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export router as default", () => {
    expect(userRoutes).toBeDefined();
    expect(typeof userRoutes).toBe("function");
  });

  it("should have middleware stack", () => {
    const routes = userRoutes.stack;
    expect(routes.length).toBeGreaterThan(0);
  });

  it("should log debug when get user route is hit", async () => {
    await request(app).get("/users/12345").expect(401);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Get user route hit",
      expect.objectContaining({
        method: "GET",
        path: "/12345",
      }),
    );
  });
});
