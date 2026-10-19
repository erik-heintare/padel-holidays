import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { agentRuns, operators, outreachDrafts } from "@/db/schema";
import { hasBearer, unauthorized } from "@/lib/auth";

const payloadSchema = z.object({
  session_id: z.string().max(120).optional().nullable(),
  drafts: z
    .array(
      z.object({
        operator_domain: z.string().min(3),
        to_email: z.string().email().optional().nullable(),
        subject: z.string().min(3).max(200),
        body: z.string().min(50).max(5000),
      }),
    )
    .max(10),
});

export async function POST(req: Request) {
  if (!hasBearer(req, process.env.AGENT_INGEST_TOKEN)) return unauthorized();
  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid payload", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const db = getDb();
  let saved = 0;
  const rejections: { title: string; reason: string }[] = [];
  for (const d of parsed.data.drafts) {
    const domain = d.operator_domain.toLowerCase().replace(/^www\./, "");
    const [op] = await db.select().from(operators).where(eq(operators.domain, domain)).limit(1);
    if (!op) {
      rejections.push({ title: d.subject, reason: `unknown operator ${domain}` });
      continue;
    }
    await db.insert(outreachDrafts).values({
      operatorId: op.id,
      toEmail: d.to_email ?? op.contactEmail,
      subject: d.subject,
      body: d.body,
    });
    saved++;
  }
  await db.insert(agentRuns).values({
    sessionId: parsed.data.session_id ?? null,
    kind: "outreach",
    received: parsed.data.drafts.length,
    inserted: saved,
    rejected: rejections.length,
    rejections,
  });
  return Response.json({ saved, rejections });
}
