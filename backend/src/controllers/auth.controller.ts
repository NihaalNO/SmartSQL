import { Request, Response } from "express";
import { getSupabase, getAuthClient } from "../config/supabase";
import { ApiError } from "../utils/ApiError";
import { verifyAdminCode, createAdminToken } from "../services/auth.service";
import { SupabaseClient } from "@supabase/supabase-js";
import type { TokenResponse, UserOut } from "../types/auth.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveRole(
  sb: SupabaseClient,
  roleName: string
): Promise<{ id: number; name: string }> {
  const { data } = await sb
    .from("roles")
    .select("id, name")
    .eq("name", roleName)
    .limit(1);

  if (data && data.length > 0) return data[0] as { id: number; name: string };

  const { data: fallback } = await sb
    .from("roles")
    .select("id, name")
    .eq("name", "viewer")
    .limit(1);

  return (fallback?.[0] ?? { id: 0, name: "viewer" }) as {
    id: number;
    name: string;
  };
}

async function getAppUser(
  sb: SupabaseClient,
  supabaseUid: string
): Promise<{
  id: number;
  full_name: string;
  email: string;
  status: string;
  role_id: number;
}> {
  const { data, error } = await sb
    .from("users")
    .select("id, full_name, email, status, role_id")
    .eq("supabase_uid", supabaseUid)
    .limit(1);

  if (error || !data || data.length === 0) {
    throw ApiError.unauthorized("User profile not found");
  }

  const user = data[0] as {
    id: number;
    full_name: string;
    email: string;
    status: string;
    role_id: number;
  };

  if (user.status !== "active") {
    throw ApiError.unauthorized("Account inactive");
  }

  return user;
}

async function getRoleName(sb: SupabaseClient, roleId: number): Promise<string> {
  const { data } = await sb.from("roles").select("name").eq("id", roleId).limit(1);
  return (data?.[0] as { name?: string } | undefined)?.name ?? "viewer";
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export async function register(req: Request, res: Response): Promise<void> {
  const { full_name, email, password, role } = req.body as {
    full_name: string;
    email: string;
    password: string;
    role?: string;
  };

  const sb = getSupabase();

  console.log(`[REGISTER] Registration attempt for email: ${email}`);

  // Check if email already exists in our users table
  const existingUser = await sb
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1);
  console.log(`[REGISTER] SQL users table check: found ${existingUser.data?.length ?? 0} rows`);

  if (existingUser.data && existingUser.data.length > 0) {
    console.log(`[REGISTER] Email found in SQL users table: ${email}`);
    throw ApiError.badRequest("Email already registered in our system");
  }

  // Check if email already exists in Supabase Auth
  let authUserExists = false;
  try {
    const { data: authUserData, error: authUserError } = await sb.auth.admin.getUserByEmail(
      email
    );
    if (!authUserError && authUserData) {
      authUserExists = true;
      console.log(`[REGISTER] Email found in Supabase Auth: ${email}`);
    } else {
      console.log(`[REGISTER] Email not found in Supabase Auth: ${email}`);
    }
  } catch (authCheckError) {
    // If we can't check due to permissions or other issues, we'll proceed and let createUser handle it
    console.warn(
      `Warning: Could not check if email exists in Supabase Auth: ${authCheckError.message}`
    );
  }

  if (authUserExists) {
    throw ApiError.badRequest(
      "Email already registered in authentication system. Please use a different email or contact support if you believe this is an error."
    );
  }

  // Block admin role from public registration
  if (role?.toLowerCase() === "admin") {
    throw ApiError.badRequest(
      "Admin accounts cannot be created through public registration."
    );
  }

  // Create Supabase auth user
  console.log(`[REGISTER] Creating Supabase auth user for email: ${email}`);
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.log(`[REGISTER] Failed to create Supabase auth user: ${authError?.message}`);
    throw ApiError.badRequest(authError?.message ?? "Auth creation failed");
  }

  const supabaseUid = authData.user.id;
  console.log(`[REGISTER] Created Supabase auth user with ID: ${supabaseUid}`);
  const resolvedRole = await resolveRole(sb, role ?? "viewer");

  try {
    // Insert into users table
    console.log(`[REGISTER] Inserting user into SQL users table`);
    const { data: userData, error: insertError } = await sb
      .from("users")
      .insert({
        supabase_uid: supabaseUid,
        full_name,
        email,
        role_id: resolvedRole.id,
      })
      .select("id, full_name, email, role_id, status, created_at")
      .limit(1);

    if (insertError || !userData || userData.length === 0) {
      console.log(`[REGISTER] Failed to insert user into SQL users table: ${insertError?.message}`);
      throw new Error(insertError?.message ?? "Profile creation failed");
    }

    const user = userData[0] as {
      id: number;
      full_name: string;
      email: string;
      role_id: number;
      status: string;
      created_at: string;
    };

    console.log(`[REGISTER] Successfully inserted user into SQL users table with ID: ${user.id}`);

    // Sign in to get token
    const authClient = getAuthClient();
    const { data: signInData, error: signInError } =
      await authClient.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !signInData.session) {
      console.log(`[REGISTER] Failed to sign in after registration: ${signInError?.message}`);
      throw ApiError.badRequest(signInError?.message ?? "Sign in failed");
    }

    const response: TokenResponse = {
      access_token: signInData.session.access_token,
      token_type: "bearer",
      user_id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: resolvedRole.name,
    };

    console.log(`[REGISTER] Registration successful for email: ${email}`);
    res.status(201).json(response);
  } catch (err) {
    console.log(`[REGISTER] Error during registration process: ${err.message}`);
    // Best effort: clean up auth user on profile creation failure
    try {
      await sb.auth.admin.deleteUser(supabaseUid);
      console.log(`[REGISTER] Cleaned up Supabase auth user: ${supabaseUid}`);
    } catch {
      // ignore cleanup errors
      console.log(`[REGISTER] Warning: Failed to clean up Supabase auth user: ${supabaseUid}`);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const sb = getSupabase();

  const authClient = getAuthClient();
  const { data: signInData, error: signInError } =
    await authClient.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError || !signInData.user) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const user = await getAppUser(sb, signInData.user.id);
  const roleName = await getRoleName(sb, user.role_id);

  if (roleName === "admin") {
    throw ApiError.forbidden("Admin accounts must sign in via the admin panel.");
  }

  const response: TokenResponse = {
    access_token: signInData.session.access_token,
    token_type: "bearer",
    user_id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: roleName,
  };

  res.json(response);
}

// ---------------------------------------------------------------------------
// Admin Login
// ---------------------------------------------------------------------------

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { admin_name, admin_code } = req.body as {
    admin_name: string;
    admin_code: string;
  };
  const sb = getSupabase();

  const { data: credsData, error: credsError } = await sb
    .from("admin_credentials")
    .select("code_hash, user_id")
    .eq("admin_name", admin_name)
    .limit(1);

  if (credsError || !credsData || credsData.length === 0) {
    throw ApiError.unauthorized("Invalid admin name or code");
  }

  const creds = credsData[0] as { code_hash: string; user_id: number };

  const isValid = await verifyAdminCode(admin_code, creds.code_hash);
  if (!isValid) {
    throw ApiError.unauthorized("Invalid admin name or code");
  }

  // Get user
  const { data: userData, error: userError } = await sb
    .from("users")
    .select("id, supabase_uid, full_name, email, status")
    .eq("id", creds.user_id)
    .limit(1);

  if (userError || !userData || userData.length === 0) {
    throw ApiError.unauthorized("Admin user profile not found");
  }

  const user = userData[0] as {
    id: number;
    supabase_uid: string;
    full_name: string;
    email: string;
    status: string;
  };

  if (user.status !== "active") {
    throw ApiError.forbidden("Admin account is inactive");
  }

  const token = createAdminToken(user.supabase_uid);

  const response: TokenResponse = {
    access_token: token,
    token_type: "bearer",
    user_id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: "admin",
  };

  res.json(response);
}

// ---------------------------------------------------------------------------
// OAuth2 Token
// ---------------------------------------------------------------------------

export async function tokenForm(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username: string; password: string };
  const sb = getSupabase();

  const authClient = getAuthClient();
  const { data: signInData, error: signInError } =
    await authClient.auth.signInWithPassword({
      email: username,
      password,
    });

  if (signInError || !signInData.user) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const user = await getAppUser(sb, signInData.user.id);
  const roleName = await getRoleName(sb, user.role_id);

  if (roleName === "admin") {
    throw ApiError.forbidden("Admin accounts must use the admin panel");
  }

  res.json({
    access_token: signInData.session.access_token,
    token_type: "bearer",
  });
}

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------

export function me(req: Request, res: Response): void {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const userOut: UserOut = {
    id: req.user.id,
    full_name: req.user.fullName,
    email: req.user.email,
    role: req.user.roleName,
    status: req.user.status,
    created_at: req.user.createdAt,
  };

  res.json(userOut);
}
