import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format that includes timestamp, level, and message.
 */
const logFormat = printf(({ level, message, timestamp, stack }) => {
  const msg = `${timestamp} [${level}]: ${message}`;
  return stack ? `${msg}\n${stack}` : msg;
});

/**
 * Winston logger instance for structured logging.
 * In production, consider writing to a file or external service.
 */
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});
