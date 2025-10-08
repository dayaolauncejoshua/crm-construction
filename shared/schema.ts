// sever/shared/schema.ts

import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: text("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // user, admin, super_admin
  subscriptionType: varchar("subscription_type").default("trial"), // trial, pro, enterprise
  trialEndsAt: timestamp("trial_ends_at"),
  isTrialActive: boolean("is_trial_active").default(false),
  hasUnlockedTrial: boolean("has_unlocked_trial").default(false),
  lastLoginAt: timestamp("last_login_at"),
  loginCount: integer("login_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trial activations tracking
export const trialActivations = pgTable("trial_activations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  activatedAt: timestamp("activated_at").defaultNow(),
  trialDays: integer("trial_days").default(14),
  source: varchar("source").default("dashboard"), // dashboard, landing, referral
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
});

// User activity logs for super admin
export const userActivities = pgTable("user_activities", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  action: varchar("action").notNull(), // login, trial_activated, feature_used, etc.
  resource: varchar("resource"), // leads, clients, conversations, etc.
  details: jsonb("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System metrics for super admin dashboard
export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  date: timestamp("date").defaultNow(),
  totalUsers: integer("total_users").default(0),
  activeTrials: integer("active_trials").default(0),
  expiredTrials: integer("expired_trials").default(0),
  totalClients: integer("total_clients").default(0),
  totalLeads: integer("total_leads").default(0),
  totalConversations: integer("total_conversations").default(0),
  avgResponseTime: decimal("avg_response_time", { precision: 8, scale: 2 }),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table (multi-tenant)
export const clients = pgTable("clients", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  industry: varchar("industry").notNull(),
  website: varchar("website"),
  phone: varchar("phone"),
  email: varchar("email"),
  whatsappNumber: varchar("whatsapp_number"),
  userId: varchar("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  company: varchar("company"),
  source: varchar("source").default("landing_page"),
  status: varchar("status").default("new"), // new, qualified, hot, converted, lost
  temperature: varchar("temperature").default("cold"),

  qualificationScore: decimal("qualification_score", {
    precision: 3,
    scale: 2,
  }).default("0.0"),
  auditResults: jsonb("audit_results"),
  utmData: jsonb("utm_data"),
  consentGiven: boolean("consent_given").default(false),
  responseTimeSeconds: integer("response_time_seconds"),
  manualScore: varchar("manual_score"), // Manual override score
  isManualOverride: boolean("is_manual_override").default(false),
  tags: jsonb("tags").default(sql`'[]'::jsonb`),
  internalNotes: text("internal_notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  viewedAt: timestamp("viewed_at"),
});

// Lead activity log table
export const leadActivityLog = pgTable("lead_activity_log", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id")
    .references(() => leads.id)
    .notNull(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // "score_changed", "status_changed", "tag_added", "note_added"
  fieldChanged: varchar("field_changed"), // "status", "score", "tags"
  oldValue: text("old_value"),
  newValue: text("new_value"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW TABLE: Lead Tags (predefined tags)
export const leadTags = pgTable("lead_tags", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  name: varchar("name").notNull(), // "urgent", "vip", "follow-up"
  color: varchar("color").notNull().default("blue"), // "red", "green", "blue", "yellow"
  icon: varchar("icon"), // Optional icon name
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id")
    .references(() => leads.id)
    .notNull(),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  channel: varchar("channel").notNull(), // whatsapp, sms, email
  status: varchar("status").default("active"), // active, paused, completed
  isAiHandled: boolean("is_ai_handled").default(true),
  humanTakeoverAt: timestamp("human_takeover_at"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  qualificationScore: decimal("qualification_score", {
    precision: 3,
    scale: 2,
  }).default("0.0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  unreadCount: integer("unread_count").default(0),
  lastReadAt: timestamp("last_read_at"),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id")
    .references(() => conversations.id)
    .notNull(),
  content: text("content").notNull(),
  sender: varchar("sender").notNull(), // ai, human, lead
  channel: varchar("channel").notNull(),
  messageType: varchar("message_type").default("text"), // text, image, video, template
  metadata: jsonb("metadata"),
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  isStatusMessage: boolean("is_status_message").default(false),
});

// Quick Reply Templates table
export const quickReplyTemplates = pgTable("quick_reply_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  name: varchar("name").notNull(), // "Greeting - Morning"
  content: text("content").notNull(), // "Hi {firstName}! How can I help?"
  category: varchar("category").notNull(), // "greeting", "pricing", "booking", "follow-up"
  variables: jsonb("variables").default([]), // ["firstName", "company"]
  shortcut: varchar("shortcut"), // Optional: "/morning"
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type QuickReplyTemplate = typeof quickReplyTemplates.$inferSelect;
export type InsertQuickReplyTemplate = typeof quickReplyTemplates.$inferInsert;

// VSL (Video Sales Letter) table
export const vsls = pgTable("vsls", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  title: varchar("title").notNull(),
  script: text("script"),
  videoUrl: varchar("video_url"),
  thumbnailUrl: varchar("thumbnail_url"),
  duration: integer("duration"), // in seconds
  viewCount: integer("view_count").default(0),
  conversionRate: decimal("conversion_rate", {
    precision: 5,
    scale: 2,
  }).default("0.0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id")
    .references(() => leads.id)
    .notNull(),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30), // in minutes
  status: varchar("status").default("scheduled"), // scheduled, confirmed, completed, cancelled, no_show
  meetingUrl: varchar("meeting_url"),
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analytics table
export const analytics = pgTable("analytics", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  date: timestamp("date").notNull(),
  metric: varchar("metric").notNull(), // total_leads, conversion_rate, avg_response_time, etc.
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  metadata: jsonb("metadata"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  leads: many(leads),
  conversations: many(conversations),
  vsls: many(vsls),
  bookings: many(bookings),
  analytics: many(analytics),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  client: one(clients, {
    fields: [leads.clientId],
    references: [clients.id],
  }),
  conversations: many(conversations),
  bookings: many(bookings),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    lead: one(leads, {
      fields: [conversations.leadId],
      references: [leads.id],
    }),
    client: one(clients, {
      fields: [conversations.clientId],
      references: [clients.id],
    }),
    messages: many(messages),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const vslsRelations = relations(vsls, ({ one }) => ({
  client: one(clients, {
    fields: [vsls.clientId],
    references: [clients.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  lead: one(leads, {
    fields: [bookings.leadId],
    references: [leads.id],
  }),
  client: one(clients, {
    fields: [bookings.clientId],
    references: [clients.id],
  }),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  client: one(clients, {
    fields: [analytics.clientId],
    references: [clients.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
});

export const insertVslSchema = createInsertSchema(vsls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type TrialActivation = typeof trialActivations.$inferSelect;
export type InsertTrialActivation = typeof trialActivations.$inferInsert;
export type UserActivity = typeof userActivities.$inferSelect;
export type InsertUserActivity = typeof userActivities.$inferInsert;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = typeof systemMetrics.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type LeadActivityLog = typeof leadActivityLog.$inferSelect;
export type InsertLeadActivityLog = typeof leadActivityLog.$inferInsert;
export type LeadTag = typeof leadTags.$inferSelect;
export type InsertLeadTag = typeof leadTags.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type VSL = typeof vsls.$inferSelect;
export type InsertVSL = z.infer<typeof insertVslSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Analytics = typeof analytics.$inferSelect;
