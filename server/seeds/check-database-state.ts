import { db } from "../db";
import { users, clients, leads, conversations } from "@shared/schema";

async function checkDatabaseState() {
  try {
    const allUsers = await db.select().from(users);
    console.log("\n=== USERS ===");
    console.log(`Total users: ${allUsers.length}`);
    allUsers.forEach(u => {
      console.log(`- ${u.email} (ID: ${u.id})`);
    });

    const allClients = await db.select().from(clients);
    console.log("\n=== CLIENTS ===");
    console.log(`Total clients: ${allClients.length}`);
    allClients.forEach(c => {
      console.log(`- ${c.name} (ID: ${c.id}, UserID: ${c.userId})`);
    });

    const allLeads = await db.select().from(leads);
    console.log("\n=== LEADS ===");
    console.log(`Total leads: ${allLeads.length}`);
    allLeads.forEach(l => {
      console.log(`- ${l.firstName} ${l.lastName} (${l.phone}, ClientID: ${l.clientId})`);
    });

    const allConversations = await db.select().from(conversations);
    console.log("\n=== CONVERSATIONS ===");
    console.log(`Total conversations: ${allConversations.length}`);
    allConversations.forEach(c => {
      console.log(`- Conv ${c.id.substring(0, 8)}... (LeadID: ${c.leadId}, ClientID: ${c.clientId})`);
    });

  } catch (error) {
    console.error("Error:", error);
  }
}

checkDatabaseState()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });