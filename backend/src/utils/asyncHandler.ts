import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async Express route handler so errors are caught
 * and passed to the next() error handler middleware.
 */
export const asyncHandler =
  <P = Record<string, string>, ResBody = unknown, ReqBody = unknown, ReqQuery = Record<string, unknown>>(
    fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<unknown>
  ): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
