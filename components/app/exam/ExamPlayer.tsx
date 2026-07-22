"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Grid3x3,
  Loader2,
  Maximize,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/app/Modal";
import { QuestionContent } from "@/components/app/exam/QuestionContent";
import { PaletteLegend, QuestionPalette } from "@/components/app/exam/QuestionPalette";
import { useExamIntegrity } from "@/components/app/exam/useExamIntegrity";
import {
  ApiError,
  getCurrentAttempt,
  getPaper,
  saveAnswer,
  startAttempt,
  submitAttempt,
} from "@/lib/api";
import { formatClock, formatDuration } from "@/lib/format";
import type { Paper, PaperQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUBMIT_FALLBACK =
  "We're checking your answers — we'll let you know once your result is ready.";

type Phase =
  | { name: "loading" }
  | { name: "error"; message: string }
  | { name: "ready" } // paper loaded; awaiting the fullscreen "Begin" gesture
  | { name: "playing" }
  | { name: "submitting" }
  | { name: "submitted"; message: string };

/**
 * The full-screen dMAT test player: a linear Next/Back sequence over the whole
 * paper, one overall countdown that auto-submits at 0, single-choice answers
 * autosaved on each pick. Answers are saved, never scored here — submit shows a
 * "we're checking your answers" interstitial and returns to the catalog.
 */
export function ExamPlayer({
  examinationId,
  onExit,
  onUnauthorized,
}: {
  examinationId: string;
  onExit: () => void;
  onUnauthorized: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [paper, setPaper] = useState<Paper | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [attemptId, setAttemptId] = useState("");
  const attemptIdRef = useRef("");
  const endAtRef = useRef(0);
  const submittedRef = useRef(false);
  // Lets doSubmit exit fullscreen without a hook-ordering cycle.
  const exitFullscreenRef = useRef<() => void>(() => {});

  // --- Submit (manual or auto at expiry) -----------------------------------
  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      exitFullscreenRef.current(); // leave fullscreen before the interstitial
      setConfirmOpen(false);
      setSubmitError(null);
      setPhase({ name: "submitting" });
      try {
        const res = await submitAttempt(attemptIdRef.current);
        setPhase({ name: "submitted", message: res.message || SUBMIT_FALLBACK });
      } catch (error) {
        if (error instanceof ApiError && error.unauthorized) {
          onUnauthorized();
          return;
        }
        if (auto) {
          // Time is up regardless of the response — proceed to the message.
          setPhase({ name: "submitted", message: SUBMIT_FALLBACK });
        } else {
          // Let the user retry a failed manual submit.
          submittedRef.current = false;
          setSubmitError(
            error instanceof ApiError ? error.message : "Couldn't submit. Please try again."
          );
          setPhase({ name: "playing" });
          setConfirmOpen(true);
        }
      }
    },
    [onUnauthorized]
  );

  // --- Integrity: fullscreen + leave detection (only while playing) --------
  const handleLimitReached = useCallback(() => void doSubmit(true), [doSubmit]);
  const integrity = useExamIntegrity({
    enabled: phase.name === "playing",
    attemptId,
    onLimitReached: handleLimitReached,
  });
  useEffect(() => {
    exitFullscreenRef.current = integrity.exitFullscreen;
  }, [integrity.exitFullscreen]);

  const beginExam = useCallback(() => {
    integrity.enterFullscreen();
    setPhase({ name: "playing" });
  }, [integrity]);

  // --- Start / resume, then load the paper ---------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let resolvedId: string;
        try {
          resolvedId = (await getCurrentAttempt(examinationId)).id; // resume
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            try {
              resolvedId = (await startAttempt(examinationId)).id;
            } catch (startErr) {
              // Race: someone/something started one first → resume it.
              if (startErr instanceof ApiError && startErr.status === 409) {
                resolvedId = (await getCurrentAttempt(examinationId)).id;
              } else {
                throw startErr;
              }
            }
          } else {
            throw error;
          }
        }

        const p = await getPaper(resolvedId);
        if (!active) return;

        const seededAnswers: Record<string, string> = {};
        const seededMarks: Record<string, boolean> = {};
        for (const q of p.questions) {
          if (q.selected_option_id) seededAnswers[q.id] = q.selected_option_id;
          if (q.is_marked_for_review) seededMarks[q.id] = true;
        }

        attemptIdRef.current = p.attempt_id;
        // Anchor the countdown to the server clock now — it keeps running while
        // the student reads the "Begin" screen, matching the backend.
        endAtRef.current = Date.now() + p.remaining_seconds * 1000;
        setAttemptId(p.attempt_id);
        setAnswers(seededAnswers);
        setMarked(seededMarks);
        setRemaining(p.remaining_seconds);
        setPaper(p);
        setPhase({ name: "ready" });
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.unauthorized) {
          onUnauthorized();
          return;
        }
        setPhase({
          name: "error",
          message: error instanceof ApiError ? error.message : "Couldn't start the exam.",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [examinationId, onUnauthorized]);

  // --- Countdown: one clock off the frozen end-time; auto-submits at 0 ------
  useEffect(() => {
    if (phase.name !== "playing") return;
    const tick = () => {
      const rem = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) void doSubmit(true);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase.name, doSubmit]);

  // --- Mark the current question visited (drives the palette's "not visited" state) ---
  useEffect(() => {
    const cur = paper?.questions[index];
    if (!cur) return;
    setVisited((prev) => (prev[cur.id] ? prev : { ...prev, [cur.id]: true }));
  }, [index, paper]);

  // --- Selecting an option: optimistic + fire-and-forget autosave ----------
  const selectOption = useCallback(
    (q: PaperQuestion, optionId: string) => {
      setAnswers((prev) => ({ ...prev, [q.id]: optionId }));
      void saveAnswer(attemptIdRef.current, {
        question_id: q.id,
        selected_option_id: optionId,
        is_marked_for_review: marked[q.id] ?? false,
      }).catch((error) => {
        // Server says time is up → stop the clock and submit.
        if (error instanceof ApiError && error.status === 409 && error.code === "attempt_expired") {
          endAtRef.current = Date.now();
          void doSubmit(true);
        }
        // Any other failure is benign — the optimistic value stays.
      });
    },
    [marked, doSubmit]
  );

  const toggleMark = useCallback(
    (q: PaperQuestion) => {
      const next = !(marked[q.id] ?? false);
      setMarked((prev) => ({ ...prev, [q.id]: next }));
      // Persists alongside the answer; if nothing's picked yet it stays local.
      const selected = answers[q.id];
      if (selected) {
        void saveAnswer(attemptIdRef.current, {
          question_id: q.id,
          selected_option_id: selected,
          is_marked_for_review: next,
        }).catch(() => {});
      }
    },
    [marked, answers]
  );

  // --- Loading / error / interstitial phases -------------------------------
  if (phase.name === "loading") {
    return (
      <Centered>
        <Loader2 className="size-6 animate-spin text-brand" strokeWidth={2} aria-hidden="true" />
        <p role="status" className="mt-3 text-[15px] text-ink-secondary">
          Preparing your paper…
        </p>
      </Centered>
    );
  }

  if (phase.name === "error") {
    return (
      <Centered>
        <h1 className="text-[20px] font-semibold text-ink">Couldn&apos;t start the exam</h1>
        <p role="alert" className="mt-2 max-w-[40ch] text-[15px] text-ink-secondary">
          {phase.message}
        </p>
        <div className="mt-6 w-[220px]">
          <Button type="button" onClick={onExit}>
            Back to mocks
          </Button>
        </div>
      </Centered>
    );
  }

  // Ready screen: the fullscreen "Begin" gesture, with the paper's real numbers.
  if (phase.name === "ready" && paper) {
    return (
      <Centered>
        <div className="mx-auto w-full max-w-[440px] rounded-[18px] border border-hairline bg-surface-card p-7 text-left shadow-[var(--shadow-card)]">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-field px-2.5 py-1 text-[11px] font-medium text-ink-secondary">
            <ShieldCheck className="size-3 text-brand" strokeWidth={2.5} aria-hidden="true" />
            Proctored — fullscreen
          </div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
            You&apos;re about to begin
          </h1>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-ink-secondary">Questions</dt>
              <dd className="font-semibold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
                {paper.total_questions}
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-ink-secondary">Time</dt>
              <dd className="font-semibold text-ink">{formatDuration(paper.remaining_seconds)}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-ink-secondary">Sections</dt>
              <dd className="font-semibold text-ink">{paper.sections.length}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[13px] leading-relaxed text-ink-secondary">
            The test runs in fullscreen. Leaving the tab, window or fullscreen is recorded — after
            two warnings your test is submitted automatically. The clock is already running.
          </p>
          <div className="mt-6">
            <Button type="button" onClick={beginExam} autoFocus>
              <Maximize className="size-4" strokeWidth={2} aria-hidden="true" />
              Begin in fullscreen
            </Button>
          </div>
        </div>
      </Centered>
    );
  }

  if (phase.name === "submitting" || phase.name === "submitted") {
    const submitted = phase.name === "submitted";
    return (
      <Centered>
        <Loader2
          className={cn("size-7 text-brand", !submitted && "animate-spin")}
          strokeWidth={2}
          aria-hidden="true"
        />
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.01em] text-ink">
          {submitted ? "Test submitted" : "Submitting…"}
        </h1>
        <p role="status" className="mt-2 max-w-[42ch] text-[15px] leading-relaxed text-ink-secondary">
          {submitted ? phase.message : "Finalising your answers."}
        </p>
        {submitted ? (
          <div className="mt-7 w-[240px]">
            <Button type="button" onClick={onExit} autoFocus>
              Back to mocks
            </Button>
          </div>
        ) : null}
      </Centered>
    );
  }

  // --- Playing -------------------------------------------------------------
  if (!paper) return null;
  const total = paper.total_questions;
  const q = paper.questions[index];
  const answeredCount = Object.keys(answers).length;
  const selected = answers[q.id] ?? null;
  const isMarked = marked[q.id] ?? false;
  const low = remaining <= 300; // last 5 minutes

  const figureOptions = q.options.length > 0 && q.options.every((o) => isFigureOption(o.content_md));
  const title = paper.exam_code
    ? paper.exam_code.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Mock Test";

  return (
    <div className="min-h-dvh bg-surface-field lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto flex min-h-dvh max-w-[1340px] flex-col px-4 py-4 sm:px-6 sm:py-5 lg:h-dvh lg:min-h-0">
        {/* Header: mock title · countdown */}
        <header className="sticky top-3 z-20 mb-5 flex shrink-0 items-center justify-between gap-3 rounded-[16px] border border-hairline bg-surface-card/95 px-4 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-brand-fill/[0.1] text-brand">
              <Grid3x3 className="size-4" strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="truncate text-[15px] font-semibold text-ink">{title}</p>
          </div>
          <div
            role="timer"
            aria-live="off"
            className={cn(
              "flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[15px] font-semibold tabular-nums",
              low ? "bg-error text-white" : "bg-brand-fill text-brand-on"
            )}
          >
            <Clock className="size-4" strokeWidth={2} aria-hidden="true" />
            {formatClock(remaining)}
            <span className="sr-only">remaining</span>
          </div>
        </header>

        <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_320px]">
          {/* Question card — stays put; scrolls internally only if the stem is very long */}
          <section className="flex min-w-0 flex-col rounded-[18px] border border-hairline bg-surface-card p-5 shadow-[var(--shadow-card)] sm:p-6 lg:min-h-0 lg:overflow-y-auto">
            {q.stimulus_md ? (
              <div className="mb-5 rounded-[14px] border border-hairline bg-surface p-4 sm:p-5">
                <QuestionContent md={q.stimulus_md} />
              </div>
            ) : null}

            <p className="text-[13px] font-semibold text-ink-secondary">
              Question {q.position}
              <span className="text-ink-secondary/70"> · {q.section_name}</span>
            </p>

            <QuestionContent md={q.content_md} className="mt-3 text-[17px]" />
          </section>

          {/* Options card — stays put; scrolls internally only if there are many options */}
          <section className="flex min-w-0 flex-col rounded-[18px] border border-hairline bg-surface-card p-5 shadow-[var(--shadow-card)] sm:p-6 lg:min-h-0 lg:overflow-y-auto">
            <p className="text-[13px] font-semibold text-ink-secondary">Select your answer</p>

            {/* Options — figure options as an equal-tile grid, text/math as rows. */}
            {figureOptions ? (
              <div
                role="radiogroup"
                aria-label={`Answer choices for question ${q.position}`}
                className="mt-4 grid grid-cols-2 gap-3"
              >
                {q.options.map((option) => {
                  const isSelected = selected === option.id;
                  const letter = option.label ?? String.fromCharCode(65 + option.position - 1);
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "group relative flex min-h-[148px] cursor-pointer items-center justify-center rounded-[16px] border p-4 transition-colors focus-within:ring-2 focus-within:ring-brand",
                        isSelected
                          ? "border-brand bg-brand/[0.06]"
                          : "border-hairline bg-surface-card hover:border-hairline-strong"
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => selectOption(q, option.id)}
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute left-3 top-3 flex size-6 items-center justify-center rounded-full border text-[13px] font-semibold",
                          isSelected
                            ? "border-brand bg-brand text-brand-on"
                            : "border-hairline-strong bg-surface-card text-ink-secondary"
                        )}
                      >
                        {letter}
                      </span>
                      {isSelected ? (
                        <span
                          aria-hidden="true"
                          className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-brand text-brand-on"
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      ) : null}
                      <QuestionContent
                        md={option.content_md}
                        className="[&_img]:mx-auto [&_img]:my-0 [&_img]:max-h-[104px] [&_img]:w-auto [&_p]:my-0"
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label={`Answer choices for question ${q.position}`}
                className="mt-4 flex flex-col gap-2.5"
              >
                {q.options.map((option) => {
                  const isSelected = selected === option.id;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "group flex cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3.5 transition-colors",
                        "focus-within:ring-2 focus-within:ring-brand",
                        isSelected
                          ? "border-brand bg-brand/[0.06]"
                          : "border-hairline bg-surface hover:border-hairline-strong"
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => selectOption(q, option.id)}
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold",
                          isSelected
                            ? "border-brand bg-brand text-brand-on"
                            : "border-hairline-strong bg-surface-card text-ink-secondary"
                        )}
                      >
                        {option.label ?? String.fromCharCode(65 + option.position - 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <QuestionContent
                          md={option.content_md}
                          className={isSelected ? "font-medium [&_p]:text-brand" : undefined}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {/* Palette card — the only scrolling column (mobile uses the bottom sheet) */}
          <aside className="hidden lg:block lg:min-h-0">
            <div className="flex h-full flex-col overflow-hidden rounded-[18px] border border-hairline bg-surface-card p-5 shadow-[var(--shadow-card)]">
              <p className="mb-4 shrink-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
                Question palette
              </p>
              <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                <QuestionPalette
                  paper={paper}
                  answers={answers}
                  marked={marked}
                  visited={visited}
                  currentIndex={index}
                  onJump={setIndex}
                />
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom action bar: mark / prev / next · submit · legend */}
        <footer className="sticky bottom-3 z-20 mt-5 shrink-0 rounded-[16px] border border-hairline bg-surface-card/95 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleMark(q)}
                aria-pressed={isMarked}
                className="inline-flex h-11 items-center gap-1.5 rounded-[12px] bg-error px-4 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
              >
                <Flag className="size-4" strokeWidth={2} aria-hidden="true" />
                {isMarked ? "Marked for review" : "Mark for review"}
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="inline-flex h-11 items-center gap-1 rounded-[12px] bg-brand-fill px-4 text-[15px] font-medium text-brand-on transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-4" strokeWidth={2} aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                disabled={index >= total - 1}
                className="inline-flex h-11 items-center gap-1 rounded-[12px] bg-brand-fill px-4 text-[15px] font-medium text-brand-on transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label={`Question palette, ${answeredCount} of ${total} answered`}
                className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-hairline bg-surface px-3 text-[14px] font-medium text-ink transition-colors hover:bg-surface-field lg:hidden"
              >
                <Grid3x3 className="size-4" strokeWidth={2} aria-hidden="true" />
                <span className="tabular-nums">
                  {answeredCount}/{total}
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmitError(null);
                setConfirmOpen(true);
              }}
              className="inline-flex h-11 items-center rounded-[12px] bg-success px-5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Submit Test
            </button>
          </div>
          <PaletteLegend className="mt-3 justify-center border-t border-hairline pt-3" />
        </footer>
      </div>

      {/* Palette — mobile bottom sheet (desktop uses the sidebar) */}
      <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Questions" size="lg">
        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
          <QuestionPalette
            paper={paper}
            answers={answers}
            marked={marked}
            visited={visited}
            currentIndex={index}
            onJump={(i) => {
              setIndex(i);
              setPaletteOpen(false);
            }}
          />
        </div>
      </Modal>

      {/* Submit confirm */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit your test?" size="sm">
        <div className="px-6 pb-6 pt-2">
          <p className="text-[15px] leading-relaxed text-ink-secondary">
            You&apos;ve answered <span className="font-semibold text-ink">{answeredCount}</span> of{" "}
            {total} questions. Once you submit you can&apos;t change your answers.
          </p>
          {submitError ? (
            <p role="alert" className="mt-3 text-[13px] text-error">
              {submitError}
            </p>
          ) : null}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="h-[52px] flex-1 rounded-[12px] border border-hairline bg-surface-field text-[16px] font-medium text-ink transition-colors hover:bg-surface"
            >
              Keep going
            </button>
            <div className="flex-1">
              <Button type="button" onClick={() => void doSubmit(false)}>
                Submit
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Integrity warning — 2 warnings, then the next violation auto-submits */}
      <Modal
        open={integrity.warning !== null}
        onClose={integrity.dismissWarning}
        title="You left the test"
        size="sm"
      >
        <div className="px-6 pb-6 pt-2">
          <div
            aria-hidden="true"
            className="mb-3 flex size-11 items-center justify-center rounded-full bg-error/10 text-error"
          >
            <ShieldAlert className="size-6" strokeWidth={2} />
          </div>
          <p className="text-[15px] leading-relaxed text-ink">
            Leaving the tab, window or fullscreen is recorded.{" "}
            <span className="font-semibold">
              Warning {integrity.warning?.count ?? 0} of {integrity.maxViolations - 1}.
            </span>{" "}
            {integrity.warning && integrity.warning.count >= integrity.maxViolations - 1
              ? "One more and your test will be submitted automatically."
              : "Leaving again twice will end your test."}
          </p>
          <div className="mt-6">
            <Button type="button" onClick={integrity.dismissWarning} autoFocus>
              <Maximize className="size-4" strokeWidth={2} aria-hidden="true" />
              Return to test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** True when an option's content is nothing but a single image — a figure choice
 *  (Figure Sequences). These read best as an equal-tile grid, not stacked rows. */
function isFigureOption(md: string): boolean {
  return /^!\[[^\]]*\]\((?:data:|https?:)[^)]*\)$/.test(md.trim());
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
      {children}
    </div>
  );
}
