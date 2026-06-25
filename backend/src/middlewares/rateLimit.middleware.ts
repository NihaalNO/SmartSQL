import rateLimit from "express-rate-limit";

/**
 * General API rate limiter — 100 requests per 15 minutes per IP.
 * Applied globally to all routes.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { detail: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiter for auth endpoints — 5 requests per 15 minutes per IP.
 * Applied to login and register routes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { detail: "Too many auth attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for query endpoints — 30 requests per minute per IP.
 * Applied to query run and run-live routes.
 */
export const queryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { detail: "Too many query requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
