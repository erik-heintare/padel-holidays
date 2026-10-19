import { createHash } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import { agentRuns, operators, trips } from "@/db/schema";
import { toCountryCode } from "./countries";
import { domainOf, slugify } from "./slug";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");
const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "must be an http(s) URL");

/** One trip as the agent reports it. Field names are snake_case to match the agent's JSON contract. */
export const agentTripSchema = z.object({
  operator: z.object({
    name: z.string().min(2).max(120),
    website: httpUrl,
    contact_email: z.string().email().optional().nullable(),
  }),
  title: z.string().min(5).max(160),
  type: z.enum(["camp", "holiday", "clinic", "tournament_trip", "retreat"]),
  level: z.enum(["beginner", "intermediate", "advanced", "all"]).optional().nullable(),
  country: z.string().min(2),
  region: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  venue: z.string().max(120).optional().nullable(),
  start_date: isoDate.optional().nullable(),
  end_date: isoDate.optional().nullable(),
  recurring: z.boolean().optional().nullable(),
  season_note: z.string().max(160).optional().nullable(),
  duration_nights: z.number().int().min(0).max(60).optional().nullable(),
  price_from: z.number().positive().max(100_000).optional().nullable(),
  currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/)
    .optional()
    .nullable(),
  includes: z.array(z.string().max(80)).max(20).optional().nullable(),
  coaches: z.string().max(200).optional().nullable(),
  description: z.string().min(40).max(1500),
  image_url: httpUrl.optional().nullable(),
  source_url: httpUrl,
  booking_url: httpUrl.optional().nullable(),
});

export type AgentTrip = z.infer<typeof agentTripSchema>;

export const ingestPayloadSchema = z.object({
  session_id: z.string().max(120).optional().nullable(),
  slice: z.string().max(120).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  trips: z.array(z.unknown()).max(100),
});

export type NormalizedTrip = {
  operator: { name: string; website: string; domain: string; contactEmail: string | null };
  title: string;
  type: AgentTrip["type"];
  level: NonNullable<AgentTrip["level"]>;
  country: string;
  region: string | null;
  city: string | null;
  venue: string | null;
  startDate: string | null;
  endDate: string | null;
  recurring: boolean;
  seasonNote: string | null;
  durationNights: number | null;
  priceFrom: number | null;
  currency: string | null;
  includes: string[];
  coaches: string | null;
  description: string;
  imageUrl: string | null;
  sourceUrl: string;
  bookingUrl: string | null;
  dedupeKey: string;
};

export type ValidationResult =
  | { ok: true; trip: NormalizedTrip }
  | { ok: false; title: string; reason: string };

const DAY_MS = 86_400_000;

function addDays(isoDay: string, days: number): string {
  return new Date(Date.parse(isoDay) + days * DAY_MS).toISOString().slice(0, 10);
}

function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function computeDedupeKey(domain: string, title: string, startDate: string | null): string {
  return createHash("sha1")
    .update(`${domain}|${normalizeTitle(title)}|${startDate ?? "recurring"}`)
    .digest("hex");
}

function clean(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/**
 * Validates and normalizes one agent record. Pure: no I/O, so it is the main unit under test.
 * `today` is an ISO date (YYYY-MM-DD).
 */
export function validateTrip(raw: unknown, today: string): ValidationResult {
  const titleOf = (r: unknown) =>
    typeof r === "object" && r && "title" in r ? String((r as { title: unknown }).title) : "(untitled)";

  const parsed = agentTripSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, title: titleOf(raw), reason: `invalid ${issue.path.join(".") || "record"}: ${issue.message}` };
  }
  const r = parsed.data;

  const text = `${r.title} ${r.description}`.toLowerCase();
  if (!/p[aá]del/.test(text)) {
    return { ok: false, title: r.title, reason: "not a padel trip (no 'padel' in title or description)" };
  }

  const country = toCountryCode(r.country);
  if (!country) return { ok: false, title: r.title, reason: `unknown country '${r.country}'` };

  const recurring = r.recurring ?? false;
  const startDate = r.start_date ?? null;
  const endDate = r.end_date ?? null;

  if (!startDate && !recurring) {
    return { ok: false, title: r.title, reason: "needs start_date, or recurring=true with season_note" };
  }
  if (recurring && !startDate && !clean(r.season_note)) {
    return { ok: false, title: r.title, reason: "recurring trip needs a season_note" };
  }
  if (startDate) {
    if (Number.isNaN(Date.parse(startDate))) return { ok: false, title: r.title, reason: "invalid start_date" };
    if (startDate < today) return { ok: false, title: r.title, reason: "start_date is in the past" };
    if (startDate > addDays(today, 730)) {
      return { ok: false, title: r.title, reason: "start_date more than two years ahead" };
    }
  }
  if (endDate) {
    if (Number.isNaN(Date.parse(endDate))) return { ok: false, title: r.title, reason: "invalid end_date" };
    if (startDate && endDate < startDate) return { ok: false, title: r.title, reason: "end_date before start_date" };
  }

  const priceFrom = r.price_from != null ? Math.round(r.price_from) : null;
  const currency = r.currency ? r.currency.toUpperCase() : null;
  if (priceFrom != null && !currency) return { ok: false, title: r.title, reason: "price_from needs a currency" };

  let durationNights = r.duration_nights ?? null;
  if (durationNights == null && startDate && endDate) {
    durationNights = Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS);
  }

  const domain = domainOf(r.operator.website);
  const title = r.title.trim();

  return {
    ok: true,
    trip: {
      operator: {
        name: r.operator.name.trim(),
        website: r.operator.website,
        domain,
        contactEmail: clean(r.operator.contact_email),
      },
      title,
      type: r.type,
      level: r.level ?? "all",
      country,
      region: clean(r.region),
      city: clean(r.city),
      venue: clean(r.venue),
      startDate,
      endDate,
      recurring,
      seasonNote: clean(r.season_note),
      durationNights,
      priceFrom,
      currency,
      includes: (r.includes ?? []).map((s) => s.trim()).filter(Boolean),
      coaches: clean(r.coaches),
      description: r.description.trim(),
      imageUrl: r.image_url ?? null,
      sourceUrl: r.source_url,
      bookingUrl: r.booking_url ?? null,
      dedupeKey: computeDedupeKey(domain, title, startDate),
    },
  };
}

export type LinkStatus = "ok" | "dead" | "unverifiable";

/**
 * Checks that a URL still resolves. Bot protection (401/403/429) and network errors are
 * "unverifiable", not dead: we only reject pages that are positively gone (404/410).
 */
export async function checkLink(url: string, timeoutMs = 8000): Promise<LinkStatus> {
  const attempt = async (method: "HEAD" | "GET") =>
    fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "PadelHolidaysBot/1.0 (+https://padelholidays.example/about)" },
    });
  try {
    let res = await attempt("HEAD");
    // Many sites answer HEAD with 405/404 but serve GET fine.
    if (res.status >= 400) res = await attempt("GET");
    if (res.status === 404 || res.status === 410) return "dead";
    if (res.ok) return "ok";
    return "unverifiable";
  } catch {
    return "unverifiable";
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export type IngestSummary = {
  received: number;
  inserted: number;
  updated: number;
  rejected: number;
  rejections: { title: string; reason: string }[];
  slugs: string[];
};

async function uniqueSlug(db: DB, base: string): Promise<string> {
  let slug = base || "padel-trip";
  for (let i = 2; ; i++) {
    const existing = await db.select({ id: trips.id }).from(trips).where(eq(trips.slug, slug)).limit(1);
    if (existing.length === 0) return slug;
    slug = `${base}-${i}`;
  }
}

async function upsertOperator(db: DB, op: NormalizedTrip["operator"]): Promise<number> {
  const existing = await db.select().from(operators).where(eq(operators.domain, op.domain)).limit(1);
  if (existing[0]) {
    if (!existing[0].contactEmail && op.contactEmail) {
      await db.update(operators).set({ contactEmail: op.contactEmail }).where(eq(operators.id, existing[0].id));
    }
    return existing[0].id;
  }
  let slug = slugify(op.name) || slugify(op.domain);
  const clash = await db.select({ id: operators.id }).from(operators).where(eq(operators.slug, slug)).limit(1);
  if (clash.length) slug = slugify(`${op.name} ${op.domain}`);
  const [row] = await db
    .insert(operators)
    .values({ slug, name: op.name, domain: op.domain, website: op.website, contactEmail: op.contactEmail })
    .returning({ id: operators.id });
  return row.id;
}

export async function ingestBatch(
  db: DB,
  payload: z.infer<typeof ingestPayloadSchema>,
  opts: { today: string; checkLink: (url: string) => Promise<LinkStatus> },
): Promise<IngestSummary> {
  const summary: IngestSummary = {
    received: payload.trips.length,
    inserted: 0,
    updated: 0,
    rejected: 0,
    rejections: [],
    slugs: [],
  };
  const reject = (title: string, reason: string) => {
    summary.rejected++;
    summary.rejections.push({ title, reason });
  };

  // Validate everything first, then check links concurrently: link checks dominate the runtime.
  const seen = new Set<string>();
  const valid: NormalizedTrip[] = [];
  for (const raw of payload.trips) {
    const result = validateTrip(raw, opts.today);
    if (!result.ok) {
      reject(result.title, result.reason);
    } else if (seen.has(result.trip.dedupeKey)) {
      reject(result.trip.title, "duplicate within batch");
    } else {
      seen.add(result.trip.dedupeKey);
      valid.push(result.trip);
    }
  }
  const linkStatuses = await mapLimit(valid, 8, (t) => opts.checkLink(t.sourceUrl));

  for (const [i, t] of valid.entries()) {
    if (linkStatuses[i] === "dead") {
      reject(t.title, "source_url returns 404/410");
      continue;
    }

    const operatorId = await upsertOperator(db, t.operator);
    const fields = {
      operatorId,
      title: t.title,
      type: t.type,
      level: t.level,
      country: t.country,
      region: t.region,
      city: t.city,
      venue: t.venue,
      startDate: t.startDate,
      endDate: t.endDate,
      recurring: t.recurring,
      seasonNote: t.seasonNote,
      durationNights: t.durationNights,
      priceFrom: t.priceFrom,
      currency: t.currency,
      includes: t.includes,
      coaches: t.coaches,
      description: t.description,
      imageUrl: t.imageUrl,
      sourceUrl: t.sourceUrl,
      bookingUrl: t.bookingUrl,
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    };

    const existing = await db
      .select({ id: trips.id, slug: trips.slug, status: trips.status })
      .from(trips)
      .where(eq(trips.dedupeKey, t.dedupeKey))
      .limit(1);

    if (existing[0]) {
      // Re-seen trips come back to life unless an admin hid them on purpose.
      const status = existing[0].status === "hidden" ? "hidden" : "published";
      await db.update(trips).set({ ...fields, status }).where(eq(trips.id, existing[0].id));
      summary.updated++;
      summary.slugs.push(existing[0].slug);
    } else {
      const base = slugify([t.title, t.city, t.startDate?.slice(0, 7)].filter(Boolean).join(" "));
      const slug = await uniqueSlug(db, base);
      await db.insert(trips).values({ ...fields, slug, dedupeKey: t.dedupeKey, status: "published" });
      summary.inserted++;
      summary.slugs.push(slug);
    }
  }

  await db.insert(agentRuns).values({
    sessionId: payload.session_id ?? null,
    kind: "scout",
    slice: payload.slice ?? null,
    received: summary.received,
    inserted: summary.inserted,
    updated: summary.updated,
    rejected: summary.rejected,
    rejections: summary.rejections.slice(0, 100),
    notes: payload.notes ?? null,
  });

  return summary;
}

/** Marks trips whose dates have passed as expired. Returns the number changed. */
export async function expirePastTrips(db: DB, today: string): Promise<number> {
  const res = await db
    .update(trips)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        ne(trips.status, "expired"),
        eq(trips.recurring, false),
        sql`coalesce(${trips.endDate}, ${trips.startDate}) < ${today}`,
      ),
    )
    .returning({ id: trips.id });
  return res.length;
}
