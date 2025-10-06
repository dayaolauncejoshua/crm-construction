import { storage } from "./storage";

async function setupNewAccount() {
  // Change this to match the email you just signed up with
  const newUserEmail = "test@example.com";
  const yourPhone = "639542269454";

  try {
    console.log("Finding your new user account...");
    
    // Get all users and find yours by email
    const allUsers = await storage.getAllUsersForAdmin();
    const user = allUsers.find(u => u.email === newUserEmail);
    
    if (!user) {
      console.error(`User with email ${newUserEmail} not found!`);
      console.log("Available users:");
      allUsers.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
      process.exit(1);
    }

    console.log(`Found user: ${user.email} (ID: ${user.id})\n`);

    console.log("Creating client...");
    const client = await storage.createClient({
      name: "My Construction Business",
      industry: "construction",
      userId: user.id,
      whatsappNumber: yourPhone,
      isActive: true,
    });
    console.log(`Created client: ${client.name}\n`);

    console.log("Creating WhatsApp test lead...");
    const lead = await storage.createLead({
      clientId: client.id,
      firstName: "Test",
      lastName: "Lead",
      email: "testlead@example.com",
      phone: yourPhone,
      company: "Test Company",
      source: "whatsapp",
      status: "new",
      qualificationScore: "0.5",
      consentGiven: true,
      auditResults: {
        type: "construction",
        wins: ["Good opportunity"],
        risks: ["None"],
        score: 50,
        topFinding: "Ready to test WhatsApp",
      },
    });
    console.log(`Created lead: ${lead.firstName} ${lead.lastName}\n`);

    console.log("Creating conversation...");
    const conversation = await storage.createConversation({
      leadId: lead.id,
      clientId: client.id,
      channel: "whatsapp",
      status: "active",
      isAiHandled: true,
      qualificationScore: "0.5",
      lastMessageAt: new Date(),
    });
    console.log(`Created conversation: ${conversation.id}\n`);

    console.log("Creating welcome message...");
    await storage.createMessage({
      conversationId: conversation.id,
      content: "Welcome! Send a WhatsApp message to test the system.",
      sender: "ai",
      channel: "whatsapp",
      sentAt: new Date(),
    });

    console.log("\n" + "=".repeat(50));
    console.log("SETUP COMPLETE!");
    console.log("=".repeat(50));
    console.log(`\nYour account is ready:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Client: ${client.name}`);
    console.log(`  Test Lead: ${lead.firstName} ${lead.lastName}`);
    console.log(`  Phone: ${lead.phone}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Refresh your browser`);
    console.log(`  2. Go to Dashboard or Conversations page`);
    console.log(`  3. Send WhatsApp message to test`);

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

setupNewAccount()
  .then(() => process.exit(0))
  .catch(console.error);