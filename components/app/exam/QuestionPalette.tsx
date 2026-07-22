"use client";

import { cn } from "@/lib/utils";
import type { Paper } from "@/lib/types";

type Status = "current" | "answered" | "not_answered" | "review" | "not_attempted";

/**
 * The question you're on wins (blue), then Review (marked), then Answered, then
 * seen-but-unanswered (Not answered), else Not attempted. "Current" being its own
 * colour means the active question never shows an alarming red/orange while you're
 * still on it.
 */
function statusOf(isCurrent: boolean, answered: boolean, marked: boolean, visited: boolean): Status {
  if (isCurrent) return "current";
  if (marked) return "review";
  if (answered) return "answered";
  if (visited) return "not_answered";
  return "not_attempted";
}

/** Tile fill for each state. Orange (Not answered) uses a token, so via inline style. */
const FILL: Record<Status, string> = {
  current: "bg-brand-fill text-white",
  answered: "bg-success text-white",
  review: "bg-ink text-surface",
  not_answered: "text-white",
  not_attempted: "border border-hairline-strong bg-surface text-ink",
};

function fillStyle(status: Status): React.CSSProperties | undefined {
  return status === "not_answered" ? { backgroundColor: "var(--et-careless)" } : undefined;
}

const LABEL: Record<Status, string> = {
  current: "current",
  answered: "answered",
  not_answered: "not answered",
  review: "marked for review",
  not_attempted: "not attempted",
};

/** A small round legend dot in the state's colour. */
function Dot({ status }: { status: Status }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-3.5 rounded-full", FILL[status])}
      style={fillStyle(status)}
    />
  );
}

/** The horizontal 5-state key, for the bottom action bar. */
export function PaletteLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-secondary",
        className
      )}
    >
      <span className="flex items-center gap-2">
        <Dot status="current" /> Current
      </span>
      <span className="flex items-center gap-2">
        <Dot status="not_attempted" /> Not attempted
      </span>
      <span className="flex items-center gap-2">
        <Dot status="answered" /> Answered
      </span>
      <span className="flex items-center gap-2">
        <Dot status="not_answered" /> Not answered
      </span>
      <span className="flex items-center gap-2">
        <Dot status="review" /> Review
      </span>
    </div>
  );
}

/**
 * A jump grid of every question, grouped by section, coloured by the 5-state
 * model: Current · Not attempted · Answered · Not answered · Review. State is
 * carried by fill + the number + an aria-label — never colour alone.
 */
export function QuestionPalette({
  paper,
  answers,
  marked,
  visited,
  currentIndex,
  onJump,
}: {
  paper: Paper;
  answers: Record<string, string>;
  marked: Record<string, boolean>;
  visited: Record<string, boolean>;
  currentIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {paper.sections.map((section) => {
        const qs = paper.questions.filter((q) => q.section_code === section.code);
        return (
          <div key={section.code}>
            <p className="mb-2.5 text-[13px] font-medium text-ink">
              {section.name} <span className="text-ink-secondary">· {section.count}</span>
            </p>
            <div className="grid grid-cols-5 gap-2">
              {qs.map((q) => {
                const answered = Boolean(answers[q.id]);
                const isMarked = Boolean(marked[q.id]);
                const wasVisited = Boolean(visited[q.id]);
                const isCurrent = paper.questions[currentIndex]?.id === q.id;
                const status = statusOf(isCurrent, answered, isMarked, wasVisited);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onJump(q.position - 1)}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`Question ${q.position}: ${LABEL[status]}`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-[10px] text-[13px] font-semibold tabular-nums outline-none transition-transform hover:scale-[1.06] focus-visible:ring-2 focus-visible:ring-brand",
                      FILL[status]
                    )}
                    style={fillStyle(status)}
                  >
                    {q.position}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
