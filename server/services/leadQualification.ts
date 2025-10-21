// server/services/leadQualification.ts
import { messageQueue } from "./messageQueue";
import { storage } from "../storage";
import { qualifyLead, generateAIResponse } from "./openai";
import { whatsappService } from "./whatsapp";
import { WebSocketServer } from "ws";
import { spamPatternLearning } from "./spamPatternLearning";
import { detectBookingIntent } from "./openai";
import type {InsertBooking} from "../../shared/schema";

function normalizeTimeString(timeStr: string): string {
  if (!timeStr) return "10:00 AM"; // Default if time is missing

  const upperTime = timeStr.toUpperCase().replace(/\s/g, "");

  if (upperTime.includes(":")) {
    return upperTime.replace(/([AP]M)/, " $1");
  }
  const match = upperTime.match(/(\d+)([AP]M)/);
  if (match) {
    const hour = match[1];
    const period = match[2];
    return `${hour}:00 ${period}`;
  }

  return "10:00 AM";
}

export class LeadQualificationService {
  private wss: WebSocketServer | null = null;

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  async processNewLead(leadId: string): Promise<void> {
    try {
      const lead = await storage.getLead(leadId);
      if (!lead) throw new Error("Lead not found");

      const client = await storage.getClient(lead.clientId);
      if (!client) throw new Error("Client not found");

      // Create initial conversation
      const conversation = await storage.createConversation({
        leadId: lead.id,
        clientId: lead.clientId,
        channel: "whatsapp",
        status: "active",
        isAiHandled: true,
        qualificationScore: "0.0",
      });

      // Send initial audit result message
      if (lead.phone && lead.auditResults) {
        const auditData = lead.auditResults as any;
        const success = await whatsappService.sendAuditResult(
          lead.phone,
          lead.firstName || "there",
          auditData.type || "audit",
          auditData.topFinding || "Key opportunities identified",
          `https://app.example.com/audit/${lead.id}`
        );

        // Record response time
        const createdAt = lead.createdAt
          ? new Date(lead.createdAt).getTime()
          : Date.now();
        const responseTime = Math.floor((Date.now() - createdAt) / 1000);
        await storage.updateLead(lead.id, {
          responseTimeSeconds: responseTime,
        });

        // Create message record
        await storage.createMessage({
          conversationId: conversation.id,
          content: `Audit result sent via WhatsApp`,
          sender: "ai",
          channel: "whatsapp",
          sentAt: new Date(),
        });

        // Broadcast to dashboard
        this.broadcastUpdate({
          type: "new_conversation",
          conversation: {
            ...conversation,
            lead,
          },
        });
      }
    } catch (error) {
      console.error("Error processing new lead:", error);
    }
  }

  async queueIncomingMessage(
    from: string,
    message: string,
    timestamp: number,
    phoneNumberId?: string,
    messageId?: string // ✅ ADD THIS
  ): Promise<void> {
    console.log(`📨 Queueing message from ${from}, messageId: ${messageId}`);
    await messageQueue.enqueueMessage(
      from,
      message,
      timestamp,
      this.handleIncomingMessage.bind(this),
      phoneNumberId,
      messageId // ✅ ADD THIS
    );
  }

  private async handleIncomingMessage(
    from: string,
    message: string,
    timestamp: number,
    phoneNumberId?: string,
    messageId?: string
  ): Promise<void> {
    try {
      console.log("=== INCOMING MESSAGE ===");
      console.log("From:", from);
      console.log("Message:", message);
      console.log("Phone Number ID:", phoneNumberId);
      console.log("WhatsApp Message ID:", messageId);

      // Step 1: Find or create lead
      let lead = await storage.getLeadByPhone(from);

      if (!lead) {
        console.log("📝 Unknown number - creating new lead automatically");

        const allUsers = await storage.getAllUsersForAdmin();
        let targetClient = null;

        // Match by Phone Number ID
        if (phoneNumberId) {
          console.log(
            `🔍 Looking for client with Phone number ID: ${phoneNumberId}`
          );

          // Loop through regular users to and their clients
          for (const user of allUsers) {
            if (user.role === "super_admin") continue;

            const userClients = await storage.getClients(user.id);

            // Find active client with matching WhatsApp Phone Number ID
            const matchedClient = userClients.find(
              (c) => c.isActive && c.whatsappPhoneNumberId === phoneNumberId
            );

            if (matchedClient) {
              targetClient = matchedClient;
              console.log(
                `✅ Found client with WhatsApp number: ${matchedClient.name} (${matchedClient.whatsappNumber})`
              );
              break;
            }
          }
        }

        // Fallback: use first active client
        if (!targetClient) {
          console.log(
            "⚠️ No client matched WhatsApp number, using first active client"
          );

          for (const user of allUsers) {
            if (user.role === "super_admin") continue;

            const userClients = await storage.getClients(user.id);
            const firstWithWhatsApp = userClients.find(
              (c) => c.isActive && (c.whatsappPhoneNumberId || c.whatsappNumber)
            );

            if (firstWithWhatsApp) {
              targetClient = firstWithWhatsApp;
              console.log(
                `✅ Using fallback client: ${firstWithWhatsApp.name}`
              );
              break;
            }
          }
        }

        if (!targetClient) {
          console.error("❌ No active clients found");
          return;
        }

        console.log(`Assigning to client: ${targetClient.name}`);

        lead = await storage.createLead({
          clientId: targetClient.id,
          firstName: from,
          lastName: "",
          email: `whatsapp_${from.replace(/\+/g, "")}@temp.com`,
          phone: from,
          company: "Unknown",
          source: "whatsapp-inbound",
          status: "new",
          auditResults: {
            type: "inbound-message",
            wins: ["Reached out via WhatsApp"],
            risks: [],
            timeline: "Unknown",
            estimatedROI: "Unknown",
            score: 50,
            topFinding: "Inbound WhatsApp contact",
          },
          qualificationScore: "0.0",
        });

        console.log("✅ New lead created:", lead.id);
      } else {
        console.log("✅ Existing lead found:", lead.firstName, lead.lastName);
      }

      // Step 2: Find or create conversation
      // ✅ CHANGED: Look for ANY conversation (active or closed) for this lead
      const allConversations = await storage.getAllConversations(lead.clientId);
      let conversation = allConversations.find(
        (c: any) => c.leadId === lead.id
      );

      let wasReopened = false;

      if (!conversation) {
        // No conversation exists - create new one
        const newConv = await storage.createConversation({
          leadId: lead.id,
          clientId: lead.clientId,
          channel: "whatsapp",
          status: "active",
          isAiHandled: true,
          qualificationScore: "0.0",
          lastMessageAt: new Date(),
        });
        conversation = { ...newConv, lead } as any;
        console.log("✅ New conversation created:", conversation?.id);
      } else if (conversation.status === "closed") {
        // ✅ SMART REOPENING: Conversation was closed (terminated spam)
        console.log(
          "🔄 Reopening previously closed conversation:",
          conversation.id
        );

        // Reopen conversation but KEEP AI DISABLED (human review required)
        await storage.updateConversation(conversation.id, {
          status: "active",
          isAiHandled: false, // ← AI stays OFF, human must review
          lastMessageAt: new Date(),
          reopenedAt: new Date(), // Track when it was reopened
        } as any); // ✅ Type assertion to bypass TypeScript

        // Update lead status from "spam" back to "not-a-lead" for human review
        if (lead.status === "spam") {
          const existingTags = Array.isArray(lead.tags) ? lead.tags : [];
          await storage.updateLead(lead.id, {
            status: "not-a-lead",
            tags: [
              ...existingTags.filter((t: string) => t !== "terminated"),
              "reopened",
            ], // Remove "terminated", add "reopened"
          });
        }

        wasReopened = true;
        console.log("✅ Conversation reopened - flagged for human review");

        // Broadcast reopened conversation alert
        this.broadcastUpdate({
          type: "conversation_reopened",
          conversationId: conversation.id,
          lead: await storage.getLead(lead.id),
          message: "Previously terminated conversation has new activity",
        });
      } else {
        console.log("✅ Existing active conversation found:", conversation.id);
      }

      if (!conversation) {
        console.error("Failed to create conversation");
        return;
      }

      // Step 3: Record incoming message
      const savedMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: message,
        sender: "lead",
        channel: "whatsapp",
        sentAt: new Date(timestamp * 1000),
        deliveredAt: new Date(),
        metadata: messageId ? { whatsappMessageId: messageId } : undefined,
      });

      console.log(
        `✅ Incoming message saved with metadata:`,
        savedMessage.metadata
      );

      await storage.markPreviousMessagesAsRead(conversation.id);
      await storage.incrementUnreadCount(conversation.id);

      // Broadcast new message to dashboard
      this.broadcastUpdate({
        type: "new_message",
        conversationId: conversation.id,
        message: { content: message, sender: "lead" },
      });

      // Step 4: AI Processing
      if (conversation.isAiHandled) {
        console.log("🤖 AI is handling - generating response...");

        // BROADCAST: AI is typing (dashboard only)
        this.broadcastUpdate({
          type: "typing_indicator",
          conversationId: conversation.id,
          isTyping: true,
          sender: "ai",
        });

        // SEND STATUS MESSAGE: Let lead know we're processing
        const statusMessage = "Let me check that for you...";
        await whatsappService.sendTextMessage(from, statusMessage);

        // Record status message
        await storage.createMessage({
          conversationId: conversation.id,
          content: statusMessage,
          sender: "ai",
          channel: "whatsapp",
          sentAt: new Date(),
          deliveredAt: new Date(),
          isStatusMessage: true, // Flag as status message
        });

        // Get conversation history and qualify
        const messages = await storage.getMessages(conversation.id);
        const qualification = await qualifyLead(lead, messages);

        console.log("AI Qualification:", qualification);

        // ✅ CHECK: Is this a non-construction inquiry?
        if (
          qualification.nextAction === "mark_as_not_a_lead" ||
          qualification.score < 0.1
        ) {
          console.log("🚫 Marking as not-a-lead");

          // ✅ NEW: Count redirect messages
          const redirectCount = messages.filter(
            (msg) =>
              msg.sender === "ai" &&
              (msg.content.includes("construction company") ||
                msg.content.includes("building projects") ||
                msg.content.includes("wrong business"))
          ).length;

          console.log(`🔢 Total redirects sent: ${redirectCount}`);

          // Update lead status
          await storage.updateLead(lead.id, {
            status: "not-a-lead",
            qualificationScore: qualification.score.toString(),
            temperature: "cold",
            tags: ["not-construction", "irrelevant"],
          });

          // ✅ NEW: After final redirect (3rd message), disable AI
          if (redirectCount >= 2) {
            console.log(
              "⛔ Disabling AI for this conversation - max redirects reached"
            );

            const category =
              message.toLowerCase().includes("food") ||
              message.toLowerCase().includes("burger") ||
              message.toLowerCase().includes("fries")
                ? "food"
                : message.toLowerCase().includes("shoe") ||
                  message.toLowerCase().includes("clothing")
                ? "retail"
                : message.toLowerCase().includes("test")
                ? "test"
                : "other";

            await spamPatternLearning.learnFromSpam(message, category);
            console.log(`🧠 Learning complete for category: ${category}`);

            await storage.updateConversation(conversation.id, {
              qualificationScore: qualification.score.toString(),
              lastMessageAt: new Date(),
              isAiHandled: false, // ← STOP AI FROM RESPONDING
              status: "closed", // ← CLOSE CONVERSATION
            });

            // Add additional tags
            await storage.updateLead(lead.id, {
              status: "spam",
              tags: [
                "not-construction",
                "irrelevant",
                "terminated",
                "wrong-number",
              ],
            });
          } else {
            // Still within redirect limit
            await storage.updateConversation(conversation.id, {
              qualificationScore: qualification.score.toString(),
              lastMessageAt: new Date(),
              isAiHandled: true, // Keep AI handling for now
            });
          }

          // Broadcast lead update
          const updatedLead = await storage.getLead(lead.id);
          this.broadcastUpdate({
            type: "lead_updated",
            lead: updatedLead,
            conversationId: conversation.id,
          });

          // ✅ Generate polite redirect response
          console.log("💬 Generating redirect response...");

          const client = await storage.getClient(lead.clientId);
          const aiResponse = await generateAIResponse(messages, lead, client);

          console.log("AI Redirect Response:", aiResponse);

          // STOP TYPING
          this.broadcastUpdate({
            type: "typing_indicator",
            conversationId: conversation.id,
            isTyping: false,
            sender: "ai",
          });

          // Send redirect message
          const redirectResult = await whatsappService.sendTextMessage(
            from,
            aiResponse
          );

          await storage.createMessage({
            conversationId: conversation.id,
            content: aiResponse,
            sender: "ai",
            channel: "whatsapp",
            sentAt: new Date(),
            deliveredAt: new Date(),
            metadata: redirectResult.messageId
              ? { whatsappMessageId: redirectResult.messageId }
              : undefined,
          });

          console.log(
            "✅ Redirect message sent, conversation marked as not-a-lead"
          );

          // Broadcast final message update
          this.broadcastUpdate({
            type: "new_message",
            conversationId: conversation.id,
            message: { content: "AI redirect sent", sender: "ai" },
          });

          // ✅ STOP HERE - Don't continue with normal flow
          return;
        }

        // ✅ NORMAL FLOW: Construction-related inquiry
        // Determine temperature based on score
        let temperature: "hot" | "warm" | "cold";
        if (qualification.score >= 0.7) {
          temperature = "hot";
        } else if (qualification.score >= 0.4) {
          temperature = "warm";
        } else {
          temperature = "cold";
        }

        // ✅ UPDATE CONVERSATION with score
        await storage.updateConversation(conversation.id, {
          qualificationScore: qualification.score.toString(),
          lastMessageAt: new Date(),
        });

        // ✅ UPDATE LEAD with temperature and auto-qualify hot leads
        await storage.updateLead(lead.id, {
          qualificationScore: qualification.score.toString(),
          temperature: temperature,
          status: qualification.score >= 0.7 ? "qualified" : lead.status, // Auto-qualify hot leads
        });

        console.log(`🌡️ Temperature set to: ${temperature}`);

        // Broadcast lead update to dashboard
        const updatedLead = await storage.getLead(lead.id);
        this.broadcastUpdate({
          type: "lead_updated",
          lead: updatedLead,
          conversationId: conversation.id,
        });

        // Hot lead detection
        if (qualification.needsHumanAttention || qualification.score >= 0.7) {
          console.log("🔥 HOT LEAD - Triggering human handoff");

          await storage.updateConversation(conversation.id, {
            isAiHandled: false,
            humanTakeoverAt: new Date(),
          });

          // STOP TYPING
          this.broadcastUpdate({
            type: "typing_indicator",
            conversationId: conversation.id,
            isTyping: false,
            sender: "ai",
          });

          const updatedLead = await storage.getLead(lead.id);
          this.broadcastUpdate({
            type: "lead_updated",
            lead: updatedLead,
            conversationId: conversation.id,
          });

          this.broadcastUpdate({
            type: "hot_lead_alert",
            conversation: {
              ...conversation,
              lead: updatedLead,
              qualificationScore: qualification.score.toString(),
            },
            qualification,
          });

          const handoffMessage =
            "Thanks for your message! You've been identified as a priority lead. A team member will respond within 5 minutes.";
          const handoffResult = await whatsappService.sendTextMessage(
            from,
            handoffMessage
          );

          await storage.createMessage({
            conversationId: conversation.id,
            content: handoffMessage,
            sender: "ai",
            channel: "whatsapp",
            sentAt: new Date(),
            deliveredAt: new Date(),
            metadata: handoffResult.messageId
              ? { whatsappMessageId: handoffResult.messageId }
              : undefined,
          });
        } else {
          console.log("💬 Generating AI response...");

          const client = await storage.getClient(lead.clientId);
          const aiResponse = await generateAIResponse(messages, lead, client);

          console.log("AI Response:", aiResponse);

          // STOP TYPING
          this.broadcastUpdate({
            type: "typing_indicator",
            conversationId: conversation.id,
            isTyping: false,
            sender: "ai",
          });

          const aiResult = await whatsappService.sendTextMessage(
            from,
            aiResponse
          );

          await storage.createMessage({
            conversationId: conversation.id,
            content: aiResponse,
            sender: "ai",
            channel: "whatsapp",
            sentAt: new Date(),
            deliveredAt: new Date(),
            metadata: aiResult.messageId
              ? { whatsappMessageId: aiResult.messageId }
              : undefined,
          });

          console.log("✅ AI response sent");

          // ✅ NEW: Check for booking intent after AI responds to construction inquiry
          console.log("🔍 Checking for booking intent...");

          const bookingIntent = await detectBookingIntent(messages, lead);

          console.log("📅 Booking Intent:", bookingIntent);

          // ✅ STRICT VALIDATION: Only create booking if BOTH conditions met
          if (
            bookingIntent.wantsToBook &&
            bookingIntent.isConfirmed &&
            bookingIntent.confidence > 0.8 &&
            bookingIntent.proposedDateTime?.date // ← MUST have specific date
          ) {
            console.log("✅ High booking intent detected with specific date!");

            let scheduledFor: Date;
          const currentYear = new Date().getFullYear();

          if (
            bookingIntent.proposedDateTime.date &&
            bookingIntent.proposedDateTime.time
          ) {
            const normalizedTime = normalizeTimeString(bookingIntent.proposedDateTime.time);
            const dateString = `${bookingIntent.proposedDateTime.date}, ${currentYear} ${normalizedTime}`;
            console.log(`[DEBUG] Parsing normalized date string: "${dateString}"`);
            scheduledFor = new Date(dateString);
          } else if (bookingIntent.proposedDateTime.date) {
            const normalizedTime = normalizeTimeString("10am"); // Default time
            const dateString = `${bookingIntent.proposedDateTime.date}, ${currentYear} ${normalizedTime}`;
             console.log(`[DEBUG] Parsing normalized date string with default time: "${dateString}"`);
            scheduledFor = new Date(dateString);
          } else {
             console.error("❌ Booking intent confirmed but date is missing. Aborting.");
             return; // Exit if date is somehow missing
          }
          
          // Validate the parsed date
          if (isNaN(scheduledFor.getTime())) {
              console.error("❌ Failed to parse date. Aborting booking creation.", { bookingIntent });
              return;
          }

            // Create pending booking
            try {
              // Check for an existing pending booking for this lead
              const existingPendingBooking =
                await storage.findPendingBookingByLeadId(lead.id);

              const bookingDetails: InsertBooking = {
                leadId: lead.id,
                clientId: lead.clientId,
                title: `${
                  bookingIntent.meetingType === "site-visit"
                    ? "Site Visit"
                    : "Consultation"
                } - ${lead.firstName} ${lead.lastName}`,
                scheduledFor,
                scheduledAt: scheduledFor,
                duration: 60,
                status: "pending_approval",
                attendeeEmail: lead.email,
                attendeeName: `${lead.firstName} ${lead.lastName}`,
                attendeePhone: lead.phone,
                meetingType: bookingIntent.meetingType,
                location: bookingIntent.location || "TBD",
                notes: `AI-proposed booking. Confidence: ${(
                  bookingIntent.confidence * 100
                ).toFixed(0)}%. Reasoning: ${bookingIntent.reasoning}.`,
                proposedBy: "ai",
                aiConfidence: bookingIntent.confidence.toString(),
              };

              let savedBooking;
              let eventType = "booking_approval_needed";

              if (existingPendingBooking) {
                console.log(
                  `🔄 Updating existing pending booking: ${existingPendingBooking.id}`
                );
                // We remove status from the update object as we don't want to change it from pending_approval here
                const { status, ...updateDetails } = bookingDetails;
                savedBooking = await storage.updateBooking(
                  existingPendingBooking.id,
                  updateDetails
                );
                eventType = "booking_updated"; // Use a different event for updates on the frontend
              } else {
                console.log("✅ Creating new pending booking...");
                savedBooking = await storage.createBooking(bookingDetails);
              }

              console.log("✅ Pending booking saved:", savedBooking.id);

              // Broadcast to agents for approval using the correct event type
              this.broadcastUpdate({
                type: eventType,
                booking: {
                  ...savedBooking,
                  lead: {
                    firstName: lead.firstName,
                    lastName: lead.lastName,
                    company: lead.company,
                    phone: lead.phone,
                  },
                },
              });

              console.log(
                `📢 Booking ${eventType} notification sent to agents`
              );
            } catch (error) {
              console.error(
                "❌ Error creating/updating pending booking:",
                error
              );
            }
          } else if (
            bookingIntent.wantsToBook &&
            bookingIntent.confidence > 0.5
          ) {
            // ✅ NEW: Medium confidence or no specific date - just log it
            console.log(
              `ℹ️ Booking interest detected (confidence: ${bookingIntent.confidence}) but no specific date yet. Waiting for lead to specify day.`
            );
          }
        }

        // Broadcast final message update
        this.broadcastUpdate({
          type: "new_message",
          conversationId: conversation.id,
          message: { content: "AI response sent", sender: "ai" },
        });
      } else {
        console.log("👤 Human handling - just recording");

        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(),
        });
      }

      console.log("✅ Message processing complete");
    } catch (error) {
      console.error("Error handling message:", error);

      try {
        await whatsappService.sendTextMessage(
          from,
          "We received your message and will respond shortly!"
        );
      } catch (fallbackError) {
        console.error("Fallback message failed:", fallbackError);
      }
    }
  }

  private broadcastUpdate(data: any): void {
    if (!this.wss) return;

    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

export const leadQualificationService = new LeadQualificationService();
