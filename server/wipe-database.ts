import { db } from "./db";
import { 
  users, clients, leads, conversations, messages, 
  bookings, vsls, analytics, trialActivations, 
  userActivities, systemMetrics 
} from "@shared/schema";

async function wipeDatabase() {
  console.log("WARNING: Deleting ALL data from database...");
  
  try {
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(bookings);
    await db.delete(leads);
    await db.delete(vsls);
    await db.delete(clients);
    await db.delete(trialActivations);
    await db.delete(userActivities);
    await db.delete(systemMetrics);
    await db.delete(analytics);
    await db.delete(users);
    
    console.log("✅ Database completely wiped");
  } catch (error) {
    console.error("Error:", error);
  }
}

wipeDatabase()
  .then(() => process.exit(0))
  .catch(console.error);