import { db } from "../db";
import { messages, conversations, leads, leadActivityLog } from "@shared/schema";

async function resetEverything() {
  console.log("🗑️  RESETTING DATABASE...");

  try {
    // Delete in correct order (respect foreign keys)
    
    console.log("1️⃣  Deleting all messages...");
    await db.delete(messages);
    console.log("   ✅ Messages deleted");

    console.log("2️⃣  Deleting all conversations...");
    await db.delete(conversations);
    console.log("   ✅ Conversations deleted");

    console.log("3️⃣  Deleting all lead activity logs...");
    await db.delete(leadActivityLog);
    console.log("   ✅ Activity logs deleted");

    console.log("4️⃣  Deleting all leads...");
    await db.delete(leads);
    console.log("   ✅ Leads deleted");

    console.log("\n✅ DATABASE RESET COMPLETE!");
    console.log("📊 All conversations, leads, and messages have been deleted.");
    console.log("🎯 Ready for fresh testing!\n");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

resetEverything()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });