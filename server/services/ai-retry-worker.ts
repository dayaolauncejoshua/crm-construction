// server/services/ai-retry-worker.ts
// Background worker to retry failed AI messages

import { storage } from "../storage";
import { leadQualificationService } from "./leadQualification";
import { whatsappService } from "./whatsapp";
import type { FailedMessage } from "@shared/schema";

class AIRetryWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every 1 minute
  private broadcastFn: ((data: any) => void) | null = null;

  /**
   * Set broadcast function for WebSocket updates
   */
  setBroadcastFunction(fn: (data: any) => void): void {
    this.broadcastFn = fn;
    console.log("✅ [AI RETRY] Broadcast function registered");
  }

  /**
   * Start the retry worker
   */
  start(): void {
    if (this.isRunning) {
      console.log("⚠️ [AI RETRY] Worker already running");
      return;
    }

    console.log("🔄 [AI RETRY] Starting retry worker...");
    this.isRunning = true;

    // Run immediately on start
    this.processRetries().catch((err) =>
      console.error("❌ [AI RETRY] Initial run failed:", err)
    );

    // Then run every minute
    this.intervalId = setInterval(() => {
      this.processRetries().catch((err) =>
        console.error("❌ [AI RETRY] Scheduled run failed:", err)
      );
    }, this.CHECK_INTERVAL);

    console.log("✅ [AI RETRY] Worker started (checking every 60 seconds)");
  }

  /**
   * Stop the retry worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("⏹️ [AI RETRY] Worker stopped");
  }

  /**
   * Process pending retries
   */
  private async processRetries(): Promise<void> {
    try {
      // Get pending messages ready for retry
      const pendingMessages = await storage.getPendingFailedMessages(50);

      if (pendingMessages.length === 0) {
        console.log("✅ [AI RETRY] No pending retries");
        return;
      }

      console.log(
        `\n🔄 [AI RETRY] Processing ${pendingMessages.length} pending retries`
      );

      for (const failedMessage of pendingMessages) {
        await this.retryMessage(failedMessage);
      }

      console.log(`✅ [AI RETRY] Batch complete\n`);
    } catch (error: any) {
      console.error("❌ [AI RETRY] Error processing retries:", error);
    }
  }

  /**
   * Retry a single failed message
   */
  private async retryMessage(failedMessage: FailedMessage): Promise<void> {
    const { id, leadId, phoneNumber, content, retryCount, maxRetries } =
      failedMessage;

    console.log(`\n📨 [AI RETRY] Retrying message ${id}`);
    console.log(`   Lead: ${leadId}`);
    console.log(`   Phone: ${phoneNumber}`);
    console.log(`   Attempt: ${retryCount + 1}/${maxRetries}`);

    try {
      // Update status to processing
      await storage.updateFailedMessage(id, {
        status: "processing",
        lastRetryAt: new Date(),
      });

      // Get fresh lead data
      const lead = await storage.getLead(leadId);
      if (!lead) {
        console.error(`❌ [AI RETRY] Lead ${leadId} not found`);
        await storage.updateFailedMessage(id, {
  status: "failed",
  failureReason: "Lead not found",
});
        return;
      }

      // Try to process the message again
      await leadQualificationService.queueIncomingMessage(
        phoneNumber,
        content,
        Date.now() / 1000, // Current timestamp
        undefined, // phoneNumberId
        undefined // messageId (new attempt, no WhatsApp ID)
      );

      // If we get here, processing succeeded
      await storage.updateFailedMessage(id, {
        status: "completed",
        processedAt: new Date(),
      });

      console.log(`✅ [AI RETRY] Message ${id} processed successfully`);

      // Broadcast success
      if (this.broadcastFn) {
        this.broadcastFn({
          type: "retry_success",
          failedMessageId: id,
          leadId,
          message: "Failed message successfully processed",
        });
      }
    } catch (error: any) {
      console.error(`❌ [AI RETRY] Retry failed for message ${id}:`, error);

      const newRetryCount = retryCount + 1;

      // Check if max retries reached
      if (newRetryCount >= maxRetries) {
        console.log(
          `⛔ [AI RETRY] Max retries (${maxRetries}) reached - escalating to human`
        );

       await storage.updateFailedMessage(id, {
  status: "escalated",
  escalatedAt: new Date(),
  retryCount: newRetryCount,
  failureReason: `Max retries reached: ${error.message}`,
});

        // Escalate to human
        await this.escalateToHuman(failedMessage);
      } else {
        // Schedule next retry with exponential backoff
        const nextRetryMinutes = Math.min(Math.pow(2, newRetryCount), 30); // Cap at 30 minutes
        const retryAfter = new Date();
        retryAfter.setMinutes(retryAfter.getMinutes() + nextRetryMinutes);

        await storage.updateFailedMessage(id, {
  status: "pending",
  retryCount: newRetryCount,
  retryAfter,
  failureReason: error.message,
});

        console.log(
          `⏳ [AI RETRY] Scheduled next retry in ${nextRetryMinutes} minutes`
        );
      }
    }
  }

  /**
   * Escalate failed message to human
   */
  private async escalateToHuman(failedMessage: FailedMessage): Promise<void> {
    try {
      const { leadId, phoneNumber, content, clientId } = failedMessage;

      console.log(`🚨 [AI RETRY] Escalating to human: ${leadId}`);

      // Get lead and conversation
      const lead = await storage.getLead(leadId);
      if (!lead) {
        console.error(`❌ [AI RETRY] Cannot escalate - lead not found`);
        return;
      }

      const conversations = await storage.getAllConversations(clientId);
      const conversation = conversations.find((c) => c.leadId === leadId);

      if (conversation) {
        // Mark conversation for human takeover
        await storage.updateConversation(conversation.id, {
          isAiHandled: false,
          humanTakeoverAt: new Date(),
        });

        console.log(
          `✅ [AI RETRY] Conversation ${conversation.id} handed to human`
        );

        // Broadcast escalation
        if (this.broadcastFn) {
          this.broadcastFn({
            type: "ai_failure_escalation",
            conversationId: conversation.id,
            leadId,
            reason: "AI processing failed after multiple retries",
            lead: {
              ...lead,
              firstName: lead.firstName || "Unknown",
              lastName: lead.lastName || "",
            },
          });
        }
      }

      // Send notification to team
      const onCallUser = await storage.getOnCallTeamMember();
      if (onCallUser) {
        const { notificationService } = await import("./notification-sevice");

        await notificationService.sendUrgentLeadAlert({
          userId: onCallUser.id,
          phoneNumber,
          message: content.substring(0, 100),
          reason: "AI processing failed after multiple retries",
        });

        console.log(`✅ [AI RETRY] Alert sent to ${onCallUser.email}`);
      }

      // Send holding message to lead
      try {
        const holdingMessage = `Hi ${
          lead.firstName || "there"
        }! Thank you for your patience. A team member will respond to you personally shortly. 🏗️`;

        await whatsappService.sendTextMessage(phoneNumber, holdingMessage);
        console.log(`✅ [AI RETRY] Holding message sent to ${phoneNumber}`);
      } catch (whatsappError) {
        console.error(
          `⚠️ [AI RETRY] Could not send holding message:`,
          whatsappError
        );
      }
    } catch (error) {
      console.error(`❌ [AI RETRY] Escalation failed:`, error);
    }
  }

  /**
   * Get retry statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    escalated: number;
  }> {
    // This would need a new storage method to get stats
    // For now, return placeholder
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      escalated: 0,
    };
  }
}

export const aiRetryWorker = new AIRetryWorker();