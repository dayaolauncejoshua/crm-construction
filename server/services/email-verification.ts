//server/services/email-verification.ts

import { config } from "dotenv";
config();

import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

// ✅ Debug environment variables on load
console.log("📧 Email Service Initialization:");
console.log("  EMAIL_HOST:", process.env.EMAIL_HOST || "❌ NOT SET");
console.log("  EMAIL_PORT:", process.env.EMAIL_PORT || "❌ NOT SET");
console.log("  EMAIL_USER:", process.env.EMAIL_USER || "❌ NOT SET");
console.log("  EMAIL_PASS:", process.env.EMAIL_PASSWORD ? "✅ Set" : "❌ NOT SET");

const EMAIL_TOKEN_SECRET =
  process.env.EMAIL_TOKEN_SECRET || "change-this-secret-key";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5000";

// Create Gmail transporter with validation
if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error("❌ CRITICAL: Email configuration missing in .env file!");
  console.error("   Required: EMAIL_HOST, EMAIL_USER, EMAIL_PASS");
}

// Create Gmail transporter (using your existing config)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // ✅ ADD: Better timeout and debugging
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
  debug: true, // Enable debug output
  logger: true, // Enable logger
});

// Test email connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email service error:", error);
  } else {
    console.log("✅ Email service ready");
  }
});

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

// Send verification email
export async function sendVerificationEmail(
  email: string,
  userId: string,
  firstName: string
): Promise<void> {
  const token = generateVerificationToken(userId, email);
  const verificationLink = `${FRONTEND_URL}/verify/${token}`;

  await transporter.sendMail({
    from:
      process.env.EMAIL_FROM ||
      '"AI Lead System" <crmaileadsystem.noreply@gmail.com>',
    to: email,
    subject: "Verify Your Email - AI Lead System",
    html: getVerificationEmailHTML(verificationLink, firstName),
  });

  console.log(`✅ Verification email sent to ${email}`);
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  userId: string,
  firstName: string
): Promise<void> {
  const token = generatePasswordResetToken(userId, email);
  const resetLink = `${FRONTEND_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from:
      process.env.EMAIL_FROM ||
      '"AI Lead System" <crmaileadsystem.noreply@gmail.com>',
    to: email,
    subject: "Reset Your Password - AI Lead System",
    html: getPasswordResetEmailHTML(resetLink, firstName),
  });

  console.log(`✅ Password reset email sent to ${email}`);
}

export const emailVerificationService = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyToken,
  generateVerificationToken,
  generatePasswordResetToken,
};
