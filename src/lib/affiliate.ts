import { site } from "./site";

type OutboundInput = {
  slug: string;
  sourceUrl: string;
  bookingUrl: string | null;
  affiliateUrl: string | null;
  operatorAffiliateParams: Record<string, string> | null;
};

/**
 * The URL a visitor is sent to from /go/[slug].
 * A trip-level affiliate URL wins as-is (networks build their own tracking links).
 * Otherwise we take the booking page (or the source page), add the operator's referral params,
 * and tag it with UTM params so operators can see the traffic we send in their analytics.
 * Params already present on the URL are never overwritten.
 */
export function buildOutboundUrl(input: OutboundInput): string {
  if (input.affiliateUrl) return input.affiliateUrl;
  const url = new URL(input.bookingUrl ?? input.sourceUrl);
  const params: Record<string, string> = {
    ...(input.operatorAffiliateParams ?? {}),
    utm_source: site.utmSource,
    utm_medium: "referral",
    utm_campaign: input.slug,
  };
  for (const [k, v] of Object.entries(params)) {
    if (!url.searchParams.has(k)) url.searchParams.set(k, v);
  }
  return url.toString();
}
