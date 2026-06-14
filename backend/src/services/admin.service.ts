import { getSupabase } from "../config/supabase";

// ---------------------------------------------------------------------------
// Platform statistics
// ---------------------------------------------------------------------------

export interface PlatformStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_queries: number;
  success_queries: number;
  success_rate: number;
  saved_queries: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const sb = getSupabase();

  const usersRes = await sb.from("users").select("id, status");
  const allUsers = (usersRes.data ?? []) as Array<{ id: number; status: string }>;
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.status === "active").length;

  const logsRes = await sb.from("query_logs").select("id, execution_status");
  const allLogs = (logsRes.data ?? []) as Array<{ id: number; execution_status: string }>;
  const totalQueries = allLogs.length;
  const successQueries = allLogs.filter((l) => l.execution_status === "success").length;
  const successRate = totalQueries > 0 ? Math.round((successQueries / totalQueries) * 100) / 10 : 0;

  const savedRes = await sb.from("saved_queries").select("id");
  const savedCount = (savedRes.data ?? []).length;

  return {
    total_users: totalUsers,
    active_users: activeUsers,
    inactive_users: totalUsers - activeUsers,
    total_queries: totalQueries,
    success_queries: successQueries,
    success_rate: successRate,
    saved_queries: savedCount,
  };
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export interface AdminUserOut {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export async function listUsers(): Promise<AdminUserOut[]> {
  const sb = getSupabase();

  const usersRes = await sb
    .from("users")
    .select("id, full_name, email, status, role_id, created_at")
    .order("created_at", { ascending: false });

  const users = (usersRes.data ?? []) as Array<{
    id: number;
    full_name: string;
    email: string;
    status: string;
    role_id: number;
    created_at: string;
  }>;

  // Fetch all roles for name mapping
  const rolesRes = await sb.from("roles").select("id, name");
  const roleMap = new Map<number, string>();
  for (const r of (rolesRes.data ?? []) as Array<{ id: number; name: string }>) {
    roleMap.set(r.id, r.name);
  }

  return users.map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: roleMap.get(u.role_id) ?? "viewer",
    status: u.status,
    created_at: u.created_at,
  }));
}

export async function updateUserStatus(userId: number, status: string): Promise<string> {
  const sb = getSupabase();
  const res = await sb.from("users").update({ status }).eq("id", userId);
  if (res.error) {
    throw new Error(`Failed to update user status: ${res.error.message}`);
  }
  return `User ${userId} set to ${status}`;
}

export async function updateUserRole(userId: number, roleName: string): Promise<string> {
  const sb = getSupabase();

  const roleRes = await sb.from("roles").select("id").eq("name", roleName).single();
  if (roleRes.error || !roleRes.data) {
    throw new Error("Role not found");
  }

  const roleId = (roleRes.data as { id: number }).id;
  const updateRes = await sb.from("users").update({ role_id: roleId }).eq("id", userId);
  if (updateRes.error) {
    throw new Error(`Failed to update user role: ${updateRes.error.message}`);
  }

  return `User ${userId} role updated to ${roleName}`;
}

export async function deleteUser(userId: number): Promise<string> {
  const sb = getSupabase();

  // Get user to find supabase_uid
  const userRes = await sb
    .from("users")
    .select("supabase_uid")
    .eq("id", userId)
    .single();

  const supabaseUid = userRes.data
    ? (userRes.data as { supabase_uid: string | null }).supabase_uid
    : null;

  // Delete from our users table
  const deleteRes = await sb.from("users").delete().eq("id", userId);
  if (deleteRes.error) {
    throw new Error(`Failed to delete user: ${deleteRes.error.message}`);
  }

  // Best-effort: also delete from Supabase Auth
  if (supabaseUid) {
    try {
      await sb.auth.admin.deleteUser(supabaseUid);
    } catch {
      // Ignore errors — user row is already removed
    }
  }

  return `User ${userId} deleted`;
}

// ---------------------------------------------------------------------------
// Query logs (all users)
// ---------------------------------------------------------------------------

export interface AdminQueryLog {
  id: number;
  user_id: number | null;
  natural_language_query: string;
  execution_status: string;
  execution_time_ms: number | null;
  row_count: number | null;
  model_provider: string | null;
  created_at: string;
  user_email: string;
  user_full_name: string;
}

export async function getAllQueryLogs(limit = 100): Promise<AdminQueryLog[]> {
  const sb = getSupabase();

  const logsRes = await sb
    .from("query_logs")
    .select(
      "id, user_id, natural_language_query, execution_status, execution_time_ms, row_count, model_provider, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const logs = (logsRes.data ?? []) as Array<{
    id: number;
    user_id: number | null;
    natural_language_query: string;
    execution_status: string;
    execution_time_ms: number | null;
    row_count: number | null;
    model_provider: string | null;
    created_at: string;
  }>;

  // Attach user info
  if (logs.length > 0) {
    const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))];
    const usersRes = await sb
      .from("users")
      .select("id, email, full_name")
      .in("id", userIds as number[]);

    const userMap = new Map<number, { email: string; full_name: string }>();
    for (const u of (usersRes.data ?? []) as Array<{ id: number; email: string; full_name: string }>) {
      userMap.set(u.id, u);
    }

    return logs.map((l) => ({
      ...l,
      user_email: userMap.get(l.user_id ?? -1)?.email ?? "—",
      user_full_name: userMap.get(l.user_id ?? -1)?.full_name ?? "—",
    }));
  }

  return logs.map((l) => ({ ...l, user_email: "—", user_full_name: "—" }));
}
