import "dotenv/config";
import express from "express";
import passport from "passport";
import { configurePassport } from "./config/passport";
import { config } from "./config/environment";
import { logger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { securityHeaders, corsValidator } from "./middlewares/security";
import authRoutes from "./routes/authRoute";
import apkRoutes from "./routes/apkRoute";
import channelRoutes from "./routes/channelRoute";
import tokenRoutes from "./routes/tokenRoute";
import userRoutes from "./routes/userRoute";
import { dbGatewayService } from "./services/dbGatewayService";

const app = express();
app.disable("x-powered-by");
configurePassport();

app.use(securityHeaders);
app.use(corsValidator);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(passport.initialize());

app.use("/auth", authRoutes);
app.use("/apk", apkRoutes);
app.use("/channels", channelRoutes);
app.use("/tokens", tokenRoutes);
app.use("/users", userRoutes);

app.get("/health", async (req, res, next) => {
  try {
    logger.debug("Health check", { path: req.path });
    const dbGateway = await dbGatewayService.checkHealth();
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      dbGateway:
        dbGateway.status === "healthy"
          ? { status: "healthy", response: dbGateway.data }
          : { status: "unhealthy", error: dbGateway.error },
    });
  } catch (error) {
    next(error);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

if (config.nodeEnv !== "test") {
  const server = app.listen(config.port, () => {
    logger.info(`Server started on port ${config.port}`, {
      environment: config.nodeEnv,
      port: config.port,
    });
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down gracefully");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
}

export default app;
