ALTER TABLE "bookings" ALTER COLUMN "duration" SET DEFAULT 60;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "scheduled_for" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "attendee_email" varchar;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "attendee_name" varchar;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "attendee_phone" varchar;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "meeting_type" varchar;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_24h_sent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_1h_sent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_24h_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_1h_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "whatsapp_phone_number_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "viewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "call_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_expiry" timestamp;