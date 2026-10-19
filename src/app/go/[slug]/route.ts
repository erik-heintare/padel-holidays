import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clicks, operators, trips } from "@/db/schema";
import { buildOutboundUrl } from "@/lib/affiliate";

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless/i;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const [row] = await db
    .select({ trip: trips, affiliateParams: operators.affiliateParams })
    .from(trips)
    .innerJoin(operators, eq(trips.operatorId, operators.id))
    .where(eq(trips.slug, slug))
    .limit(1);
  if (!row) return Response.redirect(new URL("/trips", req.url), 302);

  const target = buildOutboundUrl({
    slug: row.trip.slug,
    sourceUrl: row.trip.sourceUrl,
    bookingUrl: row.trip.bookingUrl,
    affiliateUrl: row.trip.affiliateUrl,
    operatorAffiliateParams: row.affiliateParams,
  });

  // Count humans only, so the click numbers we show operators hold up.
  if (!BOT_UA.test(req.headers.get("user-agent") ?? "")) {
    await db.insert(clicks).values({
      tripId: row.trip.id,
      operatorId: row.trip.operatorId,
      referrer: req.headers.get("referer")?.slice(0, 500) ?? null,
      country: req.headers.get("x-vercel-ip-country"),
    });
  }

  return new Response(null, {
    status: 302,
    headers: { location: target, "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
}
