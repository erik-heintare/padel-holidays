import type { MetadataRoute } from "next";
import { countrySlug } from "@/lib/countries";
import { countriesWithTrips, operatorsWithTrips, sitemapEntries } from "@/lib/queries";
import { site } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [trips, countries, ops] = await Promise.all([sitemapEntries(), countriesWithTrips(), operatorsWithTrips()]);
  return [
    { url: `${site.url}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/trips`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/destinations`, changeFrequency: "weekly" },
    ...countries.map((c) => ({ url: `${site.url}/destinations/${countrySlug(c.country)}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...ops.map((o) => ({ url: `${site.url}/operators/${o.slug}`, changeFrequency: "weekly" as const })),
    ...trips.map((t) => ({ url: `${site.url}/trips/${t.slug}`, lastModified: t.updatedAt, priority: 0.7 })),
  ];
}
