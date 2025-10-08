import { db } from "../db";
import { leads } from "@shared/schema";
import { eq } from "drizzle-orm";
import { config } from "dotenv";

config();

async function updateLeadEmail() {
  console.log("📧 Updating lead email...");

  try {
    // Find the most recent lead by phone number
    const phoneNumber = "+639542269454"; // ✅ CHANGE THIS to the phone number you're testing with
    const newEmail = "crmaileadsystem.noreply@gmail.com"; // ✅ CHANGE THIS to your real email

    const allLeads = await db.select().from(leads);
    const lead = allLeads.find(l => l.phone === phoneNumber);

    if (!lead) {
      console.error(`❌ No lead found with phone number: ${phoneNumber}`);
      console.log("Available phone numbers:");
      allLeads.forEach(l => console.log(`  - ${l.phone} (${l.firstName} ${l.lastName})`));
      return;
    }

    console.log(`✅ Found lead: ${lead.firstName} ${lead.lastName}`);
    console.log(`   Current email: ${lead.email || "none"}`);

    await db.update(leads)
      .set({ 
        email: newEmail,
        updatedAt: new Date()
      })
      .where(eq(leads.id, lead.id));

    console.log(`✅ Email updated to: ${newEmail}`);
    console.log("\n📋 Lead Details:");
    console.log(`   Name: ${lead.firstName} ${lead.lastName}`);
    console.log(`   Phone: ${lead.phone}`);
    console.log(`   Email: ${newEmail}`);
    console.log(`   Company: ${lead.company}`);
    console.log("\n🎯 You can now schedule a meeting for this lead!");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

updateLeadEmail()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });