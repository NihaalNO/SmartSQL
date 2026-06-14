import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";

/**
 * Middleware factory that validates the request body against a Zod schema.
 * Throws a 400 error if validation fails.
 *
 * Usage:
 *   router.post("/register", validateBody(RegisterSchema), controller.register);
 */
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return next(ApiError.badRequest(`Validation failed: ${issues}`));
    }
    next();
  };
}

/**
 * Middleware factory that validates the request query parameters against a Zod schema.
 */
export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return next(ApiError.badRequest(`Validation failed: ${issues}`));
    }
    next();
  };
}

/**
 * Middleware factory that validates the request params against a Zod schema.
 */
export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return next(ApiError.badRequest(`Validation failed: ${issues}`));
    }
    next();
  };
}
