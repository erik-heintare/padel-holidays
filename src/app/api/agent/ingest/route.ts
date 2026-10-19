import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { hasBearer, todayIso, unauthorized } from "@/lib/auth";
import { checkLink, ingestBatch, ingestPayloadSchema } from "@/lib/ingest";

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!hasBearer(req, process.env.AGENT_INGEST_TOKEN)) return unauthorized();
  const parsed = ingestPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid payload", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const summary = await ingestBatch(getDb(), parsed.data, { today: todayIso(), checkLink });
  if (summary.inserted + summary.updated > 0) revalidatePath("/", "layout");
  return Response.json(summary);
}
