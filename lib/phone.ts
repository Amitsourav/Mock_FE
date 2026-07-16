export type Country = {
  /** ISO 3166-1 alpha-2 — used as the option key, since dial codes are not unique (US/CA share +1). */
  iso: string;
  name: string;
  dial: string;
  flag: string;
  /** Expected national-number length(s), for a friendlier error than a bare regex reject. */
  nsnLengths: number[];
};

/**
 * A curated list, India first. Deliberately short rather than all ~240 ISO
 * countries: these cover the expected applicant base. Add entries here if the
 * intake widens — nothing else needs to change.
 */
export const COUNTRIES: Country[] = [
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳", nsnLengths: [10] },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪", nsnLengths: [10, 11] },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸", nsnLengths: [10] },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧", nsnLengths: [10] },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪", nsnLengths: [9] },
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬", nsnLengths: [8] },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺", nsnLengths: [9] },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", nsnLengths: [10] },
  { iso: "NP", name: "Nepal", dial: "+977", flag: "🇳🇵", nsnLengths: [10] },
  { iso: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰", nsnLengths: [9] },
  { iso: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩", nsnLengths: [10] },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function findCountry(iso: string): Country {
  return COUNTRIES.find((c) => c.iso === iso) ?? DEFAULT_COUNTRY;
}

/** Strip everything but digits — users paste spaces, dashes and brackets. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function toE164(country: Country, national: string): string {
  return `${country.dial}${digitsOnly(national)}`;
}

/**
 * Validates the national number against the country's expected length, then
 * against the E.164 shape overall. Returns null when valid, else a message
 * safe to show the user.
 */
export function validatePhone(country: Country, national: string): string | null {
  const digits = digitsOnly(national);
  if (!digits) return "Enter your mobile number.";

  if (country.iso === "IN" && digits.length === 10 && !/^[6-9]/.test(digits)) {
    return "Indian mobile numbers start with 6, 7, 8 or 9.";
  }

  if (!country.nsnLengths.includes(digits.length)) {
    const expected = country.nsnLengths.join(" or ");
    return `${country.name} numbers are ${expected} digits. You entered ${digits.length}.`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(toE164(country, digits))) {
    return "That doesn't look like a valid mobile number.";
  }

  return null;
}

/** Group digits for readability in the input: "98765 43210" for IN, 3-3-4 elsewhere. */
export function formatNational(country: Country, national: string): string {
  const digits = digitsOnly(national);
  if (country.iso === "IN") {
    return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5, 10)}` : digits;
  }
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean);
  return parts.join(" ");
}

/**
 * Longest dial code first, so "+91…" matches India before the "+1" of the US.
 * Derived from COUNTRIES so adding a country needs no change here.
 */
const BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

/** Split an E.164 (or the backend's "+"-less form) back into country + national digits. */
export function parseE164(raw: string): { iso: string; national: string } | undefined {
  const digits = digitsOnly(raw);
  const country = BY_DIAL_LENGTH.find((c) => digits.startsWith(c.dial.slice(1)));
  if (!country) return undefined;
  return { iso: country.iso, national: digits.slice(country.dial.length - 1) };
}

/**
 * The backend returns the phone without a "+" ("917004428198"). Re-add it and
 * space it so the read-only display matches what the user typed.
 */
export function formatE164ForDisplay(raw: string): string {
  const parsed = parseE164(raw);
  if (!parsed) return `+${digitsOnly(raw)}`;
  const country = findCountry(parsed.iso);
  return `${country.dial} ${formatNational(country, parsed.national)}`.trim();
}
