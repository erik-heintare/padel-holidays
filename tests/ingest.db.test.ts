import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { expirePastTrips, ingestBatch, type LinkStatus } from "@/lib/ingest";
import { sampleTrip } from "./fixtures";

// Runs only when a disposable Postgres is available: TEST_DATABASE_URL=postgres://... npm test
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("ingestBatch (database)", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const ok = async (): Promise<LinkStatus> => "ok";

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
  });
  beforeEach(async () => {
    await db.execute(sql`truncate clicks, leads, outreach_drafts, trips, operators, agent_runs restart identity cascade`);
  });
  afterAll(async () => pool?.end());

  it("inserts, then updates instead of duplicating", async () => {
    const first = await ingestBatch(db, { trips: [sampleTrip()], slice: "es-andalucia" }, { today: "2026-10-19", checkLink: ok });
    expect(first).toMatchObject({ inserted: 1, updated: 0, rejected: 0, slugs: ["marbella-padel-week-marbella-2027-03"] });

    const second = await ingestBatch(db, { trips: [sampleTrip({ price_from: 999 })] }, { today: "2026-10-19", checkLink: ok });
    expect(second).toMatchObject({ inserted: 0, updated: 1 });

    const rows = await db.select().from(schema.trips);
    expect(rows).toHaveLength(1);
    expect(rows[0].priceFrom).toBe(999);
    expect(await db.select().from(schema.operators)).toHaveLength(1);
    expect(await db.select().from(schema.agentRuns)).toHaveLength(2);
  });

  it("rejects dead links and in-batch duplicates, keeps hidden trips hidden", async () => {
    const dead = async (u: string): Promise<LinkStatus> => (u.includes("gone") ? "dead" : "ok");
    const res = await ingestBatch(
      db,
      { trips: [sampleTrip(), sampleTrip(), sampleTrip({ title: "Gone Padel Week", source_url: "https://solpadel.example/gone" })] },
      { today: "2026-10-19", checkLink: dead },
    );
    expect(res).toMatchObject({ inserted: 1, rejected: 2 });
    expect(res.rejections.map((r) => r.reason)).toEqual(["duplicate within batch", "source_url returns 404/410"]);

    await db.update(schema.trips).set({ status: "hidden" });
    await ingestBatch(db, { trips: [sampleTrip()] }, { today: "2026-10-19", checkLink: ok });
    const [row] = await db.select().from(schema.trips);
    expect(row.status).toBe("hidden");
  });

  it("expires trips once their dates pass", async () => {
    await ingestBatch(db, { trips: [sampleTrip()] }, { today: "2026-10-19", checkLink: ok });
    expect(await expirePastTrips(db, "2027-03-05")).toBe(0);
    expect(await expirePastTrips(db, "2027-03-09")).toBe(1);
  });
});
