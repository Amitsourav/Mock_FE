"use client";

import { formatPct } from "@/lib/format";
import type { SkillStat } from "@/lib/types";

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 92;
const RINGS = [0.25, 0.5, 0.75, 1];

/**
 * Skill-accuracy shape. A supporting visual to the weakest-first bars: the
 * polygon makes the overall profile legible at a glance. Single hue; every axis
 * is labelled, so nothing depends on colour. Needs >= 3 skills to form a shape.
 */
export function SkillRadar({ skills }: { skills: SkillStat[] }) {
  if (skills.length < 3) return null;

  const n = skills.length;
  const angleFor = (i: number) => -Math.PI / 2 + (i / n) * 2 * Math.PI;
  const point = (i: number, r: number) => ({
    x: CENTER + Math.cos(angleFor(i)) * r,
    y: CENTER + Math.sin(angleFor(i)) * r,
  });

  const dataPath =
    skills
      .map((s, i) => {
        const r = (Math.max(0, Math.min(100, s.avg_accuracy_pct)) / 100) * RADIUS;
        const p = point(i, r);
        return `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[300px]"
        role="img"
        aria-label={`Accuracy by skill: ${skills
          .map((s) => `${s.skill_name} ${formatPct(s.avg_accuracy_pct)}`)
          .join(", ")}.`}
      >
        {/* Concentric rings */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={skills
              .map((_, i) => {
                const p = point(i, RADIUS * ring);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="var(--hairline)"
            strokeWidth="1"
          />
        ))}

        {/* Spokes */}
        {skills.map((_, i) => {
          const p = point(i, RADIUS);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke="var(--hairline)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <path d={dataPath} fill="var(--brand)" fillOpacity="0.16" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" />
        {skills.map((s, i) => {
          const r = (Math.max(0, Math.min(100, s.avg_accuracy_pct)) / 100) * RADIUS;
          const p = point(i, r);
          return (
            <circle key={s.skill_code} cx={p.x} cy={p.y} r="3.5" fill="var(--brand)" stroke="var(--surface-card)" strokeWidth="2" />
          );
        })}

        {/* Axis labels */}
        {skills.map((s, i) => {
          const p = point(i, RADIUS + 16);
          const a = angleFor(i);
          const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
          return (
            <text
              key={`lbl-${s.skill_code}`}
              x={p.x}
              y={p.y + 4}
              textAnchor={anchor}
              fontSize="10"
              fill="var(--ink-secondary)"
            >
              {s.skill_name.length > 14 ? `${s.skill_name.slice(0, 13)}…` : s.skill_name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
