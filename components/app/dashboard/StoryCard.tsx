"use client";

import { Sparkles, Target } from "lucide-react";
import type { DashboardInsight } from "@/lib/types";

/**
 * The coach's read. The predicted score now lives in the ReadinessHero, so this
 * card is purely the narrative: the AI summary as an editorial pull-quote, the
 * top three moves as a numbered action list, and strengths vs gaps as two
 * contrasting chip clusters.
 */
export function StoryCard({ insight }: { insight: DashboardInsight }) {
  const actions = insight.study_plan.slice(0, 3);

  return (
    <section className="rounded-[18px] border border-hairline bg-surface-card p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-field px-2.5 py-1 text-[11px] font-medium text-ink-secondary">
        <Sparkles className="size-3 text-brand" strokeWidth={2.5} aria-hidden="true" />
        AI insight
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Narrative pull-quote */}
        <div className="lg:col-span-3">
          <p className="font-display text-[22px] font-medium leading-relaxed tracking-[-0.01em] text-ink sm:text-[24px]">
            {insight.summary}
          </p>
        </div>

        {/* Next moves */}
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
        <div className="mt-7 flex flex-col gap-3 border-t border-hairline pt-5 sm:flex-row sm:gap-8">
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
                    style={{ backgroundColor: "color-mix(in srgb, var(--mastery-weak) 14%, transparent)", color: "var(--mastery-weak)" }}
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
