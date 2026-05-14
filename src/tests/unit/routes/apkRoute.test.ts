import request from "supertest";
import app from "../../../index";
import apkRoutes from "../../../routes/apkRoute";
import { logger } from "../../../utils/logger";

jest.mock("../../../config/environment");
jest.mock("../../../utils/logger");

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("apkRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export router as default", () => {
    expect(apkRoutes).toBeDefined();
    expect(typeof apkRoutes).toBe("function");
  });

  it("should have middleware stack", () => {
    const routes = apkRoutes.stack;
    expect(routes.length).toBeGreaterThan(0);
  });

  it("should log debug and return 401 when GET /apk/download is hit without auth", async () => {
    await request(app).get("/apk/download").expect(401);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Get APK download URL route hit",
      expect.objectContaining({
        method: "GET",
        path: "/download",
      }),
    );
  });
});
