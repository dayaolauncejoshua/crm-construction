// server/auth.ts

import { Router } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const router = Router();
const SALT_ROUNDS = 10;

// Signup
router.post("/api/auth/signup", async (req, res) => {
  try {
    console.log("=== SIGNUP DEBUG ===");
    console.log("Request body:", req.body);

    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash: passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: "user",
        emailVerified: false, // ✅ ADD THIS - Not verified yet
      })
      .returning();

    // ✅ SEND VERIFICATION EMAIL
    try {
      const { sendVerificationEmail } = await import(
        "./services/email-verification"
      );
      await sendVerificationEmail(
        newUser.email!,
        newUser.id,
        newUser.firstName || "User"
      );
      console.log(`✅ Verification email sent to: ${newUser.email}`);
    } catch (emailError) {
      console.error("⚠️ Failed to send verification email:", emailError);
      // Don't fail signup if email fails
    }

    // Create session (use type assertion)
    (req.session as any).userId = newUser.id;

    console.log("✅ User created:", newUser.email);

    res.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        emailVerified: newUser.emailVerified, // ✅ ADD THIS - Include verification status
      },
      
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login
router.post("/api/auth/login", async (req, res) => {
  try {
    console.log("=== LOGIN BACKEND DEBUG ===");
    console.log("Request body:", req.body);
    console.log("Email:", req.body?.email);
    console.log("Password:", req.body?.password ? "***" : "missing");

    const { email, password } = req.body;

    if (!email || !password) {
      console.log("❌ Missing credentials");
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user
    console.log("🔍 Looking up user:", email.toLowerCase());
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user || !user.passwordHash) {
      console.log("❌ User not found or no password hash");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("✅ User found:", user.email);

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      console.log("❌ Password incorrect");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("✅ Password valid");

    // ✅ OPTIONAL: Check email verification
    // Uncomment these lines if you want to REQUIRE verification before login:
    /*
    if (!user.emailVerified) {
      console.log("⚠️ Email not verified");
      return res.status(403).json({ 
        error: "Please verify your email before logging in",
        emailNotVerified: true,
        email: user.email,
      });
    }
    */

    // Update login stats
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        loginCount: (user.loginCount || 0) + 1,
      })
      .where(eq(users.id, user.id));

    // Create session (use type assertion)
    (req.session as any).userId = user.id;

    console.log("✅ Session created, userId:", user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified, // ✅ ADD THIS - Include verification status
      },
    });
  } catch (error: any) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout
router.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// Get current user
router.get("/api/auth/me", async (req, res) => {
  try {
    const userId = (req.session as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified, // ✅ ADD THIS
        isTrialActive: user.isTrialActive,
        trialEndsAt: user.trialEndsAt,
      },
    });
  } catch (error: any) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
