import "../../../config/environment";

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
    expect(testConfig.user.skipUpdateThresholdMs).toBe(60 * 60 * 1000);
  });

  it("should throw error for missing required TWITCH_CLIENT_ID", () => {
    delete process.env.TWITCH_CLIENT_ID;

    expect(() => {
      require("../../../config/environment");
    }).toThrow("Missing required environment variable: TWITCH_CLIENT_ID");
  });

  it("should parse ALLOWED_ORIGINS correctly", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.ALLOWED_ORIGINS =
      "https://app1.com,https://app2.com,http://localhost:3000";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.cors.allowedOrigins).toEqual([
      "https://app1.com",
      "https://app2.com",
      "http://localhost:3000",
    ]);
  });

  it("should use default allowed origins when ALLOWED_ORIGINS is not set", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    delete process.env.ALLOWED_ORIGINS;

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.cors.allowedOrigins).toEqual([
      "http://localhost:3000",
      "http://localhost:8080",
      "null",
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

  it("should handle custom DB_SERVICE_URL", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.DB_SERVICE_URL = "https://db-service.example.com";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.dbGateway.url).toBe("https://db-service.example.com");
  });

  it("should set gcp.skipAuth true when NODE_ENV is development", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.NODE_ENV = "development";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.gcp.skipAuth).toBe(true);
  });

  it("should set gcp.skipAuth false when NODE_ENV is production", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.NODE_ENV = "production";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.gcp.skipAuth).toBe(false);
  });

  it("should set gcp.skipAuth true when NODE_ENV is unset (defaults to development)", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    delete process.env.NODE_ENV;

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.gcp.skipAuth).toBe(true);
  });

  it("should derive gcp.serviceUrl from AUTH_SERVICE_URL", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.AUTH_SERVICE_URL = "https://user-mgmt.example.com";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.gcp.serviceUrl).toBe("https://user-mgmt.example.com");
    expect(testConfig.userManagement.url).toBe("https://user-mgmt.example.com");
  });

  it("should strip trailing slash from AUTH_SERVICE_URL for gcp.serviceUrl", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.AUTH_SERVICE_URL = "https://user-mgmt.example.com/";

    const { config: testConfig } = require("../../../config/environment");

    expect(testConfig.gcp.serviceUrl).toBe("https://user-mgmt.example.com");
  });
});
