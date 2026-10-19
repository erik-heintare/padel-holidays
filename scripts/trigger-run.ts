/**
 * Fires a deployment right now instead of waiting for its schedule, e.g. to seed the site
 * after the first deploy or to test a prompt change.
 *
 *   npm run agent:run              # scout
 *   npm run agent:run -- outreach
 *
 * Needs Anthropic credentials (ANTHROPIC_API_KEY or `ant auth login`) and claude-lock.json from `ant apply`.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

const job = process.argv[2] ?? "scout";
const file = job === "outreach" ? "deployment-weekly-outreach.yaml" : "deployment-daily-scout.yaml";

const lock = JSON.parse(readFileSync("claude-lock.json", "utf8")) as { resources: Record<string, { id: string }> };
const entry = Object.entries(lock.resources).find(([path]) => path.endsWith(`padel-scout/${file}`));
if (!entry) {
  console.error(`No ${file} in claude-lock.json. Run \`ant apply agents/padel-scout\` first.`);
  process.exit(1);
}

const client = new Anthropic();
const run = await client.beta.deployments.run(entry[1].id);
if (run.error) {
  console.error(`Run failed to start: ${run.error.type}: ${run.error.message}`);
  process.exit(1);
}
console.log(`Started ${job} run ${run.id}, session ${run.session_id}`);
console.log(`Watch it live: ant beta:sessions connect ${run.session_id}`);
