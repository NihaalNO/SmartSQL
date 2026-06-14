import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { getSupabase } from "../config/supabase";
import { ApiError } from "../utils/ApiError";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number;
  supabaseUid: string;
  fullName: string;
  email: string;
  status: string;
  roleName: string;
  createdAt: Date | string;
}

/**
 * Extended Express Request with authenticated user attached.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ---------------------------------------------------------------------------
// Token decoding
// ---------------------------------------------------------------------------

export function decodeToken(token: string): Record<string, unknown> {
  try {
    return jwt.verify(token, env.SUPABASE_JWT_SECRET, {
      algorithms: ["HS256"],
      // Supabase tokens use 'authenticated' audience, not a custom one
      // skip audience check as in the original Python code
      audience: undefined,
      issuer: undefined,
      // For Supabase JWT, we skip audience verification
    }) as Record<string, unknown>;
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
}

// ---------------------------------------------------------------------------
// Authentication middlewares
// ---------------------------------------------------------------------------

/**
 * Verifies the Authorization: Bearer <token> header,
 * decodes the token, fetches the user from Supabase,
 * and attaches the user to req.user.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return next(new ApiError(401, "Invalid token payload"));
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  let payload: Record<string, unknown>;

  try {
    payload = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
      algorithms: ["HS256"],
    }) as Record<string, unknown>;
  } catch {
    return next(new ApiError(401, "Invalid or expired token"));
  }

  const supabaseUid = payload.sub as string | undefined;
  if (!supabaseUid) {
    return next(new ApiError(401, "Invalid token payload"));
  }

  const sb = getSupabase();
  const userRes = await sb
    .from("users")
    .select("id, supabase_uid, full_name, email, status, created_at, role_id")
    .eq("supabase_uid", supabaseUid)
    .single();

  if (userRes.error || !userRes.data) {
    return next(new ApiError(401, "User not found"));
  }

  const data = userRes.data as {
    id: number;
    supabase_uid: string;
    full_name: string;
    email: string;
    status: string;
    created_at: string;
    role_id: number;
  };

  if (data.status !== "active") {
    return next(new ApiError(401, "Account is inactive"));
  }

  // Fetch role name
  const roleRes = await sb.from("roles").select("name").eq("id", data.role_id).single();
  const roleName = roleRes.data?.name ?? "viewer";

  req.user = {
    id: data.id,
    supabaseUid: data.supabase_uid,
    fullName: data.full_name,
    email: data.email,
    status: data.status,
    roleName: roleName as string,
    createdAt: data.created_at,
  };

  next();
}

/**
 * Middleware factory that restricts access to the given roles.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.roleName)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    next();
  };
}

/**
 * Optional authentication — attaches user if token is present,
 * but does not require it. Used for endpoints where auth is optional.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
      algorithms: ["HS256"],
    }) as Record<string, unknown>;
    const supabaseUid = payload.sub as string | undefined;
    if (supabaseUid) {
      const sb = getSupabase();
      const userRes = await sb
        .from("users")
        .select("id, supabase_uid, full_name, email, status, created_at, role_id")
        .eq("supabase_uid", supabaseUid)
        .single();

      if (userRes.data) {
        const data = userRes.data as {
          id: number;
          supabase_uid: string;
          full_name: string;
          email: string;
          status: string;
          created_at: string;
          role_id: number;
        };

        const roleRes = await sb.from("roles").select("name").eq("id", data.role_id).single();
        req.user = {
          id: data.id,
          supabaseUid: data.supabase_uid,
          fullName: data.full_name,
          email: data.email,
          status: data.status,
          roleName: (roleRes.data?.name ?? "viewer") as string,
          createdAt: data.created_at,
        };
      }
    }
  } catch {
    // Invalid token — proceed without user
  }
  next();
}
