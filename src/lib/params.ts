import type { TripFilters } from "./queries";

type SearchParams = Record<string, string | string[] | undefined>;

const TYPES = ["camp", "holiday", "clinic", "tournament_trip", "retreat"] as const;
const LEVELS = ["beginner", "intermediate", "advanced", "all"] as const;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export function parseFilters(sp: SearchParams): { filters: TripFilters; page: number; raw: Record<string, string | undefined> } {
  const raw = {
    q: one(sp.q),
    country: one(sp.country)?.toUpperCase(),
    type: one(sp.type),
    level: one(sp.level),
    month: one(sp.month),
    maxPrice: one(sp.maxPrice),
  };
  const maxPrice = raw.maxPrice ? Number.parseInt(raw.maxPrice, 10) : undefined;
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  return {
    raw,
    page,
    filters: {
      q: raw.q?.slice(0, 80),
      country: raw.country && /^[A-Z]{2}$/.test(raw.country) ? raw.country : undefined,
      type: TYPES.find((t) => t === raw.type),
      level: LEVELS.find((l) => l === raw.level),
      month: raw.month,
      maxPrice: maxPrice && maxPrice > 0 ? maxPrice : undefined,
    },
  };
}
