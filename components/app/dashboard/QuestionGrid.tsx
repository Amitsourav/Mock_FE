"use client";

import { useCallback, useState } from "react";
import { Flag } from "lucide-react";
import { QuestionReview } from "@/components/app/dashboard/QuestionReview";
import { ERROR_TYPES, ERROR_TYPE_BY_KEY, errorTypeColor } from "@/lib/errorTypes";
import { formatMs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AttemptQuestion } from "@/lib/types";

/** Translucent fill + solid icon colour for an error type, theme-aware. */
function cellStyle(key: AttemptQuestion["error_type"]): React.CSSProperties {
  const color = errorTypeColor(key);
  return { backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color };
}

/**
 * Per-question grid, coloured by error_type. Each type also has a unique ICON
 * and a labelled legend, so careless (amber) vs conceptual (red) is separable by
 * shape, not hue alone — the accessibility guarantee for the mandated palette.
 * Hover/focus reveals the concept (kc), section, timing and difficulty.
 *
 * With an `attemptId`, every cell also opens the full question review. It is
 * omitted on the public share page, which has no session to fetch the paper
 * with — there the grid stays a read-only heat map, exactly as before.
 */
export function QuestionGrid({
  questions,
  attemptId,
  onUnauthorized,
}: {
  questions: AttemptQuestion[];
  /** Enables the review popup. Absent → cells are not clickable. */
  attemptId?: string;
  onUnauthorized?: () => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [openNo, setOpenNo] = useState<number | null>(null);
  const activeQ = active != null ? questions.find((q) => q.question_no === active) ?? null : null;
  const reviewable = Boolean(attemptId);

  const closeReview = useCallback(() => setOpenNo(null), []);
  const noop = useCallback(() => {}, []);

  // Only show legend entries that actually occur in this attempt.
  const present = new Set(questions.map((q) => q.error_type));
  const legend = ERROR_TYPES.filter((t) => present.has(t.key));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
        {legend.map(({ key, label, Icon }) => (
          <span key={key} className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
            <span
              className="flex size-4 items-center justify-center rounded-[5px]"
              style={cellStyle(key)}
            >
              <Icon className="size-3" strokeWidth={3} aria-hidden="true" />
            </span>
            {label}
          </span>
        ))}
        {reviewable ? (
          <span className="ml-auto text-[12px] font-medium text-brand">
            Select any question to review it
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(34px,1fr))] gap-1.5">
        {questions.map((q) => {
          // Fall back gracefully if the backend ever sends an unknown error_type.
          const meta = ERROR_TYPE_BY_KEY[q.error_type] ?? ERROR_TYPE_BY_KEY.unattempted;
          const Icon = meta.Icon;
          return (
            <button
              key={q.question_no}
              type="button"
              onMouseEnter={() => setActive(q.question_no)}
              onFocus={() => setActive(q.question_no)}
              onMouseLeave={() => setActive((cur) => (cur === q.question_no ? null : cur))}
              onBlur={() => setActive((cur) => (cur === q.question_no ? null : cur))}
              onClick={reviewable ? () => setOpenNo(q.question_no) : undefined}
              aria-haspopup={reviewable ? "dialog" : undefined}
              aria-label={`Question ${q.question_no}: ${meta.label}, ${formatMs(q.time_spent_ms)}${
                q.kc_code ? `, ${q.kc_code}` : ""
              }${q.marked_for_review ? ", marked for review" : ""}${
                reviewable ? ". Open review" : ""
              }`}
              style={cellStyle(q.error_type)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-[7px] outline-none ring-brand transition-transform focus-visible:ring-2 hover:scale-[1.08]",
                reviewable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <Icon className="size-3.5" strokeWidth={3} aria-hidden="true" />
              {q.marked_for_review ? (
                <Flag
                  className="absolute -right-0.5 -top-0.5 size-2.5 text-brand"
                  strokeWidth={3}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Reserve a line so hovering doesn't shift layout */}
      <div className="mt-3 min-h-[20px] text-[12px] text-ink-secondary" aria-live="polite">
        {activeQ ? (
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            <span className="font-medium text-ink">Q{activeQ.question_no}</span> ·{" "}
            {(ERROR_TYPE_BY_KEY[activeQ.error_type] ?? ERROR_TYPE_BY_KEY.unattempted).label} ·{" "}
            {activeQ.section_name}
            {activeQ.kc_code ? ` · ${activeQ.kc_code}` : ""} · {formatMs(activeQ.time_spent_ms)}
            {activeQ.difficulty ? ` · ${activeQ.difficulty}` : ""}
            {activeQ.marked_for_review ? " · flagged" : ""}
          </span>
        ) : null}
      </div>

      {attemptId ? (
        <QuestionReview
          attemptId={attemptId}
          questions={questions}
          openNo={openNo}
          onNavigate={setOpenNo}
          onClose={closeReview}
          onUnauthorized={onUnauthorized ?? noop}
        />
      ) : null}
    </div>
  );
}
