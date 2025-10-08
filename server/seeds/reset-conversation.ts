import { db } from "../db";
import { 
  messages, 
  conversations, 
  leads, 
  leadActivityLog,
  bookings,
  quickReplyTemplates,
  vsls
} from "@shared/schema";
import { config } from "dotenv";

config();

async function resetEverything() {
  console.log("🗑️  RESETTING DATABASE...");

  try {
    // Delete in correct order to respect foreign key constraints
    
    console.log("1️⃣  Deleting all messages...");
    await db.delete(messages);
    console.log("   ✅ Messages deleted");

    console.log("2️⃣  Deleting all conversations...");
    await db.delete(conversations);
    console.log("   ✅ Conversations deleted");

    console.log("3️⃣  Deleting all lead activity logs...");
    await db.delete(leadActivityLog);
    console.log("   ✅ Activity logs deleted");

    console.log("4️⃣  Deleting all bookings..."); // ✅ ADD THIS BEFORE LEADS
    await db.delete(bookings);
    console.log("   ✅ Bookings deleted");

    console.log("5️⃣  Deleting all leads...");
    await db.delete(leads);
    console.log("   ✅ Leads deleted");

    console.log("6️⃣  Deleting all quick reply templates...");
    await db.delete(quickReplyTemplates);
    console.log("   ✅ Templates deleted");

    console.log("7️⃣  Deleting all VSLs...");
    await db.delete(vsls);
    console.log("   ✅ VSLs deleted");

    console.log("\n✅ DATABASE RESET COMPLETE!");
    console.log("📊 All conversations, messages, leads, bookings, and related data deleted");
    console.log("🔄 You can now start fresh with new test data\n");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

resetEverything()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });