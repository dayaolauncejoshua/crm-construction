import { storage } from "../storage";

async function seedMoreConversations() {
  console.log("Adding more test conversations...\n");

  try {
    // Get existing client (use the first one from your curl output)
    const clients = await storage.getClients("demo-user-id");
    if (clients.length === 0) {
      console.error("No clients found. Run seed-test-data.ts first.");
      process.exit(1);
    }

    const client = clients[0];
    console.log("Using client:", client.name, client.id);

    // Array of test leads
    const testLeads = [
      {
        firstName: "Michael",
        lastName: "Brown",
        email: "michael@example.com",
        phone: "+1234567892",
        company: "Brown Builders Inc",
        score: "0.65",
        status: "qualified",
      },
      {
        firstName: "Sarah",
        lastName: "Wilson",
        email: "sarah@example.com",
        phone: "+1234567893",
        company: "Wilson Construction",
        score: "0.45",
        status: "new",
      },
      {
        firstName: "David",
        lastName: "Martinez",
        email: "david@example.com",
        phone: "+1234567894",
        company: "Martinez Development",
        score: "0.78",
        status: "qualified",
      },
      {
        firstName: "Emily",
        lastName: "Taylor",
        email: "emily@example.com",
        phone: "+1234567895",
        company: "Taylor Property Group",
        score: "0.52",
        status: "new",
      },
      {
        firstName: "Robert",
        lastName: "Anderson",
        email: "robert@example.com",
        phone: "+1234567896",
        company: "Anderson Homes",
        score: "0.89",
        status: "qualified",
      },
      {
        firstName: "Lisa",
        lastName: "Thomas",
        email: "lisa@example.com",
        phone: "+1234567897",
        company: "Thomas Remodeling",
        score: "0.38",
        status: "new",
      },
    ];

    for (const leadData of testLeads) {
      // Create lead
      const lead = await storage.createLead({
        clientId: client.id,
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email,
        phone: leadData.phone,
        company: leadData.company,
        source: "landing-page",
        status: leadData.status,
        auditResults: {
          type: "construction",
          wins: ["Cost optimization", "Timeline improvement"],
          risks: ["Budget concerns"],
          timeline: "90 days",
          estimatedROI: "+20% improvement",
          score: Math.floor(parseFloat(leadData.score) * 100),
          topFinding: "Optimization opportunities identified",
        },
        qualificationScore: leadData.score,
      });

      console.log(`✓ Lead created: ${lead.firstName} ${lead.lastName}`);

      // Create conversation
      const conversation = await storage.createConversation({
        leadId: lead.id,
        clientId: client.id,
        channel: "whatsapp",
        status: "active",
        isAiHandled: parseFloat(leadData.score) < 0.7,
        qualificationScore: leadData.score,
        lastMessageAt: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
      });

      // Create 2-4 messages per conversation
      const messageCount = Math.floor(Math.random() * 3) + 2;
      const sampleMessages = [
        { sender: "lead", content: "Hi, I got your audit results. Looks interesting!" },
        { sender: "ai", content: "Thanks for your interest! What specific area would you like to discuss?" },
        { sender: "lead", content: "I'm curious about the cost savings you mentioned." },
        { sender: "ai", content: "Based on our analysis, we identified several areas where you can reduce costs by 15-25%." },
        { sender: "lead", content: "That sounds great. Can we schedule a call?" },
      ];

      for (let i = 0; i < Math.min(messageCount, sampleMessages.length); i++) {
        await storage.createMessage({
          conversationId: conversation.id,
          content: sampleMessages[i].content,
          sender: sampleMessages[i].sender as "lead" | "ai" | "human",
          channel: "whatsapp",
          sentAt: new Date(Date.now() - (messageCount - i) * 3600000), // Space out messages
        });
      }

      console.log(`  ✓ ${messageCount} messages created`);
    }

    console.log("\n✓ 6 additional conversations created successfully!");
    console.log("Refresh your browser to see them.");

  } catch (error) {
    console.error("Error seeding conversations:", error);
    throw error;
  }
}

seedMoreConversations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });