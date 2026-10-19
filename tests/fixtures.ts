/** A well-formed agent record. Tests override single fields to probe each rule. */
export function sampleTrip(overrides: Record<string, unknown> = {}) {
  return {
    operator: { name: "Sol Padel Camps", website: "https://www.solpadel.example/" },
    title: "Marbella Padel Week",
    type: "camp",
    level: "intermediate",
    country: "Spain",
    city: "Marbella",
    start_date: "2027-03-01",
    end_date: "2027-03-08",
    price_from: 1195.5,
    currency: "eur",
    includes: ["15 hours coaching", "Hotel, 7 nights"],
    description: "A week of padel coaching on the Costa del Sol with daily drills, match play and video analysis.",
    source_url: "https://www.solpadel.example/camps/marbella-march",
    ...overrides,
  };
}
