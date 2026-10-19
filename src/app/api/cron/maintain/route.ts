import { and, asc, eq, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { trips } from "@/db/schema";
import { hasBearer, todayIso, unauthorized } from "@/lib/auth";
import { checkLink, expirePastTrips } from "@/lib/ingest";

export const maxDuration = 300;

const RECHECK_AFTER_DAYS = 7;
const RECHECK_BATCH = 40;

/** Daily housekeeping (Vercel Cron): expire past trips and re-verify the stalest links. No LLM involved. */
export async function GET(req: Request) {
  if (!hasBearer(req, process.env.CRON_SECRET)) return unauthorized();
  const db = getDb();
  const expired = await expirePastTrips(db, todayIso());

  const stale = await db
    .select({ id: trips.id, sourceUrl: trips.sourceUrl })
    .from(trips)
    .where(
      and(
        eq(trips.status, "published"),
        lt(trips.lastVerifiedAt, new Date(Date.now() - RECHECK_AFTER_DAYS * 86_400_000)),
      ),
    )
    .orderBy(asc(trips.lastVerifiedAt))
    .limit(RECHECK_BATCH);

  let dead = 0;
  await Promise.all(
    stale.map(async (t) => {
      const status = await checkLink(t.sourceUrl);
      if (status === "dead") dead++;
      await db
        .update(trips)
        .set(status === "dead" ? { status: "dead_link", updatedAt: new Date() } : { lastVerifiedAt: new Date() })
        .where(eq(trips.id, t.id));
    }),
  );

  if (expired + dead > 0) revalidatePath("/", "layout");
  return Response.json({ expired, rechecked: stale.length, dead });
}
