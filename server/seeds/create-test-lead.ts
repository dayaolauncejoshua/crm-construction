import { db } from "../db";
import { leads, clients, conversations } from "@shared/schema";
import { config } from "dotenv";

config();

async function createTestLeadWithRealEmail() {
  console.log("📧 Creating test lead with real email...");

  try {
    // Get the first client
    const allClients = await db.select().from(clients);
    if (allClients.length === 0) {
      console.error("❌ No clients found. Create a client first.");
      return;
    }
    const client = allClients[0];

    // ✅ CUSTOMIZE THESE VALUES
    const testLead = {
      clientId: client.id,
      firstName: "Launce",
      lastName: "Dayao",
      email: "crmaileadsystem.noreply@gmail.com", // ✅ CHANGE THIS to your real email
      phone: "+639542269454", // ✅ CHANGE THIS to your WhatsApp number
      company: "Santos Construction",
      source: "whatsapp",
      status: "new" as const,
      temperature: "cold" as const,
      qualificationScore: "0.3",
      tags: ["test-lead"],
      interests: ["commercial-construction"],
    };

    console.log("\n📋 Creating lead with details:");
    console.log(`   Name: ${testLead.firstName} ${testLead.lastName}`);
    console.log(`   Email: ${testLead.email}`);
    console.log(`   Phone: ${testLead.phone}`);
    console.log(`   Company: ${testLead.company}`);

    // Create lead
    const [lead] = await db.insert(leads).values(testLead).returning();
    console.log(`\n✅ Lead created with ID: ${lead.id}`);

    // Create conversation
    const [conversation] = await db.insert(conversations).values({
      leadId: lead.id,
      clientId: client.id,
      channel: "whatsapp",
      isAiHandled: true,
      status: "active",
      lastMessageAt: new Date(),
    }).returning();

    console.log(`✅ Conversation created with ID: ${conversation.id}`);

    console.log("\n🎯 NEXT STEPS:");
    console.log(`1. Send a WhatsApp message from ${testLead.phone} to your business number`);
    console.log(`2. Wait for AI response in the dashboard`);
    console.log(`3. Schedule a meeting from the conversation`);
    console.log(`4. Check ${testLead.email} for the calendar invite`);

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

createTestLeadWithRealEmail()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });