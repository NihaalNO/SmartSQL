import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { disconnectPrisma } from "./services/prisma.service";
import { getSupabase } from "./config/supabase";
import { setupUnhandledErrorHandlers } from "./middlewares/error.middleware";

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = env.PORT;

const app = createApp();

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  await disconnectPrisma();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");
  await disconnectPrisma();
  process.exit(0);
});

// Start listening
app.listen(PORT, () => {
  logger.info(`🚀 SmartSQL API server running on http://localhost:${PORT}`);
  logger.info(`📦 Environment: ${env.NODE_ENV}`);

  // Verify Supabase connection at startup
  try {
    getSupabase();
    logger.info("✅ Supabase client initialized");
  } catch (err) {
    logger.error("❌ Supabase client initialization failed:", err);
  }
});

// Setup unhandled error handlers
setupUnhandledErrorHandlers();
