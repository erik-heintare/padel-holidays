const displayNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Every ISO 3166-1 alpha-2 code Intl knows a name for, mapped to its English name. */
const CODE_TO_NAME = new Map<string, string>();
for (const a of ALPHA) {
  for (const b of ALPHA) {
    const code = a + b;
    const name = displayNames.of(code);
    // Intl also names a few non-country regions (EU, UN, EZ, QO...); skip them.
    if (name && !["EU", "UN", "EZ", "QO", "XA", "XB", "XK", "ZZ"].includes(code)) {
      CODE_TO_NAME.set(code, name);
    }
  }
}

function key(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const NAME_TO_CODE = new Map<string, string>();
for (const [code, name] of CODE_TO_NAME) NAME_TO_CODE.set(key(name), code);
// Common alternative spellings the agent may produce.
const ALIASES: Record<string, string> = {
  uk: "GB",
  greatbritain: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  usa: "US",
  unitedstatesofamerica: "US",
  uae: "AE",
  espana: "ES",
  holland: "NL",
  turkiye: "TR",
  czechia: "CZ",
  czechrepublic: "CZ",
};
for (const [alias, code] of Object.entries(ALIASES)) NAME_TO_CODE.set(alias, code);

/** Accepts an ISO alpha-2 code or an English country name; returns the ISO code or null. */
export function toCountryCode(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    const code = trimmed.toUpperCase();
    if (code === "UK") return "GB";
    return CODE_TO_NAME.has(code) ? code : null;
  }
  return NAME_TO_CODE.get(key(trimmed)) ?? null;
}

export function countryName(code: string): string {
  return CODE_TO_NAME.get(code.toUpperCase()) ?? code;
}

/** URL slug for a country page, e.g. "ES" -> "spain". */
export function countrySlug(code: string): string {
  return countryName(code)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function countryFromSlug(slug: string): string | null {
  for (const code of CODE_TO_NAME.keys()) {
    if (countrySlug(code) === slug) return code;
  }
  return null;
}

export function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}
