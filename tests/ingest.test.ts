import { describe, expect, it } from "vitest";
import { computeDedupeKey, validateTrip } from "@/lib/ingest";
import { sampleTrip } from "./fixtures";

const TODAY = "2026-10-19";

describe("validateTrip", () => {
  it("normalizes a valid record", () => {
    const r = validateTrip(sampleTrip(), TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.trip.country).toBe("ES");
    expect(r.trip.currency).toBe("EUR");
    expect(r.trip.priceFrom).toBe(1196);
    expect(r.trip.durationNights).toBe(7);
    expect(r.trip.level).toBe("intermediate");
    expect(r.trip.operator.domain).toBe("solpadel.example");
  });

  it.each([
    [{ start_date: "2026-01-01", end_date: "2026-01-05" }, "start_date is in the past"],
    [{ start_date: "2029-06-01", end_date: null }, "more than two years"],
    [{ end_date: "2027-02-01" }, "end_date before start_date"],
    [{ start_date: null, end_date: null }, "needs start_date"],
    [{ start_date: null, end_date: null, recurring: true }, "season_note"],
    [{ country: "Atlantis" }, "unknown country"],
    [{ currency: null }, "needs a currency"],
    [{ title: "Marbella Tennis Week", description: "A week of tennis coaching on the Costa del Sol with daily drills and match play." }, "not a padel trip"],
    [{ source_url: "ftp://solpadel.example/x" }, "source_url"],
    [{ type: "cruise" }, "type"],
  ])("rejects %o", (overrides, reason) => {
    const r = validateTrip(sampleTrip(overrides), TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain(reason);
  });

  it("accepts recurring trips with a season note and no dates", () => {
    const r = validateTrip(
      sampleTrip({ start_date: null, end_date: null, recurring: true, season_note: "Any week, April to October" }),
      TODAY,
    );
    expect(r.ok).toBe(true);
  });

  it("accepts the Spanish spelling pádel", () => {
    const r = validateTrip(
      sampleTrip({ title: "Semana de pádel en Marbella", description: "Una semana de pádel con entrenadores profesionales, partidos y análisis de vídeo." }),
      TODAY,
    );
    expect(r.ok).toBe(true);
  });
});

describe("computeDedupeKey", () => {
  it("ignores case, accents and punctuation in titles", () => {
    expect(computeDedupeKey("a.com", "Pádel Week: Marbella!", "2027-03-01")).toBe(
      computeDedupeKey("a.com", "padel week marbella", "2027-03-01"),
    );
  });
  it("separates different dates and operators", () => {
    const base = computeDedupeKey("a.com", "Padel Week", "2027-03-01");
    expect(computeDedupeKey("a.com", "Padel Week", "2027-03-08")).not.toBe(base);
    expect(computeDedupeKey("b.com", "Padel Week", "2027-03-01")).not.toBe(base);
  });
});
