"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type LollipopPoint = {
  /** Short chip text under the stem (attempt number). */
  label: string;
  /** Hover/assistive description (mock title · date). */
  title: string;
  value: number;
  /** Tooltip/pill text — e.g. "90.5% · 88.9 %ile". Falls back to format(value). */
  pill?: string;
};

/**
 * A lollipop-line trend: every mock gets a solid ink stem with a dot head, a
 * connecting line runs through all the dots (drawn in after the stems rise),
 * and the latest attempt carries a tooltip pill with accuracy + percentile.
 * Round label chips sit along the baseline, the active chip dark. Pure
 * CSS/SVG, no chart library. Values are clamped to [0, max].
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
  // Hovering any column moves the pill (and dot emphasis) to that attempt.
  // (Declared before the empty-points return — hooks must run unconditionally.)
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) return null;
  const hi = points.length - 1; // latest attempt carries the highlight by default
  const active = hover ?? hi;

  const heightPct = (v: number) => Math.max((Math.max(0, Math.min(max, v)) / max) * 100, 3);
  // Column centres in a gapless equal-width flex row → exact (i + ½)/n.
  const linePoints = points
    .map((p, i) => `${(((i + 0.5) / points.length) * 100).toFixed(2)},${(100 - heightPct(p.value)).toFixed(2)}`)
    .join(" ");

  return (
    <div
      role="img"
      aria-label={`Trend across ${points.length} attempts: ${points
        .map((p) => `${p.title} ${p.pill ?? format(p.value)}`)
        .join(", ")}.`}
    >
      {/* Chart area. Top padding reserves room for the tooltip pill at 100%. */}
      <div className="relative">
        {/* Connecting line through the dot heads — fades in after the stems rise.
            NOTE: a dash-based "draw-in" (strokeDasharray + pathLength) is NOT
            usable here — this SVG has preserveAspectRatio="none" and
            vectorEffect="non-scaling-stroke", which push the dash pattern into
            pixel space and make pathLength ineffective, so the line renders as
            broken segments. A plain opacity fade avoids that entirely. */}
        {/* w-full is load-bearing: an absolutely-positioned SVG is a replaced
            element, so left/right-0 alone would NOT stretch it — it collapses
            to its intrinsic square and the line piles up in the corner. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-12 h-40 w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity="0.8"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="animate-dot"
            style={{ animationDelay: "620ms" }}
          />
        </svg>

        <div className="flex items-end pt-12">
          {points.map((p, i) => {
            const pct = heightPct(p.value);
            const isHi = i === hi;
            const isActive = i === active;
            return (
              <div
                key={i}
                className="relative h-40 min-w-0 flex-1"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {/* stem — every mock gets a solid ink line; they rise in sequence */}
                <div
                  className="animate-stem absolute bottom-0 left-1/2 w-[2.5px] -translate-x-1/2 rounded-full bg-ink"
                  style={{ height: `${pct}%`, animationDelay: `${i * 55}ms` }}
                />
                {/* dot head — grows slightly while its pill is showing */}
                <div
                  className={cn(
                    "animate-dot absolute left-1/2 size-2.5 -translate-x-1/2 rounded-full ring-2 ring-surface-card transition-transform duration-150",
                    isHi ? "bg-ink" : "bg-brand",
                    isActive && "scale-125"
                  )}
                  style={{
                    bottom: `calc(${pct}% - 4px)`,
                    animationDelay: `${i * 55 + 320}ms`,
                  }}
                />
                {/* tooltip pill — follows the hovered attempt, rests on the latest.
                    Entrance animation only applies to the resting pill; a hovered
                    pill must appear instantly (no staggered delay). */}
                {isActive ? (
                  <span
                    className={cn(
                      "absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-ink text-surface",
                      hover === null
                        ? "animate-dot rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        : "rounded-[10px] px-3 py-1.5 text-center"
                    )}
                    style={{
                      bottom: `calc(${pct}% + 10px)`,
                      ...(hover === null ? { animationDelay: `${i * 55 + 420}ms` } : {}),
                    }}
                  >
                    {hover === null ? (
                      p.pill ?? format(p.value)
                    ) : (
                      <>
                        <span className="block max-w-[260px] truncate text-[10px] text-surface/70">
                          {p.title}
                        </span>
                        <span className="block text-[11px] font-semibold">
                          {p.pill ?? format(p.value)}
                        </span>
                      </>
                    )}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Baseline chips — attempt numbers, latest dark. */}
      <div className="mt-3 flex border-t border-hairline pt-3">
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
