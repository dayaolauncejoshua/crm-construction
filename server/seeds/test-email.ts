// ✅ STEP 1: Load .env FIRST - BEFORE any imports
import { config } from "dotenv";
config();

// ✅ STEP 2: NOW import (this creates transporter with correct values)
import { sendVerificationEmail } from "../services/email-verification";

async function testEmail() {
  console.log("🔍 Environment variables:");
  console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("---");

  try {
    await sendVerificationEmail(
      "crmaileadsystem.noreply@gmail.com", // ← Change to your email
      "test-user-id",
      "John"
    );
    console.log("✅ Test email sent successfully!");
  } catch (error) {
    console.error("❌ Test email failed:", error);
  }
  process.exit(0);
}

testEmail();