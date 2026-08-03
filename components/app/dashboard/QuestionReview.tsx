"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flag, Lightbulb, Timer, X } from "lucide-react";
import { Modal } from "@/components/app/Modal";
import { Skeleton } from "@/components/app/Skeleton";
import { QuestionContent, isFigureOption } from "@/components/app/exam/QuestionContent";
import { ApiError, getQuestionReview } from "@/lib/api";
import { ERROR_TYPE_BY_KEY, errorTypeColor } from "@/lib/errorTypes";
import { formatMs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AttemptQuestion, AttemptQuestionReview, ReviewOption } from "@/lib/types";

/**
 * The marked script. Reviewing is a sequence, not a lookup, so the popup is
 * built to be walked: ← / → step through the paper without closing, and each
 * question's verdict lands as a single stamped accent on an otherwise quiet
 * sheet. The answer key is the only place colour is loud — and it is always
 * paired with an icon and a written label, per lib/errorTypes.
 *
 * Content comes from `GET /dashboard/attempts/{id}/questions/{n}`. That endpoint
 * may not exist yet: when it fails, the popup keeps the diagnosis it already has
 * from the attempt report (error type, concept, timing) and says plainly that
 * the paper text isn't available, rather than showing a broken shell.
 */
export function QuestionReview({
  attemptId,
  questions,
  openNo,
  onNavigate,
  onClose,
  onUnauthorized,
}: {
  attemptId: string;
  /** The whole paper, for navigation and the timing comparison. */
  questions: AttemptQuestion[];
  /** The question on screen; null closes the popup. */
  openNo: number | null;
  onNavigate: (questionNo: number) => void;
  onClose: () => void;
  onUnauthorized: () => void;
}) {
  const [review, setReview] = useState<AttemptQuestionReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // Walking the paper must not refetch what we've already read.
  const cache = useRef(new Map<number, AttemptQuestionReview>());
  const scroller = useRef<HTMLDivElement>(null);

  const index = questions.findIndex((q) => q.question_no === openNo);
  const meta = index >= 0 ? questions[index] : null;
  const prev = index > 0 ? questions[index - 1] : null;
  const next = index >= 0 && index < questions.length - 1 ? questions[index + 1] : null;

  useEffect(() => {
    if (openNo == null) return;
    const cached = cache.current.get(openNo);
    if (cached) {
      setReview(cached);
      setUnavailable(false);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setUnavailable(false);
    setReview(null);
    getQuestionReview(attemptId, openNo)
      .then((r) => {
        if (!active) return;
        cache.current.set(openNo, r);
        setReview(r);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.unauthorized) {
          onUnauthorized();
          return;
        }
        // Any failure reads the same to the student: the paper isn't available.
        setUnavailable(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attemptId, openNo, onUnauthorized]);

  // Every question starts at the top of its own sheet. Without this, stepping
  // to a longer question keeps the previous one's scroll offset and the new
  // stem opens already scrolled past — it reads as a clipped popup.
  // Runs on `review` too: the body is a skeleton while loading, so resetting on
  // `openNo` alone would scroll a placeholder and leave the real content offset.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [openNo, review]);

  // ← / → walk the paper. Ignored while a text field has focus, so this can
  // never fight a future search box inside the popup.
  useEffect(() => {
    if (openNo == null) return;
    function onKey(event: KeyboardEvent) {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft" && prev) {
        event.preventDefault();
        onNavigate(prev.question_no);
      } else if (event.key === "ArrowRight" && next) {
        event.preventDefault();
        onNavigate(next.question_no);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openNo, prev, next, onNavigate]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  if (openNo == null || !meta) return null;

  const verdict = ERROR_TYPE_BY_KEY[meta.error_type] ?? ERROR_TYPE_BY_KEY.unattempted;
  const VerdictIcon = verdict.Icon;
  const verdictColor = errorTypeColor(meta.error_type);

  // Pace, measured against this student's own paper — no backend needed.
  const timed = questions.filter((q) => q.time_spent_ms > 0);
  const avgMs = timed.length > 0 ? timed.reduce((s, q) => s + q.time_spent_ms, 0) / timed.length : 0;
  const paceDelta = meta.time_spent_ms > 0 && avgMs > 0 ? meta.time_spent_ms - avgMs : null;

  const conceptLabel = review?.kc_name ?? meta.kc_code;

  return (
    <Modal open onClose={handleClose} size="xl" labelledBy="qr-heading">
      {/* A FIXED frame, not a content-sized one. The popup is walked with
          Previous/Next, and a max-height panel re-centres itself on every
          question — so the header, close button and Next all jump as the
          content grows or shrinks. Pinning the height keeps the chrome
          anchored and lets only the sheet inside move. Capped in px so it
          doesn't become a vast empty page on a tall monitor. */}
      <div className="flex h-[min(88dvh,840px)] flex-col">
        {/* ---------- Masthead: the stamped verdict on the script ---------- */}
        <header className="shrink-0 border-b border-hairline px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-secondary">
                Question review
              </p>
              <h2 id="qr-heading" className="mt-1.5 flex items-baseline gap-2">
                <span
                  className="font-display text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  Q{meta.question_no}
                </span>
                <span
                  className="text-[13px] text-ink-secondary"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  of {questions.length}
                </span>
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* The one loud element on the sheet. Icon + word, never hue alone. */}
              <span
                key={meta.question_no}
                className="animate-stamp inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold"
                style={{
                  backgroundColor: `color-mix(in srgb, ${verdictColor} 14%, transparent)`,
                  color: verdictColor,
                }}
              >
                <VerdictIcon className="size-3.5" strokeWidth={3} aria-hidden="true" />
                {verdict.label}
              </span>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close question review"
                className="grid size-9 place-items-center rounded-full border border-hairline text-ink-secondary transition-colors hover:bg-surface-field hover:text-ink"
              >
                <X className="size-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Provenance strip — where this question came from in the paper. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-ink-secondary">
            <Chip>{meta.section_name}</Chip>
            {conceptLabel ? <Chip>{conceptLabel}</Chip> : null}
            {meta.difficulty ? <Chip>{titleCase(meta.difficulty)}</Chip> : null}
            {meta.marked_for_review ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[12px] font-medium text-brand">
                <Flag className="size-3" strokeWidth={2.5} aria-hidden="true" />
                You flagged this
              </span>
            ) : null}
          </div>
        </header>

        {/* ---------- The script ---------- */}
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {loading ? (
            <LoadingScript />
          ) : review ? (
            <div className="flex flex-col gap-5">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <section aria-label="Question" className="min-w-0">
                {review.stimulus_md ? (
                  <div className="mb-4 rounded-[14px] border border-hairline bg-surface-field/60 p-4">
                    <QuestionContent md={review.stimulus_md} />
                  </div>
                ) : null}
                <QuestionContent md={review.content_md} className="text-[16.5px]" />
              </section>

              <section aria-label="Answer options" className="min-w-0">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-secondary">
                  The answer key
                </p>
                <OptionList review={review} />

                {review.selected_option_id == null ? (
                  <p className="mt-3 rounded-[12px] border border-dashed border-hairline px-3.5 py-2.5 text-[13px] text-ink-secondary">
                    You left this one unattempted.
                  </p>
                ) : null}

              </section>
            </div>

            {/* Full width, below both columns: worked solutions run long and
                read badly in a half-width gutter, and keeping it out of the
                options column stops that column towering over the stem. */}
            {review.explanation_md ? (
              <section
                aria-label="Explanation"
                className="rounded-[14px] border border-hairline bg-surface-field/60 p-4 sm:p-5"
              >
                <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-secondary">
                  <Lightbulb className="size-3.5 text-brand" strokeWidth={2.5} aria-hidden="true" />
                  Why
                </p>
                <QuestionContent md={review.explanation_md} className="text-[14.5px]" />
              </section>
            ) : null}
            </div>
          ) : (
            <Unavailable failed={unavailable} />
          )}
        </div>

        {/* ---------- Footer: pace, then the walk ---------- */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-3.5 sm:px-7">
          <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
            <Timer className="size-3.5" strokeWidth={2} aria-hidden="true" />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatMs(meta.time_spent_ms)}
            </span>
            {paceDelta != null ? (
              <span className="text-ink-secondary/80">
                · {formatMs(Math.abs(paceDelta))} {paceDelta > 0 ? "slower" : "faster"} than your
                average
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <NavButton
              side="prev"
              target={prev}
              onNavigate={onNavigate}
            />
            <NavButton side="next" target={next} onNavigate={onNavigate} />
          </div>
        </footer>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-field px-2.5 py-1 text-[12px] font-medium text-ink-secondary">
      {children}
    </span>
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function NavButton({
  side,
  target,
  onNavigate,
}: {
  side: "prev" | "next";
  target: AttemptQuestion | null;
  onNavigate: (n: number) => void;
}) {
  const Icon = side === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      disabled={!target}
      onClick={() => target && onNavigate(target.question_no)}
      aria-label={
        target
          ? `${side === "prev" ? "Previous" : "Next"} question, Q${target.question_no}`
          : `No ${side === "prev" ? "previous" : "next"} question`
      }
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-[10px] border border-hairline px-3 text-[13px] font-medium text-ink transition-colors",
        "hover:bg-surface-field disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      )}
    >
      {side === "prev" ? <Icon className="size-4" strokeWidth={2} aria-hidden="true" /> : null}
      {side === "prev" ? "Previous" : "Next"}
      {side === "next" ? <Icon className="size-4" strokeWidth={2} aria-hidden="true" /> : null}
    </button>
  );
}

/** How one option was marked. Correctness and choice are separate signals, so
 *  all four combinations read distinctly — including "right for the wrong one". */
function optionVerdict(o: ReviewOption, review: AttemptQuestionReview) {
  const correct = o.is_correct || o.id === review.correct_option_id;
  const picked = o.id === review.selected_option_id;
  if (correct && picked) return { tone: "correct" as const, label: "Your answer · correct" };
  if (correct) return { tone: "correct" as const, label: "Correct answer" };
  if (picked) return { tone: "wrong" as const, label: "Your answer" };
  return { tone: "plain" as const, label: null };
}

const TONE = {
  correct: { color: "var(--success)", Icon: Check },
  wrong: { color: "var(--error)", Icon: X },
} as const;

function OptionList({ review }: { review: AttemptQuestionReview }) {
  const figures =
    review.options.length > 0 && review.options.every((o) => isFigureOption(o.content_md));

  return (
    <ul className={cn("min-w-0", figures ? "grid grid-cols-2 gap-3" : "flex flex-col gap-2.5")}>
      {review.options.map((o) => {
        const { tone, label } = optionVerdict(o, review);
        const marked = tone !== "plain";
        const style = marked ? TONE[tone] : null;
        const letter = o.label ?? String.fromCharCode(65 + o.position - 1);

        return (
          <li
            key={o.id}
            className={cn(
              "relative min-w-0 rounded-[14px] border transition-colors",
              figures ? "p-3 pt-9" : "px-4 py-3",
              marked ? "border-transparent" : "border-hairline bg-surface"
            )}
            style={
              style
                ? {
                    backgroundColor: `color-mix(in srgb, ${style.color} 7%, transparent)`,
                    boxShadow: `inset 0 0 0 1.5px ${style.color}`,
                  }
                : undefined
            }
          >
            <div className={cn("flex min-w-0 gap-3", figures ? "flex-col" : "items-center")}>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
                  figures && "absolute left-3 top-2.5",
                  marked ? "text-white" : "border border-hairline-strong bg-surface-card text-ink-secondary"
                )}
                style={style ? { backgroundColor: style.color } : undefined}
              >
                {letter}
              </span>

              <div className="min-w-0 flex-1">
                <QuestionContent
                  md={o.content_md}
                  className={cn(
                    "text-[15px]",
                    figures && "[&_img]:mx-auto [&_img]:my-0 [&_img]:max-h-[112px] [&_img]:w-auto [&_p]:my-0"
                  )}
                />
              </div>

              {/* The written verdict — the meaning never rests on the fill colour. */}
              {marked && style ? (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold",
                    figures && "justify-center"
                  )}
                  style={{ color: style.color }}
                >
                  <style.Icon className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  {label}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LoadingScript() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading question"
      className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-2 h-32 rounded-[14px]" />
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-[14px]" />
        ))}
      </div>
      <span className="sr-only">Loading question…</span>
    </div>
  );
}

/**
 * The honest empty state. The diagnosis above and the timing below are still
 * real, so this explains precisely what is missing rather than reading as a
 * failure of the whole report.
 */
function Unavailable({ failed }: { failed: boolean }) {
  return (
    // Centred in the fixed frame — a small notice pinned to the top of a tall
    // sheet reads as content that failed to load beneath it.
    <div className="flex h-full flex-col items-center justify-center rounded-[16px] border border-dashed border-hairline px-6 py-10 text-center">
      <p className="text-[15px] font-medium text-ink">
        {failed ? "The paper for this question isn't available" : "Nothing to show yet"}
      </p>
      <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-secondary">
        Your result for it is above — how it was marked, which concept it tested and how long you
        spent. The question text and options aren&apos;t stored for this attempt.
      </p>
    </div>
  );
}
