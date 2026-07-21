"use client";

import { cn } from "@/lib/utils";
import type { Paper } from "@/lib/types";

/**
 * A jump grid of every question, grouped by section and coloured by state
 * (answered / marked / not-answered). State is carried by fill + a ring on the
 * current question and a dot on marked ones — not colour alone.
 */
export function QuestionPalette({
  paper,
  answers,
  marked,
  currentIndex,
  onJump,
}: {
  paper: Paper;
  answers: Record<string, string>;
  marked: Record<string, boolean>;
  currentIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-[5px] bg-brand-fill" /> Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-[5px] border border-hairline bg-surface-field" /> Not answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative size-3.5 rounded-[5px] border border-hairline bg-surface-field">
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand" />
          </span>
          Marked
        </span>
      </div>

      {paper.sections.map((section) => {
        const qs = paper.questions.filter((q) => q.section_code === section.code);
        return (
          <div key={section.code}>
            <p className="mb-2 text-[13px] font-medium text-ink">
              {section.name} <span className="text-ink-secondary">· {section.count}</span>
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(38px,1fr))] gap-1.5">
              {qs.map((q) => {
                const answered = Boolean(answers[q.id]);
                const isMarked = Boolean(marked[q.id]);
                const isCurrent = paper.questions[currentIndex]?.id === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onJump(q.position - 1)}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`Question ${q.position}${answered ? ", answered" : ", not answered"}${
                      isMarked ? ", marked for review" : ""
                    }`}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-[7px] text-[12px] font-medium tabular-nums outline-none transition-transform hover:scale-[1.06] focus-visible:ring-2 focus-visible:ring-brand",
                      answered
                        ? "bg-brand-fill text-brand-on"
                        : "border border-hairline bg-surface-field text-ink",
                      isCurrent && "ring-2 ring-brand ring-offset-2 ring-offset-surface-card"
                    )}
                  >
                    {q.position}
                    {isMarked ? (
                      <span
                        aria-hidden="true"
                        className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand ring-2 ring-surface-card"
                      />
                    ) : null}
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
