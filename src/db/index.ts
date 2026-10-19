import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __padelDb?: DB };

/** Lazily creates one pooled connection per server instance. */
export function getDb(): DB {
  if (globalForDb.__padelDb) return globalForDb.__padelDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString: url,
    max: 5,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: true },
  });
  globalForDb.__padelDb = drizzle(pool, { schema });
  return globalForDb.__padelDb;
}

export { schema };
