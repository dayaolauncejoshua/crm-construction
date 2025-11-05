// server/services/email-verification.ts

import { config } from "dotenv";
config();

import jwt from "jsonwebtoken";
import sgMail from '@sendgrid/mail';

const EMAIL_TOKEN_SECRET =
  process.env.EMAIL_TOKEN_SECRET || "change-this-secret-key";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5000";

// ✅ Initialize SendGrid (same as email.ts)
const apiKey = process.env.EMAIL_PASSWORD; // SendGrid API key
const emailFrom = process.env.EMAIL_FROM;

console.log("📧 [EMAIL VERIFICATION] Initializing SendGrid");
console.log("  API Key:", apiKey ? "✅ Set" : "❌ Missing");
console.log("  From:", emailFrom);

if (!apiKey) {
  console.error("❌ [EMAIL VERIFICATION] SendGrid API key not found!");
} else {
  sgMail.setApiKey(apiKey);
  console.log("✅ [EMAIL VERIFICATION] SendGrid ready");
}

// Parse EMAIL_FROM to extract email and name
let fromEmail = '';
let fromName = '';

if (emailFrom) {
  const fromMatch = emailFrom.match(/"?([^"<]+)"?\s*<([^>]+)>/);
  if (fromMatch) {
    fromName = fromMatch[1].trim();
    fromEmail = fromMatch[2].trim();
  } else {
    fromEmail = emailFrom.trim();
    fromName = 'AI Lead System';
  }
}

// Generate verification token (expires in 24 hours)
export function generateVerificationToken(
  userId: string,
  email: string
): string {
  return jwt.sign(
    { userId, email, type: "email_verification" },
    EMAIL_TOKEN_SECRET,
    { expiresIn: "24h" }
  );
}

// Generate password reset token (expires in 1 hour)
export function generatePasswordResetToken(
  userId: string,
  email: string
): string {
  return jwt.sign(
    { userId, email, type: "password_reset" },
    EMAIL_TOKEN_SECRET,
    { expiresIn: "1h" }
  );
}

// Verify token
export function verifyToken(token: string): {
  userId: string;
  email: string;
  type: string;
} {
  try {
    const decoded = jwt.verify(token, EMAIL_TOKEN_SECRET) as {
      userId: string;
      email: string;
      type: string;
    };
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

// Email Templates
function getVerificationEmailHTML(
  verificationLink: string,
  firstName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header with gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                  <div style="width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    <span style="font-size: 32px;">🏗️</span>
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Verify Your Email</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 16px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                    Hi ${firstName},
                  </p>
                  <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                    Welcome to <strong>AI Lead System</strong>! We're excited to have you on board. Click the button below to verify your email address and get started.
                  </p>

                  <!-- CTA Button -->
                  <table role="presentation" style="width: 100%;">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${verificationLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                          Verify Email Address
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 24px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 8px 0 0; color: #2563eb; font-size: 13px; word-break: break-all;">
                    ${verificationLink}
                  </p>

                  <!-- Info Box -->
                  <div style="margin-top: 32px; padding: 16px; background-color: #f1f5f9; border-left: 4px solid #2563eb; border-radius: 4px;">
                    <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
                      <strong>⏰ This link expires in 24 hours.</strong><br>
                      If you didn't create an account with AI Lead System, you can safely ignore this email.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                    <strong>AI Lead System</strong> - For Construction
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    © 2025 AI Lead System. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getPasswordResetEmailHTML(
  resetLink: string,
  firstName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                  <div style="width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    <span style="font-size: 32px;">🔐</span>
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 16px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                    Hi ${firstName},
                  </p>
                  <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password for your AI Lead System account. Click the button below to create a new password.
                  </p>

                  <!-- CTA Button -->
                  <table role="presentation" style="width: 100%;">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${resetLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 24px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 8px 0 0; color: #2563eb; font-size: 13px; word-break: break-all;">
                    ${resetLink}
                  </p>

                  <!-- Warning Box -->
                  <div style="margin-top: 32px; padding: 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                    <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                      <strong>⚠️ Security Notice</strong><br>
                      This link expires in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                    <strong>AI Lead System</strong> - For Construction
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    © 2025 AI Lead System. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ✅ Send verification email using SendGrid
export async function sendVerificationEmail(
  email: string,
  userId: string,
  firstName: string
): Promise<void> {
  if (!apiKey || !fromEmail) {
    throw new Error("SendGrid not configured");
  }

  const token = generateVerificationToken(userId, email);
  const verificationLink = `${FRONTEND_URL}/verify/${token}`;

  console.log(`📧 [VERIFICATION] Sending to: ${email}`);
  console.log(`🔗 [VERIFICATION] Link: ${verificationLink}`);

  try {
    await sgMail.send({
      to: email,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: "Verify Your Email - AI Lead System",
      html: getVerificationEmailHTML(verificationLink, firstName),
    });

    console.log(`✅ [VERIFICATION] Email sent to ${email}`);
  } catch (error: any) {
    console.error("❌ [VERIFICATION] Failed to send email:", error);
    
    if (error.response) {
      console.error("SendGrid Error:", error.response.body);
    }
    
    throw error;
  }
}

// ✅ Send password reset email using SendGrid
export async function sendPasswordResetEmail(
  email: string,
  userId: string,
  firstName: string
): Promise<void> {
  if (!apiKey || !fromEmail) {
    throw new Error("SendGrid not configured");
  }

  const token = generatePasswordResetToken(userId, email);
  const resetLink = `${FRONTEND_URL}/reset-password/${token}`;

  console.log(`📧 [PASSWORD RESET] Sending to: ${email}`);
  console.log(`🔗 [PASSWORD RESET] Link: ${resetLink}`);

  try {
    await sgMail.send({
      to: email,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: "Reset Your Password - AI Lead System",
      html: getPasswordResetEmailHTML(resetLink, firstName),
    });

    console.log(`✅ [PASSWORD RESET] Email sent to ${email}`);
  } catch (error: any) {
    console.error("❌ [PASSWORD RESET] Failed to send email:", error);
    
    if (error.response) {
      console.error("SendGrid Error:", error.response.body);
    }
    
    throw error;
  }
}

export const emailVerificationService = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyToken,
  generateVerificationToken,
  generatePasswordResetToken,
};