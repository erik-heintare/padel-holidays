import { getDb } from "@/db";
import { outreachContext, scoutContext } from "@/lib/agent-context";
import { hasBearer, todayIso, unauthorized } from "@/lib/auth";

export async function GET(req: Request) {
  if (!hasBearer(req, process.env.AGENT_INGEST_TOKEN)) return unauthorized();
  const kind = new URL(req.url).searchParams.get("kind") ?? "scout";
  const db = getDb();
  const body = kind === "outreach" ? await outreachContext(db, todayIso()) : await scoutContext(db, todayIso());
  return Response.json(body);
}
