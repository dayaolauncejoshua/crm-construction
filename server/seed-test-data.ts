import { storage } from "./storage";

async function seedTestData() {
  console.log("Seeding test data...\n");

  try {
    // Create test user
    const user = await storage.upsertUser({
      id: "demo-user-id",
      email: "demo@example.com",
      firstName: "Demo",
      lastName: "User",
      role: "user",
    });
    console.log("✓ User created:", user.email);

    // Create test client
    const client = await storage.createClient({
      userId: user.id,
      name: "Demo Construction Co",
      industry: "construction",
      settings: {},
    });
    console.log("✓ Client created:", client.name);
    console.log("  Client ID:", client.id);

    // Create hot lead
    const lead1 = await storage.createLead({
      clientId: client.id,
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+1234567890",
      company: "ABC Construction",
      source: "landing-page",
      status: "qualified",
      auditResults: {
        type: "construction",
        wins: ["Cost reduction opportunity", "Timeline optimization", "Safety improvements"],
        risks: ["Budget overrun risk"],
        timeline: "90 days",
        estimatedROI: "+30% savings",
        score: 92,
        topFinding: "30% cost reduction opportunity identified",
      },
      qualificationScore: "0.85",
    });
    console.log("✓ Hot lead created:", lead1.firstName, lead1.lastName);

    // Create regular lead
    const lead2 = await storage.createLead({
      clientId: client.id,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "+1234567891",
      company: "XYZ Builders",
      source: "referral",
      status: "new",
      auditResults: {
        type: "construction",
        wins: ["Process improvement"],
        risks: ["Timeline concerns"],
        timeline: "120 days",
        estimatedROI: "+15% improvement",
        score: 78,
        topFinding: "Process improvement opportunities",
      },
      qualificationScore: "0.45",
    });
    console.log("✓ Regular lead created:", lead2.firstName, lead2.lastName);

    // Create hot conversation
    const conversation1 = await storage.createConversation({
      leadId: lead1.id,
      clientId: client.id,
      channel: "whatsapp",
      status: "active",
      isAiHandled: true,
      qualificationScore: "0.85",
      lastMessageAt: new Date(),
    });

    // Messages for hot lead
    await storage.createMessage({
      conversationId: conversation1.id,
      content: "Hi, I just received your construction audit results. The 30% cost reduction looks amazing!",
      sender: "lead",
      channel: "whatsapp",
      sentAt: new Date(Date.now() - 7200000),
    });

    await storage.createMessage({
      conversationId: conversation1.id,
      content: "That's great to hear! The audit identified several key areas where we can optimize your processes. Would you like to schedule a call to discuss the implementation plan?",
      sender: "ai",
      channel: "whatsapp",
      sentAt: new Date(Date.now() - 7100000),
    });

    await storage.createMessage({
      conversationId: conversation1.id,
      content: "Yes, I'm very interested. We have a project starting next month with a $2M budget. Can we talk this week?",
      sender: "lead",
      channel: "whatsapp",
      sentAt: new Date(Date.now() - 3600000),
    });

    await storage.createMessage({
      conversationId: conversation1.id,
      content: "Perfect timing! Given your project scope and timeline, I'd recommend we connect with our senior consultant. What day works best for you this week?",
      sender: "ai",
      channel: "whatsapp",
      sentAt: new Date(Date.now() - 3500000),
    });

    await storage.createMessage({
      conversationId: conversation1.id,
      content: "Thursday afternoon would be ideal. Do you have any slots available?",
      sender: "lead",
      channel: "whatsapp",
      sentAt: new Date(Date.now() - 1800000),
    });

    console.log("✓ 5 messages created for hot conversation");

    // Create regular conversation
    const conversation2 = await storage.createConversation({
      leadId: lead2.id,
      clientId: client.id,
      channel: "whatsapp",
      status: "active",
      isAiHandled: true,
      qualificationScore: "0.45",
      lastMessageAt: new Date(Date.now() - 86400000),
    });

    await storage.createMessage({
      conversationId: conversation2.id,
      content: "Hi, I received the audit. Can you tell me more about your services?",
      sender: "lead",
      channel: "whatsapp",
      sentAt: new Date(Date.now() - 86400000),
    });

    await storage.createMessage({
      conversationId: conversation2.id,
      content: "Of course! We specialize in construction project optimization. The audit shows we can help improve your processes by about 15%. What specific area interests you most?",
      sender: "ai",
      channel: "whatsapp",
      sentAt: new Date(Date.now() - 86300000),
    });

    console.log("✓ 2 messages created for regular conversation");

    console.log("\nTest data seeded successfully!");
    console.log("\nClient ID:", client.id);
    console.log("Use this in the UI or hardcode as 'demo-client'");
    
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
}

seedTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });