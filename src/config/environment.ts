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
    port: parseInt(process.env.PORT || "3000", 10),
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
      url: process.env.DB_GATEWAY_URL || "http://localhost:3001",
    },
  };
}

export const config = validateConfig();
