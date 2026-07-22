"use client";

import { ERROR_TYPES, errorTypeColor } from "@/lib/errorTypes";
import type { ErrorDistribution } from "@/lib/types";

const SIZE = 180;
const R = 70;
const STROKE = 26;
const C = 2 * Math.PI * R;

/**
 * Error-type breakdown as a donut. Every slice is also named in the legend with
 * its icon and count, so the split is never colour-only — the tight
 * conceptual/careless pair is separated by icon + label, not hue alone.
 */
export function ErrorDonut({ distribution }: { distribution: ErrorDistribution }) {
  const slices = ERROR_TYPES.map((t) => ({ ...t, value: distribution[t.key] ?? 0 }));
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="text-[14px] text-ink-secondary">No question data yet.</p>;
  }

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-[150px] w-[150px] shrink-0 -rotate-90"
        role="img"
        aria-label={`Error breakdown: ${slices.map((s) => `${s.label} ${s.value}`).join(", ")}.`}
      >
        {slices.map((s) => {
          if (s.value === 0) return null;
          const frac = s.value / total;
          const dash = frac * C;
          // 2px surface gap between slices so neighbours read distinct.
          const gap = 2;
          const seg = (
            <circle
              key={s.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={errorTypeColor(s.key)}
              strokeWidth={STROKE}
              strokeDasharray={`${Math.max(0, dash - gap)} ${C - Math.max(0, dash - gap)}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return seg;
        })}
        {/* centre total */}
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(90 ${SIZE / 2} ${SIZE / 2})`}
          fontSize="26"
          fontWeight="600"
          fill="var(--ink)"
        >
          {total}
        </text>
      </svg>

      <ul className="flex w-full flex-col gap-2">
        {slices.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <li key={s.key} className="flex items-center gap-2.5 text-[13px]">
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-[6px]"
                style={{
                  backgroundColor: `color-mix(in srgb, ${errorTypeColor(s.key)} 16%, transparent)`,
                  color: errorTypeColor(s.key),
                }}
              >
                <s.Icon className="size-3" strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1 truncate text-ink">{s.label}</span>
              {/* nowrap + shrink-0: in a narrow tile the value must never break
                  at the "·" — the label truncates instead. */}
              <span
                className="shrink-0 whitespace-nowrap text-ink-secondary"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {s.value} · {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
