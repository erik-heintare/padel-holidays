import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "../src/db";

await migrate(getDb(), { migrationsFolder: "drizzle" });
console.log("Migrations applied");
process.exit(0);
