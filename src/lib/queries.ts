import { and, asc, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { operators, trips, type Operator, type Trip } from "@/db/schema";
import { todayIso } from "./auth";

export type TripWithOperator = Trip & { operator: Pick<Operator, "name" | "slug" | "domain" | "website"> };

export type TripFilters = {
  country?: string;
  type?: Trip["type"];
  level?: Trip["level"];
  month?: string; // YYYY-MM
  maxPrice?: number;
  q?: string;
  operatorId?: number;
};

const PAGE_SIZE = 24;

const operatorCols = {
  name: operators.name,
  slug: operators.slug,
  domain: operators.domain,
  website: operators.website,
};

/** Published trips that haven't started yet, or run all season. */
function liveCondition(): SQL {
  return and(eq(trips.status, "published"), or(gte(trips.startDate, todayIso()), eq(trips.recurring, true)))!;
}

const featuredFirst = sql`case when ${trips.featuredUntil} > now() then 0 else 1 end`;

function filterConditions(f: TripFilters): SQL[] {
  const c: SQL[] = [liveCondition()];
  if (f.country) c.push(eq(trips.country, f.country));
  if (f.type) c.push(eq(trips.type, f.type));
  if (f.level) c.push(or(eq(trips.level, f.level), eq(trips.level, "all"))!);
  if (f.operatorId) c.push(eq(trips.operatorId, f.operatorId));
  if (f.maxPrice) c.push(lte(trips.priceFrom, f.maxPrice));
  if (f.month && /^\d{4}-\d{2}$/.test(f.month)) {
    const first = `${f.month}-01`;
    c.push(
      or(
        eq(trips.recurring, true),
        and(lte(trips.startDate, sql`(${first}::date + interval '1 month' - interval '1 day')::date`), gte(sql`coalesce(${trips.endDate}, ${trips.startDate})`, first)),
      )!,
    );
  }
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    c.push(or(ilike(trips.title, like), ilike(trips.city, like), ilike(trips.region, like), ilike(operators.name, like))!);
  }
  return c;
}

export async function listTrips(f: TripFilters, page = 1): Promise<{ trips: TripWithOperator[]; total: number; pageSize: number }> {
  const db = getDb();
  const where = and(...filterConditions(f));
  const rows = await db
    .select({ trip: trips, operator: operatorCols })
    .from(trips)
    .innerJoin(operators, eq(trips.operatorId, operators.id))
    .where(where)
    .orderBy(featuredFirst, sql`${trips.startDate} asc nulls last`, desc(trips.firstSeenAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const [{ total }] = await db
    .select({ total: count() })
    .from(trips)
    .innerJoin(operators, eq(trips.operatorId, operators.id))
    .where(where);
  return { trips: rows.map((r) => ({ ...r.trip, operator: r.operator })), total, pageSize: PAGE_SIZE };
}

export async function featuredTrips(limit = 6): Promise<TripWithOperator[]> {
  const rows = await getDb()
    .select({ trip: trips, operator: operatorCols })
    .from(trips)
    .innerJoin(operators, eq(trips.operatorId, operators.id))
    .where(and(liveCondition(), sql`${trips.featuredUntil} > now()`))
    .orderBy(asc(trips.startDate))
    .limit(limit);
  return rows.map((r) => ({ ...r.trip, operator: r.operator }));
}

export async function getTrip(slug: string): Promise<TripWithOperator | null> {
  const [row] = await getDb()
    .select({ trip: trips, operator: operatorCols })
    .from(trips)
    .innerJoin(operators, eq(trips.operatorId, operators.id))
    .where(eq(trips.slug, slug))
    .limit(1);
  return row ? { ...row.trip, operator: row.operator } : null;
}

export async function countriesWithTrips(): Promise<{ country: string; trips: number }[]> {
  return getDb()
    .select({ country: trips.country, trips: count() })
    .from(trips)
    .where(liveCondition())
    .groupBy(trips.country)
    .orderBy(desc(count()));
}

export async function getOperator(slug: string): Promise<Operator | null> {
  const [op] = await getDb().select().from(operators).where(eq(operators.slug, slug)).limit(1);
  return op ?? null;
}

export async function operatorsWithTrips(): Promise<{ slug: string; name: string; trips: number }[]> {
  return getDb()
    .select({ slug: operators.slug, name: operators.name, trips: count() })
    .from(operators)
    .innerJoin(trips, eq(trips.operatorId, operators.id))
    .where(liveCondition())
    .groupBy(operators.id)
    .orderBy(desc(count()));
}

export async function sitemapEntries() {
  return getDb()
    .select({ slug: trips.slug, updatedAt: trips.updatedAt })
    .from(trips)
    .where(liveCondition());
}
