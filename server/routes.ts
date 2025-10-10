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
import { emailService } from "./services/email";
import {
  startReminderCron,
  setBroadcastFunction,
} from "./services/reminder-cron";
import bcrypt from "bcrypt";

// Helper function to check for booking conflicts
function hasBookingConflict(
  newStart: Date,
  newEnd: Date,
  existingBookings: any[],
  excludeBookingId?: string
): { hasConflict: boolean; conflictingBooking?: any } {
  console.log("🔍 Checking for conflicts:");
  console.log(
    "  New booking:",
    newStart.toISOString(),
    "to",
    newEnd.toISOString()
  );
  console.log(
    "  Checking against",
    existingBookings.length,
    "existing bookings"
  );

  for (const booking of existingBookings) {
    // Skip cancelled/completed bookings and the booking being rescheduled
    if (booking.status !== "scheduled" || booking.id === excludeBookingId) {
      console.log(
        `  ⏭️  Skipping booking ${booking.id} (status: ${booking.status})`
      );
      continue;
    }

    const existingStart = new Date(booking.scheduledFor);
    const existingEnd = new Date(
      existingStart.getTime() + booking.duration * 60000
    );

    console.log(`  📋 Checking: ${booking.title}`);
    console.log(
      `     Existing: ${existingStart.toISOString()} to ${existingEnd.toISOString()}`
    );

    // Check if times overlap
    const hasOverlap =
      (newStart >= existingStart && newStart < existingEnd) || // New starts during existing
      (newEnd > existingStart && newEnd <= existingEnd) || // New ends during existing
      (newStart <= existingStart && newEnd >= existingEnd); // New encompasses existing

    if (hasOverlap) {
      console.log("  ❌ CONFLICT DETECTED!");
      return { hasConflict: true, conflictingBooking: booking };
    } else {
      console.log("  ✅ No conflict");
    }
  }

  console.log("✅ No conflicts found");
  return { hasConflict: false };
}

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

  // Create booking with calendar invite
  app.post("/api/bookings/schedule", async (req, res) => {
    try {
      const {
        leadId,
        clientId,
        scheduledFor, // From frontend
        duration = 60,
        meetingType = "consultation",
        location = "Office",
        notes,
      } = req.body;

      console.log("📅 Creating booking:", {
        leadId,
        scheduledFor,
        meetingType,
      });

      // Get lead
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Get client
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const scheduledDate = new Date(scheduledFor);

      // Check for conflicts with existing bookings
      const existingBookings = await storage.getBookings(clientId);
      const scheduledEnd = new Date(scheduledDate.getTime() + duration * 60000);

      const conflict = hasBookingConflict(
        scheduledDate,
        scheduledEnd,
        existingBookings
      );

      if (conflict.hasConflict && conflict.conflictingBooking) {
        const conflictStart = new Date(
          conflict.conflictingBooking.scheduledFor
        );
        const conflictEnd = new Date(
          conflictStart.getTime() + conflict.conflictingBooking.duration * 60000
        );

        return res.status(409).json({
          error: "Booking conflict detected",
          message: `There is already a meeting scheduled from ${conflictStart.toLocaleTimeString(
            "en-US",
            { hour: "2-digit", minute: "2-digit" }
          )} to ${conflictEnd.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          conflictingBooking: {
            id: conflict.conflictingBooking.id,
            title: conflict.conflictingBooking.title,
            attendeeName: conflict.conflictingBooking.attendeeName,
            scheduledFor: conflict.conflictingBooking.scheduledFor,
            duration: conflict.conflictingBooking.duration,
          },
        });
      }

      // Create booking
      const booking = await storage.createBooking({
        leadId,
        clientId,
        title: `${
          meetingType === "site-visit" ? "Site Visit" : "Consultation"
        } - ${lead.firstName} ${lead.lastName}`,
        description: notes || `${meetingType} with ${client.name}`,
        location,
        scheduledAt: scheduledDate, // Your existing field
        scheduledFor: scheduledDate, // New field
        duration,
        status: "scheduled",
        attendeeEmail: lead.email,
        attendeeName: `${lead.firstName} ${lead.lastName}`,
        attendeePhone: lead.phone,
        meetingType,
        notes,
      });

      console.log("✅ Booking created:", booking.id);

      // Save booking notification as a message in the conversation
      try {
        console.log("🔍 Looking for conversation for leadId:", leadId);

        const conversations = await storage.getConversations(clientId, 100);
        console.log(
          `📊 Found ${conversations.length} conversations for clientId ${clientId}`
        );

        const conversation = conversations.find((c) => c.leadId === leadId);

        if (!conversation) {
          console.error("❌ No conversation found for this lead!");
          console.log(
            "Available leadIds:",
            conversations.map((c) => c.leadId)
          );
        } else {
          console.log("✅ Found conversation:", conversation.id);

          const messageContent =
            `📅 Meeting Scheduled!\n\n` +
            `Type: ${
              meetingType === "site-visit" ? "Site Visit" : "Consultation"
            }\n` +
            `Date: ${scheduledDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}\n` +
            `Time: ${scheduledDate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}\n` +
            `Duration: ${duration} minutes\n` +
            `Location: ${location}\n` +
            (notes ? `\nNotes: ${notes}` : "");

          const savedMessage = await storage.createMessage({
            conversationId: conversation.id,
            sender: "human",
            content: messageContent,
            channel: "whatsapp",
            isStatusMessage: true,
            sentAt: new Date(),
            deliveredAt: new Date(),
          });

          console.log("✅ Booking message saved:", savedMessage.id);

          // Broadcast the new message
          broadcastUpdate({
            type: "new_message",
            conversationId: conversation.id,
            message: savedMessage,
          });

          console.log("✅ Broadcast sent to WebSocket clients");
        }
      } catch (error) {
        console.error("❌ Failed to save booking message:", error);
      }

      // Calculate end time
      const startTime = scheduledDate;
      const endTime = new Date(startTime.getTime() + duration * 60000);

      // Send email with .ics if email exists
      if (lead.email) {
        const icsContent = emailService.generateICS({
          title: booking.title,
          description: booking.description || "",
          location: booking.location || "TBD",
          startTime,
          endTime,
          organizerEmail: process.env.EMAIL_USER || "noreply@aileadsystem.com",
          organizerName: client.name,
          attendeeEmail: lead.email,
          attendeeName: `${lead.firstName} ${lead.lastName}`,
        });

        const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #2563eb;">Meeting Confirmed! 🎉</h2>
          <p>Hi ${lead.firstName},</p>
          <p>Your ${
            meetingType === "site-visit" ? "site visit" : "consultation"
          } has been scheduled.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📅 Meeting Details</h3>
            <p><strong>Date:</strong> ${startTime.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}</p>
            <p><strong>Time:</strong> ${startTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
            <p><strong>Duration:</strong> ${duration} minutes</p>
            <p><strong>Location:</strong> ${location}</p>
          </div>
          
          <p>The meeting has been added to your calendar. See you then!</p>
          
          <p style="margin-top: 30px;">Best regards,<br>${client.name}</p>
        </div>
      `;

        await emailService.sendCalendarInvite({
          to: lead.email,
          toName: `${lead.firstName} ${lead.lastName}`,
          subject: `Meeting Confirmed - ${startTime.toLocaleDateString()}`,
          htmlBody: emailBody,
          icsContent,
          icsFilename: "meeting.ics",
        });
      }

      // Send WhatsApp confirmation
      if (lead.phone) {
        const whatsappMsg = `✅ Meeting Confirmed!

📅 ${startTime.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
🕐 ${startTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
⏱️ ${duration} minutes
📍 ${location}

Check your email for the calendar invite. See you then!`;

        await whatsappService.sendTextMessage(lead.phone, whatsappMsg);
      }

      // Update lead status
      await storage.updateLead(leadId, { status: "contacted" });

      res.json({ success: true, booking });
    } catch (error) {
      console.error("❌ Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Reschedule booking
  app.patch("/api/bookings/:bookingId/reschedule", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { scheduledFor, duration, notes } = req.body;

      console.log("📅 Rescheduling booking:", bookingId);

      // Get existing booking
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Get lead details
      const lead = await storage.getLead(existingBooking.leadId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Get client details
      const client = await storage.getClient(existingBooking.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const newScheduledDate = new Date(scheduledFor);

      // Check for conflicts with existing bookings
      const existingBookings = await storage.getBookings(
        existingBooking.clientId
      );
      const scheduledEnd = new Date(
        newScheduledDate.getTime() +
          (duration || existingBooking.duration) * 60000
      );

      const conflict = hasBookingConflict(
        newScheduledDate,
        scheduledEnd,
        existingBookings,
        bookingId // Exclude current booking from conflict check
      );

      if (conflict.hasConflict && conflict.conflictingBooking) {
        const conflictStart = new Date(
          conflict.conflictingBooking.scheduledFor
        );
        const conflictEnd = new Date(
          conflictStart.getTime() + conflict.conflictingBooking.duration * 60000
        );

        return res.status(409).json({
          error: "Booking conflict detected",
          message: `There is already a meeting scheduled from ${conflictStart.toLocaleTimeString(
            "en-US",
            { hour: "2-digit", minute: "2-digit" }
          )} to ${conflictEnd.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          conflictingBooking: {
            id: conflict.conflictingBooking.id,
            title: conflict.conflictingBooking.title,
            attendeeName: conflict.conflictingBooking.attendeeName,
            scheduledFor: conflict.conflictingBooking.scheduledFor,
            duration: conflict.conflictingBooking.duration,
          },
        });
      }

      // Update booking
      const updatedBooking = await storage.updateBooking(bookingId, {
        scheduledFor: newScheduledDate,
        scheduledAt: newScheduledDate,
        duration: duration || existingBooking.duration,
        notes: notes !== undefined ? notes : existingBooking.notes,
      });

      console.log("✅ Booking rescheduled:", updatedBooking.id);

      // Format date/time for notifications
      const formattedDate = newScheduledDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = newScheduledDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Send updated email notification
      if (lead.email) {
        const startTime = newScheduledDate;
        const endTime = new Date(
          startTime.getTime() + (duration || existingBooking.duration) * 60000
        );

        const icsContent = emailService.generateICS({
          title: updatedBooking.title,
          description: updatedBooking.description || "",
          location: updatedBooking.location || "TBD",
          startTime,
          endTime,
          organizerEmail: process.env.EMAIL_USER || "noreply@aileadsystem.com",
          organizerName: client.name,
          attendeeEmail: lead.email,
          attendeeName: `${lead.firstName} ${lead.lastName}`,
        });

        const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #f59e0b;">⚠️ Meeting Rescheduled</h2>
          <p>Hi ${lead.firstName},</p>
          <p>Your meeting has been rescheduled to a new time.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">📅 New Meeting Details</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Duration:</strong> ${
              duration || existingBooking.duration
            } minutes</p>
            <p><strong>Location:</strong> ${
              updatedBooking.location || "TBD"
            }</p>
          </div>
          
          <p>The updated meeting has been added to your calendar.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>${client.name}</p>
        </div>
      `;

        await emailService.sendCalendarInvite({
          to: lead.email,
          toName: `${lead.firstName} ${lead.lastName}`,
          subject: `Meeting Rescheduled - ${formattedDate}`,
          htmlBody: emailBody,
          icsContent,
          icsFilename: "meeting-updated.ics",
        });

        console.log("✅ Reschedule email sent");
      }

      // Send WhatsApp notification
      if (lead.phone) {
        const whatsappMsg = `⚠️ Meeting Rescheduled

Hi ${lead.firstName}! Your meeting has been moved to a new time:

📅 ${formattedDate}
🕐 ${formattedTime}
⏱️ ${duration || existingBooking.duration} minutes
📍 ${updatedBooking.location || "TBD"}

Check your email for the updated calendar invite. See you then!`;

        await whatsappService.sendTextMessage(lead.phone, whatsappMsg);
        console.log("✅ Reschedule WhatsApp sent");
      }

      // Add message to conversation
      try {
        const conversations = await storage.getConversations(
          existingBooking.clientId,
          100
        );
        const conversation = conversations.find(
          (c) => c.leadId === existingBooking.leadId
        );

        if (conversation) {
          const messageContent =
            `🔄 Meeting Rescheduled\n\n` +
            `New Date: ${formattedDate}\n` +
            `New Time: ${formattedTime}\n` +
            `Duration: ${duration || existingBooking.duration} minutes\n` +
            `Location: ${updatedBooking.location || "TBD"}\n` +
            (notes ? `\nNotes: ${notes}` : "");

          await storage.createMessage({
            conversationId: conversation.id,
            sender: "human",
            content: messageContent,
            channel: "whatsapp",
            isStatusMessage: true,
            sentAt: new Date(),
            deliveredAt: new Date(),
          });

          console.log("✅ Reschedule message added to conversation");

          broadcastUpdate({
            type: "new_message",
            conversationId: conversation.id,
            message: messageContent,
          });
        }
      } catch (error) {
        console.error("⚠️ Failed to add reschedule message:", error);
      }

      // Broadcast booking update
      broadcastUpdate({
        type: "booking_updated",
        booking: updatedBooking,
      });

      res.json({ success: true, booking: updatedBooking });
    } catch (error: any) {
      console.error("❌ Error rescheduling booking:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Edit booking details (location, duration, notes, type)
  app.patch("/api/bookings/:bookingId/edit", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { duration, location, notes, meetingType } = req.body;

      console.log("✏️ Editing booking details:", bookingId);

      // Get existing booking
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Get lead details
      const lead = await storage.getLead(existingBooking.leadId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // If duration changed, check for conflicts
      if (duration && duration !== existingBooking.duration) {
        const existingBookings = await storage.getBookings(
          existingBooking.clientId
        );
        const scheduledStart = new Date(existingBooking.scheduledFor);
        const newEnd = new Date(scheduledStart.getTime() + duration * 60000);

        const conflict = hasBookingConflict(
          scheduledStart,
          newEnd,
          existingBookings,
          bookingId // Exclude current booking
        );

        if (conflict.hasConflict && conflict.conflictingBooking) {
          const conflictStart = new Date(
            conflict.conflictingBooking.scheduledFor
          );
          const conflictEnd = new Date(
            conflictStart.getTime() +
              conflict.conflictingBooking.duration * 60000
          );

          return res.status(409).json({
            error: "Booking conflict detected",
            message: `The new duration creates a conflict with a meeting from ${conflictStart.toLocaleTimeString(
              "en-US",
              { hour: "2-digit", minute: "2-digit" }
            )} to ${conflictEnd.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
            conflictingBooking: {
              id: conflict.conflictingBooking.id,
              title: conflict.conflictingBooking.title,
              attendeeName: conflict.conflictingBooking.attendeeName,
              scheduledFor: conflict.conflictingBooking.scheduledFor,
              duration: conflict.conflictingBooking.duration,
            },
          });
        }
      }

      // Update booking
      const updatedBooking = await storage.updateBooking(bookingId, {
        duration: duration || existingBooking.duration,
        location: location || existingBooking.location,
        notes: notes !== undefined ? notes : existingBooking.notes,
        meetingType: meetingType || existingBooking.meetingType,
      });

      console.log("✅ Booking details updated:", updatedBooking.id);

      // Add message to conversation
      try {
        const conversations = await storage.getConversations(
          existingBooking.clientId,
          100
        );
        const conversation = conversations.find(
          (c) => c.leadId === existingBooking.leadId
        );

        if (conversation) {
          const scheduledDate = new Date(existingBooking.scheduledFor);
          const formattedDate = scheduledDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const changes = [];
          if (duration && duration !== existingBooking.duration) {
            changes.push(
              `Duration: ${existingBooking.duration} min → ${duration} min`
            );
          }
          if (location && location !== existingBooking.location) {
            changes.push(`Location: ${existingBooking.location} → ${location}`);
          }
          if (meetingType && meetingType !== existingBooking.meetingType) {
            changes.push(
              `Type: ${existingBooking.meetingType} → ${meetingType}`
            );
          }

          const messageContent =
            `📝 Meeting Details Updated\n\n` +
            `Meeting: ${existingBooking.title}\n` +
            `Date: ${formattedDate} at ${formattedTime}\n\n` +
            `Changes:\n${changes.join("\n")}`;

          await storage.createMessage({
            conversationId: conversation.id,
            sender: "human",
            content: messageContent,
            channel: "whatsapp",
            isStatusMessage: true,
            sentAt: new Date(),
            deliveredAt: new Date(),
          });

          console.log("✅ Details update message added to conversation");

          broadcastUpdate({
            type: "new_message",
            conversationId: conversation.id,
            message: messageContent,
          });
        }
      } catch (error) {
        console.error("⚠️ Failed to add update message:", error);
      }

      // Broadcast booking update
      broadcastUpdate({
        type: "booking_updated",
        booking: updatedBooking,
      });

      res.json({ success: true, booking: updatedBooking });
    } catch (error: any) {
      console.error("❌ Error updating booking details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel booking
  app.patch("/api/bookings/:bookingId/cancel", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body;

      console.log("❌ Cancelling booking:", bookingId);

      // Get existing booking
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Get lead details
      const lead = await storage.getLead(existingBooking.leadId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Get client details
      const client = await storage.getClient(existingBooking.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Update booking status to cancelled
      const updatedBooking = await storage.updateBooking(bookingId, {
        status: "cancelled",
        notes: reason ? `Cancelled: ${reason}` : existingBooking.notes,
      });

      console.log("✅ Booking cancelled:", updatedBooking.id);

      // Format date/time for notifications
      const scheduledDate = new Date(existingBooking.scheduledFor);
      const formattedDate = scheduledDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Send cancellation email
      if (lead.email) {
        const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #dc2626;">❌ Meeting Cancelled</h2>
          <p>Hi ${lead.firstName},</p>
          <p>We regret to inform you that your scheduled meeting has been cancelled.</p>
          
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #7f1d1d;">📅 Cancelled Meeting Details</h3>
            <p><strong>Meeting:</strong> ${existingBooking.title}</p>
            <p><strong>Originally Scheduled:</strong> ${formattedDate} at ${formattedTime}</p>
            <p><strong>Duration:</strong> ${
              existingBooking.duration
            } minutes</p>
            <p><strong>Location:</strong> ${
              existingBooking.location || "TBD"
            }</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          </div>
          
          <p>If you would like to reschedule, please contact us and we'll be happy to find a new time that works for you.</p>
          
          <p style="margin-top: 30px;">We apologize for any inconvenience.</p>
          <p>Best regards,<br>${client.name}</p>
        </div>
      `;

        await emailService.sendCalendarInvite({
          to: lead.email,
          toName: `${lead.firstName} ${lead.lastName}`,
          subject: `Meeting Cancelled - ${existingBooking.title}`,
          htmlBody: emailBody,
          icsContent: "", // No calendar invite for cancellation
          icsFilename: "",
        });

        console.log("✅ Cancellation email sent");
      }

      // Send WhatsApp notification
      if (lead.phone) {
        const whatsappMsg = `❌ Meeting Cancelled

Hi ${lead.firstName}, your scheduled meeting has been cancelled.

📅 ${formattedDate}
🕐 ${formattedTime}
📍 ${existingBooking.location || "TBD"}
${reason ? `\n❓ Reason: ${reason}` : ""}

If you'd like to reschedule, please let us know. We apologize for any inconvenience.`;

        await whatsappService.sendTextMessage(lead.phone, whatsappMsg);
        console.log("✅ Cancellation WhatsApp sent");
      }

      // Add message to conversation
      try {
        const conversations = await storage.getConversations(
          existingBooking.clientId,
          100
        );
        const conversation = conversations.find(
          (c) => c.leadId === existingBooking.leadId
        );

        if (conversation) {
          const messageContent =
            `❌ Meeting Cancelled\n\n` +
            `Meeting: ${existingBooking.title}\n` +
            `Was scheduled for: ${formattedDate} at ${formattedTime}\n` +
            `Duration: ${existingBooking.duration} minutes\n` +
            `Location: ${existingBooking.location || "TBD"}\n` +
            (reason ? `\nReason: ${reason}` : "");

          await storage.createMessage({
            conversationId: conversation.id,
            sender: "human",
            content: messageContent,
            channel: "whatsapp",
            isStatusMessage: true,
            sentAt: new Date(),
            deliveredAt: new Date(),
          });

          console.log("✅ Cancellation message added to conversation");

          broadcastUpdate({
            type: "new_message",
            conversationId: conversation.id,
            message: messageContent,
          });
        }
      } catch (error) {
        console.error("⚠️ Failed to add cancellation message:", error);
      }

      // Broadcast booking update
      broadcastUpdate({
        type: "booking_updated",
        booking: updatedBooking,
      });

      res.json({ success: true, booking: updatedBooking });
    } catch (error: any) {
      console.error("❌ Error cancelling booking:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update booking status (mark as completed/no-show)
  app.patch("/api/bookings/:bookingId/status", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status, notes } = req.body;

      console.log("📊 Updating booking status:", bookingId, "to", status);

      // Validate status
      const validStatuses = ["scheduled", "completed", "no-show", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Get existing booking
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Get lead details
      const lead = await storage.getLead(existingBooking.leadId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Update booking status
      const updatedBooking = await storage.updateBooking(bookingId, {
        status,
        notes: notes || existingBooking.notes,
      });

      console.log("✅ Booking status updated:", updatedBooking.id, status);

      // Add message to conversation
      try {
        const conversations = await storage.getConversations(
          existingBooking.clientId,
          100
        );
        const conversation = conversations.find(
          (c) => c.leadId === existingBooking.leadId
        );

        if (conversation) {
          const scheduledDate = new Date(existingBooking.scheduledFor);
          const formattedDate = scheduledDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          let messageContent = "";
          let statusEmoji = "";

          switch (status) {
            case "completed":
              statusEmoji = "✅";
              messageContent =
                `✅ Meeting Completed\n\n` +
                `Meeting: ${existingBooking.title}\n` +
                `Date: ${formattedDate} at ${formattedTime}\n` +
                `Duration: ${existingBooking.duration} minutes\n` +
                `Status: Successfully completed`;
              break;
            case "no-show":
              statusEmoji = "❌";
              messageContent =
                `❌ No-Show Recorded\n\n` +
                `Meeting: ${existingBooking.title}\n` +
                `Date: ${formattedDate} at ${formattedTime}\n` +
                `Status: Lead did not attend`;
              break;
            case "scheduled":
              statusEmoji = "📅";
              messageContent =
                `📅 Meeting Status Updated\n\n` +
                `Meeting: ${existingBooking.title}\n` +
                `Date: ${formattedDate} at ${formattedTime}\n` +
                `Status: Rescheduled/Reactivated`;
              break;
          }

          if (messageContent) {
            await storage.createMessage({
              conversationId: conversation.id,
              sender: "human",
              content: messageContent,
              channel: "whatsapp",
              isStatusMessage: true,
              sentAt: new Date(),
              deliveredAt: new Date(),
            });

            console.log("✅ Status update message added to conversation");

            broadcastUpdate({
              type: "new_message",
              conversationId: conversation.id,
              message: messageContent,
            });
          }
        }
      } catch (error) {
        console.error("⚠️ Failed to add status message:", error);
      }

      // Broadcast booking update
      broadcastUpdate({
        type: "booking_updated",
        booking: updatedBooking,
      });

      res.json({ success: true, booking: updatedBooking });
    } catch (error: any) {
      console.error("❌ Error updating booking status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get bookings for client
  app.get("/api/bookings/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const bookings = await storage.getBookings(clientId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Test reminder endpoint (REMOVE IN PRODUCTION)
  app.post("/api/bookings/:bookingId/test-reminder", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { timeframe } = req.body; // "24h" or "1h"

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Dynamically import the service
      const { sendMeetingReminder } = await import(
        "./services/reminder-service"
      );
      const result = await sendMeetingReminder(
        booking,
        timeframe || "24h",
        broadcastUpdate
      );

      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // Create user (super admin only)
  app.post("/api/super-admin/users", async (req, res) => {
    try {
      const { email, firstName, lastName, role, subscriptionType, password } =
        req.body;

      console.log("👤 Creating new user:", email);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      }

      // Hash password (use provided password or generate temporary one)
      const tempPassword = password || "Welcome123!";
      const passwordHash = await bcrypt.hash(tempPassword, 10); // ← Using bcrypt

      // Create user
      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        role: role || "user",
        subscriptionType: subscriptionType || "trial",
        passwordHash,
        isActive: true,
      });

      console.log("✅ User created:", user.id);
      console.log("🔐 Temporary password:", tempPassword);

      res.json({
        ...user,
        temporaryPassword: tempPassword,
      });
    } catch (error) {
      console.error("❌ Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
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

  setBroadcastFunction(broadcastUpdate);
  startReminderCron();

  return httpServer;
}
