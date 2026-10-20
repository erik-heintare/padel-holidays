# Padel Holidays

A padel trip aggregator that keeps itself up to date. A Claude Managed Agent searches the web every day for padel camps, clinics, holidays and tournament trips. The site validates and publishes what it finds, and earns money by referring visitors to the organisers.

```
Managed Agent "padel-scout"  (Anthropic runs the schedule and the agent)
  daily scout run    -> GET  /api/agent/context?kind=scout     which region to cover, what we already list
                     -> POST /api/agent/ingest                 validate -> link check -> dedupe -> publish
  weekly outreach    -> GET  /api/agent/context?kind=outreach  organisers worth pitching, with our traffic stats
                     -> POST /api/agent/outreach               email drafts for you to review and send

Next.js on Vercel + Postgres (Neon)
  /                     home, featured and upcoming trips, destinations
  /trips                filters for country, month, type, level, price and text search
  /trips/[slug]         trip page with booking CTA, enquiry form and JSON-LD
  /destinations/[c]     country landing pages (SEO)
  /operators/[slug]     organiser pages
  /go/[slug]            outbound redirect: logs the click, adds referral and UTM params
  /list-your-trip       featured-listing and partnership enquiries
  /admin                leads, outreach drafts, agent runs, referral deals, featuring trips
  /api/cron/maintain    daily Vercel Cron: expire past trips, re-check stale links
```

## How it makes money

| Stream | How it works | Where you manage it |
|---|---|---|
| Referral links | Every "Check availability" click goes through `/go/<slug>`. It is logged and tagged `utm_source=padelholidays`, plus the organiser's referral params once you have a deal. A trip-level affiliate URL (for example, from Awin) replaces the link entirely. | `/admin`: Organisers (referral params, commission note) and Trips (affiliate URL) |
| Enquiries | Visitors ask questions through a form on each trip. You receive the lead and forward it to the organiser on a commission. | `/admin`: Leads, plus an email if Resend is configured |
| Featured listings | A paid placement at the top of results and on the home page, always labelled "Featured". | `/admin`: Trips, Featured (7, 30 or 90 days) |
| Partner outreach | The weekly agent drafts a short pitch to organisers without a deal, citing the clicks and leads we sent them. You review and send it. | `/admin`: Outreach drafts |

Click and lead counts per organiser are your evidence when negotiating commissions.

## Data quality guardrails

The agent can only add trips through `/api/agent/ingest`, and the server checks every record (`src/lib/ingest.ts`):

- It must match the schema and mention padel.
- It needs a future start date (at most two years ahead), or `recurring: true` with a season note.
- The country must be a known ISO code, and a price must come with a currency.
- The source page must not return 404/410.
- Records are deduplicated on organiser domain + normalised title + start date. A re-seen trip updates the existing row, and a trip you hid stays hidden.

Every batch is logged in `agent_runs` with its rejection reasons, so you can see them in `/admin`. The daily cron expires trips whose dates have passed and marks trips whose pages disappeared.

## Local development

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL and secrets
npm run db:migrate
npm run dev
```

Checks: `npm run lint && npm run typecheck && npm test`. The database integration tests run when `TEST_DATABASE_URL` points at a disposable Postgres database.

To simulate the agent locally:

```bash
curl -X POST localhost:3000/api/agent/ingest \
  -H "Authorization: Bearer $AGENT_INGEST_TOKEN" -H "content-type: application/json" \
  -d '{"slice":"test","trips":[{ ...a record as described in agents/padel-scout/agent.md... }]}'
```

## Going live

1. **Vercel project:** in Vercel, go to **Add New → Project** and import `erik-heintare/padel-holidays`. Grant the Vercel GitHub app access to the repo if asked. Under Environment Variables, add `AGENT_INGEST_TOKEN`, `ADMIN_PASSWORD` and `CRON_SECRET`, then deploy. This first build fails because there is no database yet.
2. **Database:** in the project, go to **Storage → Create Database → Neon**, pick region Frankfurt (`eu-central-1`), and connect it to the project. This sets `DATABASE_URL`. Then **Redeploy**. The `vercel-build` script applies database migrations before every build, so the schema is created automatically. The site URL comes from Vercel's production domain; set `NEXT_PUBLIC_SITE_URL` only for a custom domain. `vercel.json` registers the daily maintenance cron.
3. **Agent setup.** This needs the [`ant` CLI](https://docs.claude.com) and an Anthropic API key, or `ant auth login`:
   1. Put your real site URL in both `agents/padel-scout/deployment-*.yaml` files. They currently say `https://padel-holidays.vercel.app`.
   2. Create the agent, environment and vault: `ant apply --dry-run agents/padel-scout/agent.md agents/padel-scout/environment.yaml agents/padel-scout/vault.yaml`, then run it again without `--dry-run`. Commit the resulting `claude-lock.json`.
   3. Add the ingest token to the vault as a header-only `environment_variable` credential, limited to your site host:
      ```bash
      ant beta:vaults:credentials create --vault-id <vlt_...> <<'YAML'
      display_name: Padel Holidays ingest token
      auth:
        type: environment_variable
        secret_name: AGENT_INGEST_TOKEN
        secret_value: <same value as the Vercel env var>
        networking: {type: limited, allowed_hosts: [your-site-host.com]}
        injection_location: {header: true}
      YAML
      ```
      The agent's sandbox only ever sees a placeholder. The real token is substituted on requests to your site host.
   4. Put the `vlt_...` ID into `vault_ids` in both deployment files, then `ant apply agents/padel-scout`.
   5. Seed the site now instead of waiting for the schedule: `npm run agent:run`. Watch it with `ant beta:sessions connect <session-id>`.

The scout runs daily at 05:15 and outreach runs Mondays at 06:40 (Europe/Tallinn). Each run has a hard spend cap: $2 for scout, $1 for outreach. To change the model, effort, prompt or schedule, edit the files in `agents/padel-scout/` and run `ant apply agents/padel-scout` again.

The scout rotates through the research areas in `src/lib/slices.ts`, always taking the one scanned least recently. Add a slice there to cover a new region or theme.
