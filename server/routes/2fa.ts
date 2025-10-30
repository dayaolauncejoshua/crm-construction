// server/routes/2fa.ts
import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import {
  generate2FASecret,
  verify2FACode,
  generateBackupCodes,
  verifyBackupCode,
  encrypt2FASecret,
  decrypt2FASecret,
} from "../services/2fa-service";
import { timestamp } from "drizzle-orm/mysql-core";

const router = Router();

// Middleware to check authentication
const requireAuth = (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// ==================== SETUP 2FA ====================
router.post("/api/2fa/setup", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId;

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if 2FA already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        error:
          "2FA is already enabled. Please disable it first to set up again.",
        alreadyEnabled: true,
      });
    }

    // Generate secret and QR code
    const { secret, qrCode, manualEntryKey } = await generate2FASecret(
      user.email!,
      `${user.firstName} ${user.lastName}`
    );

    // Store secret temporarily in session (not in DB yet, until verified)
    (req.session as any).pendingTwoFactorSecret = secret;

    await new Promise((resolve, reject) => {
      req.session.save((err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    console.log("✅ 2FA setup initiated for:", user.email);

    res.json({
      qrCode,
      manualEntryKey,
      message: "Scan QR code with your authenticator app",
    });
  } catch (error: any) {
    console.error("❌ 2FA setup error:", error);
    res.status(500).json({ error: "Failed to setup 2FA" });
  }
});

// ==================== VERIFY & ENABLE 2FA ====================
router.post("/api/2fa/verify-setup", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: "Invalid code format" });
    }

    // Get pending secret from session
    const pendingSecret = (req.session as any).pendingTwoFactorSecret;
    if (!pendingSecret) {
      return res.status(400).json({ error: "No pending 2FA setup found" });
    }

    // Verify the code
    const isValid = verify2FACode(pendingSecret, code);

    if (!isValid) {
      await storage.logUserActivity(userId, "2fa_enable_failed", "security", {
        reason: "incorrect_code",
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({ error: "Invalid verification code" });
    }

    // Generate backup codes
    const { codes, hashedCodes } = await generateBackupCodes();

    // Encrypt secret for storage
    const encryptedSecret = encrypt2FASecret(pendingSecret);

    // Enable 2FA
    await db
      .update(users)
      .set({
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: hashedCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Add this: Log 2FA enable action
    await storage.logUserActivity(userId, "2fa_enabled", "security", {
      timestamp: new Date().toISOString(),
      method: "totp",
    });

    // Clear pending secret from session
    delete (req.session as any).pendingTwoFactorSecret;

    await new Promise((resolve) => {
      req.session.save(() => resolve(true));
    });

    console.log("✅ 2FA enabled for user:", userId);

    res.json({
      success: true,
      backupCodes: codes, // Show these ONCE - user must save them
      message: "2FA enabled successfully",
    });
  } catch (error: any) {
    console.error("❌ 2FA verification error:", error);
    res.status(500).json({ error: "Failed to verify 2FA" });
  }
});

// ==================== VERIFY 2FA CODE (DURING LOGIN) ====================
router.post("/api/2fa/verify", async (req, res) => {
  try {
    const { userId, code, useBackupCode } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA not enabled for this user" });
    }

    let isValid = false;

    if (useBackupCode) {
      // Verify backup code
      const result = await verifyBackupCode(
        user.twoFactorBackupCodes as string[],
        code
      );
      isValid = result.valid;

      if (isValid) {
        // Update remaining backup codes
        await db
          .update(users)
          .set({
            twoFactorBackupCodes: result.remainingCodes,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(
          "✅ Backup code used. Remaining:",
          result.remainingCodes.length
        );
      }
    } else {
      // Decrypt secret and verify TOTP code
      const decryptedSecret = decrypt2FASecret(user.twoFactorSecret);
      isValid = verify2FACode(decryptedSecret, code);
    }

    if (!isValid) {
      console.log("❌ Invalid 2FA code for user:", userId);
      return res.status(401).json({ error: "Invalid code" });
    }

    console.log("✅ 2FA verification successful for user:", userId);

    res.json({
      success: true,
      message: "2FA verification successful",
    });
  } catch (error: any) {
    console.error("❌ 2FA verification error:", error);
    res.status(500).json({ error: "Failed to verify 2FA code" });
  }
});

// ==================== DISABLE 2FA ====================
router.post("/api/2fa/disable", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    const { password, code } = req.body; // ✅ ADD: code parameter

    console.log(`🔐 [2FA DISABLE] Request for user: ${userId}`);

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA is not enabled" });
    }

    // ✅ Determine account type
    const isOAuthOnly = !user.passwordHash && user.oauthProvider;

    console.log(`🔍 [2FA DISABLE] Account type:`, {
      hasPassword: !!user.passwordHash,
      isOAuthOnly,
    });

    // ✅ STEP 1: Verify password (if account has one)
    if (user.passwordHash) {
      if (!password) {
        return res.status(400).json({ error: "Password required" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        console.log(`❌ [2FA DISABLE] Invalid password`);

        await storage.logUserActivity(
          userId,
          "2fa_disable_failed",
          "security",
          {
            reason: "incorrect_password",
            timestamp: new Date().toISOString(),
          }
        );

        return res.status(401).json({ error: "Incorrect password" });
      }

      console.log(`✅ [2FA DISABLE] Password verified`);
    } else {
      console.log(
        `ℹ️ [2FA DISABLE] OAuth-only account, skipping password check`
      );
    }

    // ✅ STEP 2: Verify current 2FA code (REQUIRED for ALL accounts)
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: "Current 2FA code required" });
    }

    const decryptedSecret = decrypt2FASecret(user.twoFactorSecret);
    const isValidCode = verify2FACode(decryptedSecret, code);

    if (!isValidCode) {
      console.log(`❌ [2FA DISABLE] Invalid 2FA code`);

      await storage.logUserActivity(userId, "2fa_disable_failed", "security", {
        reason: "incorrect_2fa_code",
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({ error: "Invalid 2FA code" });
    }

    console.log(`✅ [2FA DISABLE] 2FA code verified`);

    // ✅ STEP 3: Disable 2FA
    await db
      .update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // ✅ Log the action
    await storage.logUserActivity(userId, "2fa_disabled", "security", {
      timestamp: new Date().toISOString(),
      accountType: isOAuthOnly ? "oauth" : "password",
    });

    console.log(
      `✅ [2FA DISABLE] 2FA disabled successfully for user: ${userId}`
    );

    res.json({
      success: true,
      message: "Two-factor authentication has been disabled",
    });
  } catch (error: any) {
    console.error("❌ [2FA DISABLE] Error:", error);
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
});

// ==================== REGENERATE BACKUP CODES ====================
router.post(
  "/api/2fa/regenerate-backup-codes",
  requireAuth,
  async (req, res) => {
   try{
    const userId = (req.session as any).userId;
    const { password, code } = req.body;

    console.log(`🔄 [REGENERATE CODES] Request for user: ${userId}`);

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found"});
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret){
      return res.status(400).json({ error: "2FA is not enabled"});
    }

    // Determine account type
    const isOAuthOnly = !user.passwordHash && user.oauthProvider;

    console.log(`🔍 [REGENERATE CODES] Account type:`, {
      hasPassword: !!user.passwordHash,
      isOAuthOnly,
    });

    // ✅ STEP 1: Verify password (if account has one)
    if (user.passwordHash){
      if(!password) {
         return res.status(400).json({ error: "Password required" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if(!isPasswordValid){
        console.log(`❌ [REGENERATE CODES] Invalid password`);

        await storage.logUserActivity(userId, "backup_codes_regenerate_failed", "security", {
          reason: "incorrect_password",
          timestamp: new Date().toISOString(),
        });

        return res.status(401).json({ error: "Incorrect password" });
      }

      console.log(`✅ [REGENERATE CODES] Password verified`);
    } else {
      console.log(`ℹ️ [REGENERATE CODES] OAuth-only account, skipping password check`)
    }

    // ✅ STEP 2: Verify current 2FA code (REQUIRED for ALL accounts)
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: "Current 2FA code required" });
    }

    const decryptSecret = decrypt2FASecret(user.twoFactorSecret);
    const isValidCode = verify2FACode(decryptSecret, code);

    if (!isValidCode) {
      console.log(`❌ [REGENERATE CODES] Invalid 2FA code`);

      await storage.logUserActivity(userId, "backup_codes_regenerate_failed", "security", {
        reason: "incorrect_2fa_code",
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({ error: "Invalid 2FA code"});
    }

    console.log(`✅ [REGENERATE CODES] 2FA code verified`);

    // Step 3: Generate new backup codes
    const { codes, hashedCodes } = await generateBackupCodes();

    // Update backup codes
    await db.update(users).set({
      twoFactorBackupCodes: hashedCodes,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    // Log the action
    await storage.logUserActivity(userId, "2fa_backup_codes_regenerated", "security", {
      timestamp: new Date().toISOString(),
      accountType: isOAuthOnly ? "oauth" : "password",
    });

    console.log(`✅ [REGENERATE CODES] Backup codes regenerated for user: ${userId}`)

    res.json({
      success: true,
      backupCodes: codes,
      message: "New backup codes generated successfully",
    });

   } catch (error: any) {
    console.error("❌ [REGENERATE CODES] Error:", error);
    res.status(500).json({ error: "Failed to regenerate backup codes"});
   }
  
});

export default router;
