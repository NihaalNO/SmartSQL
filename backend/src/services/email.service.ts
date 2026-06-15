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
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to SmartSQL, ${safeUsername}!</h2>
      <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
      <a href="${verificationUrl}" style="display: inline-block; background-color: #004ac6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
        Verify Email
      </a>
      <p>Or copy and paste the following link into your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't create an account, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #777;">This is an automated message, please do not reply.</p>
    </div>
  `;
}

/**
 * Generates the HTML for the password reset email.
 */
export function getPasswordResetTemplate(
  resetUrl: string,
  username: string
): string {
  const safeUsername = escapeHtml(username);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Hello ${safeUsername},</p>
      <p>We received a request to reset your password for your SmartSQL account.</p>
      <p>Click the button below to choose a new password:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #004ac6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
        Reset Password
      </a>
      <p>Or copy and paste the following link into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #777;">This is an automated message, please do not reply.</p>
    </div>
  `;
}