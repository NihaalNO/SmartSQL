import { Request, Response } from "express";
import { getSupabase, getAuthClient } from "../config/supabase";
import { ApiError } from "../utils/ApiError";
import { sendEmail, getEmailVerificationTemplate, getPasswordResetTemplate } from "../services/email.service";
import { SupabaseClient } from "@supabase/supabase-js";
import type { TokenResponse, UserOut } from "../types/auth.types";
import * as jwt from "jsonwebtoken";
import { env } from "../config/env";
import axios from "axios";

type AppUser = {
  id: number;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  avatar_url?: string | null;
};

async function getAppUser(
  sb: SupabaseClient,
  supabaseUid: string
): Promise<AppUser> {
  const { data, error } = await sb
    .from("users")
    .select("id, full_name, email, status, created_at, updated_at, avatar_url")
    .eq("supabase_uid", supabaseUid)
    .limit(1);

  if (error || !data || data.length === 0) {
    throw ApiError.unauthorized("User profile not found");
  }

  const user = data[0] as AppUser;

  if (user.status !== "active") {
    throw ApiError.unauthorized("Account inactive");
  }

  return user;
}

function tokenResponse(accessToken: string, user: AppUser): TokenResponse {
  return {
    access_token: accessToken,
    token_type: "bearer",
    user_id: user.id,
    full_name: user.full_name,
    email: user.email,
    email_verified: true,
    created_at: user.created_at,
    updated_at: user.updated_at,
    avatar_url: user.avatar_url,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { full_name, email, password } = req.body as {
    full_name: string;
    email: string;
    password: string;
  };

  const sb = getSupabase();

  const existingUser = await sb.from("users").select("id").eq("email", email).limit(1);
  if (existingUser.data && existingUser.data.length > 0) {
    throw ApiError.badRequest("Email already registered. Please try a different email.");
  }

  try {
    const { data: authUserData, error: authUserError } = await (sb.auth.admin as any).getUserByEmail(email);
    if (!authUserError && authUserData) {
      throw ApiError.badRequest("Email already registered. Please try a different email.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
  }

  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw ApiError.badRequest(authError?.message ?? "Auth creation failed");
  }

  const supabaseUid = authData.user.id;

  try {
    const { data: userData, error: insertError } = await sb
      .from("users")
      .insert({
        supabase_uid: supabaseUid,
        full_name,
        email,
      })
      .select("id, full_name, email, status, created_at")
      .limit(1);

    if (insertError || !userData || userData.length === 0) {
      throw new Error(insertError?.message ?? "Profile creation failed");
    }

    const user = userData[0] as { id: number; full_name: string; email: string };
    const verificationToken = jwt.sign(
      { userId: user.id, email: user.email, type: "email_verification" },
      env.EMAIL_VERIFICATION_SECRET,
      { expiresIn: "1h" }
    );

    const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your SmartSQL email",
      html: getEmailVerificationTemplate(verificationUrl, user.full_name),
    }).catch(() => {});

    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account, then log in.",
      user_id: user.id,
      email: user.email,
    });
  } catch (err: unknown) {
    try {
      await sb.auth.admin.deleteUser(supabaseUid);
    } catch {
      // Ignore cleanup errors.
    }
    throw err;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const sb = getSupabase();

  const authClient = getAuthClient();
  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user || !signInData.session) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const { data: authUserData } = await (sb.auth.admin as any).getUserByEmail(email);
  if (!authUserData || !authUserData.user.email_confirmed_at) {
    throw ApiError.unauthorized("Please verify your email before logging in");
  }

  const userApp = await getAppUser(sb, signInData.user.id);
  res.json(tokenResponse(signInData.session.access_token, userApp));
}

export async function loginWithGoogle(req: Request, res: Response): Promise<void> {
  const { code, redirect_uri } = req.body as { code: string; redirect_uri?: string };

  if (!code) {
    throw ApiError.badRequest("Authorization code is required");
  }

  const authClient = getAuthClient();

  try {
    let sessionData: Awaited<ReturnType<typeof authClient.auth.exchangeCodeForSession>>["data"];
    let exchangeError: Awaited<ReturnType<typeof authClient.auth.exchangeCodeForSession>>["error"] | null = null;

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
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const idToken = googleTokenRes.data?.id_token as string | undefined;
      if (!idToken) {
        throw ApiError.unauthorized("Google authentication failed");
      }

      const signInResult = await authClient.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      sessionData = signInResult.data;
      exchangeError = signInResult.error;
    } else {
      const exchangeResult = await authClient.auth.exchangeCodeForSession(code);
      sessionData = exchangeResult.data;
      exchangeError = exchangeResult.error;
    }

    if (exchangeError || !sessionData.session || !sessionData.user.email) {
      throw ApiError.unauthorized(exchangeError?.message ?? "Failed to exchange code for session");
    }

    const { session, user } = sessionData;
    const email = user.email as string;
    const sb = getSupabase();
    const baseSelect = "id, full_name, email, status, created_at, updated_at, avatar_url";

    const { data: userData } = await sb
      .from("users")
      .select(baseSelect)
      .eq("email", email)
      .limit(1);

    let appUser: AppUser;

    if (!userData || userData.length === 0) {
      const { data: newUserData, error: insertError } = await sb
        .from("users")
        .insert({
          supabase_uid: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0],
          email,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        })
        .select(baseSelect)
        .limit(1);

      if (insertError || !newUserData || newUserData.length === 0) {
        throw ApiError.badRequest(insertError?.message ?? "Failed to create user profile");
      }

      appUser = newUserData[0] as AppUser;
    } else {
      const existing = userData[0] as AppUser;
      if (existing.status !== "active") {
        throw ApiError.unauthorized("Account is inactive");
      }

      if (!existing.avatar_url && user.user_metadata?.avatar_url) {
        await sb.from("users").update({ avatar_url: user.user_metadata.avatar_url }).eq("id", existing.id);
      }

      appUser = existing;
    }

    res.json(tokenResponse(session.access_token, appUser));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized("Authentication failed");
  }
}

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

    if (payload.type !== "email_verification") {
      throw ApiError.badRequest("Invalid token type");
    }

    const sb = getSupabase();
    const { data: userData, error: userError } = await sb
      .from("users")
      .select("id, supabase_uid")
      .eq("id", payload.userId)
      .limit(1);

    if (userError || !userData || userData.length === 0) {
      throw ApiError.notFound("User not found");
    }

    const user = userData[0] as { id: number; supabase_uid: string };
    const { error: updateError } = await sb.auth.admin.updateUserById(user.supabase_uid, {
      email_confirm: true,
    });

    if (updateError) {
      throw ApiError.badRequest(updateError.message);
    }

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.badRequest("Invalid or expired verification token");
    }
    throw error;
  }
}

export async function resendVerificationEmail(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const sb = getSupabase();
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

  const verificationToken = jwt.sign(
    { userId: user.id, email: user.email, type: "email_verification" },
    env.EMAIL_VERIFICATION_SECRET,
    { expiresIn: "1h" }
  );

  const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your SmartSQL email",
    html: getEmailVerificationTemplate(verificationUrl, user.full_name),
  });

  res.json({ message: "Verification email sent. Please check your inbox." });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const sb = getSupabase();

  const { data: userData, error: userError } = await sb
    .from("users")
    .select("id, full_name, email")
    .eq("email", email)
    .limit(1);

  if (userError || !userData || userData.length === 0) {
    res.json({ message: "If an account with that email exists, we've sent a password reset link." });
    return;
  }

  const user = userData[0] as { id: number; full_name: string; email: string };
  const resetToken = jwt.sign(
    { userId: user.id, email: user.email, type: "password_reset" },
    env.PASSWORD_RESET_SECRET,
    { expiresIn: "1h" }
  );

  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your SmartSQL password",
    html: getPasswordResetTemplate(resetUrl, user.full_name),
  });

  res.json({ message: "If an account with that email exists, we've sent a password reset link." });
}

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

    if (payload.type !== "password_reset") {
      throw ApiError.badRequest("Invalid token type");
    }

    const sb = getSupabase();
    const { data: userData, error: userError } = await sb
      .from("users")
      .select("supabase_uid")
      .eq("id", payload.userId)
      .limit(1);

    if (userError || !userData || userData.length === 0) {
      throw ApiError.notFound("User not found");
    }

    const { error: updateError } = await sb.auth.admin.updateUserById(userData[0].supabase_uid, {
      password,
    });

    if (updateError) {
      throw ApiError.badRequest(updateError?.message ?? "Failed to update password");
    }

    res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.badRequest("Invalid or expired reset token");
    }
    throw error;
  }
}

export async function tokenForm(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username: string; password: string };
  const sb = getSupabase();

  const authClient = getAuthClient();
  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email: username,
    password,
  });

  if (signInError || !signInData.user || !signInData.session) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  await getAppUser(sb, signInData.user.id);

  res.json({
    access_token: signInData.session.access_token,
    token_type: "bearer",
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  let emailVerified = false;

  try {
    const sb = getSupabase();
    const { data: authUser } = await sb.auth.admin.getUserById(req.user.supabaseUid);
    emailVerified = !!authUser?.user?.email_confirmed_at;
  } catch {
    // Gracefully fall back to false if we can't check.
  }

  const userOut: UserOut = {
    id: req.user.id,
    full_name: req.user.fullName,
    email: req.user.email,
    status: req.user.status,
    email_verified: emailVerified,
    created_at: req.user.createdAt,
    updated_at: req.user.updatedAt,
    avatar_url: req.user.avatarUrl,
  };

  res.json(userOut);
}
