"use client";

import type { DashboardInsight, DashboardSummary } from "@/lib/types";
import { useCountUp } from "@/components/app/dashboard/useCountUp";

const R = 138;
const CX = 160;
const CY = 168;

/** Fraction 0–1 → point on the top semicircle (0 = left, 1 = right). */
function pointAt(frac: number): [number, number] {
  const a = Math.PI - Math.max(0, Math.min(1, frac)) * Math.PI;
  return [CX + R * Math.cos(a), CY - R * Math.sin(a)];
}

function arcPath(from: number, to: number): string {
  const [x1, y1] = pointAt(from);
  const [x2, y2] = pointAt(to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** The first sentence of the AI summary — the one-line verdict. */
function verdictOf(summary: string): string {
  const m = summary.match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : summary).trim();
}

/**
 * The hero: exam readiness as a single cinematic statement. The predicted score
 * is the centrepiece — oversized display type inside a calm arc gauge, with the
 * likely band drawn as a confidence range and a one-line verdict from the AI.
 * The arc draws and the number counts up on load (both respect reduced motion).
 */
export function ReadinessHero({
  insight,
  summary,
}: {
  insight: DashboardInsight;
  summary: DashboardSummary;
}) {
  const predicted = Math.max(0, Math.min(100, insight.predicted_score));
  const low = Math.max(0, Math.min(100, insight.predicted_band_low));
  const high = Math.max(0, Math.min(100, insight.predicted_band_high));
  const shown = Math.round(useCountUp(predicted));

  const [mx, my] = pointAt(predicted / 100);

  return (
    <section
      aria-labelledby="readiness-heading"
      className="reveal relative overflow-hidden rounded-[24px] border border-hairline bg-surface-card px-6 py-8 shadow-[var(--shadow-card)] sm:px-10 sm:py-10"
    >
      {/* Ambient light — quiet, never busy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 w-[70%] rounded-full bg-brand-fill/10 blur-[90px]"
      />

      <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-14">
        {/* Gauge + number */}
        <div className="relative w-full max-w-[360px]">
          <svg viewBox="0 0 320 190" className="w-full" role="img" aria-label={`Predicted score ${Math.round(predicted)} out of 100, likely range ${Math.round(low)} to ${Math.round(high)}.`}>
            <defs>
              <linearGradient id="readiness-fill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--brand-fill)" />
                <stop offset="100%" stopColor="var(--mastery-strong)" />
              </linearGradient>
            </defs>

            {/* Track */}
            <path d={arcPath(0, 1)} fill="none" stroke="var(--surface-field)" strokeWidth="14" strokeLinecap="round" />
            {/* Likely band */}
            <path d={arcPath(low / 100, high / 100)} fill="none" stroke="var(--brand)" strokeOpacity="0.28" strokeWidth="14" strokeLinecap="round" />
            {/* Predicted value — draws on load */}
            <path
              d={arcPath(0, predicted / 100)}
              fill="none"
              stroke="url(#readiness-fill)"
              strokeWidth="14"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              className="animate-arc"
              style={{ ["--arc-len" as string]: 1, ["--arc-to" as string]: 0 } as React.CSSProperties}
            />
            {/* Predicted marker */}
            <circle cx={mx} cy={my} r="7" fill="var(--surface-card)" stroke="var(--brand-fill)" strokeWidth="3.5" className="reveal" style={{ animationDelay: "700ms" }} />
            {/* End ticks */}
            <text x="18" y="186" fontSize="11" fill="var(--ink-secondary)">0</text>
            <text x="302" y="186" fontSize="11" fill="var(--ink-secondary)" textAnchor="end">100</text>
          </svg>

          {/* Number overlaid in the arc's mouth */}
          <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-secondary">
              Exam readiness
            </p>
            <p className="font-display text-[76px] font-semibold leading-[0.9] tracking-[-0.02em] text-ink sm:text-[88px]" style={{ fontVariantNumeric: "tabular-nums" }}>
              {shown}
            </p>
            <p className="text-[13px] text-ink-secondary">
              out of 100 · likely{" "}
              <span className="font-medium text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
                {Math.round(low)}–{Math.round(high)}
              </span>
            </p>
          </div>
        </div>

        {/* Verdict + context */}
        <div className="max-w-[420px] text-center lg:text-left">
          <h1 id="readiness-heading" className="sr-only">
            Exam readiness
          </h1>
          <p className="font-display text-[24px] font-medium leading-snug tracking-[-0.01em] text-ink sm:text-[27px]">
            {verdictOf(insight.summary)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5 lg:justify-start">
            <HeroChip label="Latest percentile" value={summary.latest_percentile.toFixed(1)} />
            <HeroChip label="Mocks taken" value={`${summary.total_attempts}`} />
            <HeroChip
              label="Improvement"
              value={`${summary.improvement_pct >= 0 ? "+" : ""}${summary.improvement_pct.toFixed(1)}%`}
              good={summary.improvement_pct >= 0}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroChip({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5">
      <span
        className={`text-[14px] font-semibold ${good === undefined ? "text-ink" : good ? "text-success" : "text-error"}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
      <span className="text-[12px] text-ink-secondary">{label}</span>
    </span>
  );
}
