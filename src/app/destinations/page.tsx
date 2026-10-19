import type { Metadata } from "next";
import Link from "next/link";
import { countryFlag, countryName, countrySlug } from "@/lib/countries";
import { countriesWithTrips } from "@/lib/queries";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Padel holiday destinations",
  description: "Padel camps and holidays by country: Spain, Portugal, Sweden, the UAE and more.",
};

export default async function DestinationsPage() {
  const countries = await countriesWithTrips();
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">Destinations</h1>
      <p className="mt-1 text-muted">Where you can play padel on holiday right now.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {countries.map((c) => (
          <Link key={c.country} href={`/destinations/${countrySlug(c.country)}`} className="rounded-xl border border-slate-200 p-5 transition hover:border-court-500 hover:shadow">
            <span className="text-3xl" aria-hidden>{countryFlag(c.country)}</span>
            <p className="mt-2 font-semibold">{countryName(c.country)}</p>
            <p className="text-sm text-muted">{c.trips} upcoming {c.trips === 1 ? "trip" : "trips"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
