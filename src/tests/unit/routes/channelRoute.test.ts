import request from "supertest";
import app from "../../../index";
import channelRoutes from "../../../routes/channelRoute";
import { logger } from "../../../utils/logger";

jest.mock("../../../config/environment");
jest.mock("../../../utils/logger");

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("channelRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export router as default", () => {
    expect(channelRoutes).toBeDefined();
    expect(typeof channelRoutes).toBe("function");
  });

  it("should have middleware stack", () => {
    const routes = channelRoutes.stack;
    expect(routes.length).toBeGreaterThan(0);
  });

  it("should log debug when PUT /channels/me route is hit", async () => {
    await request(app)
      .put("/channels/me")
      .send({
        accessToken: "token",
        idToken: "id",
        discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
      })
      .expect(400);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Update channel route hit",
      expect.objectContaining({
        method: "PUT",
        path: "/me",
      }),
    );
  });
});
