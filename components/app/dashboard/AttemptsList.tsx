"use client";

import { ChevronDown } from "lucide-react";
import { formatDate, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AttemptListItem } from "@/lib/types";

/**
 * Recent attempts, newest first — each row is an explicit "view result"
 * control (bordered card + labelled pill, not a bare list line), and the
 * opened attempt's full report expands inline directly beneath its row.
 */
export function AttemptsList({
  attempts,
  openId,
  onToggle,
  detail,
  detailRef,
}: {
  attempts: AttemptListItem[];
  /** The attempt whose report is expanded (null = all collapsed). */
  openId: string | null;
  onToggle: (id: string) => void;
  /** The rendered report for `openId`, mounted under its row. */
  detail: React.ReactNode;
  /** Ref to the expanded region, for scroll-into-view. */
  detailRef: React.Ref<HTMLDivElement>;
}) {
  // Incoming order is oldest→newest (for the trend); the list reads newest first.
  const rows = [...attempts].reverse();

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((a) => {
        const open = a.id === openId;
        return (
          <li
            key={a.id}
            className={cn(
              "overflow-hidden rounded-[14px] border transition-colors",
              open
                ? "border-brand/45 bg-brand/[0.04]"
                : "border-hairline bg-surface hover:border-hairline-strong hover:bg-surface-field/50"
            )}
          >
            <button
              type="button"
              onClick={() => onToggle(a.id)}
              aria-expanded={open}
              className="group flex w-full items-center gap-4 px-4 py-3 text-left"
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
              {/* The affordance: a labelled pill, not a bare chevron. */}
              <span
                className={cn(
                  "hidden shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors sm:inline-flex",
                  open
                    ? "bg-brand-fill text-brand-on"
                    : "border border-brand/40 text-brand group-hover:bg-brand-fill group-hover:text-brand-on"
                )}
              >
                {open ? "Hide result" : "View result"}
                <ChevronDown
                  className={cn("size-3.5 transition-transform duration-300", open && "rotate-180")}
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </span>
              {/* Mobile: compact circular affordance with the same states. */}
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full transition-colors sm:hidden",
                  open ? "bg-brand-fill text-brand-on" : "border border-brand/40 text-brand"
                )}
                aria-hidden="true"
              >
                <ChevronDown
                  className={cn("size-4 transition-transform duration-300", open && "rotate-180")}
                  strokeWidth={2.5}
                />
              </span>
            </button>

            {/* Inline report — mounts only for the open row. */}
            {open ? (
              <div
                ref={detailRef}
                className="reveal scroll-mt-24 border-t border-brand/20 bg-surface px-4 py-4 sm:px-5"
              >
                {detail}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
