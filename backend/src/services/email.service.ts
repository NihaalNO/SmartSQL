import sgMail from '@sendgrid/mail';
import { env } from '../config/env';

// Initialize SendGrid
sgMail.setApiKey(env.SENDGRID_API_KEY);

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

/**
 * Escapes HTML special characters to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getBrandLogoUrl(): string {
  const origin = env.NEXT_PUBLIC_APP_URL || env.FRONTEND_URL;
  return `${origin.replace(/\/$/, '')}/brand/smartsql-horizontal.svg`;
}

function getEmailShell(content: string): string {
  const logoUrl = getBrandLogoUrl();
  return `
    <div style="background:#ffffff; color:#171717; font-family: Inter, Arial, sans-serif; margin:0; padding:32px 16px;">
      <div style="max-width:600px; margin:0 auto; border:1px solid #e5e5e5; border-radius:12px; overflow:hidden;">
        <div style="padding:24px 28px 18px; border-bottom:1px solid #ededed;">
          <img src="${logoUrl}" width="141" height="36" alt="SmartSQL" style="display:block; border:0; outline:none; text-decoration:none;" />
        </div>
        <div style="padding:28px;">
          ${content}
        </div>
        <div style="height:3px; background:#00d4a4;"></div>
        <div style="padding:18px 28px; background:#fafafa; border-top:1px solid #ededed;">
          <p style="margin:0; color:#888888; font-size:12px; line-height:18px;">This is an automated SmartSQL message. Please do not reply.</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Sends an email using SendGrid.
 */
export async function sendEmail(data: EmailData): Promise<void> {
  try {
    await sgMail.send({
      to: data.to,
      from: env.SENDGRID_FROM_EMAIL,
      subject: data.subject,
      html: data.html,
    });
  } catch (error: any) {
    // Log the error and throw a custom error
    console.error('SendGrid error:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error('Failed to send email');
  }
}

/**
 * Generates the HTML for the email verification email.
 */
export function getEmailVerificationTemplate(
  verificationUrl: string,
  username: string
): string {
  const safeUsername = escapeHtml(username);
  return getEmailShell(`
      <p style="margin:0 0 10px; color:#5a5a5c; font-size:12px; font-weight:700; letter-spacing:.5px; text-transform:uppercase;">Email verification</p>
      <h2 style="margin:0 0 12px; color:#171717; font-size:24px; line-height:32px; font-weight:650;">Welcome to SmartSQL, ${safeUsername}.</h2>
      <p style="margin:0 0 20px; color:#3a3a3c; font-size:15px; line-height:24px;">Thank you for signing up. Verify your email address to start generating safe, schema-aware SQL from natural language.</p>
      <a href="${verificationUrl}" style="display:inline-block; background-color:#171717; color:#ffffff; padding:12px 18px; text-decoration:none; border-radius:8px; margin:4px 0 22px; font-size:14px; font-weight:650;">
        Verify Email
      </a>
      <p style="margin:0 0 8px; color:#5a5a5c; font-size:13px; line-height:20px;">Or copy and paste this link into your browser:</p>
      <p style="margin:0 0 18px; word-break:break-all; color:#171717; font-size:13px; line-height:20px;">${verificationUrl}</p>
      <p style="margin:0; color:#5a5a5c; font-size:13px; line-height:20px;">This link expires in 1 hour. If you did not create an account, you can ignore this email.</p>
  `);
}

/**
 * Generates the HTML for the password reset email.
 */
export function getPasswordResetTemplate(
  resetUrl: string,
  username: string
): string {
  const safeUsername = escapeHtml(username);
  return getEmailShell(`
      <p style="margin:0 0 10px; color:#5a5a5c; font-size:12px; font-weight:700; letter-spacing:.5px; text-transform:uppercase;">Password reset</p>
      <h2 style="margin:0 0 12px; color:#171717; font-size:24px; line-height:32px; font-weight:650;">Reset your SmartSQL password.</h2>
      <p style="margin:0 0 20px; color:#3a3a3c; font-size:15px; line-height:24px;">Hello ${safeUsername}, we received a request to reset your password. Use the secure link below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block; background-color:#171717; color:#ffffff; padding:12px 18px; text-decoration:none; border-radius:8px; margin:4px 0 22px; font-size:14px; font-weight:650;">
        Reset Password
      </a>
      <p style="margin:0 0 8px; color:#5a5a5c; font-size:13px; line-height:20px;">Or copy and paste this link into your browser:</p>
      <p style="margin:0 0 18px; word-break:break-all; color:#171717; font-size:13px; line-height:20px;">${resetUrl}</p>
      <p style="margin:0; color:#5a5a5c; font-size:13px; line-height:20px;">This link expires in 1 hour. If you did not request this, your password will remain unchanged.</p>
  `);
}
