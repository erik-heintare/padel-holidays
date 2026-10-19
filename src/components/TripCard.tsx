import Link from "next/link";
import { countryFlag, countryName } from "@/lib/countries";
import { formatDates, formatPrice, isFeatured, LEVEL_LABELS, TYPE_LABELS } from "@/lib/format";
import type { TripWithOperator } from "@/lib/queries";

export function TripCard({ trip }: { trip: TripWithOperator }) {
  const price = formatPrice(trip.priceFrom, trip.currency);
  const featured = isFeatured(trip);
  const place = [trip.city ?? trip.region, countryName(trip.country)].filter(Boolean).join(", ");
  return (
    <Link
      href={`/trips/${trip.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-lg ${
        featured ? "border-ball-dark ring-2 ring-ball" : "border-slate-200"
      }`}
    >
      <div className="relative aspect-[16/9] bg-gradient-to-br from-court-600 to-court-900">
        {trip.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-5xl" aria-hidden>
            {countryFlag(trip.country)}
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="chip bg-white/95">{TYPE_LABELS[trip.type]}</span>
          {featured && <span className="chip bg-ball text-court-900">Featured</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {countryFlag(trip.country)} {place}
        </p>
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-court-600">{trip.title}</h3>
        <p className="text-sm text-muted">{trip.operator.name}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2 text-sm">
          <div>
            <p className="font-medium">{formatDates(trip)}</p>
            <p className="text-xs text-muted">
              {LEVEL_LABELS[trip.level]}
              {trip.durationNights ? ` · ${trip.durationNights} nights` : ""}
            </p>
          </div>
          {price && (
            <p className="text-right">
              <span className="block text-xs text-muted">from</span>
              <span className="text-base font-bold">{price}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function TripGrid({ trips }: { trips: TripWithOperator[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((t) => (
        <TripCard key={t.id} trip={t} />
      ))}
    </div>
  );
}
