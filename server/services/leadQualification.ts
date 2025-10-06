// server/services/leadQualification.ts

import { storage } from "../storage";
import { qualifyLead, generateAIResponse } from "./openai";
import { whatsappService } from "./whatsapp";
import { WebSocketServer } from "ws";

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

  //   //OPENAPI AI
  //   async handleIncomingMessage(
  //   from: string,
  //   message: string,
  //   timestamp: number
  // ): Promise<void> {
  //   try {
  //     console.log("=== INCOMING MESSAGE ===");
  //     console.log("From:", from);

  //     // Find lead by phone number
  //     const lead = await storage.getLeadByPhone(from);

  //     if (!lead) {
  //       console.log("❌ No lead found for phone:", from);
  //       return;
  //     }

  //     console.log("✅ Lead found:", lead.firstName, lead.lastName);

  //       // Find active conversation
  //       const conversations = await storage.getActiveConversations(lead.clientId);
  //       const conversation = conversations.find(c => c.leadId === lead.id);

  //       if (!conversation) {
  //         console.log("No active conversation found for lead:", lead.id);
  //         return;
  //       }

  //       // Record the incoming message
  //       await storage.createMessage({
  //         conversationId: conversation.id,
  //         content: message,
  //         sender: "lead",
  //         channel: "whatsapp",
  //         sentAt: new Date(timestamp * 1000),
  //       });

  //       //---------------------------------------------------------------------------
  //       //SKIP AI QUALIFICATION FOR NOW - UPDATE CONVERSATION FOR NOW

  //       // Get conversation history
  //       // const messages = await storage.getMessages(conversation.id);

  //       // // Qualify the lead
  //       // const qualification = await qualifyLead(lead, messages);

  //       // // Update conversation with new score
  //       // await storage.updateConversation(conversation.id, {
  //       //   qualificationScore: qualification.score.toString(),
  //       //   lastMessageAt: new Date(),
  //       // });

  //       // // Check if human handoff is needed
  //       // if (qualification.needsHumanAttention || qualification.score >= 0.7) {
  //       //   await storage.updateConversation(conversation.id, {
  //       //     isAiHandled: false,
  //       //     humanTakeoverAt: new Date(),
  //       //   });

  //       //   // Alert humans via WebSocket
  //       //   this.broadcastUpdate({
  //       //     type: "hot_lead_alert",
  //       //     conversation: {
  //       //       ...conversation,
  //       //       lead,
  //       //       qualificationScore: qualification.score.toString(),
  //       //     },
  //       //     qualification,
  //       //   });

  //       //   // Send notification message
  //       //   await whatsappService.sendTextMessage(
  //       //     from,
  //       //     "Thanks for your message! A team member will respond within 5 minutes to help with your request."
  //       //   );
  //       // } else {
  //       //   // Generate AI response
  //       //   const client = await storage.getClient(lead.clientId);
  //       //   const aiResponse = await generateAIResponse(messages, lead, client);

  //       //   // Send AI response
  //       //   await whatsappService.sendTextMessage(from, aiResponse);

  //       //   // Record AI response
  //       //   await storage.createMessage({
  //       //     conversationId: conversation.id,
  //       //     content: aiResponse,
  //       //     sender: "ai",
  //       //     channel: "whatsapp",
  //       //     sentAt: new Date(),
  //       //   });
  //       // }

  //        // -----------------------------------------------------

  //         await storage.updateConversation(conversation.id, {
  //       lastMessageAt: new Date(),
  //     });

  //       // Broadcast conversation update
  //       this.broadcastUpdate({
  //       type: "new_message",
  //       conversationId: conversation.id,
  //       message: { content: message, sender: "lead" },
  //     });

  //     console.log("✅ Message recorded, skipping AI for now");

  //   } catch (error) {
  //     console.error("Error handling incoming message:", error);
  //   }
  //   }
  // ======================= FOR UNKNOWN NUMBERS ===========================
  async handleIncomingMessage(
    from: string,
    message: string,
    timestamp: number
  ): Promise<void> {
    try {
      console.log("=== INCOMING MESSAGE ===");
      console.log("From:", from);

      let lead = await storage.getLeadByPhone(from);

      if (!lead) {
        console.log("📝 Unknown number - creating new lead automatically");

        // Get ALL active clients and try to match by WhatsApp number
        const allUsers = await storage.getAllUsersForAdmin();
        let targetClient = null;

        // Try to find client that matches the WhatsApp number
        for (const user of allUsers) {
          const userClients = await storage.getClients(user.id);
          const matchingClient = userClients.find(
            (c) => c.isActive && c.whatsappNumber === from
          );
          if (matchingClient) {
            targetClient = matchingClient;
            break;
          }
        }

        // If no match by phone, get the most recently created active client
        if (!targetClient) {
          for (const user of allUsers) {
            const userClients = await storage.getClients(user.id);
            if (userClients.length > 0) {
              targetClient = userClients[0]; // Get first active client
              break;
            }
          }
        }

        if (!targetClient) {
          console.error("No active clients found - cannot create lead");
          return;
        }

        console.log(
          `Assigning to client: ${targetClient.name} (${targetClient.id})`
        );

        // Auto-create lead from unknown WhatsApp number
        lead = await storage.createLead({
          clientId: targetClient.id,
          firstName: "WhatsApp",
          lastName: "Lead",
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

      // Find or create conversation
      const conversations = await storage.getActiveConversations(lead.clientId);
      let conversation = conversations.find((c) => c.leadId === lead.id);

      if (!conversation) {
        const newConv = await storage.createConversation({
          leadId: lead.id,
          clientId: lead.clientId,
          channel: "whatsapp",
          status: "active",
          isAiHandled: false,
          qualificationScore: "0.0",
          lastMessageAt: new Date(),
        });
        conversation = { ...newConv, lead } as any;
        console.log("✅ New conversation created:", conversation!.id);
      } else {
        console.log("✅ Existing conversation found:", conversation.id);
      }

      if (!conversation) {
        console.error("Failed to create conversation");
        return;
      }

      // Record incoming message
      await storage.createMessage({
        conversationId: conversation.id,
        content: message,
        sender: "lead",
        channel: "whatsapp",
        sentAt: new Date(timestamp * 1000),
      });

      // Increment unread count for incoming messages
      await storage.incrementUnreadCount(conversation.id);

      // Update conversation timestamp
      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
      });

      // Broadcast to UI
      this.broadcastUpdate({
        type: "new_message",
        conversationId: conversation.id,
        message: { content: message, sender: "lead" },
      });

      console.log("✅ Message processed");
    } catch (error) {
      console.error("Error handling incoming message:", error);
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
