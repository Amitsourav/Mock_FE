"use client";

import { TrendingDown } from "lucide-react";
import type { ConceptMastery } from "@/lib/types";

/** Mastery band → colour + label. Never colour-only: the % and label always show. */
function masteryBand(p: number): { color: string; label: string } {
  if (p < 0.5) return { color: "var(--et-conceptual)", label: "Weak" };
  if (p < 0.8) return { color: "var(--et-careless)", label: "Developing" };
  return { color: "var(--et-correct)", label: "Strong" };
}

/** Forgetting: retained memory has decayed well below what was once mastered. */
function isDecaying(c: ConceptMastery): boolean {
  return c.retention_probability < c.p_mastery - 0.25;
}

/**
 * The primary action surface: concepts to fix next, weakest first (the API
 * already orders by gap_priority). Each row leads with the concept, a mastery
 * bar, its band label, and a "forgetting" flag when retention has decayed.
 */
export function ReadyToFix({ concepts }: { concepts: ConceptMastery[] }) {
  if (concepts.length === 0) {
    return <p className="text-[14px] text-ink-secondary">No concept data yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {concepts.map((c) => {
        const pct = Math.round(Math.max(0, Math.min(1, c.p_mastery)) * 100);
        const band = masteryBand(c.p_mastery);
        const decaying = isDecaying(c);
        return (
          <li key={c.kc_code}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-ink">{c.kc_name}</p>
                <p className="text-[12px] text-ink-secondary">{c.subject_name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {decaying ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--et-careless) 14%, transparent)",
                      color: "var(--et-careless)",
                    }}
                  >
                    <TrendingDown className="size-3" strokeWidth={2.5} aria-hidden="true" />
                    Forgetting
                  </span>
                ) : null}
                <span
                  className="text-[13px] font-semibold"
                  style={{ fontVariantNumeric: "tabular-nums", color: band.color }}
                >
                  {pct}%
                </span>
              </div>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-field"
              role="img"
              aria-label={`${c.kc_name}: ${pct}% mastery (${band.label})${decaying ? ", memory decaying" : ""}.`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%`, backgroundColor: band.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
