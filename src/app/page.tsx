import Link from "next/link";
import { TripFilters } from "@/components/TripFilters";
import { TripGrid } from "@/components/TripCard";
import { countryFlag, countryName, countrySlug } from "@/lib/countries";
import { countriesWithTrips, featuredTrips, listTrips } from "@/lib/queries";
import { site } from "@/lib/site";

export const revalidate = 600;

export default async function Home() {
  const [featured, upcoming, countries] = await Promise.all([featuredTrips(3), listTrips({}), countriesWithTrips()]);
  const totalTrips = countries.reduce((n, c) => n + c.trips, 0);

  return (
    <>
      <section className="relative overflow-hidden bg-court-900 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(90deg,transparent_49.5%,white_49.5%,white_50.5%,transparent_50.5%),linear-gradient(transparent_29.5%,white_29.5%,white_30.5%,transparent_30.5%,transparent_69.5%,white_69.5%,white_70.5%,transparent_70.5%)]" />
        <div className="container-page relative py-16 sm:py-24">
          <p className="chip bg-ball text-court-900">Updated daily</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">{site.tagline}</h1>
          <p className="mt-4 max-w-2xl text-lg text-court-100">
            {totalTrips > 0
              ? `${totalTrips} upcoming padel camps, clinics and holidays in ${countries.length} countries, compared side by side.`
              : "Padel camps, clinics and holidays from organisers worldwide, compared side by side."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/trips" className="btn-ball">Browse all trips</Link>
            <Link href="/destinations" className="btn border border-white/40 text-white hover:bg-white/10">Explore destinations</Link>
          </div>
        </div>
      </section>

      <div className="container-page -mt-8 relative z-10">
        <TripFilters countries={countries} values={{}} />
      </div>

      {featured.length > 0 && (
        <section className="container-page mt-14">
          <h2 className="text-2xl font-bold">Featured trips</h2>
          <div className="mt-6"><TripGrid trips={featured} /></div>
        </section>
      )}

      <section className="container-page mt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold">Coming up next</h2>
          <Link href="/trips" className="text-sm font-semibold text-court-600 hover:underline">See all</Link>
        </div>
        <div className="mt-6">
          {upcoming.trips.length > 0 ? (
            <TripGrid trips={upcoming.trips.slice(0, 9)} />
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-muted">
              Our scout is out searching for trips. Check back soon.
            </p>
          )}
        </div>
      </section>

      {countries.length > 0 && (
        <section className="container-page mt-14">
          <h2 className="text-2xl font-bold">Popular destinations</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {countries.slice(0, 12).map((c) => (
              <Link
                key={c.country}
                href={`/destinations/${countrySlug(c.country)}`}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-court-500 hover:shadow"
              >
                <span className="text-2xl" aria-hidden>{countryFlag(c.country)}</span>
                <p className="mt-1 font-semibold">{countryName(c.country)}</p>
                <p className="text-xs text-muted">{c.trips} {c.trips === 1 ? "trip" : "trips"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-page mt-16 grid gap-6 sm:grid-cols-3">
        {[
          ["We search every day", "Our research agent checks organiser websites daily and adds new camps the moment they're published."],
          ["Compare in one place", "Dates, levels, prices and what's included, side by side, across countries and organisers."],
          ["Book direct", "You book on the organiser's own site, at their price. Nothing is marked up."],
        ].map(([title, text]) => (
          <div key={title} className="rounded-2xl bg-court-50 p-6">
            <h3 className="font-semibold text-court-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
