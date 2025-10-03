CREATE TABLE "analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"metric" varchar NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer DEFAULT 30,
	"status" varchar DEFAULT 'scheduled',
	"meeting_url" varchar,
	"notes" text,
	"reminder_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"industry" varchar NOT NULL,
	"website" varchar,
	"phone" varchar,
	"email" varchar,
	"whatsapp_number" varchar,
	"user_id" varchar,
	"is_active" boolean DEFAULT true,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"status" varchar DEFAULT 'active',
	"is_ai_handled" boolean DEFAULT true,
	"human_takeover_at" timestamp,
	"last_message_at" timestamp DEFAULT now(),
	"qualification_score" numeric(3, 2) DEFAULT '0.0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"email" varchar NOT NULL,
	"phone" varchar,
	"company" varchar,
	"source" varchar DEFAULT 'landing_page',
	"status" varchar DEFAULT 'new',
	"qualification_score" numeric(3, 2) DEFAULT '0.0',
	"audit_results" jsonb,
	"utm_data" jsonb,
	"consent_given" boolean DEFAULT false,
	"response_time_seconds" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"content" text NOT NULL,
	"sender" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"message_type" varchar DEFAULT 'text',
	"metadata" jsonb,
	"sent_at" timestamp DEFAULT now(),
	"delivered_at" timestamp,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp DEFAULT now(),
	"total_users" integer DEFAULT 0,
	"active_trials" integer DEFAULT 0,
	"expired_trials" integer DEFAULT 0,
	"total_clients" integer DEFAULT 0,
	"total_leads" integer DEFAULT 0,
	"total_conversations" integer DEFAULT 0,
	"avg_response_time" numeric(8, 2),
	"conversion_rate" numeric(5, 4),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trial_activations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"activated_at" timestamp DEFAULT now(),
	"trial_days" integer DEFAULT 14,
	"source" varchar DEFAULT 'dashboard',
	"ip_address" varchar,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "user_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action" varchar NOT NULL,
	"resource" varchar,
	"details" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'user',
	"subscription_type" varchar DEFAULT 'trial',
	"trial_ends_at" timestamp,
	"is_trial_active" boolean DEFAULT false,
	"has_unlocked_trial" boolean DEFAULT false,
	"last_login_at" timestamp,
	"login_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vsls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"script" text,
	"video_url" varchar,
	"thumbnail_url" varchar,
	"duration" integer,
	"view_count" integer DEFAULT 0,
	"conversion_rate" numeric(5, 2) DEFAULT '0.0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brand_mentions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"platform" varchar NOT NULL,
	"url" varchar,
	"content" text,
	"author" varchar,
	"sentiment" varchar,
	"sentiment_score" numeric(3, 2),
	"reach" integer,
	"engagement" integer,
	"is_influencer" boolean DEFAULT false,
	"response_needed" boolean DEFAULT false,
	"mention_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competitor_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"competitor_name" varchar NOT NULL,
	"platform" varchar NOT NULL,
	"ad_spend" numeric(10, 2),
	"ad_count" integer,
	"impressions" integer,
	"reach" integer,
	"engagement" numeric(5, 2),
	"ad_data" jsonb,
	"tracking_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "executive_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"report_type" varchar NOT NULL,
	"report_data" jsonb NOT NULL,
	"pdf_url" varchar,
	"loom_url" varchar,
	"key_insights" jsonb,
	"recommendations" jsonb,
	"period" varchar NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"sent_at" timestamp,
	"viewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"conversation_id" varchar,
	"channel" varchar NOT NULL,
	"trigger_type" varchar NOT NULL,
	"schedule_time" timestamp NOT NULL,
	"content" text NOT NULL,
	"status" varchar DEFAULT 'pending',
	"sent_at" timestamp,
	"response_received" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kpi_anomalies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"metric" varchar NOT NULL,
	"current_value" numeric(10, 4),
	"expected_value" numeric(10, 4),
	"deviation_percent" numeric(5, 2),
	"severity" varchar DEFAULT 'medium',
	"alert_sent" boolean DEFAULT false,
	"acknowledged" boolean DEFAULT false,
	"investigation_notes" text,
	"detected_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_scoring" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"score" integer NOT NULL,
	"features" jsonb NOT NULL,
	"model_version" varchar DEFAULT 'v1.0',
	"confidence" numeric(3, 2),
	"predictions" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notion_sops" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"notion_page_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"category" varchar,
	"last_synced" timestamp,
	"sync_status" varchar DEFAULT 'active',
	"page_url" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "opportunity_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"alert_type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"priority" varchar DEFAULT 'medium',
	"data" jsonb,
	"action_required" boolean DEFAULT false,
	"action_taken" boolean DEFAULT false,
	"estimated_impact" varchar,
	"expires_at" timestamp,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "serp_monitoring" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"keyword" varchar NOT NULL,
	"current_position" integer,
	"previous_position" integer,
	"url" varchar,
	"search_volume" integer,
	"competition" varchar,
	"cpc" numeric(5, 2),
	"features" jsonb,
	"check_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "technical_issues" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"issue_type" varchar NOT NULL,
	"severity" varchar DEFAULT 'medium',
	"affected_component" varchar,
	"error_message" text,
	"stack_trace" text,
	"user_agent" varchar,
	"url" varchar,
	"ip_address" varchar,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"resolution" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_sops" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"category" varchar NOT NULL,
	"video_url" varchar NOT NULL,
	"thumbnail_url" varchar,
	"duration" integer,
	"view_count" integer DEFAULT 0,
	"tags" jsonb,
	"is_public" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "visual_workflows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"platform" varchar NOT NULL,
	"board_id" varchar NOT NULL,
	"board_url" varchar NOT NULL,
	"workflow_type" varchar,
	"last_modified" timestamp,
	"collaborators" jsonb,
	"thumbnail_url" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "white_label_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"brand_name" varchar NOT NULL,
	"logo_url" varchar,
	"primary_color" varchar,
	"secondary_color" varchar,
	"custom_domain" varchar,
	"custom_css" text,
	"favicon" varchar,
	"login_bg_image" varchar,
	"footer_text" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_activations" ADD CONSTRAINT "trial_activations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vsls" ADD CONSTRAINT "vsls_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_mentions" ADD CONSTRAINT "brand_mentions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_tracking" ADD CONSTRAINT "competitor_tracking_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_reports" ADD CONSTRAINT "executive_reports_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_anomalies" ADD CONSTRAINT "kpi_anomalies_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scoring" ADD CONSTRAINT "lead_scoring_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notion_sops" ADD CONSTRAINT "notion_sops_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_alerts" ADD CONSTRAINT "opportunity_alerts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serp_monitoring" ADD CONSTRAINT "serp_monitoring_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_issues" ADD CONSTRAINT "technical_issues_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_sops" ADD CONSTRAINT "video_sops_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_sops" ADD CONSTRAINT "video_sops_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_workflows" ADD CONSTRAINT "visual_workflows_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "white_label_settings" ADD CONSTRAINT "white_label_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");