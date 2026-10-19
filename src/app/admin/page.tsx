import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { agentRuns, clicks, leads, listingRequests, operators, outreachDrafts, trips } from "@/db/schema";
import { daysAgo, formatDates, isFeatured } from "@/lib/format";
import {
  featureTrip,
  markListingRequestHandled,
  setDraftStatus,
  setLeadStatus,
  setTripAffiliateUrl,
  setTripStatus,
  updateOperator,
} from "./actions";
import { requireAdmin } from "./guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const PARTNER_STATUSES = ["none", "contacted", "negotiating", "partner", "declined"] as const;
const LEAD_STATUSES = ["new", "forwarded", "booked", "lost"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4 overflow-x-auto">{children}</div>
    </section>
  );
}

const th = "border-b border-slate-200 px-2 py-2 text-left text-xs font-semibold uppercase text-muted";
const td = "border-b border-slate-100 px-2 py-2 align-top text-sm";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const db = getDb();
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [
    [{ live }],
    [{ c7 }],
    [{ c30 }],
    [{ newLeads }],
    runs,
    leadRows,
    drafts,
    requests,
    opRows,
    tripRows,
  ] = await Promise.all([
    db.select({ live: count() }).from(trips).where(eq(trips.status, "published")),
    db.select({ c7: count() }).from(clicks).where(gte(clicks.createdAt, since7)),
    db.select({ c30: count() }).from(clicks).where(gte(clicks.createdAt, since30)),
    db.select({ newLeads: count() }).from(leads).where(eq(leads.status, "new")),
    db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(10),
    db
      .select({ lead: leads, tripTitle: trips.title, tripSlug: trips.slug, operatorName: operators.name, operatorEmail: operators.contactEmail })
      .from(leads)
      .innerJoin(trips, eq(leads.tripId, trips.id))
      .innerJoin(operators, eq(trips.operatorId, operators.id))
      .orderBy(desc(leads.createdAt))
      .limit(30),
    db
      .select({ draft: outreachDrafts, operatorName: operators.name })
      .from(outreachDrafts)
      .innerJoin(operators, eq(outreachDrafts.operatorId, operators.id))
      .where(eq(outreachDrafts.status, "draft"))
      .orderBy(desc(outreachDrafts.createdAt)),
    db.select().from(listingRequests).where(eq(listingRequests.handled, false)).orderBy(desc(listingRequests.createdAt)),
    db
      .select({
        op: operators,
        clicks30: sql<number>`(select count(*) from ${clicks} where ${clicks.operatorId} = ${operators.id} and ${clicks.createdAt} >= ${since30})`.mapWith(Number),
        liveTrips: sql<number>`(select count(*) from ${trips} where ${trips.operatorId} = ${operators.id} and ${trips.status} = 'published')`.mapWith(Number),
      })
      .from(operators)
      .orderBy(sql`2 desc`, operators.name)
      .limit(50),
    db
      .select({
        trip: trips,
        operatorName: operators.name,
        clicks30: sql<number>`(select count(*) from ${clicks} where ${clicks.tripId} = ${trips.id} and ${clicks.createdAt} >= ${since30})`.mapWith(Number),
      })
      .from(trips)
      .innerJoin(operators, eq(trips.operatorId, operators.id))
      .where(q ? or(ilike(trips.title, `%${q}%`), ilike(operators.name, `%${q}%`)) : and(eq(trips.status, "published")))
      .orderBy(desc(trips.firstSeenAt))
      .limit(50),
  ]);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">Admin</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Live trips", live],
          ["Clicks (7d)", c7],
          ["Clicks (30d)", c30],
          ["New leads", newLeads],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-court-50 p-4">
            <p className="label">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <Section title="Leads">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className={th}>When</th><th className={th}>Trip</th><th className={th}>From</th><th className={th}>Details</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {leadRows.map(({ lead, tripTitle, tripSlug, operatorName, operatorEmail }) => (
              <tr key={lead.id}>
                <td className={td}>{lead.createdAt.toISOString().slice(0, 10)}</td>
                <td className={td}><a className="text-court-600 underline" href={`/trips/${tripSlug}`}>{tripTitle}</a><br /><span className="text-muted">{operatorName}{operatorEmail ? ` · ${operatorEmail}` : ""}</span></td>
                <td className={td}>{lead.name}<br /><a className="text-court-600" href={`mailto:${lead.email}`}>{lead.email}</a></td>
                <td className={td}>{lead.groupSize ? `${lead.groupSize} players · ` : ""}{lead.preferredDates}<br /><span className="text-muted">{lead.message}</span></td>
                <td className={td}>
                  <form action={setLeadStatus} className="flex gap-1">
                    <input type="hidden" name="id" value={lead.id} />
                    <select name="status" defaultValue={lead.status} className="field !w-auto !py-1">
                      {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <button className="btn-ghost !px-3 !py-1">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`Outreach drafts (${drafts.length})`}>
        <div className="space-y-4">
          {drafts.map(({ draft, operatorName }) => (
            <details key={draft.id} className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-semibold">{operatorName}: {draft.subject}</summary>
              <p className="mt-2 text-sm text-muted">To: {draft.toEmail ?? "no email found, use their contact form"}</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{draft.body}</pre>
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.toEmail && (
                  <a className="btn-primary !py-1.5" href={`mailto:${draft.toEmail}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}>Open in email</a>
                )}
                <form action={setDraftStatus}><input type="hidden" name="id" value={draft.id} /><input type="hidden" name="status" value="sent" /><button className="btn-ghost !py-1.5">Mark sent</button></form>
                <form action={setDraftStatus}><input type="hidden" name="id" value={draft.id} /><input type="hidden" name="status" value="discarded" /><button className="btn-ghost !py-1.5">Discard</button></form>
              </div>
            </details>
          ))}
        </div>
      </Section>

      {requests.length > 0 && (
        <Section title="Listing requests">
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <p className="font-semibold">{r.company} · <a href={r.website} className="text-court-600 underline">{r.website}</a></p>
                <p>{r.contactName} · <a href={`mailto:${r.email}`} className="text-court-600">{r.email}</a></p>
                <p className="mt-1 text-muted">{r.message}</p>
                <form action={markListingRequestHandled} className="mt-2"><input type="hidden" name="id" value={r.id} /><button className="btn-ghost !py-1">Mark handled</button></form>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Agent runs">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className={th}>When</th><th className={th}>Kind / slice</th><th className={th}>Received</th><th className={th}>New</th><th className={th}>Updated</th><th className={th}>Rejected</th><th className={th}>Notes</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td className={td}>{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className={td}>{r.kind}{r.slice ? ` / ${r.slice}` : ""}</td>
                <td className={td}>{r.received}</td>
                <td className={td}>{r.inserted}</td>
                <td className={td}>{r.updated}</td>
                <td className={td} title={r.rejections.map((x) => `${x.title}: ${x.reason}`).join("\n")}>{r.rejected}</td>
                <td className={`${td} max-w-sm text-muted`}>{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Organisers and referral deals">
        <table className="w-full min-w-[900px]">
          <thead><tr><th className={th}>Organiser</th><th className={th}>Clicks 30d</th><th className={th}>Deal</th></tr></thead>
          <tbody>
            {opRows.map(({ op, clicks30, liveTrips }) => (
              <tr key={op.id}>
                <td className={td}><a href={op.website} className="font-semibold text-court-600">{op.name}</a><br /><span className="text-muted">{op.domain} · {liveTrips} live trips</span></td>
                <td className={td}>{clicks30}</td>
                <td className={td}>
                  <form action={updateOperator} className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                    <input type="hidden" name="id" value={op.id} />
                    <select name="partner_status" defaultValue={op.partnerStatus} className="field !py-1">
                      {PARTNER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <input name="affiliate_params" defaultValue={op.affiliateParams ? new URLSearchParams(op.affiliateParams).toString() : ""} placeholder="ref=padelholidays" className="field !py-1" />
                    <input name="commission_note" defaultValue={op.commissionNote ?? ""} placeholder="10% per booking" className="field !py-1" />
                    <input name="contact_email" defaultValue={op.contactEmail ?? ""} placeholder="email" className="field !py-1" />
                    <button className="btn-ghost !py-1">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Trips">
        <form className="mb-4 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search all trips, including hidden ones" className="field max-w-sm" />
          <button className="btn-ghost">Search</button>
        </form>
        <table className="w-full min-w-[960px]">
          <thead><tr><th className={th}>Trip</th><th className={th}>Clicks 30d</th><th className={th}>Status</th><th className={th}>Featured</th><th className={th}>Affiliate URL</th></tr></thead>
          <tbody>
            {tripRows.map(({ trip, operatorName, clicks30 }) => (
              <tr key={trip.id}>
                <td className={td}><a href={`/trips/${trip.slug}`} className="font-semibold text-court-600">{trip.title}</a><br /><span className="text-muted">{operatorName} · {trip.country} · {formatDates(trip)}</span></td>
                <td className={td}>{clicks30}</td>
                <td className={td}>
                  <form action={setTripStatus}>
                    <input type="hidden" name="id" value={trip.id} />
                    <input type="hidden" name="status" value={trip.status === "hidden" ? "published" : "hidden"} />
                    <span className="mr-2">{trip.status}</span>
                    <button className="btn-ghost !px-2 !py-0.5 text-xs">{trip.status === "hidden" ? "Unhide" : "Hide"}</button>
                  </form>
                </td>
                <td className={td}>
                  <form action={featureTrip} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={trip.id} />
                    <span className="mr-1 text-xs">{isFeatured(trip) ? `until ${trip.featuredUntil!.toISOString().slice(0, 10)}` : "no"}</span>
                    <select name="days" defaultValue="30" className="field !w-auto !py-0.5 text-xs">
                      <option value="0">off</option><option value="7">7d</option><option value="30">30d</option><option value="90">90d</option>
                    </select>
                    <button className="btn-ghost !px-2 !py-0.5 text-xs">Set</button>
                  </form>
                </td>
                <td className={td}>
                  <form action={setTripAffiliateUrl} className="flex gap-1">
                    <input type="hidden" name="id" value={trip.id} />
                    <input name="affiliate_url" defaultValue={trip.affiliateUrl ?? ""} placeholder="https://" className="field !py-0.5 text-xs" />
                    <button className="btn-ghost !px-2 !py-0.5 text-xs">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
