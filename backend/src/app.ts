import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import "express-async-errors";

import { env } from "./config/env";
import { generalLimiter } from "./middlewares/rateLimit.middleware";
import { requestLogger } from "./middlewares/logger.middleware";
import { errorHandler } from "./middlewares/error.middleware";
// import { logger } from "./utils/logger";

// Routers
import authRouter from "./routes/auth.routes";
import queryRouter from "./routes/query.routes";
import schemaRouter from "./routes/schema.routes";
import healthRouter from "./routes/health.routes";
import liveDbRouter from "./routes/liveDb.routes";

// ---------------------------------------------------------------------------
// Express app factory
// ---------------------------------------------------------------------------

export function createApp(): Application {
  const app = express();

  // Security
  app.use(helmet());

  // CORS — must be first to wrap every response including error responses
  app.use(
    cors({
      origin: [env.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
      ],
    })
  );

  // Parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Compression
  app.use(compression());

  // Logging (skip in test mode if needed)
  if (env.NODE_ENV !== "test") {
    app.use(requestLogger);
  }

  // Rate limiting (applied globally; stricter limits on auth routes within routers)
  app.use(generalLimiter);

  // Routes
  app.use("/api/auth", authRouter);
  app.use("/api/queries", queryRouter);
  app.use("/api/schema", schemaRouter);
  app.use("/api/live-db", liveDbRouter);
  app.use("/", healthRouter);

  // Global error handler — MUST be the last middleware
  app.use(errorHandler);

  return app;
}
