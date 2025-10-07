import { storage } from "../storage";

async function seedTags(clientId: string) {
  const defaultTags = [
    { clientId, name: "Urgent", color: "red", icon: "AlertTriangle" },
    { clientId, name: "VIP", color: "purple", icon: "Star" },
    { clientId, name: "Follow-up", color: "blue", icon: "Clock" },
    { clientId, name: "Needs Quote", color: "yellow", icon: "DollarSign" },
    { clientId, name: "Hot Lead", color: "orange", icon: "Flame" },
    { clientId, name: "Cold Lead", color: "gray", icon: "Snowflake" },
    { clientId, name: "Qualified", color: "green", icon: "CheckCircle" },
    { clientId, name: "Not Interested", color: "red", icon: "XCircle" },
  ];

  console.log("🏷️  Seeding default tags...");

  for (const tag of defaultTags) {
    await storage.createLeadTag(tag);
  }

  console.log(`✅ Seeded ${defaultTags.length} tags`);
}

const clientId = process.argv[2];
if (!clientId) {
  console.error("Usage: npx tsx server/seed-tags.ts <clientId>");
  process.exit(1);
}

seedTags(clientId)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });