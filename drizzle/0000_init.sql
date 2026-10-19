CREATE TYPE "public"."lead_status" AS ENUM('new', 'forwarded', 'booked', 'lost');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('none', 'contacted', 'negotiating', 'partner', 'declined');--> statement-breakpoint
CREATE TYPE "public"."trip_level" AS ENUM('beginner', 'intermediate', 'advanced', 'all');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('published', 'hidden', 'expired', 'dead_link');--> statement-breakpoint
CREATE TYPE "public"."trip_type" AS ENUM('camp', 'holiday', 'clinic', 'tournament_trip', 'retreat');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text,
	"kind" text NOT NULL,
	"slice" text,
	"received" integer DEFAULT 0 NOT NULL,
	"inserted" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"rejected" integer DEFAULT 0 NOT NULL,
	"rejections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"operator_id" integer NOT NULL,
	"referrer" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"group_size" integer,
	"preferred_dates" text,
	"message" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"website" text NOT NULL,
	"message" text,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"website" text NOT NULL,
	"contact_email" text,
	"affiliate_params" jsonb,
	"commission_note" text,
	"partner_status" "partner_status" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operators_slug_unique" UNIQUE("slug"),
	CONSTRAINT "operators_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "outreach_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" integer NOT NULL,
	"to_email" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"operator_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" "trip_type" NOT NULL,
	"level" "trip_level" DEFAULT 'all' NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"city" text,
	"venue" text,
	"start_date" date,
	"end_date" date,
	"recurring" boolean DEFAULT false NOT NULL,
	"season_note" text,
	"duration_nights" integer,
	"price_from" integer,
	"currency" text,
	"includes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"coaches" text,
	"description" text NOT NULL,
	"image_url" text,
	"source_url" text NOT NULL,
	"booking_url" text,
	"affiliate_url" text,
	"featured_until" timestamp with time zone,
	"status" "trip_status" DEFAULT 'published' NOT NULL,
	"dedupe_key" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clicks_operator_idx" ON "clicks" USING btree ("operator_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_dedupe_key_idx" ON "trips" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "trips_status_start_idx" ON "trips" USING btree ("status","start_date");--> statement-breakpoint
CREATE INDEX "trips_country_idx" ON "trips" USING btree ("country");