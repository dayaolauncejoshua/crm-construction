import { db } from "./db";
import { clients, leads, conversations } from "@shared/schema";
import { eq } from "drizzle-orm";

async function cleanupTestData() {
  try {
    console.log("Cleaning up test data...");

    // Find clients with invalid userId
    const invalidClients = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, "demo-user-id"));

    console.log(`Found ${invalidClients.length} clients with invalid userId`);

    for (const client of invalidClients) {
      // Delete conversations for this client
      await db.delete(conversations).where(eq(conversations.clientId, client.id));
      console.log(`Deleted conversations for client: ${client.name}`);

      // Delete leads for this client
      await db.delete(leads).where(eq(leads.clientId, client.id));
      console.log(`Deleted leads for client: ${client.name}`);

      // Delete the client
      await db.delete(clients).where(eq(clients.id, client.id));
      console.log(`Deleted client: ${client.name}`);
    }

    console.log("✅ Cleanup complete!");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

cleanupTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });