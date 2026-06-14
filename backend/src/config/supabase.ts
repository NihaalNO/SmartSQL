import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let _supabase: SupabaseClient | null = null;

/**
 * Returns a cached service-role client for Supabase.
 * Bypasses RLS; used for all backend DB table operations.
 * Never sign in with this client (it would swap auth contexts).
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

/**
 * Returns a fresh anon-key client for sign-in operations.
 * A new instance is created per call so auth mutations
 * never affect the shared service-role client.
 */
export function getAuthClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
