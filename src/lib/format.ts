import type { Trip } from "@/db/schema";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const FULL = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatDates(t: Pick<Trip, "startDate" | "endDate" | "recurring" | "seasonNote">): string {
  if (!t.startDate) return t.seasonNote ?? "Flexible dates";
  const start = new Date(`${t.startDate}T00:00:00Z`);
  if (!t.endDate || t.endDate === t.startDate) return FULL.format(start);
  const end = new Date(`${t.endDate}T00:00:00Z`);
  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    if (start.getUTCMonth() === end.getUTCMonth()) {
      return `${start.getUTCDate()}–${end.getUTCDate()} ${MONTH.format(start)} ${start.getUTCFullYear()}`;
    }
    return `${DAY_MONTH.format(start)} – ${FULL.format(end)}`;
  }
  return `${FULL.format(start)} – ${FULL.format(end)}`;
}

export function formatPrice(amount: number | null, currency: string | null): string | null {
  if (amount == null || !currency) return null;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export const TYPE_LABELS: Record<Trip["type"], string> = {
  camp: "Camp",
  holiday: "Holiday",
  clinic: "Clinic",
  tournament_trip: "Tournament trip",
  retreat: "Retreat",
};

export const LEVEL_LABELS: Record<Trip["level"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all: "All levels",
};

export function isFeatured(t: Pick<Trip, "featuredUntil">): boolean {
  return !!t.featuredUntil && t.featuredUntil.getTime() > Date.now();
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}
