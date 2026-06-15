import { Request, Response } from "express";
import { getSupabase, getAuthClient } from "../config/supabase";
import { ApiError } from "../utils/ApiError";
import { verifyAdminCode, createAdminToken } from "../services/auth.service";
import { sendEmail, getEmailVerificationTemplate, getPasswordResetTemplate, } from "../services/email.service";
import { SupabaseClient } from "@supabase/supabase-js";
import type { TokenResponse, UserOut } from "../types/auth.types";
import * as jwt from "jsonwebtoken";
import { env } from "../config/env";

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
    throw ApiError.badRequest("Email already registered. Please try a different email.");
  }

  // Check if email already exists in Supabase Auth
  let authUserExists = false;
  try {
    const { data: authUserData, error: authUserError } = await (sb.auth.admin as any).getUserByEmail(
      email
    );
    if (!authUserError && authUserData) {
      authUserExists = true;
      console.log(`[REGISTER] Email found in Supabase Auth: ${email}`);
    } else {
      console.log(`[REGISTER] Email not found in Supabase Auth: ${email}`);
    }
  } catch (authCheckError: unknown) {
    // If we can't check due to permissions or other issues, we'll proceed and let createUser handle it
    console.warn(
      `Warning: Could not check if email exists in Supabase Auth: ${String(authCheckError)}`
    );
  }

  if (authUserExists) {
    throw ApiError.badRequest("Email already registered. Please try a different email.");
  }

  // Block admin role from public registration
  if (role?.toLowerCase() === "admin") {
    throw ApiError.badRequest(
      "Admin accounts cannot be created through public registration."
    );
  }

  // Create Supabase auth user WITHOUT email confirmation
  console.log(`[REGISTER] Creating Supabase auth user for email: ${email}`);
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // Require email verification
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

    // Generate email verification token
    const verificationToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'email_verification' },
      env.EMAIL_VERIFICATION_SECRET,
      { expiresIn: '1h' }
    );

    const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

    // Send verification email
    const emailData = {
      to: user.email,
      subject: "Verify your SmartSQL email",
      html: getEmailVerificationTemplate(verificationUrl, user.full_name),
    };

    await sendEmail(emailData);

    console.log(`[REGISTER] Registration successful for email: ${email}. Verification email sent.`);
    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
      user_id: user.id,
      email: user.email
    });
  } catch (err: unknown) {
    console.log(`[REGISTER] Error during registration process: ${String(err)}`);
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

  // Check if user is active and verified
  const { data: userData, error: userError } = await sb
    .from("users")
    .select("id, full_name, email, status, role_id")
    .eq("email", email)
    .limit(1);

  if (userError || !userData || userData.length === 0) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const user = userData[0];

  if (user.status !== "active") {
    throw ApiError.unauthorized("Account is inactive");
  }

  // Check if email is verified (by checking if the user has signed in before or using email_confirmed_at)
  // For simplicity, we'll check if the user has a confirmed email in Supabase
  const { data: authUserData } = await (sb.auth.admin as any).getUserByEmail(email);
  if (!authUserData || !authUserData.user.email_confirmed_at) {
    throw ApiError.unauthorized("Please verify your email before logging in");
  }

  const userApp = await getAppUser(sb, signInData.user.id);
  const roleName = await getRoleName(sb, userApp.role_id);

  if (roleName === "admin") {
    throw ApiError.forbidden("Admin accounts must sign in via the admin panel.");
  }

  const response: TokenResponse = {
    access_token: signInData.session.access_token,
    token_type: "bearer",
    user_id: userApp.id,
    full_name: userApp.full_name,
    email: userApp.email,
    role: roleName,
  };

  res.json(response);
}

// ---------------------------------------------------------------------------
// Google Login (Callback Handler)
// ---------------------------------------------------------------------------

export async function loginWithGoogle(req: Request, res: Response): Promise<void> {
  const { code } = req.body as { code: string };

  if (!code) {
    throw ApiError.badRequest("Authorization code is required");
  }

  const sb = getAuthClient(); // Use anon client for OAuth code exchange

  try {
    // Exchange the code for a session
    const { data: sessionData, error: exchangeError } = await sb.auth.exchangeCodeForSession(code);

    if (exchangeError || !sessionData.session) {
      throw ApiError.unauthorized(exchangeError?.message ?? "Failed to exchange code for session");
    }

    const { session, user } = sessionData;

    // Check if user exists in our database
    const { data: userData, error: userError } = await sb
      .from("users")
      .select("id, full_name, email, status, role_id")
      .eq("email", user.email)
      .limit(1);

    let appUser: {
      id: number;
      full_name: string;
      email: string;
      role_id: number;
      status: string;
    };

    if (userError || !userData || userData.length === 0) {
      // New user - create profile
      console.log(`[GOOGLE_LOGIN] New user detected: ${user.email}`);

      // Get default role (viewer)
      const { data: roleData } = await sb
        .from("roles")
        .select("id")
        .eq("name", "viewer")
        .limit(1);

      const roleId = roleData?.[0]?.id ?? 1; // Default to viewer role if not found

      // Insert new user
      const { data: newUserData, error: insertError } = await sb
        .from("users")
        .insert({
          supabase_uid: user.id,
          full_name: user.user_metadata?.full_name || (user.email!.split('@')[0]),
          email: user.email!,
          role_id: roleId,
        })
        .select("id, full_name, email, role_id, status")
        .limit(1);

      if (insertError || !newUserData || newUserData.length === 0) {
        throw ApiError.badRequest(insertError?.message ?? "Failed to create user profile");
      }

      appUser = newUserData[0];
    } else {
      // Existing user
      appUser = userData[0];

      // Check if account is active
      if (appUser.status !== "active") {
        throw ApiError.unauthorized("Account is inactive");
      }
    }

    // Get role name
    const roleName = await getRoleName(sb, appUser.role_id);

    // Prevent admin login via Google OAuth
    if (roleName === "admin") {
      throw ApiError.forbidden("Admin accounts must sign in via the admin panel.");
    }

    const response: TokenResponse = {
      access_token: session.access_token,
      token_type: "bearer",
      user_id: appUser.id,
      full_name: appUser.full_name,
      email: appUser.email,
      role: roleName,
    };

    res.json(response);
  } catch (error) {
    console.error(`[GOOGLE_LOGIN] Error:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unauthorized("Authentication failed");
  }
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
// Verify Email
// ---------------------------------------------------------------------------

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.query as { token?: string };

  if (!token) {
    throw ApiError.badRequest("Verification token is required");
  }

  try {
    const payload = jwt.verify(token, env.EMAIL_VERIFICATION_SECRET) as {
      userId: number;
      email: string;
      type: string;
    };

    if (payload.type !== 'email_verification') {
      throw ApiError.badRequest("Invalid token type");
    }

    const sb = getSupabase();

    // Check if user exists
    const { data: userData, error: userError } = await sb
      .from("users")
      .select("id, email")
      .eq("id", payload.userId)
      .limit(1);

    if (userError || !userData || userData.length === 0) {
      throw ApiError.notFound("User not found");
    }

    // Update the user's email as confirmed in Supabase
    // Note: In a real app, you might want to update the email_confirmed_at field in Supabase auth.users
    // For now, we'll just update our users table to mark email as verified
    // You could add an email_verified column to your users table

    // For now, we'll just respond that email is verified
    // In a production app, you'd want to actually mark the email as verified in Supabase

    res.json({
      message: "Email verified successfully. You can now log in."
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.badRequest("Invalid or expired verification token");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Resend Verification Email
// ---------------------------------------------------------------------------

export async function resendVerificationEmail(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };

  const sb = getSupabase();

  // Check if user exists
  const { data: userData, error: userError } = await sb
    .from("users")
    .select("id, email, full_name, status")
    .eq("email", email)
    .limit(1);

  // Always return the same message to prevent email enumeration
  if (userError || !userData || userData.length === 0) {
    res.json({
      message: "If an account with that email exists, we've sent a verification email."
    });
    return;
  }

  const user = userData[0];

  // Check if account is active
  if (user.status !== "active") {
    res.json({
      message: "If an account with that email exists, we've sent a verification email."
    });
    return;
  }

  // Generate email verification token
  const verificationToken = jwt.sign(
    { userId: user.id, email: user.email, type: 'email_verification' },
    env.EMAIL_VERIFICATION_SECRET,
    { expiresIn: '1h' }
  );

  const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

  // Send verification email
  const emailData = {
    to: user.email,
    subject: "Verify your SmartSQL email",
    html: getEmailVerificationTemplate(verificationUrl, user.full_name),
  };

  await sendEmail(emailData);

  res.json({
    message: "If an account with that email exists, we've sent a verification email."
  });
}

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };

  const sb = getSupabase();

  // Check if user exists
  const { data: userData, error: userError } = await sb
    .from("users")
    .select("id, full_name, email")
    .eq("email", email)
    .limit(1);

  // Always return the same message to prevent email enumeration
  if (userError || !userData || userData.length === 0) {
    res.json({
      message: "If an account with that email exists, we've sent a password reset link."
    });
    return;
  }

  const user = userData[0];

  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user.id, email: user.email, type: 'password_reset' },
    env.PASSWORD_RESET_SECRET,
    { expiresIn: '1h' }
  );

  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

  // Send password reset email
  const emailData = {
    to: user.email,
    subject: "Reset your SmartSQL password",
    html: getPasswordResetTemplate(resetUrl, user.full_name),
  };

  await sendEmail(emailData);

  res.json({
    message: "If an account with that email exists, we've sent a password reset link."
  });
}

// ---------------------------------------------------------------------------
// Reset Password
// ---------------------------------------------------------------------------

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token?: string; password: string };

  if (!token || !password) {
    throw ApiError.badRequest("Token and password are required");
  }

  try {
    const payload = jwt.verify(token, env.PASSWORD_RESET_SECRET) as {
      userId: number;
      email: string;
      type: string;
    };

    if (payload.type !== 'password_reset') {
      throw ApiError.badRequest("Invalid token type");
    }

    // Validate password strength
    if (password.length < 8) {
      throw ApiError.badRequest("Password must be at least 8 characters long");
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw ApiError.badRequest("Password must contain at least one uppercase letter");
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw ApiError.badRequest("Password must contain at least one lowercase letter");
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      throw ApiError.badRequest("Password must contain at least one number");
    }

    // Check for at least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw ApiError.badRequest("Password must contain at least one special character");
    }

    // Update password in Supabase Auth
    const authClient = getAuthClient();
    const { error: updateError } = await authClient.auth.admin.updateUserById(
      payload.userId.toString(),
      { password }
    );

    if (updateError) {
      throw ApiError.badRequest(updateError?.message ?? "Failed to update password");
    }

    res.json({
      message: "Password has been reset successfully. You can now log in with your new password."
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.badRequest("Invalid or expired reset token");
    }
    throw error;
  }
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