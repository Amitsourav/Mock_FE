"use client";

import { Sparkles, Target } from "lucide-react";
import type { DashboardInsight } from "@/lib/types";

/** A horizontal 0–100 gauge: the predicted band as a filled range + a marker. */
function BandGauge({ low, high, predicted }: { low: number; high: number; predicted: number }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const l = clamp(low);
  const h = clamp(high);
  const p = clamp(predicted);
  return (
    <div className="mt-4">
      <div
        className="relative h-2.5 w-full rounded-full bg-surface-field"
        role="img"
        aria-label={`Predicted ${Math.round(predicted)}, likely range ${Math.round(low)} to ${Math.round(high)} out of 100.`}
      >
        {/* likely range */}
        <div
          className="absolute top-0 h-full rounded-full bg-brand/25"
          style={{ left: `${l}%`, width: `${Math.max(1, h - l)}%` }}
        />
        {/* predicted marker */}
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-card bg-brand-fill"
          style={{ left: `${p}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}

/**
 * The dashboard hero. Leads with the AI narrative and the predicted outcome,
 * then the top next actions — the "why" and "what next" before any raw number.
 */
export function StoryCard({ insight }: { insight: DashboardInsight }) {
  const actions = insight.study_plan.slice(0, 3);

  return (
    <section className="rounded-[18px] border border-hairline bg-surface-card p-6 shadow-[var(--shadow-card)] sm:p-7">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-field px-2.5 py-1 text-[11px] font-medium text-ink-secondary">
        <Sparkles className="size-3 text-brand" strokeWidth={2.5} aria-hidden="true" />
        AI insight
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Narrative + prediction */}
        <div className="lg:col-span-3">
          <p className="text-[17px] font-medium leading-relaxed tracking-[-0.01em] text-ink">
            {insight.summary}
          </p>

          <div className="mt-6 rounded-[14px] border border-hairline bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-ink-secondary">Predicted score</span>
              <span className="text-[13px] text-ink-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                range {Math.round(insight.predicted_band_low)}–{Math.round(insight.predicted_band_high)}
              </span>
            </div>
            <p className="mt-1 text-[40px] font-semibold leading-none tracking-[-0.02em] text-ink">
              {Math.round(insight.predicted_score)}
            </p>
            <BandGauge
              low={insight.predicted_band_low}
              high={insight.predicted_band_high}
              predicted={insight.predicted_score}
            />
          </div>
        </div>

        {/* Next actions */}
        <div className="lg:col-span-2">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <Target className="size-4 text-brand" strokeWidth={2} aria-hidden="true" />
            Your next moves
          </h3>
          <ol className="mt-3 flex flex-col gap-3">
            {actions.map((step) => (
              <li key={step.step} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[11px] font-semibold text-brand"
                >
                  {step.step}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{step.focus}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-secondary">{step.action}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Strengths + gaps */}
      {insight.persistent_strengths.length > 0 || insight.persistent_gaps.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-hairline pt-5 sm:flex-row sm:gap-8">
          {insight.persistent_strengths.length > 0 ? (
            <div>
              <p className="mb-2 text-[12px] font-medium text-ink-secondary">Persistent strengths</p>
              <div className="flex flex-wrap gap-1.5">
                {insight.persistent_strengths.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-success/12 px-2.5 py-1 text-[12px] font-medium text-success"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {insight.persistent_gaps.length > 0 ? (
            <div>
              <p className="mb-2 text-[12px] font-medium text-ink-secondary">Persistent gaps</p>
              <div className="flex flex-wrap gap-1.5">
                {insight.persistent_gaps.map((g) => (
                  <span
                    key={g}
                    className="rounded-full px-2.5 py-1 text-[12px] font-medium"
                    style={{ backgroundColor: "color-mix(in srgb, var(--et-careless) 14%, transparent)", color: "var(--et-careless)" }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
