import { config } from "../../../config/environment";

describe("Environment Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should load configuration with required variables", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.NODE_ENV = "test";
    process.env.PORT = "4000";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.twitch.clientId).toBe("test_client_id");
    expect(testConfig.nodeEnv).toBe("test");
    expect(testConfig.port).toBe(4000);
  });

  it("should use default values for optional variables", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.port).toBe(3000);
    expect(testConfig.nodeEnv).toBe("test");
    expect(testConfig.twitch.issuer).toBe("https://id.twitch.tv/oauth2");
    expect(testConfig.dbGateway.url).toBe("http://localhost:3001");
  });

  it("should throw error for missing required TWITCH_CLIENT_ID", () => {
    delete process.env.TWITCH_CLIENT_ID;

    expect(() => {
      require("../../../config/environment");
    }).toThrow("Missing required environment variable: TWITCH_CLIENT_ID");
  });

  it("should parse ALLOWED_ORIGINS correctly", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.ALLOWED_ORIGINS = "https://app1.com,https://app2.com,http://localhost:3000";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.cors.allowedOrigins).toEqual([
      "https://app1.com",
      "https://app2.com", 
      "http://localhost:3000"
    ]);
  });

  it("should use default allowed origins when ALLOWED_ORIGINS is not set", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    delete process.env.ALLOWED_ORIGINS;

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.cors.allowedOrigins).toEqual([
      "https://frontend-service-782869810736.europe-west1.run.app"
    ]);
  });

  it("should parse PORT as integer", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.PORT = "8080";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.port).toBe(8080);
    expect(typeof testConfig.port).toBe("number");
  });

  it("should handle custom TWITCH_ISSUER", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.TWITCH_ISSUER = "https://custom.twitch.issuer.com";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.twitch.issuer).toBe("https://custom.twitch.issuer.com");
  });

  it("should handle custom DB_GATEWAY_URL", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.DB_GATEWAY_URL = "https://db-gateway.example.com";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.dbGateway.url).toBe("https://db-gateway.example.com");
  });
});
