export const site = {
  name: "Padel Holidays",
  tagline: "Every padel camp, clinic and holiday in one place",
  description:
    "Find padel camps, coaching holidays, clinics and tournament trips across Europe and beyond. Updated every day, with prices, dates and levels side by side.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  utmSource: "padelholidays",
};
