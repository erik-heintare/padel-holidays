import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { leads, operators, trips } from "@/db/schema";
import { notifyOwner } from "@/lib/notify";
import { site } from "@/lib/site";

const leadSchema = z.object({
  trip_slug: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  group_size: z.coerce.number().int().min(1).max(100).optional(),
  preferred_dates: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const raw = form ? Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")) : null;
  // Bots that fill the hidden honeypot field get a normal-looking success and nothing is stored.
  if (raw?.website) return Response.json({ ok: true });
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "invalid" }, { status: 400 });
  }
  const db = getDb();
  const [row] = await db
    .select({ trip: trips, operatorName: operators.name })
    .from(trips)
    .innerJoin(operators, eq(trips.operatorId, operators.id))
    .where(eq(trips.slug, parsed.data.trip_slug))
    .limit(1);
  if (!row) return Response.json({ ok: false, error: "trip not found" }, { status: 404 });

  const d = parsed.data;
  await db.insert(leads).values({
    tripId: row.trip.id,
    name: d.name,
    email: d.email,
    groupSize: d.group_size,
    preferredDates: d.preferred_dates,
    message: d.message,
  });
  await notifyOwner(
    `New enquiry: ${row.trip.title}`,
    [
      `Trip: ${row.trip.title} (${row.operatorName})`,
      `${site.url}/trips/${row.trip.slug}`,
      `From: ${d.name} <${d.email}>`,
      `Group size: ${d.group_size ?? "-"}`,
      `Dates: ${d.preferred_dates ?? "-"}`,
      "",
      d.message ?? "",
    ].join("\n"),
  );
  return Response.json({ ok: true });
}
