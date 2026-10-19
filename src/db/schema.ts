import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const tripTypeEnum = pgEnum("trip_type", [
  "camp",
  "holiday",
  "clinic",
  "tournament_trip",
  "retreat",
]);

export const tripLevelEnum = pgEnum("trip_level", [
  "beginner",
  "intermediate",
  "advanced",
  "all",
]);

export const tripStatusEnum = pgEnum("trip_status", [
  "published",
  "hidden",
  "expired",
  "dead_link",
]);

export const partnerStatusEnum = pgEnum("partner_status", [
  "none",
  "contacted",
  "negotiating",
  "partner",
  "declined",
]);

export const operators = pgTable("operators", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  // Registrable domain (e.g. "padelcamps.com"), the operator's identity for dedupe.
  domain: text("domain").notNull().unique(),
  website: text("website").notNull(),
  contactEmail: text("contact_email"),
  // Query params appended to every outbound link for this operator, e.g. {"ref": "padelholidays"}.
  affiliateParams: jsonb("affiliate_params").$type<Record<string, string>>(),
  // Free-form note on the commission deal, shown only in admin.
  commissionNote: text("commission_note"),
  partnerStatus: partnerStatusEnum("partner_status").notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trips = pgTable(
  "trips",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    operatorId: integer("operator_id")
      .notNull()
      .references(() => operators.id),
    title: text("title").notNull(),
    type: tripTypeEnum("type").notNull(),
    level: tripLevelEnum("level").notNull().default("all"),
    country: text("country").notNull(), // ISO 3166-1 alpha-2
    region: text("region"),
    city: text("city"),
    venue: text("venue"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    // Recurring products ("any week, May-October") have no fixed dates but a season window.
    recurring: boolean("recurring").notNull().default(false),
    seasonNote: text("season_note"),
    durationNights: integer("duration_nights"),
    priceFrom: integer("price_from"), // whole currency units
    currency: text("currency"),
    includes: jsonb("includes").$type<string[]>().notNull().default([]),
    coaches: text("coaches"),
    description: text("description").notNull(),
    imageUrl: text("image_url"),
    sourceUrl: text("source_url").notNull(),
    bookingUrl: text("booking_url"),
    affiliateUrl: text("affiliate_url"),
    featuredUntil: timestamp("featured_until", { withTimezone: true }),
    status: tripStatusEnum("status").notNull().default("published"),
    dedupeKey: text("dedupe_key").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("trips_dedupe_key_idx").on(t.dedupeKey),
    index("trips_status_start_idx").on(t.status, t.startDate),
    index("trips_country_idx").on(t.country),
  ],
);

export const clicks = pgTable(
  "clicks",
  {
    id: serial("id").primaryKey(),
    tripId: integer("trip_id")
      .notNull()
      .references(() => trips.id),
    operatorId: integer("operator_id")
      .notNull()
      .references(() => operators.id),
    referrer: text("referrer"),
    country: text("country"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clicks_operator_idx").on(t.operatorId, t.createdAt)],
);

export const leadStatusEnum = pgEnum("lead_status", ["new", "forwarded", "booked", "lost"]);

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  groupSize: integer("group_size"),
  preferredDates: text("preferred_dates"),
  message: text("message"),
  status: leadStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listingRequests = pgTable("listing_requests", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  website: text("website").notNull(),
  message: text("message"),
  handled: boolean("handled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"),
  kind: text("kind").notNull(), // "scout" | "outreach"
  slice: text("slice"),
  received: integer("received").notNull().default(0),
  inserted: integer("inserted").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  rejected: integer("rejected").notNull().default(0),
  rejections: jsonb("rejections").$type<{ title: string; reason: string }[]>().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outreachDrafts = pgTable("outreach_drafts", {
  id: serial("id").primaryKey(),
  operatorId: integer("operator_id")
    .notNull()
    .references(() => operators.id),
  toEmail: text("to_email"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"), // "draft" | "sent" | "discarded"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Trip = typeof trips.$inferSelect;
export type Operator = typeof operators.$inferSelect;
