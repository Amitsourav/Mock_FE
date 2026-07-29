"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  Loader2,
  Pencil,
  Plane,
  Search,
  Star,
} from "lucide-react";
import { Tile } from "@/components/app/dashboard/DashboardView";
import { useCountUp } from "@/components/app/dashboard/useCountUp";
import { Skeleton } from "@/components/app/Skeleton";
import {
  ApiError,
  getCollegePredictions,
  getTargetPrograms,
  saveAcademics,
  saveAnabinInstitution,
  searchAnabinInstitutions,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AnabinInstitution,
  CollegePrediction,
  CollegeReadiness,
  DmatField,
  PredictionEligibility,
  TargetProgram,
  TargetProgramsOut,
} from "@/lib/types";

/** Ticket data fields set in a document face — the pass reads printed, not webby. */
const MONO =
  'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/* --------------------------------------------------------------------------
   Readiness bands — colour + label per the contract. Never a guarantee: the
   backend returns honest bands, the UI renders honest language.
-------------------------------------------------------------------------- */
const READINESS: Record<CollegeReadiness, { label: string; color: string }> = {
  strong: { label: "Strong", color: "var(--success)" },
  target: { label: "Target", color: "var(--brand)" },
  reach: { label: "Reach", color: "var(--mastery-developing)" },
  low: { label: "Low", color: "var(--et-careless)" },
  eligibility_risk: { label: "Eligibility risk", color: "var(--error)" },
  unknown: { label: "Pending", color: "var(--ink-secondary)" },
};

/** The three UG fields that trigger the dMAT requirement. */
const FIELD_OPTIONS: { value: DmatField; label: string }[] = [
  { value: "engineering", label: "Engineering" },
  { value: "commerce_finance_economics", label: "Commerce / Accounting / Finance / Economics" },
  { value: "business_management", label: "Business / Management" },
];

/**
 * Long institute names → the abbreviation students actually use, so the ticket
 * field stays one line ("Indian Institute of Information Technology, Bhagalpur"
 * → "IIIT Bhagalpur"). Unmatched names pass through and truncate instead.
 * Order matters: longer patterns (IIIT, IISER) before their prefixes (IIT, IISc).
 */
const INSTITUTE_ABBREVIATIONS: [RegExp, string][] = [
  [/^Indian Institute of Information Technology[,\s]*/i, "IIIT "],
  [/^Indian Institute of Science Education and Research[,\s]*/i, "IISER "],
  [/^Indian Institute of Technology[,\s]*/i, "IIT "],
  [/^Indian Institute of Management[,\s]*/i, "IIM "],
  [/^Indian Institute of Science[,\s]*/i, "IISc "],
  [/^National Institute of Technology[,\s]*/i, "NIT "],
  [/^Birla Institute of Technology and Science[,\s]*/i, "BITS "],
];

function shortInstitutionName(name: string): string {
  for (const [pattern, abbr] of INSTITUTE_ABBREVIATIONS) {
    if (pattern.test(name)) return (abbr + name.replace(pattern, "")).trim();
  }
  return name;
}

/* --------------------------------------------------------------------------
   Arrivals manifest helpers — the programme list is scraped upstream, so
   strings arrive with HTML-entity débris (&nbsp;, &amp;) and no grouping.
-------------------------------------------------------------------------- */

/** Scrub scraped text: entity débris → spaces, collapse runs, tidy spacing. */
function cleanScraped(s: string): string {
  return s
    .replace(/&nbsp;| /gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!;:])/g, "$1")
    .trim();
}

/** "English" → EN, "German" → DE: route-code chips like a departures board. */
function langCode(l: string): string {
  const t = l.toLowerCase();
  if (t.startsWith("eng")) return "EN";
  if (t.startsWith("ger") || t.startsWith("deu")) return "DE";
  return l.slice(0, 2).toUpperCase();
}

/** Two significant initials for the university monogram tile. */
function monogram(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-ZÄÖÜ]/.test(w));
  return ((words[0]?.[0] ?? name[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

/** Airport-style city code: "Aalen" → AAL. */
function cityCode(city: string): string {
  return city.replace(/[^A-Za-zÄÖÜäöü]/g, "").slice(0, 3).toUpperCase();
}

/** Programmes grouped by university, preserving the backend's order. */
function groupByUniversity(programs: TargetProgram[]): [string, TargetProgram[]][] {
  const groups = new Map<string, TargetProgram[]>();
  for (const p of programs) {
    const list = groups.get(p.university);
    if (list) list.push(p);
    else groups.set(p.university, [p]);
  }
  return Array.from(groups.entries());
}

/* --------------------------------------------------------------------------
   Application-list tiers. The bucket comes from the backend (`tier`) with
   eligibility already baked in — the FE only groups and labels. Honesty
   contract: qualitative subtitles only, never percentages or invented odds.
-------------------------------------------------------------------------- */

type Tier = "reach" | "target" | "safe";

/** null/undefined tiers read as "target" (Moderate) until backend data lands. */
function tierOf(p: TargetProgram): Tier {
  return p.tier === "safe" || p.tier === "reach" ? p.tier : "target";
}

const TIER_SECTIONS: { key: Tier; title: string; subtitle: string; color: string }[] = [
  {
    key: "reach",
    title: "Aim",
    subtitle: "Selective — competitive, worth a shot",
    color: "var(--mastery-developing)",
  },
  { key: "target", title: "Moderate", subtitle: "Realistic — apply", color: "var(--brand)" },
  {
    key: "safe",
    title: "Fallback",
    subtitle: "Admitted if you meet the requirements",
    color: "var(--success)",
  },
];

/* --------------------------------------------------------------------------
   The results reveal (zone 03) — this is the payoff after check-in: how many
   doors the student's profile opens, and each university as an admission
   offer they can explore and shortlist.
-------------------------------------------------------------------------- */

function ResultStat({ value, label }: { value: number; label: string }) {
  const shown = Math.round(useCountUp(value, 900));
  return (
    <div className="text-center">
      <p
        className="font-display text-[30px] font-semibold leading-none tracking-[-0.02em] text-ink sm:text-[34px]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {shown}
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-secondary">
        {label}
      </p>
    </div>
  );
}

/** The headline band: your profile is in — this is what it unlocks. */
function ResultsBand({
  totalPrograms,
  totalUniversities,
  shortlisted,
  fieldLabel,
  eligibility,
}: {
  totalPrograms: number;
  totalUniversities: number;
  shortlisted: number;
  fieldLabel: string | null;
  eligibility: PredictionEligibility | null;
}) {
  return (
    <div className="glass-tile relative overflow-hidden rounded-[18px] p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand-fill/[0.09] blur-[60px]"
      />
      <div className="relative flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="min-w-[220px] flex-1">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-secondary"
            style={{ fontFamily: MONO }}
          >
            Your results
          </p>
          <h3 className="mt-1.5 font-display text-[21px] font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-[24px]">
            These doors are open to you.
          </h3>
          <p className="mt-1.5 max-w-[48ch] text-[13px] leading-relaxed text-ink-secondary">
            {eligibility?.recognized
              ? `Your degree is recognized (${eligibility.status}) — every university below accepts applications from your profile`
              : "Public, tuition-free programmes matched to your profile"}
            {fieldLabel ? ` in ${fieldLabel}` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-7 sm:gap-9">
          <ResultStat value={totalUniversities} label="Universities" />
          <ResultStat value={totalPrograms} label="Programmes" />
          <div className="text-center">
            <p
              className="flex items-center justify-center gap-1 font-display text-[30px] font-semibold leading-none tracking-[-0.02em] sm:text-[34px]"
              style={{ fontVariantNumeric: "tabular-nums", color: "var(--et-careless)" }}
            >
              <Star className="size-5 fill-current" strokeWidth={0} aria-hidden="true" />
              {shortlisted}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-secondary">
              Shortlisted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One university as an admission offer: header always visible, programmes
 *  fold out on demand — 500+ programmes stay light because rows only render
 *  for opened offers. */
function UniversityOfferCard({
  university,
  programs,
  shortlisted,
  onToggleShortlist,
  defaultOpen = false,
}: {
  university: string;
  programs: TargetProgram[];
  shortlisted: boolean;
  onToggleShortlist: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const city = programs[0]?.city ?? null;
  const openCount = programs.filter((p) => p.admission_mode === "open").length;
  const english = programs.some((p) => p.languages.some((l) => langCode(l) === "EN"));

  return (
    <section
      aria-label={university}
      className={cn(
        "glass-tile overflow-hidden rounded-[16px] transition-shadow",
        shortlisted && "ring-1 ring-[color:var(--et-careless)]/60"
      )}
    >
      {/* Offer header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-surface-field font-display text-[15px] font-bold text-ink"
          >
            {monogram(university)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-semibold text-ink">
              {university}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-secondary">
              {city ? <span>{city}</span> : null}
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {programs.length} {programs.length === 1 ? "programme" : "programmes"}
              </span>
              {openCount > 0 ? (
                <span className="font-semibold" style={{ color: "var(--success)" }}>
                  {openCount} open admission
                </span>
              ) : null}
              {english ? <span className="font-semibold text-brand">English</span> : null}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-ink-secondary transition-transform duration-300",
              open && "rotate-180"
            )}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={onToggleShortlist}
          aria-pressed={shortlisted}
          aria-label={shortlisted ? `Remove ${university} from shortlist` : `Shortlist ${university}`}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full border transition-colors",
            shortlisted
              ? "border-transparent bg-[color:var(--et-careless)]/12 text-[color:var(--et-careless)]"
              : "border-hairline text-ink-secondary hover:border-[color:var(--et-careless)]/50 hover:text-[color:var(--et-careless)]"
          )}
        >
          <Star className={cn("size-4", shortlisted && "fill-current")} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Programme fold-out */}
      {open ? (
        <ul className="border-t border-hairline">
          {programs.map((p) => {
            const deadline = p.application_deadline ? cleanScraped(p.application_deadline) : null;
            const inner = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium leading-snug text-ink">
                    {cleanScraped(p.name)}
                  </p>
                  {deadline ? (
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-secondary" title={deadline}>
                      {deadline}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {p.admission_mode ? (
                    <span
                      className="hidden rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold sm:inline"
                      style={{
                        color: p.admission_mode === "open" ? "var(--success)" : "var(--brand)",
                        backgroundColor: `color-mix(in srgb, ${
                          p.admission_mode === "open" ? "var(--success)" : "var(--brand)"
                        } 12%, transparent)`,
                      }}
                    >
                      {p.admission_mode === "open" ? "Open" : "Selective"}
                    </span>
                  ) : null}
                  {p.languages.map((l) => (
                    <span
                      key={l}
                      title={l}
                      className={cn(
                        "rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em]",
                        langCode(l) === "EN"
                          ? "bg-brand/10 text-brand"
                          : "bg-surface-field text-ink-secondary"
                      )}
                    >
                      {langCode(l)}
                    </span>
                  ))}
                  {p.link ? (
                    <ExternalLink
                      className="ml-0.5 size-3.5 text-ink-secondary transition-colors group-hover:text-brand"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              </>
            );
            return (
              <li key={`${p.name}-${p.link ?? ""}`} className="border-t border-hairline first:border-t-0">
                {p.link ? (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${cleanScraped(p.name)} — view programme`}
                    className="group flex items-center gap-3 px-4 py-2.5 pl-[68px] transition-colors hover:bg-surface-field/70"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 pl-[68px]">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

/** Anabin status → badge treatment. */
function statusBadge(status: string): { label: string; color: string } {
  if (status === "H+") return { label: "Recognized ✓", color: "var(--success)" };
  if (status === "H-") return { label: "Not recognized", color: "var(--error)" };
  return { label: "Case-by-case", color: "var(--mastery-developing)" };
}

function BadgePill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Terminal wayfinding: overhead signs, the journey strip, document slots      */
/* -------------------------------------------------------------------------- */

/** An airport overhead sign heading each zone: number, name, status light. */
function Sign({
  no,
  eyebrow,
  title,
  done,
}: {
  no: string;
  eyebrow: string;
  title: string;
  done: boolean;
}) {
  return (
    <div className="glass-dark flex items-center gap-3.5 rounded-[14px] px-4 py-3 text-surface">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-surface/10 text-[13px] font-bold"
        style={{ fontFamily: MONO }}
      >
        {no}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-[9px] font-semibold uppercase tracking-[0.24em] text-surface/50"
          style={{ fontFamily: MONO }}
        >
          {eyebrow}
        </p>
        <h2 className="truncate font-display text-[17px] font-semibold tracking-[-0.01em] sm:text-[19px]">
          {title}
        </h2>
      </div>
      <span className="flex items-center gap-1.5" aria-label={done ? "Complete" : "Pending"}>
        <span
          aria-hidden="true"
          className={cn(
            "size-2 rounded-full",
            done ? "bg-[color:var(--success)]" : "cp-blink bg-[color:var(--et-careless)]"
          )}
        />
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.18em] text-surface/50"
          style={{ fontFamily: MONO }}
        >
          {done ? "OK" : "Waiting"}
        </span>
      </span>
    </div>
  );
}

/** The terminal progress strip: check-in → boarding → arrivals, plane at now. */
function JourneyStrip({ stage }: { stage: number }) {
  const stops = ["Check-in", "Boarding", "Arrivals"];
  const frac = stops.length > 1 ? stage / (stops.length - 1) : 0;
  return (
    <div aria-hidden="true" className="mt-7">
      <div className="relative h-px w-full bg-hairline-strong">
        <div
          className="absolute left-0 top-0 h-px bg-brand transition-[width] duration-700"
          style={{ width: `${frac * 100}%` }}
        />
        {stops.map((s, i) => (
          <span
            key={s}
            className={cn(
              "absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-field",
              i <= stage ? "bg-brand" : "bg-ink-secondary/40"
            )}
            style={{ left: `${(i / (stops.length - 1)) * 100}%` }}
          />
        ))}
        <Plane
          className="absolute top-1/2 size-4 -translate-y-1/2 text-brand transition-[left] duration-700"
          style={{ left: `calc(${frac * 100}% - 8px)` }}
          strokeWidth={2}
          fill="currentColor"
        />
      </div>
      <div
        className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-secondary"
        style={{ fontFamily: MONO }}
      >
        {stops.map((s, i) => (
          <span key={s} className={cn(i <= stage && "text-brand")}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A check-in document slot: mono doc header, status stamp, the control inside. */
function DocSlot({
  no,
  kind,
  title,
  done,
  required,
  children,
}: {
  no: string;
  kind: string;
  title: string;
  done: boolean;
  required: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-tile flex min-w-0 flex-col rounded-[16px] p-4">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-hairline pb-2.5">
        <p
          className="min-w-0 truncate text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-secondary"
          style={{ fontFamily: MONO }}
        >
          Doc {no} · {kind}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-[6px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
            done
              ? "bg-success/12 text-success"
              : required
                ? "bg-error/10 text-error"
                : "bg-surface-field text-ink-secondary"
          )}
          style={{ fontFamily: MONO }}
        >
          {done ? "Filed ✓" : required ? "Required" : "Pending"}
        </span>
      </div>
      <p className="mb-2 text-[13px] font-medium text-ink">{title}</p>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inputs (station 01)                                                         */
/* -------------------------------------------------------------------------- */

function UniversityPicker({
  current,
  onSaved,
  onUnauthorized,
}: {
  current: { name: string; status: string } | null;
  onSaved: () => void;
  onUnauthorized: () => void;
}) {
  const [editing, setEditing] = useState(current == null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnabinInstitution[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typeahead: fire after 300ms of quiet, only from 2 characters.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchAnabinInstitutions(query.trim());
        if (active) setResults(r);
      } catch (err) {
        if (err instanceof ApiError && err.unauthorized) onUnauthorized();
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [query, onUnauthorized]);

  async function pick(inst: AnabinInstitution) {
    setSaving(true);
    setError(null);
    try {
      await saveAnabinInstitution(inst.id);
      setEditing(false);
      setQuery("");
      setResults([]);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't save your university.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing && current) {
    const badge = statusBadge(current.status);
    return (
      <div className="flex items-center justify-between gap-3 rounded-[12px] border border-hairline bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-ink">{current.name}</p>
          <div className="mt-1">
            <BadgePill label={badge.label} color={badge.color} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-brand transition-opacity hover:opacity-70"
        >
          <Pencil className="size-3.5" strokeWidth={2} aria-hidden="true" />
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-secondary"
          strokeWidth={2}
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your Indian university…"
          autoComplete="off"
          className="h-[46px] w-full rounded-[12px] border border-hairline bg-surface pl-10 pr-4 text-[14px] text-ink transition-[border-color] placeholder:text-ink-secondary/70 focus:border-brand"
        />
        {searching ? (
          <Loader2
            className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-secondary"
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul className="absolute inset-x-0 top-[52px] z-30 max-h-[280px] overflow-y-auto rounded-[14px] border border-hairline bg-surface-card p-1.5 shadow-[var(--shadow-card)]">
          {results.map((r) => {
            const badge = statusBadge(r.status);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void pick(r)}
                  className="flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-surface-field disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-ink">{r.name}</span>
                    {r.city ? (
                      <span className="block text-[12px] text-ink-secondary">{r.city}</span>
                    ) : null}
                  </span>
                  <BadgePill label={badge.label} color={badge.color} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {current && editing ? (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-2 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          Keep {current.name}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The dMAT-field radio — fully controlled. Selection is parent state, so a click
 *  flips instantly; the parent persists it + refetches programmes in the
 *  background. The field doesn't affect readiness, so nothing here waits on it. */
function FieldPicker({
  current,
  onChange,
}: {
  current: DmatField | null;
  onChange: (value: DmatField) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Your UG field" className="flex flex-col gap-2">
      {FIELD_OPTIONS.map((o) => {
        const selected = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (o.value !== current) onChange(o.value);
            }}
            className={cn(
              "flex items-center justify-between gap-3 rounded-[12px] border px-4 py-2.5 text-left text-[14px] transition-colors",
              selected
                ? "border-brand bg-brand/[0.06] font-medium text-ink"
                : "border-hairline bg-surface text-ink hover:border-hairline-strong"
            )}
          >
            <span className="min-w-0 flex-1">{o.label}</span>
            {selected ? (
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-fill text-brand-on">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function GradesForm({
  initialUg,
  initialTwelfth,
  onSaved,
  onUnauthorized,
}: {
  initialUg: number | null;
  initialTwelfth: number | null;
  onSaved: () => void;
  onUnauthorized: () => void;
}) {
  const [ug, setUg] = useState(initialUg != null ? String(initialUg) : "");
  const [twelfth, setTwelfth] = useState(initialTwelfth != null ? String(initialTwelfth) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ugNum = ug.trim() === "" ? null : Number(ug);
    const twNum = twelfth.trim() === "" ? null : Number(twelfth);
    for (const v of [ugNum, twNum]) {
      if (v != null && (Number.isNaN(v) || v < 0 || v > 100)) {
        setError("Percentages must be between 0 and 100.");
        return;
      }
    }
    if (ugNum == null && twNum == null) {
      setError("Enter at least your UG percentage.");
      return;
    }
    setSaving(true);
    try {
      await saveAcademics({
        ...(ugNum != null ? { ug_percentage: ugNum } : {}),
        ...(twNum != null ? { twelfth_percentage: twNum } : {}),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't save your grades.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-3">
      <div className="min-w-[130px] flex-1">
        <label htmlFor="cp-ug" className="mb-1.5 block text-[12px] font-medium text-ink-secondary">
          UG percentage
        </label>
        <input
          id="cp-ug"
          value={ug}
          onChange={(e) => setUg(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          placeholder="e.g. 75"
          className="h-[46px] w-full rounded-[12px] border border-hairline bg-surface px-3.5 text-[14px] text-ink transition-[border-color] placeholder:text-ink-secondary/70 focus:border-brand"
        />
      </div>
      <div className="min-w-[130px] flex-1">
        <label htmlFor="cp-12" className="mb-1.5 block text-[12px] font-medium text-ink-secondary">
          Class XII % <span className="font-normal">(optional)</span>
        </label>
        <input
          id="cp-12"
          value={twelfth}
          onChange={(e) => setTwelfth(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          placeholder="e.g. 80"
          className="h-[46px] w-full rounded-[12px] border border-hairline bg-surface px-3.5 text-[14px] text-ink transition-[border-color] placeholder:text-ink-secondary/70 focus:border-brand"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-[46px] items-center gap-1.5 rounded-[12px] bg-brand-fill px-4 text-[14px] font-medium text-brand-on transition-colors hover:bg-brand-fill-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saved ? (
          <>
            <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
            Saved
          </>
        ) : saving ? (
          "Saving…"
        ) : (
          "Save grades"
        )}
      </button>
      {error ? (
        <p role="alert" className="w-full text-[12px] text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* The boarding pass (station 02)                                              */
/* -------------------------------------------------------------------------- */

/** A mono ticket field: tiny tracking label over a one-line printed value.
 *  `hoverTitle` carries the untruncated text for long values. */
function TicketField({
  label,
  hoverTitle,
  children,
}: {
  label: string;
  hoverTitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p
        className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-secondary"
        style={{ fontFamily: MONO }}
      >
        {label}
      </p>
      <div
        className="mt-1 truncate text-[14px] font-medium leading-snug text-ink"
        style={{ fontFamily: MONO }}
        title={hoverTitle}
      >
        {children}
      </div>
    </div>
  );
}

function BoardingPass({
  prediction,
  fieldLabel,
  universities,
  totalUniversities,
}: {
  prediction: CollegePrediction;
  fieldLabel: string | null;
  universities: string[];
  totalUniversities: number;
}) {
  const band = READINESS[prediction.readiness] ?? READINESS.unknown;
  const score = prediction.readiness_score;
  const shown = useCountUp(score ?? 0, 1100);
  const elig = prediction.eligibility;
  const anabin = elig ? statusBadge(elig.status) : null;

  return (
    <div className="glass-tile reveal -rotate-[0.4deg] rounded-[20px] transition-transform duration-300 hover:rotate-0">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* ------- main leaf ------- */}
        <div className="p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-secondary"
              style={{ fontFamily: MONO }}
            >
              dMAT · Master&apos;s admission
            </p>
            <Plane className="size-4 text-brand" strokeWidth={2} aria-hidden="true" />
          </div>

          <p className="mt-3 font-display text-[30px] font-semibold leading-none tracking-[-0.02em] text-ink sm:text-[36px]">
            India <span aria-hidden="true" className="text-brand">✈</span> Germany
          </p>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <TicketField
              label="University"
              hoverTitle={elig ? elig.institution_name : undefined}
            >
              {elig ? shortInstitutionName(elig.institution_name) : "—"}
            </TicketField>
            <TicketField label="Anabin">
              {anabin ? <span style={{ color: anabin.color }}>{anabin.label}</span> : "—"}
            </TicketField>
            <TicketField label="Field">{fieldLabel ?? "—"}</TicketField>
            <TicketField label="dMAT">
              {prediction.dmat ? `${prediction.dmat.percentile.toFixed(1)} %ile` : "—"}
            </TicketField>
          </div>

          <p className="mt-6 text-[14px] leading-relaxed text-ink">{prediction.readiness_note}</p>
          {elig ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-secondary">{elig.meaning}</p>
          ) : null}

          {/* Real German public universities in the student's field they can
              apply to — a preview of the full list below the ticket. */}
          {universities.length > 0 ? (
            <div className="mt-5 border-t border-hairline pt-4">
              <p
                className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-secondary"
                style={{ fontFamily: MONO }}
              >
                Public universities{fieldLabel ? ` · ${fieldLabel}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                {universities.map((u) => (
                  <span
                    key={u}
                    className="text-[14px] font-semibold text-ink"
                    style={{ fontFamily: MONO }}
                  >
                    {u}
                  </span>
                ))}
              </div>
              {totalUniversities > 0 ? (
                <p className="mt-2 text-[12px] text-ink-secondary">
                  and more — {totalUniversities} public programmes you can apply to in your field.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ------- perforation + stub ------- */}
        <div className="relative border-t border-dashed border-hairline-strong lg:border-l lg:border-t-0">
          {/* punched notches — the page colour biting into the ticket */}
          <span
            aria-hidden="true"
            className="absolute -left-2 -top-2 hidden size-4 rounded-full bg-surface-field lg:block"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-2 -left-2 hidden size-4 rounded-full bg-surface-field lg:block"
          />
          <span
            aria-hidden="true"
            className="absolute -left-2 -top-2 size-4 rounded-full bg-surface-field lg:hidden"
          />
          <span
            aria-hidden="true"
            className="absolute -right-2 -top-2 size-4 rounded-full bg-surface-field lg:hidden"
          />

          <div className="flex h-full flex-col justify-between p-6">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-secondary"
                style={{ fontFamily: MONO }}
              >
                Class
              </p>
              <p
                className="mt-1.5 inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: `color-mix(in srgb, ${band.color} 15%, transparent)`,
                  color: band.color,
                  fontFamily: MONO,
                }}
              >
                {band.label}
              </p>

              <p
                className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-secondary"
                style={{ fontFamily: MONO }}
              >
                Readiness
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span
                  className="font-display text-[44px] font-semibold leading-none tracking-[-0.02em] text-ink"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {score != null ? shown.toFixed(1) : "—"}
                </span>
                <span className="text-[12px] text-ink-secondary">/100</span>
              </p>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-field">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(score != null ? 3 : 0, score ?? 0))}%`,
                    backgroundColor: band.color,
                  }}
                />
              </div>
            </div>

            {/* barcode */}
            <div
              aria-hidden="true"
              className="mt-6 h-10 w-full text-ink opacity-70"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 5px, currentColor 5px 6px, transparent 6px 11px, currentColor 11px 14px, transparent 14px 18px)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ------- validity strip: the honest admission story, ON the ticket ------- */}
      {prediction.dmat_admission_note ? (
        <div className="border-t border-hairline px-6 py-3.5 sm:px-7">
          <p className="text-[12px] leading-relaxed text-ink-secondary">
            <span
              className="mr-2 font-semibold uppercase tracking-[0.18em] text-ink"
              style={{ fontFamily: MONO, fontSize: "10px" }}
            >
              Validity
            </span>
            {prediction.dmat_admission_note}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** The fare calculation — the working behind the number, printed small. */
function FareBreakdown({ prediction }: { prediction: CollegePrediction }) {
  const b = prediction.breakdown;
  if (!b || prediction.readiness_score == null) return null;
  const chips: string[] = [];
  if (b.ug_percentage != null && b.german_grade != null)
    chips.push(`UG ${b.ug_percentage}% → DE grade ${b.german_grade.toFixed(2)}`);
  if (b.academic_score != null) chips.push(`academics ${b.academic_score.toFixed(1)}`);
  if (b.dmat_percentile != null && b.dmat_score != null)
    chips.push(`dMAT ${b.dmat_percentile.toFixed(1)}%ile → ${b.dmat_score.toFixed(1)}`);
  if (b.twelfth_percentage != null && b.twelfth_score != null)
    chips.push(`XII ${b.twelfth_percentage}% → ${b.twelfth_score.toFixed(1)}`);
  if (b.competitiveness != null && b.eligibility_multiplier != null)
    chips.push(
      `= ${b.competitiveness.toFixed(1)} × ${b.eligibility_multiplier.toFixed(1)} eligibility = ${prediction.readiness_score.toFixed(1)}`
    );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-secondary"
        style={{ fontFamily: MONO }}
      >
        Calculated
      </span>
      {chips.map((c, i) => (
        <span
          key={i}
          className="rounded-[7px] bg-surface-field px-2 py-1 text-[11.5px] text-ink-secondary"
          style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The page                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The German College Predictor as a journey: 01 your papers → 02 your ticket
 * (the readiness boarding pass) → 03 arrivals (public, tuition-free German
 * programmes in the student's field). dMAT streams only — the backend gates
 * via `applicable`. Never a cutoff, never a guarantee: bands, transparent
 * working, and the validity note printed on the ticket itself.
 */
export function CollegePredictorView({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [prediction, setPrediction] = useState<CollegePrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refineText, setRefineText] = useState("");
  const [programsQ, setProgramsQ] = useState("");
  const [programsLimit, setProgramsLimit] = useState(20);
  const [programsVersion, setProgramsVersion] = useState(0);
  const [programs, setPrograms] = useState<TargetProgramsOut | null>(null);
  const [programsLoading, setProgramsLoading] = useState(true);
  // Optimistic field selection: set the instant a field is clicked, so the
  // checkmark + programmes list respond immediately instead of waiting on the
  // save round-trip. Null until the user picks (the server default applies).
  const [fieldOverride, setFieldOverride] = useState<DmatField | null>(null);

  // Shortlist: local to this browser (localStorage) — the selection feel of
  // starring universities without a backend round-trip.
  const [shortlist, setShortlist] = useState<Set<string>>(() => new Set());
  const [shortlistOnly, setShortlistOnly] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("cp-shortlist");
      if (raw) setShortlist(new Set(JSON.parse(raw) as string[]));
    } catch {
      // Ignore malformed storage.
    }
  }, []);
  const toggleShortlist = useCallback((university: string) => {
    setShortlist((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(university)) nextSet.delete(university);
      else nextSet.add(university);
      try {
        window.localStorage.setItem("cp-shortlist", JSON.stringify(Array.from(nextSet)));
      } catch {
        // Storage full/blocked — the in-memory shortlist still works.
      }
      return nextSet;
    });
  }, []);

  const loadPrediction = useCallback(async () => {
    try {
      setPrediction(await getCollegePredictions());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't load your prediction.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void loadPrediction();
  }, [loadPrediction]);

  // The arrivals list loads immediately (field defaults server-side) and
  // reloads on refine, paging, or after any input save.
  useEffect(() => {
    let active = true;
    setProgramsLoading(true);
    getTargetPrograms({ field: fieldOverride ?? undefined, q: programsQ || undefined, limit: programsLimit })
      .then((p) => {
        if (active) setPrograms(p);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.unauthorized) onUnauthorized();
      })
      .finally(() => {
        if (active) setProgramsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fieldOverride, programsQ, programsLimit, programsVersion, onUnauthorized]);

  /** Re-pull everything after a saved input (university / grades — these DO move
   *  the readiness score, so the prediction is refetched too). */
  const refreshAll = useCallback(() => {
    void loadPrediction();
    setProgramsVersion((v) => v + 1);
  }, [loadPrediction]);

  /** Field change: the readiness score is field-independent, so this only flips
   *  the selection (instant) + refetches programmes; the save runs in the
   *  background. No prediction refetch → no wasted round-trips. */
  const changeField = useCallback(
    (value: DmatField) => {
      setFieldOverride(value);
      saveAcademics({ dmat_field: value }).catch((err: unknown) => {
        if (err instanceof ApiError && err.unauthorized) onUnauthorized();
      });
    },
    [onUnauthorized]
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-16 w-96 max-w-full" />
        <Skeleton className="h-[280px] rounded-[20px]" />
        <Skeleton className="h-[240px] rounded-[20px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Tile>
        <p role="alert" className="text-[14px] text-ink-secondary">
          {error}
        </p>
      </Tile>
    );
  }

  if (!prediction) return null;

  // Not a dMAT stream → the feature doesn't apply.
  if (!prediction.applicable) {
    return (
      <div className="glass-tile reveal mx-auto max-w-[560px] rounded-[24px] p-10 text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex size-14 items-center justify-center rounded-[16px] bg-brand-fill/[0.1] text-brand"
        >
          <GraduationCap className="size-7" strokeWidth={1.8} />
        </div>
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.01em] text-ink">
          The College Predictor is for dMAT students
        </h1>
        <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-ink-secondary">
          It maps your dMAT performance to German Master&apos;s admissions. Switch your exam
          stream to dMAT to unlock it.
        </p>
      </div>
    );
  }

  const needsUniversity = prediction.missing_inputs.includes("university") || !prediction.eligibility;
  const needsUg = prediction.missing_inputs.includes("ug_percentage");
  const currentField = fieldOverride ?? programs?.field?.key ?? null;
  const papersDone = !needsUniversity && !needsUg && currentField != null;
  const ticketReady = prediction.readiness_score != null;
  // Real public universities in the student's field, for the ticket preview.
  const previewUniversities = programs?.programs
    ? Array.from(new Set(programs.programs.map((p) => p.university))).slice(0, 3)
    : [];

  const journeyStage = papersDone
    ? ticketReady && (programs?.programs.length ?? 0) > 0
      ? 2
      : 1
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col">
      <style>{`
        @keyframes cp-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .cp-blink { animation: cp-blink 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cp-blink { animation: none; } }
      `}</style>

      {/* Masthead */}
      <div className="reveal mb-8">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-secondary"
          style={{ fontFamily: MONO }}
        >
          College predictor · dMAT
        </p>
        <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[44px]">
          Your route to a German&nbsp;Master&apos;s.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-secondary">
          Three stops: your papers, your ticket, and every public university it can take you to —
          read honestly, no invented cut-offs.
        </p>
        <JourneyStrip stage={journeyStage} />
      </div>

      {/* ------- Zone 01 · check-in ------- */}
      <section aria-labelledby="cp-zone-checkin" className="reveal" style={{ animationDelay: "60ms" }}>
        <h2 id="cp-zone-checkin" className="sr-only">
          Check-in — your papers
        </h2>
        <Sign no="01" eyebrow="Check-in" title="Your papers" done={papersDone} />
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <DocSlot
            no="1"
            kind="Passport"
            title="Indian university"
            done={!needsUniversity}
            required={needsUniversity}
          >
            <UniversityPicker
              current={
                prediction.eligibility
                  ? {
                      name: prediction.eligibility.institution_name,
                      status: prediction.eligibility.status,
                    }
                  : null
              }
              onSaved={refreshAll}
              onUnauthorized={onUnauthorized}
            />
          </DocSlot>
          <DocSlot no="2" kind="Transcript" title="Grades" done={!needsUg} required={needsUg}>
            <GradesForm
              initialUg={prediction.breakdown?.ug_percentage ?? null}
              initialTwelfth={prediction.breakdown?.twelfth_percentage ?? null}
              onSaved={refreshAll}
              onUnauthorized={onUnauthorized}
            />
          </DocSlot>
          <DocSlot
            no="3"
            kind="Declaration"
            title="UG field"
            done={currentField != null}
            required={currentField == null}
          >
            <FieldPicker current={currentField} onChange={changeField} />
          </DocSlot>
        </div>
      </section>

      {/* ------- Zone 02 · boarding: the ticket on its stage ------- */}
      <section
        aria-labelledby="cp-zone-boarding"
        className="reveal mt-8"
        style={{ animationDelay: "140ms" }}
      >
        <h2 id="cp-zone-boarding" className="sr-only">
          Boarding — your ticket
        </h2>
        <Sign no="02" eyebrow="Boarding" title="Your ticket" done={ticketReady} />
        <div className="relative mt-3">
          {/* Spotlight behind the pass — the page's centrepiece gets the light. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 -top-6 bottom-2 rounded-[40px] bg-brand-fill/[0.07] blur-[50px]"
          />
          <div className="relative">
            <BoardingPass
              prediction={prediction}
              fieldLabel={programs?.field?.label ?? null}
              universities={previewUniversities}
              totalUniversities={programs?.total_matched ?? 0}
            />
            <FareBreakdown prediction={prediction} />
          </div>
        </div>
      </section>

      {/* ------- Zone 03 · arrivals ------- */}
      <section
        aria-labelledby="cp-zone-arrivals"
        className="reveal mt-8"
        style={{ animationDelay: "220ms" }}
      >
        <h2 id="cp-zone-arrivals" className="sr-only">
          Arrivals — public universities
        </h2>
        <Sign
          no="03"
          eyebrow="Arrivals"
          title={programs?.field ? `Public universities · ${programs.field.label}` : "Where it lands"}
          done={(programs?.programs.length ?? 0) > 0}
        />
        <div className="mt-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {programs?.public_only ? (
            <BadgePill label="Public · tuition-free" color="var(--success)" />
          ) : null}
          {programs && programs.field ? (
            <span className="text-[12px] text-ink-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
              {programs.total_matched} programmes
            </span>
          ) : null}
        </div>

        {/* Admission-mode headline — ONLY when real counts exist. The data
            source is gated, so most sets are all-unknown: stay silent then. */}
        {programs?.admission_summary != null &&
        programs.admission_summary.open + programs.admission_summary.restricted > 0 ? (
          <p className="mb-4 text-[13px] leading-relaxed text-ink-secondary">
            <span className="font-semibold" style={{ color: "var(--success)" }}>
              {programs.admission_summary.open} open admission
            </span>{" "}
            ·{" "}
            <span className="font-semibold text-brand">
              {programs.admission_summary.restricted} selective
            </span>{" "}
            — open-admission programmes admit everyone who meets the requirements.
          </p>
        ) : null}

        {programs && !programs.field ? (
          <Tile className="p-5">
            <p className="text-[13.5px] leading-relaxed text-ink-secondary">
              {programs.note || "Pick your UG field above to see the public universities open to you."}
            </p>
          </Tile>
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setProgramsLimit(20);
                setProgramsQ(refineText.trim());
              }}
              className="flex gap-2"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-secondary"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <input
                  value={refineText}
                  onChange={(e) => setRefineText(e.target.value)}
                  placeholder="Refine — e.g. robotics, data, supply chain…"
                  className="h-[46px] w-full rounded-[12px] border border-hairline bg-surface pl-10 pr-4 text-[14px] text-ink transition-[border-color] placeholder:text-ink-secondary/70 focus:border-brand"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-[46px] shrink-0 items-center gap-1.5 rounded-[12px] bg-brand-fill px-4 text-[14px] font-medium text-brand-on transition-colors hover:bg-brand-fill-hover"
              >
                Refine
                <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
              </button>
            </form>

            {programsLoading ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-[150px] rounded-[12px]" />
                ))}
              </div>
            ) : programs ? (
              <>
                {programs.note ? (
                  <p className="mt-4 text-[13px] leading-relaxed text-ink-secondary">{programs.note}</p>
                ) : null}
                {(() => {
                  const groups = groupByUniversity(programs.programs);
                  const visibleGroups = shortlistOnly
                    ? groups.filter(([u]) => shortlist.has(u))
                    : groups;
                  return (
                    <>
                      <div className="mt-4">
                        <ResultsBand
                          totalPrograms={programs.total_matched}
                          totalUniversities={groups.length}
                          shortlisted={shortlist.size}
                          fieldLabel={programs.field?.label ?? null}
                          eligibility={prediction.eligibility}
                        />
                      </div>

                      {/* Shortlist filter */}
                      {shortlist.size > 0 ? (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShortlistOnly((s) => !s)}
                            aria-pressed={shortlistOnly}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                              shortlistOnly
                                ? "border-transparent bg-[color:var(--et-careless)]/15 text-[color:var(--et-careless)]"
                                : "border-hairline text-ink-secondary hover:text-ink"
                            )}
                          >
                            <Star
                              className={cn("size-3.5", shortlistOnly && "fill-current")}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            My shortlist ({shortlist.size})
                          </button>
                          {shortlistOnly ? (
                            <span className="text-[12px] text-ink-secondary">
                              Showing only starred universities
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {visibleGroups.length === 0 && shortlistOnly ? (
                        <p className="mt-3 py-6 text-center text-[13px] text-ink-secondary">
                          None of the loaded universities are starred yet — tap the star on any
                          offer to build your shortlist.
                        </p>
                      ) : null}

                      {/* The three application-list tiers. Sections with nothing
                          in them (per the whole-set counts) stay hidden — they
                          appear automatically once backend data lands. */}
                      {(() => {
                        let firstOffer = true;
                        return TIER_SECTIONS.map((t) => {
                          const tierPrograms = programs.programs.filter(
                            (p) => tierOf(p) === t.key
                          );
                          const totalInTier =
                            programs.tier_summary?.[t.key] ?? tierPrograms.length;
                          if (totalInTier === 0 && tierPrograms.length === 0) return null;

                          const tierGroups = groupByUniversity(tierPrograms).filter(
                            ([u]) => !shortlistOnly || shortlist.has(u)
                          );
                          if (shortlistOnly && tierGroups.length === 0) return null;

                          return (
                            <section key={t.key} aria-label={`${t.title} universities`} className="mt-5">
                              {/* Tier board header */}
                              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-hairline-strong pb-2">
                                <span
                                  aria-hidden="true"
                                  className="size-2.5 translate-y-[-1px] rounded-full"
                                  style={{ backgroundColor: t.color }}
                                />
                                <h3 className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">
                                  {t.title}
                                </h3>
                                <span
                                  className="rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em]"
                                  style={{
                                    fontFamily: MONO,
                                    fontVariantNumeric: "tabular-nums",
                                    color: t.color,
                                    backgroundColor: `color-mix(in srgb, ${t.color} 12%, transparent)`,
                                  }}
                                >
                                  {totalInTier} {totalInTier === 1 ? "programme" : "programmes"}
                                </span>
                                <span className="text-[12.5px] text-ink-secondary">{t.subtitle}</span>
                              </div>

                              {tierGroups.length === 0 ? (
                                <p className="mt-3 text-[13px] text-ink-secondary">
                                  None loaded yet — refine or load more below.
                                </p>
                              ) : (
                                <div className="mt-3 flex flex-col gap-3">
                                  {tierGroups.map(([university, uniPrograms], gi) => {
                                    const open = firstOffer && !shortlistOnly;
                                    firstOffer = false;
                                    return (
                                      <div
                                        key={university}
                                        className="reveal"
                                        style={{ animationDelay: `${Math.min(gi * 50, 400)}ms` }}
                                      >
                                        <UniversityOfferCard
                                          university={university}
                                          programs={uniPrograms}
                                          shortlisted={shortlist.has(university)}
                                          onToggleShortlist={() => toggleShortlist(university)}
                                          defaultOpen={open}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </section>
                          );
                        });
                      })()}
                    </>
                  );
                })()}

                {programs.programs.length < programs.total_matched ? (
                  <div className="mt-5 flex flex-col items-center gap-2">
                    <div className="h-[3px] w-40 overflow-hidden rounded-full bg-surface-field">
                      <div
                        className="h-full rounded-full bg-brand transition-[width] duration-500"
                        style={{
                          width: `${Math.round((programs.programs.length / programs.total_matched) * 100)}%`,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setProgramsLimit((l) => l + 20)}
                      className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-5 py-2.5 text-[13px] font-semibold text-ink shadow-[var(--shadow-card)] transition-colors hover:border-brand hover:text-brand"
                    >
                      Show more universities
                      <span
                        className="text-ink-secondary"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        ({programs.programs.length} of {programs.total_matched})
                      </span>
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
        </div>
      </section>

      {/* The honest small print — always visible. */}
      <div className="mt-10 border-t border-hairline pt-5">
        <p className="pb-2 text-[12px] leading-relaxed text-ink-secondary">{prediction.disclaimer}</p>
      </div>
    </div>
  );
}
