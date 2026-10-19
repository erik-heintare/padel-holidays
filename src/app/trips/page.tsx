import type { Metadata } from "next";
import Link from "next/link";
import { TripFilters } from "@/components/TripFilters";
import { TripGrid } from "@/components/TripCard";
import { parseFilters } from "@/lib/params";
import { countriesWithTrips, listTrips } from "@/lib/queries";

export const metadata: Metadata = {
  title: "All padel trips",
  description: "Every upcoming padel camp, clinic, holiday and tournament trip we know about, filterable by country, month, level and price.",
  alternates: { canonical: "/trips" },
};

export default async function TripsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { filters, page, raw } = parseFilters(await searchParams);
  const [result, countries] = await Promise.all([listTrips(filters, page), countriesWithTrips()]);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pageHref = (p: number) => {
    const qs = new URLSearchParams(Object.entries({ ...raw, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/trips?${qs}`;
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">Padel trips</h1>
      <p className="mt-1 text-muted">{result.total} trips match</p>
      <div className="mt-6"><TripFilters countries={countries} values={raw} /></div>
      <div className="mt-8">
        {result.trips.length > 0 ? (
          <TripGrid trips={result.trips} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-muted">
            No trips match those filters yet. Try widening your search.
          </p>
        )}
      </div>
      {pages > 1 && (
        <nav className="mt-8 flex justify-center gap-2" aria-label="Pagination">
          {page > 1 && <Link className="btn-ghost" href={pageHref(page - 1)}>Previous</Link>}
          <span className="btn text-muted">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-ghost" href={pageHref(page + 1)}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
