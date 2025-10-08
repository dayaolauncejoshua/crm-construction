// server/routes.ts

import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertLeadSchema,
  insertClientSchema,
  insertBookingSchema,
} from "@shared/schema";
import { generateAudit, generateVSLScript } from "./services/openai";
import { whatsappService } from "./services/whatsapp";
import { leadQualificationService } from "./services/leadQualification";
import advancedRoutes from "./advanced-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  let wss: WebSocketServer | null = null;
  function broadcastUpdate(data: any) {
    if (!wss) return;
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  // WebSocket server for real-time updates
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  leadQualificationService.setWebSocketServer(wss);

  wss.on("connection", (ws: WebSocket) => {
    console.log("Client connected to WebSocket");

    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
    });
  });

  // Landing page lead capture
  app.post("/api/leads", async (req, res) => {
    try {
      const leadData = insertLeadSchema.parse(req.body);

      // Generate audit based on provided data
      const auditInputs = req.body.auditInputs || {};
      const auditType = req.body.auditType || "business";

      const auditResults = await generateAudit(auditType, auditInputs);

      // Create lead with audit results
      const lead = await storage.createLead({
        ...leadData,
        auditResults: {
          type: auditType,
          ...auditResults,
          topFinding: auditResults.wins[0] || "Opportunities identified",
        },
        status: "new",
        qualificationScore: (auditResults.score / 100).toString(),
      });

      // Process lead for immediate response
      await leadQualificationService.processNewLead(lead.id);

      res.json({
        success: true,
        leadId: lead.id,
        auditResults: lead.auditResults,
      });
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Manual Lead Controls Routes

  // Update lead with manual overrides
  app.patch("/api/leads/:leadId/manual", async (req, res) => {
    try {
      const { leadId } = req.params;
      const userId = (req as any).user?.id; // Get from session if available

      console.log("📝 Manual lead update:", leadId, req.body);

      const lead = await storage.updateLeadManual(leadId, req.body, userId);

      console.log("✅ Lead updated:", lead);

      res.json(lead);
    } catch (error) {
      console.error("❌ Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // Get lead activity log
  app.get("/api/leads/:leadId/activity", async (req, res) => {
    try {
      const { leadId } = req.params;
      const activity = await storage.getLeadActivityLog(leadId);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity log:", error);
      res.status(500).json({ message: "Failed to fetch activity log" });
    }
  });

  // Get available tags for client
  app.get("/api/lead-tags/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const tags = await storage.getLeadTags(clientId);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // Create new tag
  app.post("/api/lead-tags", async (req, res) => {
    try {
      const tag = await storage.createLeadTag(req.body);
      res.json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  // WhatsApp webhook
  app.post("/api/webhooks/whatsapp", async (req, res) => {
    try {
      const incomingMessage = whatsappService.parseWebhook(req.body);

      if (incomingMessage) {
        await leadQualificationService.queueIncomingMessage(
          incomingMessage.from,
          incomingMessage.message,
          incomingMessage.timestamp
        );
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // WhatsApp webhook verification
  app.get("/api/webhooks/whatsapp", (req, res) => {
    const verifyToken =
      process.env.WHATSAPP_VERIFY_TOKEN || "default_verify_token";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("=== WEBHOOK VERIFICATION ===");
    console.log("Expected token:", verifyToken);
    console.log("Received token:", token);
    console.log("Mode:", mode);
    console.log("Challenge:", challenge);

    if (mode && token === verifyToken) {
      console.log("✅ Verification successful");
      res.status(200).send(challenge);
    } else {
      console.log("❌ Verification failed - token mismatch");
      res.status(403).send("Forbidden");
    }
  });

  // Client management
  app.get("/api/clients", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      console.log("=== CLIENTS API DEBUG ===");
      console.log("Requested userId:", userId);

      const clients = await storage.getClients(userId);
      console.log("Found clients:", clients.length);
      clients.forEach((c) => console.log(`  - ${c.name} (id: ${c.id})`));

      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Dashboard data
  app.get("/api/dashboard/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;

      const [kpis, conversations, hotLeads, recentActivity] = await Promise.all(
        [
          storage.getKPIs(clientId),
          storage.getConversations(clientId, 50),
          storage.getHotLeads(clientId),
          storage.getRecentActivity(clientId),
        ]
      );

      // Merge hot leads into conversations to ensure they're visible
      const conversationMap = new Map(conversations.map((c) => [c.id, c]));
      hotLeads.forEach((hl) => {
        if (!conversationMap.has(hl.id)) {
          conversationMap.set(hl.id, hl);
        }
      });
      const allConversations = Array.from(conversationMap.values());

      res.json({
        kpis,
        conversations: allConversations,
        hotLeads,
        recentActivity,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Conversations
  app.get("/api/conversations/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const conversations = await storage.getActiveConversations(clientId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages in a conversation
  app.get("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Mark conversation as read
  app.post("/api/conversations/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markConversationAsRead(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Take over conversation
  app.post("/api/conversations/:conversationId/takeover", async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversation = await storage.updateConversation(conversationId, {
        isAiHandled: false,
        humanTakeoverAt: new Date(),
      });

      // Get lead details for broadcast
      const lead = await storage.getLead(conversation.leadId);

      // Broadcast update
      broadcastUpdate({
        type: "conversation_updated",
        conversation: {
          ...conversation,
          lead,
        },
      });

      res.json(conversation);
    } catch (error) {
      console.error("Error taking over conversation:", error);
      res.status(500).json({ message: "Failed to take over conversation" });
    }
  });

  // Send message in conversation
  app.post("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { content, channel } = req.body;

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const lead = await storage.getLead(conversation.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Send message via appropriate channel
      if (channel === "whatsapp" && lead.phone) {
        await whatsappService.sendTextMessage(lead.phone, content);
      }

      // Record message
      const message = await storage.createMessage({
        conversationId,
        content,
        sender: "human",
        channel,
        sentAt: new Date(),
        deliveredAt: new Date(),
      });

      // Update conversation last message time
      await storage.updateConversation(conversationId, {
        lastMessageAt: new Date(),
      });

      // Broadcast new message
      broadcastUpdate({
        type: "new_message",
        conversationId,
        message,
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Mark messages as read
  app.post(
    "/api/conversations/:conversationId/messages/read",
    async (req, res) => {
      try {
        const { conversationId } = req.params;
        const { messageIds } = req.body;

        if (!messageIds || !Array.isArray(messageIds)) {
          return res.status(400).json({ error: "messageIds array required" });
        }

        console.log(
          `Marking ${messageIds.length} messages as read in conversation ${conversationId}`
        );

        // Mark messages as read
        await storage.markMessagesAsRead(messageIds);

        // Also mark conversation as read
        await storage.markConversationAsRead(conversationId);

        res.json({ success: true });
      } catch (error: any) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Quick Reply Templates Routes
  app.get("/api/quick-replies/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const templates = await storage.getQuickReplyTemplates(clientId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/quick-replies", async (req, res) => {
    try {
      const template = await storage.createQuickReplyTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/quick-replies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updateQuickReplyTemplate(id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/quick-replies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuickReplyTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  app.post("/api/quick-replies/:id/use", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.incrementTemplateUsage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing usage:", error);
      res.status(500).json({ message: "Failed to track usage" });
    }
  });

  // VSL Management
  app.get("/api/vsls/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const vsls = await storage.getVSLs(clientId);
      res.json(vsls);
    } catch (error) {
      console.error("Error fetching VSLs:", error);
      res.status(500).json({ message: "Failed to fetch VSLs" });
    }
  });

  app.post("/api/vsls", async (req, res) => {
    try {
      const {
        title,
        niche,
        targetAudience,
        painPoints,
        solution,
        proofElements,
        clientId,
      } = req.body;

      // Generate VSL script using AI
      const scriptData = {
        niche,
        targetAudience: targetAudience || `${niche} business owners`,
        painPoints: painPoints || `Common challenges in ${niche}`,
        solution: solution || "AI-powered lead generation system",
        proofElements: proofElements || "Proven results and case studies",
      };
      const script = await generateVSLScript(niche, scriptData);

      const vsl = await storage.createVSL({
        clientId,
        title,
        script,
        duration: 180, // 3 minutes default
        isActive: true,
      });

      res.json(vsl);
    } catch (error) {
      console.error("Error creating VSL:", error);
      res.status(500).json({ message: "Failed to create VSL" });
    }
  });

  // Bookings
  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(bookingData);

      // Update lead status to converted
      await storage.updateLead(booking.leadId, {
        status: "converted",
      });

      res.json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Update booking status
  app.patch("/api/bookings/:bookingId", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status, notes } = req.body;

      const booking = await storage.updateBooking(bookingId, {
        status,
        notes,
      });

      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Lead management routes
  app.get("/api/leads/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const leads = await storage.getLeads(clientId, 100); // Get up to 100 leads
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // Mark lead as viewed
  app.post("/api/leads/:leadId/view", async (req, res) => {
    try {
      const { leadId } = req.params;

      // Update lead with viewedAt timestamp
      const lead = await storage.updateLead(leadId, {
        viewedAt: new Date(),
      });

      res.json({ success: true, lead });
    } catch (error) {
      console.error("Error marking lead as viewed:", error);
      res.status(500).json({ message: "Failed to mark lead as viewed" });
    }
  });

  app.patch("/api/leads/:leadId", async (req, res) => {
    try {
      const { leadId } = req.params;
      const updateData = req.body;

      const lead = await storage.updateLead(leadId, {
        ...updateData,
        updatedAt: new Date(),
      });

      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:leadId", async (req, res) => {
    try {
      const { leadId } = req.params;
      await storage.deleteLead(leadId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // User trial management
  app.get("/api/user/trial-status", async (req, res) => {
    try {
      // In a real app, get userId from authenticated session
      const userId = "demo-user-id"; // Mock user ID
      const status = await storage.getUserTrialStatus(userId);
      res.json(status);
    } catch (error) {
      console.error("Error fetching trial status:", error);
      res.status(500).json({ message: "Failed to fetch trial status" });
    }
  });

  app.post("/api/user/activate-trial", async (req, res) => {
    try {
      // In a real app, get userId from authenticated session
      const userId = "demo-user-id"; // Mock user ID
      const result = await storage.activateUserTrial(userId);

      // Log the activation
      await storage.logUserActivity(userId, "trial_activated", "trial", {
        trialDays: 14,
        source: "dashboard",
      });

      res.json(result);
    } catch (error) {
      console.error("Error activating trial:", error);
      res.status(500).json({ message: "Failed to activate trial" });
    }
  });

  // Super admin routes
  app.get("/api/super-admin/dashboard", async (req, res) => {
    try {
      const dashboard = await storage.getSuperAdminDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching super admin dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/super-admin/users", async (req, res) => {
    try {
      const { search, status } = req.query;
      const users = await storage.getAllUsersForAdmin(
        search as string,
        status as string
      );
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/super-admin/activities", async (req, res) => {
    try {
      const activities = await storage.getRecentActivities();
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get("/api/super-admin/metrics", async (req, res) => {
    try {
      const metrics = await storage.recordSystemMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error recording metrics:", error);
      res.status(500).json({ message: "Failed to record metrics" });
    }
  });

  // Mount advanced routes
  app.use("/api", advancedRoutes);

  // System health endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const health = {
        whatsapp: "operational", // TODO: Implement actual health checks
        ai: "operational",
        vsl: "maintenance",
        calendar: "operational",
        uptime: "99.8%",
        timestamp: new Date().toISOString(),
      };

      res.json(health);
    } catch (error) {
      res.status(500).json({ message: "Health check failed" });
    }
  });

  return httpServer;
}
