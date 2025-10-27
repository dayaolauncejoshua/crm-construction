// server/services/2fa-service.ts
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import bcrypt from "bcrypt";

// 🔐 Encryption key and IV for 2FA secrets
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-secret-encryption-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

// Generate a consistent key and IV from the encryption key
function getKeyAndIV() {
  // Create a 32-byte key from the encryption key
  const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  // Create a 16-byte IV from the encryption key
  const iv = crypto.createHash("md5").update(ENCRYPTION_KEY).digest();
  return { key, iv };
}

/**
 * Generate a new 2FA secret and QR code
 */
export async function generate2FASecret(userEmail: string, userName: string) {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `LeadFlow CRM (${userEmail})`,
    issuer: "LeadFlow CRM",
    length: 32,
  });

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    secret: secret.base32, // Store this encrypted in DB
    qrCode: qrCodeUrl,
    manualEntryKey: secret.base32, // For manual entry in authenticator
  };
}

/**
 * Verify a 2FA code
 */
export function verify2FACode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: token,
    window: 2, // Allow 2 steps before/after (1 minute tolerance)
  });
}

/**
 * Generate backup codes
 */
export async function generateBackupCodes(): Promise<{
  codes: string[];
  hashedCodes: string[];
}> {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  // Generate 10 backup codes
  for (let i = 0; i < 10; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);

    // Hash the code for storage
    const hashed = await bcrypt.hash(code, 10);
    hashedCodes.push(hashed);
  }

  return { codes, hashedCodes };
}

/**
 * Verify a backup code
 */
export async function verifyBackupCode(
  hashedCodes: string[],
  inputCode: string
): Promise<{ valid: boolean; remainingCodes: string[] }> {
  // Try to match against each hashed code
  for (let i = 0; i < hashedCodes.length; i++) {
    const isValid = await bcrypt.compare(inputCode, hashedCodes[i]);
    if (isValid) {
      // Remove the used code
      const remainingCodes = hashedCodes.filter((_, index) => index !== i);
      return { valid: true, remainingCodes };
    }
  }

  return { valid: false, remainingCodes: hashedCodes };
}

/**
 * Encrypt 2FA secret for storage (FIXED - uses createCipheriv)
 */
export function encrypt2FASecret(secret: string): string {
  const { key, iv } = getKeyAndIV();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Decrypt 2FA secret from storage (FIXED - uses createDecipheriv)
 */
export function decrypt2FASecret(encryptedSecret: string): string {
  const { key, iv } = getKeyAndIV();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedSecret, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}