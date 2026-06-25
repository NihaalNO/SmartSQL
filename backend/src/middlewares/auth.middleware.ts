import { Request, Response, NextFunction } from "express";
import { getSupabase } from "../config/supabase";
import { ApiError } from "../utils/ApiError";

export interface AuthUser {
  id: number;
  supabaseUid: string;
  fullName: string;
  email: string;
  status: string;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  avatarUrl?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function toAuthUser(data: {
  id: number;
  supabase_uid: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  avatar_url?: string | null;
}): AuthUser {
  return {
    id: data.id,
    supabaseUid: data.supabase_uid,
    fullName: data.full_name,
    email: data.email,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    avatarUrl: data.avatar_url,
  };
}

async function findOrCreateUser(
  supabaseUid: string,
  email: string,
  fullName: string,
  avatarUrl?: string | null
): Promise<AuthUser> {
  const sb = getSupabase();

  const baseSelect = "id, supabase_uid, full_name, email, status, created_at, updated_at, avatar_url";
  const byUid = await sb
    .from("users")
    .select(baseSelect)
    .eq("supabase_uid", supabaseUid)
    .single();

  if (byUid.data) {
    const user = toAuthUser(byUid.data as Parameters<typeof toAuthUser>[0]);
    if (user.status !== "active") {
      throw new ApiError(401, "Account is inactive");
    }
    return user;
  }

  const byEmail = await sb
    .from("users")
    .select(baseSelect)
    .eq("email", email)
    .limit(1);

  if (byEmail.data && byEmail.data.length > 0) {
    const existing = byEmail.data[0] as Parameters<typeof toAuthUser>[0];
    if (existing.status !== "active") {
      throw new ApiError(401, "Account is inactive");
    }

    const linked = await sb
      .from("users")
      .update({ supabase_uid: supabaseUid, avatar_url: avatarUrl ?? existing.avatar_url ?? null })
      .eq("id", existing.id)
      .select(baseSelect)
      .single();

    if (linked.error || !linked.data) {
      throw new ApiError(500, "Failed to link user profile");
    }

    return toAuthUser(linked.data as Parameters<typeof toAuthUser>[0]);
  }

  const created = await sb
    .from("users")
    .insert({
      supabase_uid: supabaseUid,
      email,
      full_name: fullName,
      status: "active",
      avatar_url: avatarUrl ?? null,
    })
    .select(baseSelect)
    .single();

  if (created.error || !created.data) {
    throw new ApiError(500, "Failed to create user profile");
  }

  return toAuthUser(created.data as Parameters<typeof toAuthUser>[0]);
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return next(new ApiError(401, "Authentication required"));
  }

  const token = authHeader.slice(7);

  try {
    const sb = getSupabase();
    const {
      data: { user },
      error,
    } = await sb.auth.getUser(token);

    if (error || !user || !user.email) {
      return next(new ApiError(401, "Invalid or expired token"));
    }

    const emailParts = user.email.split("@");
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      emailParts[0] ||
      "SmartSQL User";

    req.user = await findOrCreateUser(
      user.id,
      user.email,
      fullName,
      user.user_metadata?.avatar_url ?? null
    );

    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Invalid or expired token"));
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required"));
  }
  next();
}

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
    const {
      data: { user },
      error,
    } = await sb.auth.getUser(token);

    if (!error && user?.email) {
      const emailParts = user.email.split("@");
      req.user = await findOrCreateUser(
        user.id,
        user.email,
        user.user_metadata?.full_name || user.user_metadata?.name || emailParts[0] || "SmartSQL User",
        user.user_metadata?.avatar_url ?? null
      );
    }
  } catch {
    // Optional auth should not block anonymous requests.
  }

  next();
}
