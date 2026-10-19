import { z } from "zod";
import { getDb } from "@/db";
import { listingRequests } from "@/db/schema";
import { notifyOwner } from "@/lib/notify";

const schema = z.object({
  company: z.string().trim().min(2).max(160),
  contact_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  website: z.string().trim().url().max(300),
  message: z.string().trim().max(2000).optional(),
  // Honeypot.
  phone_number: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const raw = form ? Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")) : null;
  // Bots that fill the hidden honeypot field get a normal-looking success and nothing is stored.
  if (raw?.phone_number) return Response.json({ ok: true });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "invalid" }, { status: 400 });
  }
  const d = parsed.data;
  await getDb().insert(listingRequests).values({
    company: d.company,
    contactName: d.contact_name,
    email: d.email,
    website: d.website,
    message: d.message,
  });
  await notifyOwner(
    `Featured listing request: ${d.company}`,
    `${d.contact_name} <${d.email}>\n${d.website}\n\n${d.message ?? ""}`,
  );
  return Response.json({ ok: true });
}
