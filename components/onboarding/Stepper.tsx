"use client";

import { Check } from "lucide-react";

const STEPS = ["Basic Details", "Goal", "Exam"] as const;

/**
 * The onboarding progress indicator. A compact "step N of 3" bar on phones; the
 * full labelled-node walk on desktop. Percentage is deliberately generous
 * (current / total, so Step 1 already reads 33%) — the bar is a motivator, not
 * an audit of completed work.
 */
export function Stepper({ current }: { current: number }) {
  const percent = Math.round((current / STEPS.length) * 100);

  return (
    <div className="w-full" aria-label={`Step ${current} of ${STEPS.length}: ${STEPS[current - 1]}`}>
      {/* Mobile: label + slim progress bar. */}
      <div className="md:hidden">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-ink">
            Step {current} of {STEPS.length} · {STEPS[current - 1]}
          </span>
          <span className="font-semibold text-brand">{percent}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-field">
          <div
            className="h-full rounded-full bg-brand-fill transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Desktop: labelled nodes joined by connectors. */}
      <div className="hidden items-center md:flex">
        <ol className="flex flex-1 items-center">
          {STEPS.map((label, i) => {
            const step = i + 1;
            const done = step < current;
            const activeNow = step === current;
            const isLast = i === STEPS.length - 1;
            return (
              <li key={label} className={isLast ? "flex items-center" : "flex flex-1 items-center"}>
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors duration-300",
                      done
                        ? "bg-brand-fill text-brand-on"
                        : activeNow
                          ? "bg-brand-fill/[0.12] text-brand ring-2 ring-brand"
                          : "bg-surface-field text-ink-secondary",
                    ].join(" ")}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step}
                  </span>
                  <span
                    className={[
                      "whitespace-nowrap text-[14px] font-medium transition-colors duration-300",
                      activeNow ? "text-ink" : done ? "text-ink" : "text-ink-secondary",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                </div>
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={`mx-4 h-px flex-1 transition-colors duration-300 ${
                      done ? "bg-brand" : "bg-hairline"
                    }`}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
        <span className="ml-6 shrink-0 rounded-full bg-brand-fill/[0.08] px-3 py-1 text-[13px] font-semibold text-brand">
          {percent}% complete
        </span>
      </div>
    </div>
  );
}
