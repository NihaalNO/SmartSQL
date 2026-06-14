import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const SALT_ROUNDS = 12;
const ADMIN_TOKEN_EXPIRE_HOURS = 8;

/**
 * Hash an admin code using bcrypt.
 */
export async function hashAdminCode(code: string): Promise<string> {
  return bcrypt.hash(code, SALT_ROUNDS);
}

/**
 * Verify a plaintext admin code against a bcrypt hash.
 */
export async function verifyAdminCode(plain: string, hashed: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hashed);
  } catch {
    return false;
  }
}

/**
 * Create a custom JWT for admin login.
 * Signed with the Supabase JWT secret.
 */
export function createAdminToken(supabaseUid: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: supabaseUid,
      role: "authenticated",
      is_admin: true,
      iat: now,
      exp: now + ADMIN_TOKEN_EXPIRE_HOURS * 60 * 60,
    },
    env.SUPABASE_JWT_SECRET,
    { algorithm: "HS256" }
  );
}

/**
 * Decode and verify any bearer token (Supabase or admin).
 * Returns the decoded payload.
 */
export function decodeToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, env.SUPABASE_JWT_SECRET, {
    algorithms: ["HS256"],
  }) as jwt.JwtPayload;
}
