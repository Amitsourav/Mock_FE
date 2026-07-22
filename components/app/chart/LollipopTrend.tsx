"use client";

import { cn } from "@/lib/utils";

export type LollipopPoint = {
  /** Short chip text under the stem (attempt number). */
  label: string;
  /** Hover/assistive description (mock title · date). */
  title: string;
  value: number;
};

/**
 * A lollipop trend: thin neutral stems with dot heads, ONE highlighted stem
 * (the latest attempt) rendered dark with a tooltip pill above it, and round
 * label chips along the baseline — the active chip dark. Pure CSS/flex, no
 * chart library. Values are clamped to [0, max].
 */
export function LollipopTrend({
  points,
  max = 100,
  format = (v: number) => `${v.toFixed(1)}%`,
}: {
  points: LollipopPoint[];
  max?: number;
  format?: (v: number) => string;
}) {
  if (points.length === 0) return null;
  const hi = points.length - 1; // latest attempt carries the highlight

  return (
    <div
      role="img"
      aria-label={`Trend across ${points.length} attempts: ${points
        .map((p) => `${p.title} ${format(p.value)}`)
        .join(", ")}.`}
    >
      {/* Stems. Top padding reserves room for the tooltip pill at 100%. */}
      <div className="flex items-end gap-1.5 pt-12">
        {points.map((p, i) => {
          const pct = Math.max(0, Math.min(max, p.value)) / max;
          const isHi = i === hi;
          return (
            <div key={i} className="relative h-40 min-w-0 flex-1" title={`${p.title} — ${format(p.value)}`}>
              {/* stem — rises in sequence on load */}
              <div
                className={cn(
                  "animate-stem absolute bottom-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full",
                  isHi ? "bg-ink" : "bg-hairline-strong"
                )}
                style={{ height: `${Math.max(pct * 100, 3)}%`, animationDelay: `${i * 55}ms` }}
              />
              {/* dot head */}
              <div
                className={cn(
                  "animate-dot absolute left-1/2 size-2.5 -translate-x-1/2 rounded-full",
                  isHi ? "bg-ink" : "bg-brand"
                )}
                style={{
                  bottom: `calc(${Math.max(pct * 100, 3)}% - 4px)`,
                  animationDelay: `${i * 55 + 320}ms`,
                }}
              />
              {/* tooltip pill on the highlighted stem */}
              {isHi ? (
                <span
                  className="animate-dot absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-surface"
                  style={{
                    bottom: `calc(${Math.max(pct * 100, 3)}% + 10px)`,
                    animationDelay: `${i * 55 + 420}ms`,
                  }}
                >
                  {format(p.value)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Baseline chips — attempt numbers, latest dark. */}
      <div className="mt-3 flex gap-1.5 border-t border-hairline pt-3">
        {points.map((p, i) => (
          <div key={i} className="flex min-w-0 flex-1 justify-center">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-medium tabular-nums",
                i === hi ? "bg-ink text-surface" : "text-ink-secondary"
              )}
            >
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
