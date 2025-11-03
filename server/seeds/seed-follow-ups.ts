import { db } from "../db";
import { followUpSequences, followUpSteps, clients } from "@shared/schema";

export async function seedDefaultFollowUpSequences() {
  console.log("🌱 Seeding default follow-up sequences...");

  // Get all clients
  const allClients = await db.select().from(clients);

  for (const client of allClients) {
    console.log(`📦 Seeding sequences for client: ${client.name}`);

    // Sequence 1: 48-Hour Fast Lane (No Response)
    const [seq1] = await db.insert(followUpSequences).values({
      clientId: client.id,
      name: "48-Hour Fast Lane",
      description: "Aggressive follow-up for unresponsive leads",
      triggerType: "no_response",
      channel: "whatsapp",
      steps: 4,
      status: "active",
      isDefault: true,
    }).returning();

    await db.insert(followUpSteps).values([
      {
        sequenceId: seq1.id,
        stepNumber: 1,
        delayMinutes: 30, // 30 minutes
        content: "Hi {{firstName}}! 👋 Just wanted to make sure you received your audit results. Did you get a chance to review them?",
        channel: "whatsapp",
      },
      {
        sequenceId: seq1.id,
        stepNumber: 2,
        delayMinutes: 360, // 6 hours
        content: "Hey {{firstName}}, here's a quick breakdown of the top 3 wins we identified in your audit:\n\n✅ Win #1: [Quick fix that boosts results]\n✅ Win #2: [Low-hanging fruit]\n✅ Win #3: [Fast improvement]\n\nWant to discuss how to implement these?",
        channel: "whatsapp",
      },
      {
        sequenceId: seq1.id,
        stepNumber: 3,
        delayMinutes: 1440, // 24 hours
        content: "Quick question, {{firstName}} - are you still interested in closing more deals? I'd love to show you exactly how we can help. Reply YES if you'd like to schedule a quick 10-minute call.",
        channel: "whatsapp",
      },
      {
        sequenceId: seq1.id,
        stepNumber: 4,
        delayMinutes: 2880, // 48 hours
        content: "No worries if now isn't the right time, {{firstName}}! If you'd like me to follow up next month, just reply LATER and I'll check back in. Otherwise, best of luck with your business! 🚀",
        channel: "whatsapp",
      },
    ]);

    // Sequence 2: Slow Nurture (14-Day)
    const [seq2] = await db.insert(followUpSequences).values({
      clientId: client.id,
      name: "14-Day Slow Nurture",
      description: "Long-term nurture for cold leads",
      triggerType: "time_based",
      channel: "whatsapp",
      steps: 3,
      status: "active",
      isDefault: false,
    }).returning();

    await db.insert(followUpSteps).values([
      {
        sequenceId: seq2.id,
        stepNumber: 1,
        delayMinutes: 4320, // 3 days
        content: "Hi {{firstName}}! Just checking in. I noticed you haven't taken action on your audit yet. Need any help understanding the recommendations?",
        channel: "whatsapp",
      },
      {
        sequenceId: seq2.id,
        stepNumber: 2,
        delayMinutes: 10080, // 7 days
        content: "Hey {{firstName}}, thought you might find this helpful: [Insert case study or success story]. Would love to discuss how we achieved similar results for your industry.",
        channel: "whatsapp",
      },
      {
        sequenceId: seq2.id,
        stepNumber: 3,
        delayMinutes: 20160, // 14 days
        content: "Last check-in, {{firstName}}! Still happy to help when you're ready. Reply INTERESTED if you'd like to pick this back up, or UNSUBSCRIBE to stop receiving messages. Thanks!",
        channel: "whatsapp",
      },
    ]);

    console.log(`✅ Seeded 2 sequences for ${client.name}`);
  }

  console.log("✅ Default sequences seeded!");
}