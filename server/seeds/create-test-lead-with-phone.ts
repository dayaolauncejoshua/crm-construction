import { storage } from "../storage";

async function createTestLeadWithYourPhone() {
  console.log("Creating test lead with your phone number...\n");

  try {
    // Get existing client
    const clients = await storage.getClients("demo-user-id");
    if (clients.length === 0) {
      console.error("No clients found. Run seed-test-data.ts first.");
      process.exit(1);
    }

    const client = clients[0];
    console.log("Using client:", client.name);

    // Create lead with YOUR phone number
    const lead = await storage.createLead({
      clientId: client.id,
      firstName: "Your",
      lastName: "Name",
      email: "yourname@example.com",
      phone: "639542269454", // Your actual phone number
      company: "Launce Tech",
      source: "whatsapp-test",
      status: "new",
      auditResults: {
        type: "construction",
        wins: ["Cost reduction", "Timeline optimization"],
        risks: ["Budget concerns"],
        timeline: "90 days",
        estimatedROI: "+25% improvement",
        score: 80,
        topFinding: "Cost optimization opportunities",
      },
      qualificationScore: "0.5",
    });

    console.log("✅ Lead created:", lead.firstName, lead.lastName);
    console.log("   Phone:", lead.phone);
    console.log("   ID:", lead.id);

    // Create conversation
    const conversation = await storage.createConversation({
      leadId: lead.id,
      clientId: client.id,
      channel: "whatsapp",
      status: "active",
      isAiHandled: true,
      qualificationScore: "0.5",
      lastMessageAt: new Date(),
    });

    console.log("✅ Conversation created:", conversation.id);
    console.log("\nNow send a WhatsApp message from +63 954 226 9454 and it should work!");

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

createTestLeadWithYourPhone()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });