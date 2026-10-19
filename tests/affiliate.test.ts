import { describe, expect, it } from "vitest";
import { buildOutboundUrl } from "@/lib/affiliate";

const base = { slug: "marbella-week", sourceUrl: "https://op.example/camp", bookingUrl: null, affiliateUrl: null, operatorAffiliateParams: null };

describe("buildOutboundUrl", () => {
  it("adds UTM params to the source URL", () => {
    const url = new URL(buildOutboundUrl(base));
    expect(url.origin + url.pathname).toBe("https://op.example/camp");
    expect(url.searchParams.get("utm_source")).toBe("padelholidays");
    expect(url.searchParams.get("utm_medium")).toBe("referral");
    expect(url.searchParams.get("utm_campaign")).toBe("marbella-week");
  });

  it("prefers the booking URL and adds operator referral params", () => {
    const url = new URL(buildOutboundUrl({ ...base, bookingUrl: "https://op.example/book?x=1", operatorAffiliateParams: { ref: "ph" } }));
    expect(url.pathname).toBe("/book");
    expect(url.searchParams.get("x")).toBe("1");
    expect(url.searchParams.get("ref")).toBe("ph");
  });

  it("never overwrites params already on the URL", () => {
    const url = new URL(buildOutboundUrl({ ...base, sourceUrl: "https://op.example/c?utm_source=theirs" }));
    expect(url.searchParams.get("utm_source")).toBe("theirs");
  });

  it("uses a trip-level affiliate URL verbatim", () => {
    expect(buildOutboundUrl({ ...base, affiliateUrl: "https://network.example/t?id=9" })).toBe("https://network.example/t?id=9");
  });
});
