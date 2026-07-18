"use client";

import { Clock, ListChecks, SignalHigh } from "lucide-react";
import { Button } from "@/components/Button";
import { useAppActions } from "@/components/app/app-context";
import { formatDuration } from "@/lib/format";
import type { MockTest } from "@/lib/types";

/** A capitalised, human difficulty label ("easy" → "Easy"). */
function difficultyLabel(value: string | null): string | null {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * One mock. Its primary CTA is hard-wired to the coming-soon gate — there is no
 * prop to make it launch a test, by design, because no test player exists yet.
 */
export function MockCard({ mock }: { mock: MockTest }) {
  const { openComingSoon } = useAppActions();
  const difficulty = difficultyLabel(mock.difficulty);

  return (
    <article className="flex flex-col rounded-[14px] border border-hairline bg-surface p-4">
      <h4 className="text-[15px] font-semibold leading-snug text-ink">{mock.title}</h4>
      {mock.description ? (
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-secondary">
          {mock.description}
        </p>
      ) : null}

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-secondary">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" strokeWidth={2} aria-hidden="true" />
          <dt className="sr-only">Duration</dt>
          <dd>{formatDuration(mock.duration_seconds)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <ListChecks className="size-3.5" strokeWidth={2} aria-hidden="true" />
          <dt className="sr-only">Questions</dt>
          <dd>{mock.total_questions} questions</dd>
        </div>
        {difficulty ? (
          <div className="flex items-center gap-1.5">
            <SignalHigh className="size-3.5" strokeWidth={2} aria-hidden="true" />
            <dt className="sr-only">Difficulty</dt>
            <dd>{difficulty}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4">
        <Button type="button" onClick={openComingSoon} className="h-[44px] text-[15px]">
          Start test
        </Button>
      </div>
    </article>
  );
}
