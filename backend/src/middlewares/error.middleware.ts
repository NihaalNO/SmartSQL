import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/ApiError";

/**
 * Global Express error-handling middleware.
 * Must be registered as the LAST middleware (after routes).
 * Preserves the same JSON error format the FastAPI frontend expects.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operational errors (expected)
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ detail: err.message });
    return;
  }

  // Log unexpected errors
  logger.error("Unhandled error:", err);

  // Preserve FastAPI-compatible error format
  const statusCode = 500;
  const message = `Internal server error: ${err.name}`;
  res.status(statusCode).json({ detail: message });
}

/**
 * Catch-all for unhandled promise rejections and synchronous errors.
 * In production this ensures no response leaks stack traces.
 */
export function setupUnhandledErrorHandlers(): void {
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection:", reason);
    process.exit(1);
  });
}
