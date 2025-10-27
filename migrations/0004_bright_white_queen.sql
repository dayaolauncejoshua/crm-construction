CREATE TABLE "call_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"event_data" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_recordings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"lead_id" varchar,
	"client_id" varchar NOT NULL,
	"twilio_call_sid" varchar,
	"recording_url" varchar,
	"duration" integer,
	"file_size" integer,
	"format" varchar DEFAULT 'mp3',
	"call_status" varchar DEFAULT 'completed',
	"was_transferred" boolean DEFAULT false,
	"transferred_at" timestamp,
	"transferred_to" varchar,
	"recording_consent" boolean DEFAULT false,
	"consent_given_at" timestamp,
	"transcript" text,
	"transcript_status" varchar DEFAULT 'pending',
	"ai_summary" text,
	"sentiment" varchar,
	"key_topics" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "call_recordings_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
CREATE TABLE "spam_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" varchar NOT NULL,
	"category" varchar NOT NULL,
	"detection_count" integer DEFAULT 0 NOT NULL,
	"false_positive_count" integer DEFAULT 0 NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.50' NOT NULL,
	"last_detected" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "spam_patterns_pattern_unique" UNIQUE("pattern")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "proposed_by" varchar;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "ai_confidence" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "approved_by" varchar;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "rejected_reason" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "reopened_at" timestamp;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reactions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "notion_sops" ADD COLUMN "scripts" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_backup_codes" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "vsls" ADD COLUMN "cloudinary_video_id" varchar;--> statement-breakpoint
ALTER TABLE "vsls" ADD COLUMN "cloudinary_thumbnail_id" varchar;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;