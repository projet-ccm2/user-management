interface Config {
  port: number;
  nodeEnv: string;
  twitch: {
    clientId: string;
    issuer: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  dbGateway: {
    url: string;
  };
  token: {
    jwtSecret: string;
    jwtExpiresInSeconds: number;
  };
  userManagement: {
    url: string;
  };
  gcp: {
    serviceUrl: string;
    skipAuth: boolean;
  };
}

function validateConfig(): Config {
  const requiredEnvVars = {
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  };

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    port: Number.parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    twitch: {
      clientId: process.env.TWITCH_CLIENT_ID!,
      issuer: process.env.TWITCH_ISSUER || "https://id.twitch.tv/oauth2",
    },
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["http://localhost:3000", "http://localhost:8080", "null"],
    },
    dbGateway: {
      url: process.env.DB_SERVICE_URL || "http://localhost:3001",
    },
    token: {
      jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
      jwtExpiresInSeconds: Number.parseInt(
        process.env.JWT_EXPIRES_IN_SECONDS || "3600",
        10,
      ),
    },
    userManagement: {
      url: process.env.USER_MANAGEMENT_URL || "http://localhost:3000",
    },
    gcp: {
      serviceUrl: process.env.GCP_SERVICE_URL || "http://localhost:3000",
      skipAuth: process.env.SKIP_GCP_AUTH === "true",
    },
  };
}

export const config = validateConfig();
