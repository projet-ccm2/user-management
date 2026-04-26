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

  it("should log debug when PUT /channels/me/discord-webhook route is hit", async () => {
    await request(app)
      .put("/channels/me/discord-webhook")
      .send({ discordWebhookUrl: "https://discord.com/api/webhooks/123/abc" })
      .expect(401);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Register discord webhook route hit",
      expect.objectContaining({
        method: "PUT",
        path: "/me/discord-webhook",
      }),
    );
  });

  it("should log debug and return 401 when GET /channels/me/moderated route is hit without auth", async () => {
    await request(app).get("/channels/me/moderated").expect(401);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Get moderated channels route hit",
      expect.objectContaining({
        method: "GET",
        path: "/me/moderated",
      }),
    );
  });
});
