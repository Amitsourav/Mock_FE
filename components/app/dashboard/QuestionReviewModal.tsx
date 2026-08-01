"use client";

import { useEffect, useState } from "react";
import { Check, Flag } from "lucide-react";
import { Modal } from "@/components/app/Modal";
import { QuestionContent } from "@/components/app/exam/QuestionContent";
import { Skeleton } from "@/components/app/Skeleton";
import { ApiError, getQuestionReview } from "@/lib/api";
import { errorTypeColor } from "@/lib/errorTypes";
import { formatMs } from "@/lib/format";
import type { OptionReview, QuestionReview } from "@/lib/types";

const GREEN = errorTypeColor("correct");
const RED = errorTypeColor("conceptual");

/** Translucent tint + solid edge for a semantic colour, theme-aware. */
function tint(color: string, fill = 8, border = 45): React.CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, ${color} ${fill}%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} ${border}%, transparent)`,
  };
}

/** Green "Correct" / red "Incorrect" / muted "Not answered" for the verdict. */
function VerdictChip({ isCorrect }: { isCorrect: boolean | null }) {
  if (isCorrect === true) {
    return (
      <span
        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold"
        style={{ ...tint(GREEN, 12), color: GREEN }}
      >
        Correct
      </span>
    );
  }
  if (isCorrect === false) {
    return (
      <span
        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold"
        style={{ ...tint(RED, 12), color: RED }}
      >
        Incorrect
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-hairline bg-surface-field px-2 py-0.5 text-[12px] font-medium text-ink-secondary">
      Not answered
    </span>
  );
}

/** One option row, styled by whether it's the right answer and/or the pick. */
function OptionRow({ option }: { option: OptionReview }) {
  const { is_correct, is_selected } = option;
  const color = is_correct ? GREEN : is_selected ? RED : null;
  const tag = is_correct
    ? is_selected
      ? "Your answer ✓"
      : "Correct answer"
    : is_selected
      ? "Your answer"
      : null;

  return (
    <li
      className="flex gap-3 rounded-[12px] border p-3"
      style={color ? tint(color) : { borderColor: "var(--hairline)" }}
    >
      <span
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold"
        style={color ? { ...tint(color, 16), color } : { borderColor: "var(--hairline)", color: "var(--ink-secondary)" }}
      >
        {is_correct ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : option.label ?? "•"}
      </span>
      <div className="min-w-0 flex-1">
        <QuestionContent md={option.content_md} className="text-[15px]" />
        {tag ? (
          <span className="mt-1 inline-block text-[11px] font-semibold" style={{ color: color ?? undefined }}>
            {tag}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ReviewBody({ q }: { q: QuestionReview }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header meta row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-secondary">
        <span className="font-medium text-ink">Q{q.question_no}</span>
        {q.section_name ? <span>· {q.section_name}</span> : null}
        <VerdictChip isCorrect={q.is_correct} />
        {q.time_spent_ms ? <span>· {formatMs(q.time_spent_ms)}</span> : null}
        {q.difficulty ? <span>· {q.difficulty}</span> : null}
        {q.marked_for_review ? (
          <span className="inline-flex items-center gap-1 text-brand">
            <Flag className="size-3" strokeWidth={2.5} aria-hidden="true" /> flagged
          </span>
        ) : null}
      </div>

      {q.detail_available === false ? (
        <p className="rounded-[12px] bg-surface-field p-3.5 text-[13px] text-ink-secondary">
          Full review isn&apos;t available for this older attempt.
        </p>
      ) : (
        <>
          {/* Shared passage / stimulus */}
          {q.stimulus_md ? (
            <div className="rounded-[12px] bg-surface-field p-3.5">
              <QuestionContent md={q.stimulus_md} className="text-[15px]" />
            </div>
          ) : null}

          {/* Question body */}
          <QuestionContent md={q.content_md} />

          {/* Options */}
          <ul className="flex flex-col gap-2">
            {q.options.map((o) => (
              <OptionRow key={o.id} option={o} />
            ))}
          </ul>

          {q.selected_label == null ? (
            <p className="text-[13px] text-ink-secondary">You didn&apos;t answer this question.</p>
          ) : null}

          {/* Worked solution */}
          {q.solution_md ? (
            <div className="rounded-[14px] border border-hairline bg-surface-field p-4">
              <p className="mb-2 text-[13px] font-semibold text-ink">Solution</p>
              {q.final_answer ? (
                <p className="mb-1 text-[14px] font-semibold text-ink">{q.final_answer}</p>
              ) : null}
              <QuestionContent md={q.solution_md} className="text-[15px]" />
            </div>
          ) : null}

          {/* Skills */}
          {q.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {q.skills.map((s) => (
                <span
                  key={s.code}
                  className="rounded-full border border-hairline bg-surface-field px-2.5 py-1 text-[11px] font-medium text-ink-secondary"
                >
                  {s.name}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Drill-down for a single answered question, opened from the per-question grid.
 * Fetches on mount (keyed by question number, so a new pick remounts fresh) and
 * shows the options with the correct answer and the candidate's choice marked,
 * plus the worked solution. Read-only — no test is started here.
 */
export function QuestionReviewModal({
  attemptId,
  questionNo,
  onClose,
  onUnauthorized,
}: {
  attemptId: string;
  questionNo: number;
  onClose: () => void;
  onUnauthorized?: () => void;
}) {
  const [data, setData] = useState<QuestionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getQuestionReview(attemptId, questionNo)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.unauthorized) {
          onUnauthorized?.();
          return;
        }
        setError(err instanceof ApiError ? err.message : "Couldn't load this question.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attemptId, questionNo, onUnauthorized]);

  return (
    <Modal open onClose={onClose} title={`Question ${questionNo}`} size="lg" showClose>
      <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
        {loading ? (
          <div role="status" aria-busy="true" aria-label="Loading question" className="flex flex-col gap-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <span className="sr-only">Loading question…</span>
          </div>
        ) : error ? (
          <p role="alert" className="text-[14px] text-ink-secondary">
            {error}
          </p>
        ) : data ? (
          <ReviewBody q={data} />
        ) : null}
      </div>
    </Modal>
  );
}
