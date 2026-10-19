import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AjaxForm } from "@/components/AjaxForm";
import { TripGrid } from "@/components/TripCard";
import { countryFlag, countryName, countrySlug } from "@/lib/countries";
import { formatDates, formatPrice, isFeatured, LEVEL_LABELS, TYPE_LABELS } from "@/lib/format";
import { getTrip, listTrips } from "@/lib/queries";
import { site } from "@/lib/site";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trip = await getTrip((await params).slug);
  if (!trip) return {};
  const where = [trip.city, countryName(trip.country)].filter(Boolean).join(", ");
  return {
    title: `${trip.title}, ${where}`,
    description: `${TYPE_LABELS[trip.type]} by ${trip.operator.name} in ${where}. ${formatDates(trip)}. ${trip.description.slice(0, 120)}`,
    alternates: { canonical: `/trips/${trip.slug}` },
    robots: trip.status === "published" ? undefined : { index: false },
    openGraph: trip.imageUrl ? { images: [trip.imageUrl] } : undefined,
  };
}

export default async function TripPage({ params }: Props) {
  const trip = await getTrip((await params).slug);
  if (!trip || trip.status === "hidden") notFound();

  const price = formatPrice(trip.priceFrom, trip.currency);
  const available = trip.status === "published";
  const related = (await listTrips({ country: trip.country })).trips.filter((t) => t.id !== trip.id).slice(0, 3);
  const place = [trip.venue, trip.city, trip.region, countryName(trip.country)].filter(Boolean).join(", ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": trip.startDate ? "Event" : "TouristTrip",
    name: trip.title,
    description: trip.description,
    url: `${site.url}/trips/${trip.slug}`,
    image: trip.imageUrl ?? undefined,
    ...(trip.startDate && {
      startDate: trip.startDate,
      endDate: trip.endDate ?? trip.startDate,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: trip.venue ?? trip.city ?? countryName(trip.country),
        address: { "@type": "PostalAddress", addressLocality: trip.city ?? undefined, addressCountry: trip.country },
      },
    }),
    organizer: { "@type": "Organization", name: trip.operator.name, url: trip.operator.website },
    ...(trip.priceFrom &&
      trip.currency && {
        offers: { "@type": "Offer", price: trip.priceFrom, priceCurrency: trip.currency, url: `${site.url}/go/${trip.slug}` },
      }),
  };

  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="text-sm text-muted">
        <Link href="/trips" className="hover:text-ink">Trips</Link> /{" "}
        <Link href={`/destinations/${countrySlug(trip.country)}`} className="hover:text-ink">{countryName(trip.country)}</Link>
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_360px]">
        <article>
          <div className="flex flex-wrap gap-2">
            <span className="chip">{TYPE_LABELS[trip.type]}</span>
            <span className="chip">{LEVEL_LABELS[trip.level]}</span>
            {isFeatured(trip) && <span className="chip bg-ball text-court-900">Featured</span>}
            {!available && <span className="chip bg-red-50 text-red-700">No longer available</span>}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{trip.title}</h1>
          <p className="mt-2 text-muted">
            {countryFlag(trip.country)} {place} · by{" "}
            <Link href={`/operators/${trip.operator.slug}`} className="font-medium text-court-600 hover:underline">{trip.operator.name}</Link>
          </p>

          {trip.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trip.imageUrl} alt={trip.title} className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover" />
          )}

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-4">
            <div><dt className="label">Dates</dt><dd className="font-semibold">{formatDates(trip)}</dd></div>
            <div><dt className="label">Length</dt><dd className="font-semibold">{trip.durationNights ? `${trip.durationNights} nights` : "See organiser"}</dd></div>
            <div><dt className="label">Level</dt><dd className="font-semibold">{LEVEL_LABELS[trip.level]}</dd></div>
            <div><dt className="label">Price from</dt><dd className="font-semibold">{price ?? "On request"}</dd></div>
          </dl>

          <div className="mt-8 space-y-4 leading-relaxed text-slate-700">
            {trip.description.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {trip.includes.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">What&apos;s included</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {trip.includes.map((item) => (
                  <li key={item} className="flex gap-2 text-sm"><span className="text-ball-dark">✓</span>{item}</li>
                ))}
              </ul>
            </section>
          )}
          {trip.coaches && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">Coaches</h2>
              <p className="mt-2 text-sm text-slate-700">{trip.coaches}</p>
            </section>
          )}
          <p className="mt-8 text-xs text-muted">
            Details collected from <a href={trip.sourceUrl} rel="nofollow noopener" target="_blank" className="underline">{trip.operator.domain}</a>
            {" "}and last checked {trip.lastVerifiedAt.toISOString().slice(0, 10)}. Always confirm details with the organiser before booking.
          </p>
        </article>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-slate-200 p-5 shadow-sm">
            {price && <p className="text-sm text-muted">from <span className="text-2xl font-bold text-ink">{price}</span></p>}
            <p className="mt-1 text-sm">{formatDates(trip)}</p>
            {available ? (
              <a href={`/go/${trip.slug}`} rel="sponsored nofollow" target="_blank" className="btn-ball mt-4 w-full">
                Check availability on {trip.operator.domain}
              </a>
            ) : (
              <Link href={`/trips?country=${trip.country}`} className="btn-primary mt-4 w-full">See similar trips</Link>
            )}
            <p className="mt-2 text-center text-xs text-muted">You book directly with {trip.operator.name}.</p>
          </div>

          {available && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold">Questions? Ask us</h2>
              <p className="mt-1 text-sm text-muted">Tell us your group and dates and we&apos;ll get answers from the organiser for you.</p>
              <AjaxForm
                action="/api/leads"
                submitLabel="Send enquiry"
                className="mt-4 space-y-3"
                success={<p>Thanks! We&apos;ve got your enquiry and will be in touch by email shortly.</p>}
              >
                <input type="hidden" name="trip_slug" value={trip.slug} />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required className="field" /></div>
                <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label" htmlFor="group_size">Players</label><input id="group_size" name="group_size" type="number" min={1} className="field" /></div>
                  <div><label className="label" htmlFor="preferred_dates">Dates</label><input id="preferred_dates" name="preferred_dates" className="field" /></div>
                </div>
                <div><label className="label" htmlFor="message">Message</label><textarea id="message" name="message" rows={3} className="field" /></div>
              </AjaxForm>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold">More padel trips in {countryName(trip.country)}</h2>
          <div className="mt-6"><TripGrid trips={related} /></div>
        </section>
      )}
    </div>
  );
}
