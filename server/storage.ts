// server/storage.ts

import {
  users,
  clients,
  leads,
  conversations,
  messages,
  vsls,
  bookings,
  analytics,
  trialActivations,
  userActivities,
  systemMetrics,
  spamPatterns,
  type User,
  type UpsertUser,
  type Client,
  type InsertClient,
  type Lead,
  type InsertLead,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type VSL,
  type InsertVSL,
  type Booking,
  type InsertBooking,
  type Analytics,
} from "@shared/schema";
import {
  leadScoring,
  followUps,
  competitorTracking,
  serpMonitoring,
  brandMentions,
  executiveReports,
  opportunityAlerts,
  technicalIssues,
  videoSOPs,
  notionSOPs,
  whiteLabelSettings,
  kpiAnomalies,
} from "@shared/advanced-schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { quickReplyTemplates } from "@shared/schema";
import {
  leadActivityLog,
  leadTags,
  InsertLeadActivityLog,
  InsertLeadTag,
} from "@shared/schema";

export interface IStorage {
  // User operations (required for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Client operations
  getClients(userId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client>;

  // Lead operations
  getLeads(clientId: string, limit?: number): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead>;
  getLeadsByStatus(clientId: string, status: string): Promise<Lead[]>;

  // Conversation operations
  getConversations(
    clientId: string,
    limit?: number
  ): Promise<(Conversation & { lead: Lead })[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(
    id: string,
    updates: Partial<InsertConversation>
  ): Promise<Conversation>;
  getActiveConversations(
    clientId: string
  ): Promise<(Conversation & { lead: Lead })[]>;

  getAllConversations(
    clientId: String
  ): Promise<(Conversation & { lead: Lead })[]>;

  getHotLeads(clientId: string): Promise<(Conversation & { lead: Lead })[]>;
  markConversationAsRead(conversationId: string): Promise<void>; // ADD THIS
  incrementUnreadCount(conversationId: string): Promise<void>;

  // Message operations
  getMessages(conversationId: string, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // VSL operations
  getVSLs(clientId: string): Promise<VSL[]>;
  createVSL(vsl: InsertVSL): Promise<VSL>;

  // Booking operations
  getBookings(clientId: string): Promise<any[]>;
  getBooking(bookingId: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(
    bookingId: string,
    updates: Partial<InsertBooking>
  ): Promise<Booking>;
  deleteBooking(bookingId: string): Promise<void>;
  getLeadBookings(leadId: string): Promise<Booking[]>;

  // Analytics operations
  getKPIs(clientId: string): Promise<{
    totalLeads: number;
    conversionRate: number;
    avgResponseTime: number;
    aiHandledPercentage: number;
  }>;
  getRecentActivity(clientId: string): Promise<any[]>;

  getSpamPatterns(): Promise<any[]>;
  saveSpamPatterns(patterns: any[]): Promise<void>;

  // Message reactions
  getMessage(messageId: string): Promise<Message | undefined>;
  addReaction(
    messageId: string,
    reaction: { emoji: string; userId: string; userName: string }
  ): Promise<void>;
  removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Get all clients with user info (for super admin)
  async getAllClientsWithUsers(): Promise<any[]> {
    return await db
      .select({
        id: clients.id,
        name: clients.name,
        industry: clients.industry,
        website: clients.website,
        phone: clients.phone,
        email: clients.email,
        whatsappNumber: clients.whatsappNumber,
        isActive: clients.isActive,
        createdAt: clients.createdAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
      })
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id))
      .where(eq(clients.isActive, true))
      .orderBy(desc(clients.createdAt));
  }

  // Get all users with their client counts (for super admin)
  async getAllUsersWithStats(): Promise<any[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        subscriptionType: users.subscriptionType,
        isTrialActive: users.isTrialActive,
        trialEndsAt: users.trialEndsAt,
        isActive: users.isActive,
        createdAt: users.createdAt,
        clientCount: count(clients.id),
      })
      .from(users)
      .leftJoin(clients, eq(users.id, clients.userId))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));
  }

  // Client operations
  async getClients(userId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(
    id: string,
    updates: Partial<InsertClient>
  ): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updated;
  }

  // Lead operations
  async getLeads(clientId: string, limit = 50): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.clientId, clientId))
      .orderBy(desc(leads.createdAt))
      .limit(limit);
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead> {
    const [updated] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async getLeadsByStatus(clientId: string, status: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(and(eq(leads.clientId, clientId), eq(leads.status, status)))
      .orderBy(desc(leads.createdAt));
  }

  async getLeadByPhone(phone: string): Promise<Lead | undefined> {
    const cleanPhone = phone.replace(/\D/g, "");
    const allLeads = await db.select().from(leads);
    return allLeads.find((l) => l.phone?.replace(/\D/g, "") === cleanPhone);
  }

  // Lead Activity Log
  async logLeadActivity(activity: InsertLeadActivityLog): Promise<any> {
    const [newLog] = await db
      .insert(leadActivityLog)
      .values(activity)
      .returning();
    return newLog;
  }

  async getLeadActivityLog(leadId: string): Promise<any[]> {
    return await db
      .select({
        id: leadActivityLog.id,
        action: leadActivityLog.action,
        fieldChanged: leadActivityLog.fieldChanged,
        oldValue: leadActivityLog.oldValue,
        newValue: leadActivityLog.newValue,
        notes: leadActivityLog.notes,
        createdAt: leadActivityLog.createdAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(leadActivityLog)
      .leftJoin(users, eq(leadActivityLog.userId, users.id))
      .where(eq(leadActivityLog.leadId, leadId))
      .orderBy(desc(leadActivityLog.createdAt))
      .limit(50);
  }

  // Lead Tags
  async getLeadTags(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(leadTags)
      .where(eq(leadTags.clientId, clientId))
      .orderBy(leadTags.name);
  }

  async createLeadTag(tag: InsertLeadTag): Promise<any> {
    const [newTag] = await db.insert(leadTags).values(tag).returning();
    return newTag;
  }

  // Update lead with manual controls
  // Update lead with manual controls
  async updateLeadManual(
    leadId: string,
    updates: Partial<InsertLead>,
    userId?: string
  ): Promise<Lead> {
    console.log("🔄 Updating lead in database:", leadId, updates);

    // Get old lead for logging
    const oldLead = await this.getLead(leadId);

    // Update the lead
    const [updated] = await db
      .update(leads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId))
      .returning();

    console.log("✅ Database updated. New values:", {
      manualScore: updated.manualScore,
      isManualOverride: updated.isManualOverride,
      temperature: updated.temperature, // ADD THIS LINE
      status: updated.status, // ADD THIS LINE
      tags: updated.tags,
    });

    // Log activity if userId provided
    if (userId && oldLead) {
      const changes: any[] = [];

      if (updates.status && updates.status !== oldLead.status) {
        changes.push({
          leadId,
          userId,
          action: "status_changed",
          fieldChanged: "status",
          oldValue: oldLead.status,
          newValue: updates.status,
        });
      }

      if (updates.temperature && updates.temperature !== oldLead.temperature) {
        changes.push({
          leadId,
          userId,
          action: "temperature_changed",
          fieldChanged: "temperature",
          oldValue: oldLead.temperature,
          newValue: updates.temperature,
        });
      }

      if (updates.manualScore && updates.manualScore !== oldLead.manualScore) {
        changes.push({
          leadId,
          userId,
          action: "score_changed",
          fieldChanged: "manualScore",
          oldValue: oldLead.manualScore || oldLead.qualificationScore,
          newValue: updates.manualScore,
        });
      }

      if (updates.manualScore && updates.manualScore !== oldLead.manualScore) {
        changes.push({
          leadId,
          userId,
          action: "score_changed",
          fieldChanged: "manualScore",
          oldValue: oldLead.manualScore || oldLead.qualificationScore,
          newValue: updates.manualScore,
        });
      }

      if (updates.tags) {
        changes.push({
          leadId,
          userId,
          action: "tags_updated",
          fieldChanged: "tags",
          oldValue: JSON.stringify(oldLead.tags || []),
          newValue: JSON.stringify(updates.tags),
        });
      }

      if (
        updates.internalNotes &&
        updates.internalNotes !== oldLead.internalNotes
      ) {
        changes.push({
          leadId,
          userId,
          action: "note_added",
          fieldChanged: "internalNotes",
          oldValue: oldLead.internalNotes,
          newValue: updates.internalNotes,
        });
      }

      // Log all changes
      for (const change of changes) {
        try {
          await this.logLeadActivity(change);
        } catch (err) {
          console.error("Failed to log activity:", err);
        }
      }
    }

    return updated;
  }

  // Conversation operations
  async getConversations(
    clientId: string,
    limit = 20
  ): Promise<(Conversation & { lead: Lead })[]> {
    return await db
      .select({
        id: conversations.id,
        leadId: conversations.leadId,
        clientId: conversations.clientId,
        channel: conversations.channel,
        status: conversations.status,
        isAiHandled: conversations.isAiHandled,
        humanTakeoverAt: conversations.humanTakeoverAt,
        lastMessageAt: conversations.lastMessageAt,
        qualificationScore: conversations.qualificationScore,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        lead: leads,
        unreadCount: conversations.unreadCount,
        lastReadAt: conversations.lastReadAt,
        reopenedAt: conversations.reopenedAt,
      })
      .from(conversations)
      .innerJoin(leads, eq(conversations.leadId, leads.id))
      .where(eq(conversations.clientId, clientId))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit);
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(
    conversation: InsertConversation
  ): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateConversation(
    id: string,
    updates: Partial<InsertConversation>
  ): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async getActiveConversations(
    clientId: string
  ): Promise<(Conversation & { lead: Lead })[]> {
    return await db
      .select({
        id: conversations.id,
        leadId: conversations.leadId,
        clientId: conversations.clientId,
        channel: conversations.channel,
        status: conversations.status,
        isAiHandled: conversations.isAiHandled,
        humanTakeoverAt: conversations.humanTakeoverAt,
        lastMessageAt: conversations.lastMessageAt,
        qualificationScore: conversations.qualificationScore,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        lead: leads,
        unreadCount: conversations.unreadCount,
        lastReadAt: conversations.lastReadAt,
        reopenedAt: conversations.reopenedAt,
      })
      .from(conversations)
      .innerJoin(leads, eq(conversations.leadId, leads.id))
      .where(
        and(
          eq(conversations.clientId, clientId),
          eq(conversations.status, "active")
        )
      )
      .orderBy(desc(conversations.lastMessageAt));
  }

  // ✅ NEW METHOD: Get ALL conversations (including closed ones)
  async getAllConversations(
    clientId: string
  ): Promise<(Conversation & { lead: Lead })[]> {
    return await db
      .select({
        id: conversations.id,
        leadId: conversations.leadId,
        clientId: conversations.clientId,
        channel: conversations.channel,
        status: conversations.status,
        isAiHandled: conversations.isAiHandled,
        humanTakeoverAt: conversations.humanTakeoverAt,
        lastMessageAt: conversations.lastMessageAt,
        qualificationScore: conversations.qualificationScore,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        lead: leads,
        unreadCount: conversations.unreadCount,
        lastReadAt: conversations.lastReadAt,
        reopenedAt: conversations.reopenedAt,
      })
      .from(conversations)
      .innerJoin(leads, eq(conversations.leadId, leads.id))
      .where(eq(conversations.clientId, clientId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  // ==================== SPAM PATTERN LEARNING METHODS ====================

  async getSpamPatterns(): Promise<any[]> {
    try {
      return await db
        .select()
        .from(spamPatterns)
        .where(gte(spamPatterns.confidence, "0.30")) // Lower threshold
        .orderBy(desc(spamPatterns.confidence));
    } catch (error) {
      console.error("Error fetching spam patterns:", error);
      return [];
    }
  }

  async saveSpamPatterns(patterns: any[]): Promise<void> {
    try {
      for (const pattern of patterns) {
        await db
          .insert(spamPatterns)
          .values({
            id: pattern.id,
            pattern: pattern.pattern,
            category: pattern.category,
            detectionCount: pattern.detectionCount,
            falsePositiveCount: pattern.falsePositiveCount,
            confidence: pattern.confidence,
            lastDetected: pattern.lastDetected,
            createdAt: pattern.createdAt,
            updatedAt: pattern.updatedAt,
          })
          .onConflictDoUpdate({
            target: spamPatterns.pattern, // ✅ Now this will work!
            set: {
              detectionCount: pattern.detectionCount,
              falsePositiveCount: pattern.falsePositiveCount,
              confidence: pattern.confidence,
              lastDetected: pattern.lastDetected,
              updatedAt: new Date(),
            },
          });
      }
      console.log(`✅ Saved ${patterns.length} spam patterns to database`);
    } catch (error) {
      console.error("❌ Error saving spam patterns:", error);
    }
  }

  async getHotLeads(
    clientId: string
  ): Promise<(Conversation & { lead: Lead })[]> {
    return await db
      .select({
        id: conversations.id,
        leadId: conversations.leadId,
        clientId: conversations.clientId,
        channel: conversations.channel,
        status: conversations.status,
        isAiHandled: conversations.isAiHandled,
        humanTakeoverAt: conversations.humanTakeoverAt,
        lastMessageAt: conversations.lastMessageAt,
        qualificationScore: conversations.qualificationScore,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        lead: leads,
        unreadCount: conversations.unreadCount,
        lastReadAt: conversations.lastReadAt,
        reopenedAt: conversations.reopenedAt,
      })
      .from(conversations)
      .innerJoin(leads, eq(conversations.leadId, leads.id))
      .where(
        and(
          eq(conversations.clientId, clientId), // MAKE SURE THIS IS HERE
          gte(conversations.qualificationScore, "0.7")
        )
      )
      .orderBy(desc(conversations.qualificationScore));
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    await db
      .update(conversations)
      .set({
        unreadCount: 0,
        lastReadAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));
  }

  async incrementUnreadCount(conversationId: string): Promise<void> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (conversation) {
      await db
        .update(conversations)
        .set({
          unreadCount: (conversation.unreadCount || 0) + 1,
        })
        .where(eq(conversations.id, conversationId));
    }
  }

  // Message operations
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.sentAt))
      .limit(limit);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  // Mark messages as read
  async markMessagesAsRead(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;

    await db
      .update(messages)
      .set({
        readAt: new Date(),
      })
      .where(
        sql`${messages.id} = ANY(ARRAY[${sql.join(
          messageIds.map((id) => sql`${id}`),
          sql`, `
        )}])`
      );
  }

  // Mark previous outgoing messages as read when lead responds
  async markPreviousMessagesAsRead(conversationId: string): Promise<void> {
    // Get all messages from this conversation that aren't from the lead
    // and don't have readAt set yet
    const unreadOutgoingMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.sender} != 'lead'`,
          sql`${messages.readAt} IS NULL`
        )
      );

    if (unreadOutgoingMessages.length > 0) {
      const messageIds = unreadOutgoingMessages.map((m) => m.id);
      await this.markMessagesAsRead(messageIds);
    }
  }

  // ==================== MESSAGE REACTION METHODS ====================

  async getMessage(messageId: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);
    return message;
  }

  async addReaction(
    messageId: string,
    reaction: { emoji: string; userId: string; userName: string }
  ): Promise<void> {
    const message = await this.getMessage(messageId);
    if (!message) throw new Error("Message not found");

    const currentReactions = (message.reactions as any[]) || [];

    // Check if user already reacted with this emoji
    const existingReactionIndex = currentReactions.findIndex(
      (r: any) => r.userId === reaction.userId && r.emoji === reaction.emoji
    );

    if (existingReactionIndex === -1) {
      // Add new reaction
      const newReactions = [
        ...currentReactions,
        {
          ...reaction,
          timestamp: new Date().toISOString(),
        },
      ];

      await db
        .update(messages)
        .set({ reactions: newReactions as any })
        .where(eq(messages.id, messageId));

      console.log(
        `✅ Added reaction ${reaction.emoji} to message ${messageId}`
      );
    }
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    const message = await this.getMessage(messageId);
    if (!message) throw new Error("Message not found");

    const currentReactions = (message.reactions as any[]) || [];

    // Remove the reaction
    const newReactions = currentReactions.filter(
      (r: any) => !(r.userId === userId && r.emoji === emoji)
    );

    await db
      .update(messages)
      .set({ reactions: newReactions as any })
      .where(eq(messages.id, messageId));

    console.log(`✅ Removed reaction ${emoji} from message ${messageId}`);
  }

  // Quick Reply Templates
  async getQuickReplyTemplates(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(quickReplyTemplates)
      .where(
        and(
          eq(quickReplyTemplates.clientId, clientId),
          eq(quickReplyTemplates.isActive, true)
        )
      )
      .orderBy(desc(quickReplyTemplates.usageCount));
  }

  async createQuickReplyTemplate(template: any): Promise<any> {
    const [newTemplate] = await db
      .insert(quickReplyTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateQuickReplyTemplate(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(quickReplyTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(quickReplyTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteQuickReplyTemplate(id: string): Promise<void> {
    await db
      .update(quickReplyTemplates)
      .set({ isActive: false })
      .where(eq(quickReplyTemplates.id, id));
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db
      .update(quickReplyTemplates)
      .set({
        usageCount: sql`${quickReplyTemplates.usageCount} + 1`,
      })
      .where(eq(quickReplyTemplates.id, id));
  }

  // VSL operations
  async getVSLs(clientId: string): Promise<VSL[]> {
    return await db
      .select()
      .from(vsls)
      .where(eq(vsls.clientId, clientId))
      .orderBy(desc(vsls.createdAt));
  }

  // Advanced Features - Lead Scoring
  async createLeadScoring(data: any): Promise<any> {
    const [newScoring] = await db.insert(leadScoring).values(data).returning();
    return newScoring;
  }

  async getLeadScoring(leadId: string): Promise<any> {
    return await db
      .select()
      .from(leadScoring)
      .where(eq(leadScoring.leadId, leadId))
      .orderBy(desc(leadScoring.createdAt));
  }

  // Follow-ups
  async createFollowUp(data: any): Promise<any> {
    const [newFollowUp] = await db.insert(followUps).values(data).returning();
    return newFollowUp;
  }

  async getFollowUps(clientId: string): Promise<any[]> {
    return await db
      .select({
        id: followUps.id,
        leadId: followUps.leadId,
        channel: followUps.channel,
        triggerType: followUps.triggerType,
        scheduleTime: followUps.scheduleTime,
        content: followUps.content,
        status: followUps.status,
        sentAt: followUps.sentAt,
        responseReceived: followUps.responseReceived,
        createdAt: followUps.createdAt,
        lead: leads,
      })
      .from(followUps)
      .innerJoin(leads, eq(followUps.leadId, leads.id))
      .where(eq(leads.clientId, clientId))
      .orderBy(desc(followUps.scheduleTime));
  }

  // Competitor Tracking
  async createCompetitorTracking(data: any): Promise<any> {
    const [newTracking] = await db
      .insert(competitorTracking)
      .values(data)
      .returning();
    return newTracking;
  }

  async getCompetitorTracking(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(competitorTracking)
      .where(eq(competitorTracking.clientId, clientId))
      .orderBy(desc(competitorTracking.trackingDate));
  }

  // SERP Monitoring
  async createSerpMonitoring(data: any): Promise<any> {
    const [newSerp] = await db.insert(serpMonitoring).values(data).returning();
    return newSerp;
  }

  async getSerpMonitoring(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(serpMonitoring)
      .where(eq(serpMonitoring.clientId, clientId))
      .orderBy(desc(serpMonitoring.checkDate));
  }

  // Brand Mentions
  async createBrandMention(data: any): Promise<any> {
    const [newMention] = await db
      .insert(brandMentions)
      .values(data)
      .returning();
    return newMention;
  }

  async getBrandMentions(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(brandMentions)
      .where(eq(brandMentions.clientId, clientId))
      .orderBy(desc(brandMentions.mentionDate));
  }

  // Executive Reports
  async createExecutiveReport(data: any): Promise<any> {
    const [newReport] = await db
      .insert(executiveReports)
      .values(data)
      .returning();
    return newReport;
  }

  async getExecutiveReports(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(executiveReports)
      .where(eq(executiveReports.clientId, clientId))
      .orderBy(desc(executiveReports.generatedAt));
  }

  // Opportunity Alerts
  async createOpportunityAlert(data: any): Promise<any> {
    const [newAlert] = await db
      .insert(opportunityAlerts)
      .values(data)
      .returning();
    return newAlert;
  }

  async getOpportunityAlerts(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(opportunityAlerts)
      .where(eq(opportunityAlerts.clientId, clientId))
      .orderBy(desc(opportunityAlerts.createdAt));
  }

  // Technical Issues
  async createTechnicalIssue(data: any): Promise<any> {
    const [newIssue] = await db
      .insert(technicalIssues)
      .values(data)
      .returning();
    return newIssue;
  }

  async getTechnicalIssues(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(technicalIssues)
      .where(eq(technicalIssues.clientId, clientId))
      .orderBy(desc(technicalIssues.createdAt));
  }

  // Video SOPs
  async createVideoSOP(data: any): Promise<any> {
    const [newSOP] = await db.insert(videoSOPs).values(data).returning();
    return newSOP;
  }

  async getVideoSOPs(clientId?: string): Promise<any[]> {
    const query = db.select().from(videoSOPs);
    if (clientId) {
      return await query
        .where(eq(videoSOPs.clientId, clientId))
        .orderBy(desc(videoSOPs.createdAt));
    }
    return await query
      .where(eq(videoSOPs.isPublic, true))
      .orderBy(desc(videoSOPs.createdAt));
  }

  // Notion SOPs
  async createNotionSOP(data: any): Promise<any> {
    const [newSOP] = await db.insert(notionSOPs).values(data).returning();
    return newSOP;
  }

  async getNotionSOPs(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(notionSOPs)
      .where(eq(notionSOPs.clientId, clientId))
      .orderBy(desc(notionSOPs.createdAt));
  }

  // White Label Settings
  async createWhiteLabelSettings(data: any): Promise<any> {
    const [newSettings] = await db
      .insert(whiteLabelSettings)
      .values(data)
      .returning();
    return newSettings;
  }

  async getWhiteLabelSettings(clientId: string): Promise<any> {
    const [settings] = await db
      .select()
      .from(whiteLabelSettings)
      .where(eq(whiteLabelSettings.clientId, clientId))
      .limit(1);
    return settings;
  }

  async updateWhiteLabelSettings(clientId: string, data: any): Promise<any> {
    const [updated] = await db
      .update(whiteLabelSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(whiteLabelSettings.clientId, clientId))
      .returning();
    return updated;
  }

  // KPI Anomalies
  async createKpiAnomaly(data: any): Promise<any> {
    const [newAnomaly] = await db.insert(kpiAnomalies).values(data).returning();
    return newAnomaly;
  }

  async getKpiAnomalies(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(kpiAnomalies)
      .where(eq(kpiAnomalies.clientId, clientId))
      .orderBy(desc(kpiAnomalies.detectedAt));
  }

  // Trial and User Management
  async activateUserTrial(
    userId: string,
    trialDays: number = 14
  ): Promise<any> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Update user with trial info
    const [updatedUser] = await db
      .update(users)
      .set({
        isTrialActive: true,
        hasUnlockedTrial: true,
        trialEndsAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    // Record trial activation
    const [activation] = await db
      .insert(trialActivations)
      .values({
        userId,
        trialDays,
        source: "dashboard",
      })
      .returning();

    return { user: updatedUser, activation };
  }

  async getUserTrialStatus(userId: string): Promise<any> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isTrialActive: users.isTrialActive,
        hasUnlockedTrial: users.hasUnlockedTrial,
        trialEndsAt: users.trialEndsAt,
        subscriptionType: users.subscriptionType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    // Calculate days left if trial is active
    let daysLeft = 0;
    if (user.isTrialActive && user.trialEndsAt) {
      const now = new Date();
      const endDate = new Date(user.trialEndsAt);
      daysLeft = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Check if trial has expired
      if (daysLeft === 0) {
        await db
          .update(users)
          .set({ isTrialActive: false, updatedAt: new Date() })
          .where(eq(users.id, userId));
        user.isTrialActive = false;
      }
    }

    return { ...user, daysLeft };
  }

  async logUserActivity(
    userId: string,
    action: string,
    resource?: string,
    details?: any
  ): Promise<any> {
    const [activity] = await db
      .insert(userActivities)
      .values({
        userId,
        action,
        resource,
        details,
      })
      .returning();

    return activity;
  }

  // Super Admin Functions
  async getSuperAdminDashboard(): Promise<any> {
    const [metrics] = await db
      .select({
        totalUsers: count(users.id),
      })
      .from(users);

    const [activeTrials] = await db
      .select({
        count: count(users.id),
      })
      .from(users)
      .where(eq(users.isTrialActive, true));

    const [expiredTrials] = await db
      .select({
        count: count(users.id),
      })
      .from(users)
      .where(
        and(eq(users.hasUnlockedTrial, true), eq(users.isTrialActive, false))
      );

    return {
      totalUsers: metrics.totalUsers || 0,
      activeTrials: activeTrials.count || 0,
      expiredTrials: expiredTrials.count || 0,
      totalClients: 0, // Will be calculated from clients table
      totalLeads: 0, // Will be calculated from leads table
    };
  }

  async getAllClients() {
    return await db.select().from(clients).where(eq(clients.isActive, true));
  }

  // Get user by email
  async getUserByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  // Create user
  async createUser(data: any) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  // ==================== EMAIL VERIFICATION METHODS ====================

  async verifyUserEmail(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`✅ User ${userId} email verified`);
  }

  async updatePasswordResetToken(
    userId: string,
    token: string,
    expiry: Date
  ): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`✅ Password reset token set for user ${userId}`);
  }

  async resetUserPassword(
    userId: string,
    newPasswordHash: string
  ): Promise<void> {
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`✅ Password reset for user ${userId}`);
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    return user;
  }

  async getAllUsersForAdmin(
    searchQuery?: string,
    statusFilter?: string
  ): Promise<any[]> {
    // Build where conditions array
    const whereConditions = [];

    if (searchQuery) {
      whereConditions.push(
        sql`${users.email} ILIKE ${`%${searchQuery}%`} OR 
            ${users.firstName} ILIKE ${`%${searchQuery}%`} OR 
            ${users.lastName} ILIKE ${`%${searchQuery}%`}`
      );
    }

    if (statusFilter && statusFilter !== "all") {
      switch (statusFilter) {
        case "trial":
          whereConditions.push(eq(users.isTrialActive, true));
          break;
        case "expired":
          whereConditions.push(
            and(
              eq(users.hasUnlockedTrial, true),
              eq(users.isTrialActive, false)
            )
          );
          break;
        default:
          whereConditions.push(eq(users.subscriptionType, statusFilter));
      }
    }

    // Build query with or without where clause
    const baseSelect = db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        subscriptionType: users.subscriptionType,
        isTrialActive: users.isTrialActive,
        trialEndsAt: users.trialEndsAt,
        lastLoginAt: users.lastLoginAt,
        loginCount: users.loginCount,
        createdAt: users.createdAt,
        clientsCount: count(clients.id),
      })
      .from(users)
      .leftJoin(clients, eq(users.id, clients.userId));

    // Apply where conditions if any, then group and order
    if (whereConditions.length > 0) {
      return await baseSelect
        .where(
          whereConditions.length === 1
            ? whereConditions[0]
            : and(...whereConditions)
        )
        .groupBy(users.id)
        .orderBy(desc(users.createdAt));
    }

    // No where conditions - just group and order
    return await baseSelect.groupBy(users.id).orderBy(desc(users.createdAt));
  }

  async getRecentActivities(limit: number = 50): Promise<any[]> {
    return await db
      .select({
        id: userActivities.id,
        userId: userActivities.userId,
        action: userActivities.action,
        resource: userActivities.resource,
        details: userActivities.details,
        createdAt: userActivities.createdAt,
        userEmail: users.email,
      })
      .from(userActivities)
      .innerJoin(users, eq(userActivities.userId, users.id))
      .orderBy(desc(userActivities.createdAt))
      .limit(limit);
  }

  async recordSystemMetrics(): Promise<any> {
    const dashboard = await this.getSuperAdminDashboard();

    const [metrics] = await db
      .insert(systemMetrics)
      .values({
        totalUsers: dashboard.totalUsers,
        activeTrials: dashboard.activeTrials,
        expiredTrials: dashboard.expiredTrials,
        totalClients: dashboard.totalClients,
        totalLeads: dashboard.totalLeads,
        avgResponseTime: sql`(SELECT AVG(response_time_seconds) FROM leads WHERE response_time_seconds IS NOT NULL)`,
        conversionRate: sql`(SELECT COUNT(*) FILTER (WHERE status = 'converted') * 100.0 / COUNT(*) FROM leads WHERE created_at > NOW() - INTERVAL '30 days')`,
      })
      .returning();

    return metrics;
  }

  async createVSL(vsl: InsertVSL): Promise<VSL> {
    const [newVSL] = await db.insert(vsls).values(vsl).returning();
    return newVSL;
  }

  // ============= BOOKING METHODS =============

  async getBookings(clientId: string) {
    return db
      .select({
        id: bookings.id,
        leadId: bookings.leadId,
        clientId: bookings.clientId,
        title: bookings.title,
        description: bookings.description,
        location: bookings.location,
        scheduledFor: bookings.scheduledFor,
        scheduledAt: bookings.scheduledAt,
        duration: bookings.duration,
        status: bookings.status,
        attendeeEmail: bookings.attendeeEmail,
        attendeeName: bookings.attendeeName,
        attendeePhone: bookings.attendeePhone,
        meetingType: bookings.meetingType,
        meetingUrl: bookings.meetingUrl,
        notes: bookings.notes,
        reminderSent: bookings.reminderSent,
        reminder24hSent: bookings.reminder24hSent,
        reminder1hSent: bookings.reminder1hSent,
        reminder24hSentAt: bookings.reminder24hSentAt,
        reminder1hSentAt: bookings.reminder1hSentAt,

        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
      })
      .from(bookings)
      .where(eq(bookings.clientId, clientId))
      .orderBy(desc(bookings.scheduledFor));
  }

  async getBooking(bookingId: string) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    return booking;
  }

  async createBooking(data: InsertBooking) {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async updateBooking(bookingId: string, updates: Partial<InsertBooking>) {
    const [booking] = await db
      .update(bookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();
    return booking;
  }

  async deleteBooking(bookingId: string) {
    await db.delete(bookings).where(eq(bookings.id, bookingId));
  }

  // Get upcoming bookings for a lead
  async getLeadBookings(leadId: string) {
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.leadId, leadId))
      .orderBy(desc(bookings.scheduledFor));
  }

  // Delete lead
  async deleteLead(id: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Analytics operations
  async getKPIs(clientId: string): Promise<{
    totalLeads: number;
    conversionRate: number;
    avgResponseTime: number;
    aiHandledPercentage: number;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total leads in last 30 days
    const [totalLeadsResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(
        and(eq(leads.clientId, clientId), gte(leads.createdAt, thirtyDaysAgo))
      );

    // Conversion rate (leads with bookings / total leads)
    const [conversionsResult] = await db
      .select({ count: count() })
      .from(leads)
      .innerJoin(bookings, eq(leads.id, bookings.leadId))
      .where(
        and(eq(leads.clientId, clientId), gte(leads.createdAt, thirtyDaysAgo))
      );

    // Average response time
    const [avgResponseResult] = await db
      .select({
        avg: sql<number>`AVG(${leads.responseTimeSeconds})`,
      })
      .from(leads)
      .where(
        and(eq(leads.clientId, clientId), gte(leads.createdAt, thirtyDaysAgo))
      );

    // AI handled percentage
    const [aiHandledResult] = await db
      .select({ count: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.clientId, clientId),
          eq(conversations.isAiHandled, true),
          gte(conversations.createdAt, thirtyDaysAgo)
        )
      );

    const [totalConversationsResult] = await db
      .select({ count: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.clientId, clientId),
          gte(conversations.createdAt, thirtyDaysAgo)
        )
      );

    return {
      totalLeads: totalLeadsResult.count,
      conversionRate:
        totalLeadsResult.count > 0
          ? (conversionsResult.count / totalLeadsResult.count) * 100
          : 0,
      avgResponseTime: avgResponseResult.avg || 0,
      aiHandledPercentage:
        totalConversationsResult.count > 0
          ? (aiHandledResult.count / totalConversationsResult.count) * 100
          : 0,
    };
  }

  async getRecentActivity(clientId: string): Promise<any[]> {
    // Get recent bookings, new leads, and VSL generations
    const recentBookings = await db
      .select({
        type: sql<string>`'booking'`,
        description: sql<string>`'New booking confirmed'`,
        leadName: sql<string>`${leads.firstName} || ' ' || ${leads.lastName}`,
        company: leads.company,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(leads, eq(bookings.leadId, leads.id))
      .where(eq(leads.clientId, clientId))
      .orderBy(desc(bookings.createdAt))
      .limit(5);

    const recentLeads = await db
      .select({
        type: sql<string>`'lead'`,
        description: sql<string>`'New lead captured'`,
        leadName: sql<string>`${leads.firstName} || ' ' || ${leads.lastName}`,
        company: leads.company,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(eq(leads.clientId, clientId))
      .orderBy(desc(leads.createdAt))
      .limit(5);

    const recentVSLs = await db
      .select({
        type: sql<string>`'vsl'`,
        description: sql<string>`'VSL generated for client'`,
        leadName: sql<string>`''`,
        company: vsls.title,
        createdAt: vsls.createdAt,
      })
      .from(vsls)
      .where(eq(vsls.clientId, clientId))
      .orderBy(desc(vsls.createdAt))
      .limit(3);

    return [...recentBookings, ...recentLeads, ...recentVSLs]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);
  }

  // VSL operations

  async getVSL(vslId: string): Promise<VSL | undefined> {
    const [vsl] = await db
      .select()
      .from(vsls)
      .where(eq(vsls.id, vslId))
      .limit(1);
    return vsl;
  }

  async updateVSL(vslId: string, data: Partial<InsertVSL>): Promise<VSL> {
    const [vsl] = await db
      .update(vsls)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vsls.id, vslId))
      .returning();
    return vsl;
  }

  async deleteVSL(vslId: string): Promise<void> {
    await db.delete(vsls).where(eq(vsls.id, vslId));
  }

  async incrementVSLViews(vslId: string): Promise<void> {
    await db
      .update(vsls)
      .set({
        viewCount: sql`${vsls.viewCount} + 1`,
      })
      .where(eq(vsls.id, vslId));
  }
}

export const storage = new DatabaseStorage();
