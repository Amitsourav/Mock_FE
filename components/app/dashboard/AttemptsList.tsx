"use client";

import { ChevronRight } from "lucide-react";
import { formatDate, formatPct } from "@/lib/format";
import type { AttemptListItem } from "@/lib/types";

/**
 * Recent attempts, newest first. Each row opens the attempt drill-down — viewing
 * a past result, which is always allowed (no coming-soon gate).
 */
export function AttemptsList({
  attempts,
  onOpen,
}: {
  attempts: AttemptListItem[];
  onOpen: (id: string) => void;
}) {
  // Incoming order is oldest→newest (for the trend); the list reads newest first.
  const rows = [...attempts].reverse();

  return (
    <ul className="flex flex-col divide-y divide-hairline">
      {rows.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => onOpen(a.id)}
            className="group flex w-full items-center gap-4 py-3 text-left transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink">{a.mock_title}</p>
              <p className="mt-0.5 text-[12px] text-ink-secondary">
                {formatDate(a.submitted_at)} · {a.correct}/{a.total_questions} correct
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-[14px] font-semibold text-ink"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {a.score}/{a.max_score}
              </p>
              <p className="text-[12px] text-ink-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatPct(a.accuracy_pct)}
                {a.percentile != null ? ` · ${a.percentile.toFixed(0)}%ile` : ""}
              </p>
            </div>
            <ChevronRight
              className="size-4 shrink-0 text-ink-secondary transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
