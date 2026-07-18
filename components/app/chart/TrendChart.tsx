"use client";

import { useId, useMemo, useState } from "react";

export type TrendPoint = { label: string; value: number };
export type TrendSeries = {
  key: string;
  label: string;
  points: TrendPoint[];
  format: (v: number) => string;
  /** Fixed axis max (e.g. 100 for a percentage); otherwise derived from data. */
  max?: number;
};

const VW = 720;
const VH = 260;
const PAD = { top: 16, right: 20, bottom: 28, left: 44 };

/**
 * A single-measure line+area trend. When given multiple series it shows a toggle
 * rather than plotting two y-scales — a dual-axis chart is never correct, so the
 * reader compares one measure at a time on a clean axis.
 *
 * Themed via CSS custom properties so light/dark are both hand-tuned, not flipped.
 */
export function TrendChart({ series }: { series: TrendSeries[] }) {
  const [activeKey, setActiveKey] = useState(series[0]?.key);
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const active = series.find((s) => s.key === activeKey) ?? series[0];
  const points = useMemo(() => active?.points ?? [], [active]);

  const geom = useMemo(() => {
    const n = points.length;
    const innerW = VW - PAD.left - PAD.right;
    const innerH = VH - PAD.top - PAD.bottom;
    const rawMax = active?.max ?? Math.max(1, ...points.map((p) => p.value));
    // Round the axis top to a clean number so ticks read 0 / 25 / 50…
    const niceMax = active?.max ?? niceCeil(rawMax);
    const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH;
    const coords = points.map((p, i) => ({ ...p, cx: x(i), cy: y(p.value) }));
    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.cx} ${c.cy}`).join(" ");
    const area =
      coords.length > 0
        ? `${line} L ${coords[coords.length - 1].cx} ${PAD.top + innerH} L ${coords[0].cx} ${
            PAD.top + innerH
          } Z`
        : "";
    return { coords, line, area, niceMax, innerH };
  }, [points, active]);

  if (!active || points.length === 0) return null;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: geom.niceMax * t,
    y: PAD.top + geom.innerH - t * geom.innerH,
  }));

  // Sparse x labels: first, last, and a couple between — avoids collisions.
  const labelIdx = new Set(
    points.length <= 4
      ? points.map((_, i) => i)
      : [0, Math.round((points.length - 1) / 2), points.length - 1]
  );

  const hoverPoint = hover != null ? geom.coords[hover] : null;

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const vx = ((event.clientX - rect.left) / rect.width) * VW;
    let nearest = 0;
    let best = Infinity;
    geom.coords.forEach((c, i) => {
      const d = Math.abs(c.cx - vx);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  return (
    <div className="w-full">
      {series.length > 1 ? (
        <div
          role="tablist"
          aria-label="Trend measure"
          className="mb-3 inline-flex gap-1 rounded-[10px] border border-hairline bg-surface-field p-1"
        >
          {series.map((s) => {
            const on = s.key === active.key;
            return (
              <button
                key={s.key}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => {
                  setActiveKey(s.key);
                  setHover(null);
                }}
                className={`rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  on ? "bg-surface-card text-ink shadow-[var(--shadow-card)]" : "text-ink-secondary"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label={`${active.label} over ${points.length} attempts, oldest to newest.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={clipId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Recessive gridlines + y ticks */}
          {yTicks.map((t) => (
            <g key={t.y}>
              <line
                x1={PAD.left}
                x2={VW - PAD.right}
                y1={t.y}
                y2={t.y}
                stroke="var(--hairline)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={t.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--ink-secondary)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {Math.round(t.value)}
              </text>
            </g>
          ))}

          {/* x labels */}
          {geom.coords.map((c, i) =>
            labelIdx.has(i) ? (
              <text
                key={`xl-${i}`}
                x={c.cx}
                y={VH - 8}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                fontSize="11"
                fill="var(--ink-secondary)"
              >
                {c.label}
              </text>
            ) : null
          )}

          <path d={geom.area} fill={`url(#${clipId})`} />
          <path
            d={geom.line}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Endpoint marker + value label */}
          {geom.coords.length > 0
            ? (() => {
                const last = geom.coords[geom.coords.length - 1];
                return (
                  <g>
                    <circle cx={last.cx} cy={last.cy} r="5" fill="var(--brand)" stroke="var(--surface-card)" strokeWidth="2" />
                    <text
                      x={last.cx}
                      y={last.cy - 12}
                      textAnchor="end"
                      fontSize="12"
                      fontWeight="600"
                      fill="var(--ink)"
                    >
                      {active.format(last.value)}
                    </text>
                  </g>
                );
              })()
            : null}

          {/* Hover crosshair + tooltip */}
          {hoverPoint ? (
            <g>
              <line
                x1={hoverPoint.cx}
                x2={hoverPoint.cx}
                y1={PAD.top}
                y2={PAD.top + geom.innerH}
                stroke="var(--hairline-strong)"
                strokeWidth="1"
              />
              <circle
                cx={hoverPoint.cx}
                cy={hoverPoint.cy}
                r="5"
                fill="var(--brand)"
                stroke="var(--surface-card)"
                strokeWidth="2"
              />
              <TooltipBox
                x={hoverPoint.cx}
                y={hoverPoint.cy}
                title={hoverPoint.label}
                value={active.format(hoverPoint.value)}
              />
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}

function TooltipBox({
  x,
  y,
  title,
  value,
}: {
  x: number;
  y: number;
  title: string;
  value: string;
}) {
  const w = 108;
  const h = 40;
  // Flip to the left near the right edge so the box never clips.
  const left = x + w + 12 > VW ? x - w - 10 : x + 10;
  const top = Math.max(PAD.top, y - h - 8);
  return (
    <g pointerEvents="none">
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx="8"
        fill="var(--surface-card)"
        stroke="var(--hairline-strong)"
        strokeWidth="1"
      />
      <text x={left + 10} y={top + 16} fontSize="11" fill="var(--ink-secondary)">
        {title}
      </text>
      <text x={left + 10} y={top + 31} fontSize="13" fontWeight="600" fill="var(--ink)">
        {value}
      </text>
    </g>
  );
}

/** Round up to a friendly axis maximum (25, 50, 100, 250…). */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}
