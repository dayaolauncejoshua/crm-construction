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
        const createdAt = lead.createdAt ? new Date(lead.createdAt).getTime() : Date.now();
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

  async handleIncomingMessage(
    from: string,
    message: string,
    timestamp: number
  ): Promise<void> {
    try {
      // Find lead by phone number
      const leads = await storage.getLeads("", 1000); // TODO: Add phone lookup method
      const lead = leads.find(l => l.phone?.replace(/\D/g, "") === from);
      
      if (!lead) {
        console.log("No lead found for phone:", from);
        return;
      }

      // Find active conversation
      const conversations = await storage.getActiveConversations(lead.clientId);
      const conversation = conversations.find(c => c.leadId === lead.id);
      
      if (!conversation) {
        console.log("No active conversation found for lead:", lead.id);
        return;
      }

      // Record the incoming message
      await storage.createMessage({
        conversationId: conversation.id,
        content: message,
        sender: "lead",
        channel: "whatsapp",
        sentAt: new Date(timestamp * 1000),
      });

      // Get conversation history
      const messages = await storage.getMessages(conversation.id);
      
      // Qualify the lead
      const qualification = await qualifyLead(lead, messages);

      // Update conversation with new score
      await storage.updateConversation(conversation.id, {
        qualificationScore: qualification.score.toString(),
        lastMessageAt: new Date(),
      });

      // Check if human handoff is needed
      if (qualification.needsHumanAttention || qualification.score >= 0.7) {
        await storage.updateConversation(conversation.id, {
          isAiHandled: false,
          humanTakeoverAt: new Date(),
        });

        // Alert humans via WebSocket
        this.broadcastUpdate({
          type: "hot_lead_alert",
          conversation: {
            ...conversation,
            lead,
            qualificationScore: qualification.score.toString(),
          },
          qualification,
        });

        // Send notification message
        await whatsappService.sendTextMessage(
          from,
          "Thanks for your message! A team member will respond within 5 minutes to help with your request."
        );
      } else {
        // Generate AI response
        const client = await storage.getClient(lead.clientId);
        const aiResponse = await generateAIResponse(messages, lead, client);

        // Send AI response
        await whatsappService.sendTextMessage(from, aiResponse);

        // Record AI response
        await storage.createMessage({
          conversationId: conversation.id,
          content: aiResponse,
          sender: "ai",
          channel: "whatsapp",
          sentAt: new Date(),
        });
      }

      // Broadcast conversation update
      this.broadcastUpdate({
        type: "conversation_updated",
        conversation: {
          ...conversation,
          lead,
          qualificationScore: qualification.score.toString(),
        },
      });

    } catch (error) {
      console.error("Error handling incoming message:", error);
    }
  }

  private broadcastUpdate(data: any): void {
    if (!this.wss) return;

    const message = JSON.stringify(data);
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

export const leadQualificationService = new LeadQualificationService();
