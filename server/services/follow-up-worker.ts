import { db } from "../db";
import { followUps, leads, conversations } from "@shared/schema";
import { eq, and, lte, or } from "drizzle-orm";
import { whatsappService } from "./whatsapp";
import { storage } from "../storage";

let broadcastUpdateFn: ((data: any) => void) | null = null;

export function setBroadcastFunction(fn: (data: any) => void) {
  broadcastUpdateFn = fn;
}

// Main worker function - runs every 60 seconds
export async function processScheduledFollowUps() {
  try {
    const now = new Date();
    
    console.log(`🔄 [FOLLOW-UP WORKER] Checking for pending follow-ups...`);

    // Find all pending follow-ups that are due
    const pendingFollowUps = await db
      .select()
      .from(followUps)
      .where(
        and(
          eq(followUps.status, "pending"),
          lte(followUps.scheduledFor, now)
        )
      )
      .limit(50); // Process max 50 at a time

    if (pendingFollowUps.length === 0) {
      console.log(`✅ [FOLLOW-UP WORKER] No pending follow-ups`);
      return;
    }

    console.log(`📨 [FOLLOW-UP WORKER] Found ${pendingFollowUps.length} follow-ups to send`);

    for (const followUp of pendingFollowUps) {
      try {
        // Get lead details
        const lead = await storage.getLead(followUp.leadId);
        if (!lead) {
          console.log(`⚠️ [FOLLOW-UP] Lead not found: ${followUp.leadId}`);
          await markFollowUpFailed(followUp.id, "Lead not found");
          continue;
        }

        // Check if lead has replied since scheduling
        if (followUp.conversationId) {
          const hasReplied = await checkIfLeadReplied(
            followUp.conversationId,
            followUp.createdAt!
          );

          if (hasReplied) {
            console.log(`✅ [FOLLOW-UP] Lead replied - cancelling follow-up: ${followUp.id}`);
            await cancelFollowUp(followUp.id, "Lead replied");
            continue;
          }
        }

        // Send message based on channel
        if (followUp.channel === "whatsapp" && lead.phone) {
          console.log(`📤 [FOLLOW-UP] Sending WhatsApp to ${lead.phone}`);
          
          await whatsappService.sendTextMessage(lead.phone, followUp.content);

          // Mark as sent
          await db
            .update(followUps)
            .set({
              status: "sent",
              sentAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(followUps.id, followUp.id));

          // Add message to conversation
          if (followUp.conversationId) {
            await storage.createMessage({
              conversationId: followUp.conversationId,
              content: followUp.content,
              sender: "ai",
              channel: "whatsapp",
              sentAt: new Date(),
              deliveredAt: new Date(),
            });

            // Broadcast update
            if (broadcastUpdateFn) {
              broadcastUpdateFn({
                type: "new_message",
                conversationId: followUp.conversationId,
                message: { content: followUp.content },
              });
            }
          }

          console.log(`✅ [FOLLOW-UP] Sent successfully: ${followUp.id}`);
        } else {
          console.log(`⚠️ [FOLLOW-UP] No phone for lead: ${lead.id}`);
          await markFollowUpFailed(followUp.id, "No phone number");
        }

      } catch (error: any) {
        console.error(`❌ [FOLLOW-UP] Error sending ${followUp.id}:`, error);
        await markFollowUpFailed(followUp.id, error.message);
      }
    }

    console.log(`✅ [FOLLOW-UP WORKER] Finished processing`);
  } catch (error) {
    console.error(`❌ [FOLLOW-UP WORKER] Fatal error:`, error);
  }
}

// Helper: Check if lead replied since follow-up was scheduled
async function checkIfLeadReplied(
  conversationId: string,
  since: Date
): Promise<boolean> {
  const messages = await storage.getMessages(conversationId);
  
  const recentLeadMessages = messages.filter(
    (m) => m.sender === "lead" && m.sentAt && new Date(m.sentAt) > since
  );

  return recentLeadMessages.length > 0;
}

// Helper: Mark follow-up as failed
async function markFollowUpFailed(followUpId: string, errorMessage: string) {
  await db
    .update(followUps)
    .set({
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(followUps.id, followUpId));
}

// Helper: Cancel follow-up
async function cancelFollowUp(followUpId: string, reason: string) {
  await db
    .update(followUps)
    .set({
      status: "cancelled",
      errorMessage: reason,
      updatedAt: new Date(),
    })
    .where(eq(followUps.id, followUpId));
}

// Cancel all pending follow-ups for a lead (when they reply)
export async function cancelPendingFollowUps(leadId: string) {
  console.log(`🚫 [FOLLOW-UP] Cancelling pending follow-ups for lead: ${leadId}`);

  const result = await db
    .update(followUps)
    .set({
      status: "cancelled",
      errorMessage: "Lead replied - auto-cancelled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(followUps.leadId, leadId),
        eq(followUps.status, "pending")
      )
    );

  console.log(`✅ [FOLLOW-UP] Cancelled pending follow-ups for lead: ${leadId}`);
  return result;
}

// Start the cron job
let cronInterval: NodeJS.Timeout | null = null;

export function startFollowUpCron() {
  if (cronInterval) {
    console.log(`⚠️ [FOLLOW-UP CRON] Already running`);
    return;
  }

  console.log(`🚀 [FOLLOW-UP CRON] Starting worker (runs every 60 seconds)`);

  // Run immediately
  processScheduledFollowUps();

  // Then run every 60 seconds
  cronInterval = setInterval(processScheduledFollowUps, 60 * 1000);
}

export function stopFollowUpCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log(`🛑 [FOLLOW-UP CRON] Stopped`);
  }
}