import request from "supertest";
import express from "express";
import tokenRoutes from "../../../routes/tokenRoute";

const app = express();
app.use(express.json());
app.use("/tokens", tokenRoutes);

jest.mock("../../../config/environment", () => ({
  config: {
    gcp: { skipAuth: true, serviceUrl: "http://localhost:3000" },
    token: {
      jwtSecret: "test-secret",
      jwtExpiresInSeconds: 3600,
    },
  },
}));

describe("tokenRoute", () => {
  it("should export router as default", () => {
    expect(tokenRoutes).toBeDefined();
    expect(typeof tokenRoutes).toBe("function");
  });

  it("POST / should return token when SKIP_GCP_AUTH is true", async () => {
    const response = await request(app)
      .post("/tokens")
      .send({})
      .expect(200);

    expect(response.body).toHaveProperty("token");
    expect(typeof response.body.token).toBe("string");
    expect(response.body.token.length).toBeGreaterThan(0);
  });
});
