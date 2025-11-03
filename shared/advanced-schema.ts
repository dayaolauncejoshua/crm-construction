// shared/advanced-schema.ts

import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { clients, leads, conversations, users } from "./schema";

// Advanced Lead Scoring Table
export const leadScoring = pgTable("lead_scoring", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id")
    .references(() => leads.id)
    .notNull(),
  score: integer("score").notNull(), // 0-100
  features: jsonb("features").notNull(), // ML features
  modelVersion: varchar("model_version").default("v1.0"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  predictions: jsonb("predictions"), // XGBoost/LightGBM predictions
  createdAt: timestamp("created_at").defaultNow(),
});

// Competitor Tracking Table
export const competitorTracking = pgTable("competitor_tracking", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  competitorName: varchar("competitor_name").notNull(),
  platform: varchar("platform").notNull(), // facebook, google, linkedin
  adSpend: decimal("ad_spend", { precision: 10, scale: 2 }),
  adCount: integer("ad_count"),
  impressions: integer("impressions"),
  reach: integer("reach"),
  engagement: decimal("engagement", { precision: 5, scale: 2 }),
  adData: jsonb("ad_data"), // Full ad data from API
  trackingDate: timestamp("tracking_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// SERP Monitoring Table
export const serpMonitoring = pgTable("serp_monitoring", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  keyword: varchar("keyword").notNull(),
  currentPosition: integer("current_position"),
  previousPosition: integer("previous_position"),
  url: varchar("url"),
  searchVolume: integer("search_volume"),
  competition: varchar("competition"), // low, medium, high
  cpc: decimal("cpc", { precision: 5, scale: 2 }),
  features: jsonb("features"), // SERP features (snippets, images, etc)
  checkDate: timestamp("check_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Brand Mentions Table
export const brandMentions = pgTable("brand_mentions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  platform: varchar("platform").notNull(), // reddit, twitter, linkedin, etc
  url: varchar("url"),
  content: text("content"),
  author: varchar("author"),
  sentiment: varchar("sentiment"), // positive, negative, neutral
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }),
  reach: integer("reach"),
  engagement: integer("engagement"),
  isInfluencer: boolean("is_influencer").default(false),
  responseNeeded: boolean("response_needed").default(false),
  mentionDate: timestamp("mention_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Executive Reports Table
export const executiveReports = pgTable("executive_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  reportType: varchar("report_type").notNull(), // weekly, monthly, quarterly
  reportData: jsonb("report_data").notNull(),
  pdfUrl: varchar("pdf_url"),
  loomUrl: varchar("loom_url"),
  keyInsights: jsonb("key_insights"),
  recommendations: jsonb("recommendations"),
  period: varchar("period").notNull(), // 2024-W01, 2024-01, etc
  generatedAt: timestamp("generated_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
});

// Opportunity Alerts Table
export const opportunityAlerts = pgTable("opportunity_alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  alertType: varchar("alert_type").notNull(), // trending_keyword, viral_moment, competitor_gap
  title: varchar("title").notNull(),
  description: text("description"),
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  data: jsonb("data"), // Alert-specific data
  actionRequired: boolean("action_required").default(false),
  actionTaken: boolean("action_taken").default(false),
  estimatedImpact: varchar("estimated_impact"), // high, medium, low
  expiresAt: timestamp("expires_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Technical Issues Table
export const technicalIssues = pgTable("technical_issues", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  issueType: varchar("issue_type").notNull(), // form_failure, slow_load, api_error
  severity: varchar("severity").default("medium"), // low, medium, high, critical
  affectedComponent: varchar("affected_component"),
  errorMessage: text("error_message"),
  stackTrace: text("stack_trace"),
  userAgent: varchar("user_agent"),
  url: varchar("url"),
  ipAddress: varchar("ip_address"),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video SOPs Table
export const videoSOPs = pgTable("video_sops", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // onboarding, troubleshooting, advanced
  videoUrl: varchar("video_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  duration: integer("duration"), // in seconds
  viewCount: integer("view_count").default(0),
  tags: jsonb("tags"),
  isPublic: boolean("is_public").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notion SOPs Table
export const notionSOPs = pgTable("notion_sops", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  notionPageId: varchar("notion_page_id").notNull(),
  title: varchar("title").notNull(),
  category: varchar("category"),
  lastSynced: timestamp("last_synced"),
  syncStatus: varchar("sync_status").default("active"), // active, failed, disabled
  pageUrl: varchar("page_url"),
  createdAt: timestamp("created_at").defaultNow(),
  scripts: jsonb("scripts").$type<NotionScript[]>().default([]),
});

// Visual Workflows Table (Figma/Miro)
export const visualWorkflows = pgTable("visual_workflows", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  title: varchar("title").notNull(),
  platform: varchar("platform").notNull(), // figma, miro
  boardId: varchar("board_id").notNull(),
  boardUrl: varchar("board_url").notNull(),
  workflowType: varchar("workflow_type"), // lead_journey, process_flow, wireframe
  lastModified: timestamp("last_modified"),
  collaborators: jsonb("collaborators"),
  thumbnailUrl: varchar("thumbnail_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// White Label Settings Table
export const whiteLabelSettings = pgTable("white_label_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  brandName: varchar("brand_name").notNull(),
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color"),
  secondaryColor: varchar("secondary_color"),
  customDomain: varchar("custom_domain"),
  customCss: text("custom_css"),
  favicon: varchar("favicon"),
  loginBgImage: varchar("login_bg_image"),
  footerText: text("footer_text"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// KPI Anomalies Table
export const kpiAnomalies = pgTable("kpi_anomalies", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id)
    .notNull(),
  metric: varchar("metric").notNull(), // conversion_rate, response_time, lead_volume
  currentValue: decimal("current_value", { precision: 10, scale: 4 }),
  expectedValue: decimal("expected_value", { precision: 10, scale: 4 }),
  deviationPercent: decimal("deviation_percent", { precision: 5, scale: 2 }),
  severity: varchar("severity").default("medium"), // low, medium, high
  alertSent: boolean("alert_sent").default(false),
  acknowledged: boolean("acknowledged").default(false),
  investigationNotes: text("investigation_notes"),
  detectedAt: timestamp("detected_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// At the bottom of the file, add this type:
export type NotionScript = {
  id: string;
  name: string;
  description: string;
  type: "automation" | "validation" | "notification";
  trigger: "manual" | "schedule" | "event";
  code: string;
  enabled: boolean;
  lastRun: string | null;
  runCount: number;
};

// Insert schemas for new tables
export const insertLeadScoringSchema = createInsertSchema(leadScoring);

export const insertCompetitorTrackingSchema =
  createInsertSchema(competitorTracking);
export const insertSerpMonitoringSchema = createInsertSchema(serpMonitoring);
export const insertBrandMentionSchema = createInsertSchema(brandMentions);
export const insertExecutiveReportSchema = createInsertSchema(executiveReports);
export const insertOpportunityAlertSchema =
  createInsertSchema(opportunityAlerts);
export const insertTechnicalIssueSchema = createInsertSchema(technicalIssues);
export const insertVideoSOPSchema = createInsertSchema(videoSOPs);
export const insertNotionSOPSchema = createInsertSchema(notionSOPs);
export const insertVisualWorkflowSchema = createInsertSchema(visualWorkflows);
export const insertWhiteLabelSettingsSchema =
  createInsertSchema(whiteLabelSettings);
export const insertKpiAnomalySchema = createInsertSchema(kpiAnomalies);

// Type definitions
export type LeadScoring = typeof leadScoring.$inferSelect;
export type InsertLeadScoring = z.infer<typeof insertLeadScoringSchema>;

export type CompetitorTracking = typeof competitorTracking.$inferSelect;
export type InsertCompetitorTracking = z.infer<
  typeof insertCompetitorTrackingSchema
>;
export type SerpMonitoring = typeof serpMonitoring.$inferSelect;
export type InsertSerpMonitoring = z.infer<typeof insertSerpMonitoringSchema>;
export type BrandMention = typeof brandMentions.$inferSelect;
export type InsertBrandMention = z.infer<typeof insertBrandMentionSchema>;
export type ExecutiveReport = typeof executiveReports.$inferSelect;
export type InsertExecutiveReport = z.infer<typeof insertExecutiveReportSchema>;
export type OpportunityAlert = typeof opportunityAlerts.$inferSelect;
export type InsertOpportunityAlert = z.infer<
  typeof insertOpportunityAlertSchema
>;
export type TechnicalIssue = typeof technicalIssues.$inferSelect;
export type InsertTechnicalIssue = z.infer<typeof insertTechnicalIssueSchema>;
export type VideoSOP = typeof videoSOPs.$inferSelect;
export type InsertVideoSOP = z.infer<typeof insertVideoSOPSchema>;
export type NotionSOP = typeof notionSOPs.$inferSelect;
export type InsertNotionSOP = z.infer<typeof insertNotionSOPSchema>;
export type VisualWorkflow = typeof visualWorkflows.$inferSelect;
export type InsertVisualWorkflow = z.infer<typeof insertVisualWorkflowSchema>;
export type WhiteLabelSettings = typeof whiteLabelSettings.$inferSelect;
export type InsertWhiteLabelSettings = z.infer<
  typeof insertWhiteLabelSettingsSchema
>;
export type KpiAnomaly = typeof kpiAnomalies.$inferSelect;
export type InsertKpiAnomaly = z.infer<typeof insertKpiAnomalySchema>;
