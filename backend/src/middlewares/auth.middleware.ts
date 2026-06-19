import { Request, Response, NextFunction } from "express";
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
// Authentication middlewares
// ---------------------------------------------------------------------------

/**
 * Verifies the Authorization: Bearer <token> header,
 * verifies the token with Supabase,
 * fetches the user from our database,
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
  // [TOKEN LOGGING REMOVED]

  try {
    const sb = getSupabase();
    const { data: { user }, error } = await sb.auth.getUser(token);

    if (error || !user) {
      return next(new ApiError(401, "Invalid or expired token"));
    }


    // Fetch user from our database using supabase_uid
    const userRes = await sb
      .from("users")
      .select("id, supabase_uid, full_name, email, status, created_at, role_id")
      .eq("supabase_uid", user.id)
      .single();

    // If user doesn't exist in our database by supabase_uid, try to create or link them
    if (userRes.error || !userRes.data) {
      const email = user.email ?? '';
      const emailParts = email.split('@');
      const fullName = user.user_metadata?.full_name ||
                      (emailParts.length > 0 ? emailParts[0] : 'Unknown User') ||
                      'Unknown User';

      // First check if user exists by email (e.g., from prior email registration)
      const { data: existingByEmail } = await sb
        .from("users")
        .select("id, supabase_uid, full_name, email, status, role_id")
        .eq("email", email)
        .limit(1);

      if (existingByEmail && existingByEmail.length > 0) {
        // Link the existing user to this OAuth identity by updating supabase_uid
        const existing = existingByEmail[0] as {
          id: number; supabase_uid?: string; full_name: string;
          email: string; status: string; role_id: number;
        };

        if (existing.status !== "active") {
          return next(new ApiError(401, "Account is inactive"));
        }

        // Update supabase_uid to link OAuth identity
        await sb.from("users").update({ supabase_uid: user.id }).eq("id", existing.id);

        // Fetch role name
        const roleRes = await sb.from("roles").select("name").eq("id", existing.role_id).single();
        const roleName = roleRes.data?.name ?? "viewer";

        req.user = {
          id: existing.id,
          supabaseUid: user.id,
          fullName: existing.full_name,
          email: existing.email,
          status: existing.status,
          roleName: roleName as string,
          createdAt: existing.id.toString(),
        };
        next();
        return;
      }

      // Fetch default role id (analyst — matches register page default)
      const { data: roleData, error: roleError } = await sb
        .from("roles")
        .select("id")
        .eq("name", "analyst")
        .single();
      if (roleError || !roleData) {
        return next(new ApiError(500, "Default role (analyst) not configured"));
      }
      const defaultRoleId = roleData.id;

      // Create new user in our database
      const newUserRes = await sb
        .from("users")
        .insert({
          supabase_uid: user.id,
          email: email,
          full_name: fullName,
          status: 'active',
          role_id: defaultRoleId
        })
        .select()
        .single();

      if (newUserRes.error || !newUserRes.data) {
        return next(new ApiError(500, "Failed to create user"));
      }

      const dbUser = newUserRes.data as {
        id: number;
        supabase_uid: string;
        full_name: string;
        email: string;
        status: string;
        created_at: string;
        role_id: number;
      };

      const roleRes = await sb.from("roles").select("name").eq("id", dbUser.role_id).single();
      const roleName = roleRes.data?.name ?? "viewer";

      req.user = {
        id: dbUser.id,
        supabaseUid: dbUser.supabase_uid,
        fullName: dbUser.full_name,
        email: dbUser.email,
        status: dbUser.status,
        roleName: roleName as string,
        createdAt: dbUser.created_at,
      };

      next();
      return;
    }

    const dbUser = userRes.data as {
      id: number;
      supabase_uid: string;
      full_name: string;
      email: string;
      status: string;
      created_at: string;
      role_id: number;
    };

    if (dbUser.status !== "active") {
      return next(new ApiError(401, "Account is inactive"));
    }

    // Fetch role name from our roles table
    const roleRes = await sb.from("roles").select("name").eq("id", dbUser.role_id).single();
    const roleName = roleRes.data?.name ?? "viewer";

    req.user = {
      id: dbUser.id,
      supabaseUid: dbUser.supabase_uid,
      fullName: dbUser.full_name,
      email: dbUser.email,
      status: dbUser.status,
      roleName: roleName as string,
      createdAt: dbUser.created_at,
    };

    next();
  } catch (error) {
    return next(new ApiError(401, "Invalid or expired token"));
  }
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
    const sb = getSupabase();
    const { data: { user }, error } = await sb.auth.getUser(token);

    if (error || !user) {
      // Invalid token — proceed without user
      return next();
    }

    // Fetch user from our database using supabase_uid
    const userRes = await sb
      .from("users")
      .select("id, supabase_uid, full_name, email, status, created_at, role_id")
      .eq("supabase_uid", user.id)
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
  } catch (error) {
    // Invalid token — proceed without user
  }
  next();
}
