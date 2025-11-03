import { seedDefaultFollowUpSequences } from "./seed-follow-ups";

async function main() {
  console.log("🌱 Seeding follow-up sequences...");
  await seedDefaultFollowUpSequences();
  console.log("✅ Done!");
  process.exit(0);
}

main().catch(console.error);