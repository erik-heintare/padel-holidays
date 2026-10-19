import { and, count, desc, eq, gte, isNull, max, notInArray, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { agentRuns, clicks, leads, operators, outreachDrafts, trips } from "@/db/schema";
import { SLICES } from "./slices";

/** The slice scanned least recently (never-scanned slices first, in list order). */
export async function nextSlice(db: DB) {
  const rows = await db
    .select({ slice: agentRuns.slice, last: max(agentRuns.createdAt) })
    .from(agentRuns)
    .where(eq(agentRuns.kind, "scout"))
    .groupBy(agentRuns.slice);
  const lastScan = new Map(rows.map((r) => [r.slice, r.last?.getTime() ?? 0]));
  return [...SLICES].sort((a, b) => (lastScan.get(a.id) ?? -1) - (lastScan.get(b.id) ?? -1))[0];
}

export async function scoutContext(db: DB, today: string) {
  const slice = await nextSlice(db);
  const known = await db
    .select({
      operator: operators.domain,
      title: trips.title,
      start_date: trips.startDate,
      country: trips.country,
      source_url: trips.sourceUrl,
    })
    .from(trips)
    .innerJoin(operators, eq(trips.operatorId, operators.id))
    .where(eq(trips.status, "published"))
    .orderBy(desc(trips.lastVerifiedAt))
    .limit(400);
  const coverage = await db
    .select({ country: trips.country, trips: count() })
    .from(trips)
    .where(eq(trips.status, "published"))
    .groupBy(trips.country);
  return { today, slice, known_trips: known, coverage_by_country: coverage };
}

/** Operators worth pitching: no deal yet, not pitched in 60 days, ranked by traffic we sent them. */
export async function outreachContext(db: DB, today: string) {
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const since60 = new Date(Date.now() - 60 * 86_400_000);
  const recentlyPitched = db
    .select({ id: outreachDrafts.operatorId })
    .from(outreachDrafts)
    .where(gte(outreachDrafts.createdAt, since60));

  const rows = await db
    .select({
      domain: operators.domain,
      name: operators.name,
      website: operators.website,
      contact_email: operators.contactEmail,
      live_trips: sql<number>`(select count(*) from ${trips} where ${trips.operatorId} = ${operators.id} and ${trips.status} = 'published')`.mapWith(Number),
      clicks_30d: sql<number>`(select count(*) from ${clicks} where ${clicks.operatorId} = ${operators.id} and ${clicks.createdAt} >= ${since30})`.mapWith(Number),
      leads_30d: sql<number>`(select count(*) from ${leads} join ${trips} on ${leads.tripId} = ${trips.id} where ${trips.operatorId} = ${operators.id} and ${leads.createdAt} >= ${since30})`.mapWith(Number),
    })
    .from(operators)
    .where(and(eq(operators.partnerStatus, "none"), notInArray(operators.id, recentlyPitched), isNull(operators.affiliateParams)))
    .orderBy(sql`clicks_30d desc`, sql`live_trips desc`)
    .limit(5);
  return { today, operators: rows };
}
