import { Request, Response } from "express";
import { getSupabase, getAuthClient } from "../config/supabase";
import { ApiError } from "../utils/ApiError";
import { verifyAdminCode, createAdminToken } from "../services/auth.service";
import { sendEmail, getEmailVerificationTemplate, getPasswordResetTemplate, } from "../services/email.service";
import { SupabaseClient } from "@supabase/supabase-js";
import type { TokenResponse, UserOut } from "../types/auth.types";
import * as jwt from "jsonwebtoken";
import { env } from "../config/env";
import axios from "axios";

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

  // Check if email already exists in our users table
  const existingUser = await sb
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (existingUser.data && existingUser.data.length > 0) {
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
    }
  } catch (authCheckError: unknown) {
    // Ignore — proceed; createUser will fail if email exists
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

  // Create Supabase auth user with email confirmed to allow immediate sign-in.
  // Email verification is handled at the application level (via middleware).
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw ApiError.badRequest(authError?.message ?? "Auth creation failed");
  }

  const supabaseUid = authData.user.id;
  const resolvedRole = await resolveRole(sb, role ?? "viewer");

  try {
    // Insert into users table
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

    await sendEmail(emailData).catch(() => {});

    // Auto-login: get a session token for the newly registered user
    const authClient = getAuthClient();
    const { data: signInData, error: signInError } =
      await authClient.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.session) {
      // If auto-login fails, still return success with message
      res.status(201).json({
        message: "Registration successful. Please check your email to verify your account, then log in.",
        user_id: user.id,
        email: user.email
      });
      return;
    }

    const roleName = await getRoleName(sb, user.role_id);

    res.status(201).json({
      access_token: signInData.session.access_token,
      token_type: "bearer",
      user_id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: roleName,
      email_verified: false,
    });
  } catch (err: unknown) {
    // Best effort: clean up auth user on profile creation failure
    try {
      await sb.auth.admin.deleteUser(supabaseUid);
    } catch {
      // ignore cleanup errors
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
    email_verified: true,
  };

  res.json(response);
}

// ---------------------------------------------------------------------------
// Google Login (Callback Handler)
// ---------------------------------------------------------------------------

export async function loginWithGoogle(req: Request, res: Response): Promise<void> {
  const { code, redirect_uri } = req.body as { code: string; redirect_uri?: string };

  if (!code) {
    throw ApiError.badRequest("Authorization code is required");
  }

  const sb = getAuthClient(); // Use anon client for OAuth code exchange

  try {
    let sessionData: Awaited<ReturnType<typeof sb.auth.exchangeCodeForSession>>["data"];
    let exchangeError: Awaited<ReturnType<typeof sb.auth.exchangeCodeForSession>>["error"] | null = null;

    if (redirect_uri) {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        throw ApiError.badRequest("Google sign in is not configured");
      }

      const googleTokenRes = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri,
          grant_type: "authorization_code",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const idToken = googleTokenRes.data?.id_token as string | undefined;
      if (!idToken) {
        throw ApiError.unauthorized("Google authentication failed");
      }

      const signInResult = await sb.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      sessionData = signInResult.data;
      exchangeError = signInResult.error;
    } else {
      const exchangeResult = await sb.auth.exchangeCodeForSession(code);
      sessionData = exchangeResult.data;
      exchangeError = exchangeResult.error;
    }

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

      // Get default role (analyst — matches register page default)
      const { data: roleData } = await sb
        .from("roles")
        .select("id")
        .eq("name", "analyst")
        .limit(1);

      if (!roleData || roleData.length === 0) {
        throw new Error('Default role (analyst) not configured');
      }
      const roleId = roleData[0].id;

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
      email_verified: true,
    };

    res.json(response);
  } catch (error) {
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
    email_verified: true,
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

    // Check if user exists and get their supabase_uid
    const { data: userData, error: userError } = await sb
      .from("users")
      .select("id, supabase_uid")
      .eq("id", payload.userId)
      .limit(1);

    if (userError || !userData || userData.length === 0) {
      throw ApiError.notFound("User not found");
    }

    const user = userData[0] as { id: number; supabase_uid: string };

    // Actually confirm the user's email in Supabase Auth
    const { error: updateError } = await sb.auth.admin.updateUserById(
      user.supabase_uid,
      { email_confirm: true }
    );

    if (updateError) {
      throw ApiError.badRequest(updateError.message);
    }

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
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const sb = getSupabase();

  // Check if user exists
  const { data: userData, error: userError } = await sb
    .from("users")
    .select("id, email, full_name, status")
    .eq("id", req.user.id)
    .limit(1);

  if (userError || !userData || userData.length === 0) {
    throw ApiError.notFound("User not found");
  }

  const user = userData[0] as { id: number; email: string; full_name: string; status: string };

  if (user.status !== "active") {
    throw ApiError.forbidden("Account is inactive");
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
    message: "Verification email sent. Please check your inbox."
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

    if (!payload.userId || !payload.email) {
      throw ApiError.badRequest("Invalid token: missing user identifier");
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

    // Get user to obtain supabase UID
    const sb = getSupabase();
    const { data: userData, error: userError } = await sb
      .from("users")
      .select("supabase_uid")
      .eq("id", payload.userId)
      .limit(1);

    if (userError || !userData || userData.length === 0) {
      throw ApiError.notFound("User not found");
    }

    // Update password in Supabase Auth using service role
    const { error: updateError } = await sb.auth.admin.updateUserById(
      userData[0].supabase_uid,
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

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  let emailVerified = false;

  try {
    const sb = getSupabase();
    const { data: authUser } = await sb.auth.admin.getUserById(
      req.user.supabaseUid
    );
    emailVerified = !!authUser?.user?.email_confirmed_at;
  } catch {
    // Gracefully fall back to false if we can't check
  }

  const userOut: UserOut = {
    id: req.user.id,
    full_name: req.user.fullName,
    email: req.user.email,
    role: req.user.roleName,
    status: req.user.status,
    email_verified: emailVerified,
    created_at: req.user.createdAt,
  };

  res.json(userOut);
}
