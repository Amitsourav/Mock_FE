"use client";

import { formatMs, formatPct } from "@/lib/format";
import type { SkillStat } from "@/lib/types";

/**
 * Weakest-first skill accuracy. Encoding is bar LENGTH (accuracy), single hue —
 * so it carries no color-only meaning and needs no CVD check. The value rides
 * the tip; average time sits alongside as supporting context.
 */
export function SkillBars({ skills }: { skills: SkillStat[] }) {
  if (skills.length === 0) return null;

  return (
    <ul className="flex flex-col gap-3.5">
      {skills.map((skill) => {
        const pct = Math.max(0, Math.min(100, skill.avg_accuracy_pct));
        return (
          <li key={skill.skill_code}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-ink">{skill.skill_name}</span>
              <span
                className="text-[13px] text-ink-secondary"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatPct(skill.avg_accuracy_pct)}
                <span className="ml-2 text-ink-secondary/70">{formatMs(skill.avg_time_ms)}/q</span>
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-field"
              role="img"
              aria-label={`${skill.skill_name}: ${formatPct(skill.avg_accuracy_pct)} average accuracy over ${skill.attempts} attempts.`}
            >
              <div
                className="h-full rounded-full bg-brand-fill transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
