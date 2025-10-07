import { db } from "./db";
import { messages, conversations, leads } from "@shared/schema";

async function resetEverything() {
  try {
    console.log("\n🗑️  RESETTING DATABASE...\n");

    console.log("1️⃣  Deleting all messages...");
    await db.delete(messages);
    console.log("   ✅ Messages deleted\n");

    console.log("2️⃣  Deleting all conversations...");
    await db.delete(conversations);
    console.log("   ✅ Conversations deleted\n");

    console.log("3️⃣  Deleting all leads...");
    await db.delete(leads);
    console.log("   ✅ Leads deleted\n");

    console.log("🎉 DATABASE COMPLETELY RESET!");
    console.log("📱 Ready to test with fresh WhatsApp messages\n");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

resetEverything();