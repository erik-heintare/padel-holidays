import { countryName } from "@/lib/countries";
import { LEVEL_LABELS, TYPE_LABELS } from "@/lib/format";

type Props = {
  countries: { country: string; trips: number }[];
  values: Record<string, string | undefined>;
  action?: string;
};

function nextMonths(n: number): { value: string; label: string }[] {
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    return { value: d.toISOString().slice(0, 7), label: fmt.format(d) };
  });
}

/** Plain GET form: filters live in the URL, so every filtered view is shareable and crawlable. */
export function TripFilters({ countries, values, action = "/trips" }: Props) {
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
      <div className="sm:col-span-3 lg:col-span-2">
        <label className="label" htmlFor="q">Search</label>
        <input id="q" name="q" defaultValue={values.q} placeholder="Marbella, junior camp, organiser…" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="country">Country</label>
        <select id="country" name="country" defaultValue={values.country ?? ""} className="field">
          <option value="">Anywhere</option>
          {countries.map((c) => (
            <option key={c.country} value={c.country}>
              {countryName(c.country)} ({c.trips})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="month">When</label>
        <select id="month" name="month" defaultValue={values.month ?? ""} className="field">
          <option value="">Any time</option>
          {nextMonths(12).map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="type">Type</label>
        <select id="type" name="type" defaultValue={values.type ?? ""} className="field">
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="level">Level</label>
        <select id="level" name="level" defaultValue={values.level ?? ""} className="field">
          <option value="">Any level</option>
          {Object.entries(LEVEL_LABELS)
            .filter(([v]) => v !== "all")
            .map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
        </select>
      </div>
      <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-6 lg:justify-end">
        <div className="flex-1 lg:max-w-40">
          <label className="label" htmlFor="maxPrice">Max price</label>
          <input id="maxPrice" name="maxPrice" type="number" min={0} step={50} defaultValue={values.maxPrice} placeholder="Any" className="field" />
        </div>
        <button type="submit" className="btn-primary">Search trips</button>
      </div>
    </form>
  );
}
