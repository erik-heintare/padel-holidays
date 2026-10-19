import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripFilters } from "@/components/TripFilters";
import { TripGrid } from "@/components/TripCard";
import { countryFromSlug, countryName } from "@/lib/countries";
import { countriesWithTrips, listTrips } from "@/lib/queries";

export const revalidate = 3600;

type Props = { params: Promise<{ country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = countryFromSlug((await params).country);
  if (!code) return {};
  const name = countryName(code);
  return {
    title: `Padel holidays and camps in ${name}`,
    description: `Compare upcoming padel camps, clinics and holidays in ${name}: dates, levels, prices and what's included.`,
    alternates: { canonical: `/destinations/${(await params).country}` },
  };
}

export default async function CountryPage({ params }: Props) {
  const code = countryFromSlug((await params).country);
  if (!code) notFound();
  const [result, countries] = await Promise.all([listTrips({ country: code }), countriesWithTrips()]);
  const name = countryName(code);
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">Padel holidays in {name}</h1>
      <p className="mt-1 text-muted">{result.total} upcoming camps, clinics and holidays</p>
      <div className="mt-6"><TripFilters countries={countries} values={{ country: code }} /></div>
      <div className="mt-8">
        {result.trips.length > 0 ? (
          <TripGrid trips={result.trips} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-muted">No upcoming trips in {name} right now.</p>
        )}
      </div>
    </div>
  );
}
