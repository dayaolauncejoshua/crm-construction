import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertLeadSchema, insertClientSchema, insertBookingSchema } from "@shared/schema";
import { generateAudit, generateVSLScript } from "./services/openai";
import { whatsappService } from "./services/whatsapp";
import { leadQualificationService } from "./services/leadQualification";
import advancedRoutes from "./advanced-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  leadQualificationService.setWebSocketServer(wss);

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
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
        auditResults: lead.auditResults 
      });
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // WhatsApp webhook
  app.post("/api/webhooks/whatsapp", async (req, res) => {
    try {
      const incomingMessage = whatsappService.parseWebhook(req.body);
      
      if (incomingMessage) {
        await leadQualificationService.handleIncomingMessage(
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
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "default_verify_token";
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Forbidden");
    }
  });

  // Client management
  app.get("/api/clients", async (req, res) => {
    try {
      // For demo purposes, use a default user ID
      const userId = req.query.userId as string || "demo-user-id";
      const clients = await storage.getClients(userId);
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
      res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Dashboard data
  app.get("/api/dashboard/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const [
        kpis,
        conversations,
        hotLeads,
        recentActivity,
        leads,
        bookings
      ] = await Promise.all([
        storage.getKPIs(clientId),
        storage.getConversations(clientId, 10),
        storage.getHotLeads(clientId),
        storage.getRecentActivity(clientId),
        storage.getLeads(clientId, 50),
        storage.getBookings(clientId)
      ]);

      res.json({
        kpis,
        conversations,
        hotLeads,
        recentActivity,
        leads,
        bookings,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
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

  // Take over conversation
  app.post("/api/conversations/:conversationId/takeover", async (req, res) => {
    try {
      const { conversationId } = req.params;
      
      const conversation = await storage.updateConversation(conversationId, {
        isAiHandled: false,
        humanTakeoverAt: new Date(),
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
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
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
      const { title, niche, targetAudience, painPoints, solution, proofElements, clientId } = req.body;
      
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
      res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error" });
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
        updatedAt: new Date(),
      });

      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Lead management routes
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
        source: "dashboard"
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
      const users = await storage.getAllUsersForAdmin(search as string, status as string);
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
