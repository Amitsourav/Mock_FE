"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Clock,
  ClipboardCheck,
  ListChecks,
  Pencil,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { MockCard } from "@/components/app/mocks/MockCard";
import { compactNumber, formatDate, formatDuration, formatPct } from "@/lib/format";
import type {
  AttemptListItem,
  ConceptMastery,
  DashboardInsight,
  DashboardSummary,
  MockTest,
  MockTestGroups,
} from "@/lib/types";

/**
 * The Mock Hub — a preparation command centre, not a test list. Progress,
 * performance and AI guidance sit above the mock catalogue. Every figure is real
 * or derived from the analytics endpoints; fields the backend doesn't provide
 * (streak, target date, per-mock stats, PYQ/diagnostic groups) are omitted
 * rather than faked. Falls back to a motivational header before the first
 * attempt exists.
 */
export function MockHub({
  examName,
  groups,
  summary,
  attempts,
  insight,
  concepts,
  onChangeStream,
  onGoToDashboard,
}: {
  examName: string;
  groups: MockTestGroups;
  summary: DashboardSummary | null;
  attempts: AttemptListItem[];
  insight: DashboardInsight | null;
  concepts: ConceptMastery[];
  onChangeStream: () => void;
  onGoToDashboard: () => void;
}) {
  const hasData = Boolean(summary && summary.total_attempts > 0);
  const questionsSolved = useMemo(
    () => attempts.reduce((sum, a) => sum + a.total_questions, 0),
    [attempts]
  );
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  // Per-subject mastery, averaged from concept-level mastery (0–1 → %).
  const subjects = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    concepts.forEach((c) => {
      const cur = map.get(c.subject_name) ?? { sum: 0, n: 0 };
      cur.sum += c.p_mastery;
      cur.n += 1;
      map.set(c.subject_name, cur);
    });
    return [...map.entries()]
      .map(([name, { sum, n }]) => ({ name, pct: (sum / n) * 100 }))
      .sort((a, b) => b.pct - a.pct);
  }, [concepts]);

  return (
    <div className="animate-step-in flex flex-col gap-8">
      {/* ---- Hero ---- */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink md:text-[36px]">
            {examName} Preparation Hub
          </h1>
          <p className="mt-2 max-w-[52ch] text-[16px] leading-relaxed text-ink-secondary">
            Track progress, improve performance, and achieve your target rank.
          </p>
        </div>
        <button
          type="button"
          onClick={onChangeStream}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-surface-card px-3.5 py-2 text-[13px] font-medium text-brand transition-colors hover:bg-surface-field"
        >
          <Pencil className="size-3.5" strokeWidth={2} aria-hidden="true" />
          Change exam
        </button>
      </header>

      {/* ---- KPIs (real analytics) or a motivational start ---- */}
      {hasData && summary ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard icon={ClipboardCheck} label="Mocks completed" value={compactNumber(summary.total_attempts)} />
          <KpiCard icon={Target} label="Avg accuracy" value={formatPct(summary.avg_accuracy_pct)} />
          <KpiCard icon={TrendingUp} label="Latest percentile" value={summary.latest_percentile.toFixed(1)} />
          <KpiCard icon={ListChecks} label="Questions solved" value={compactNumber(questionsSolved)} />
          <KpiCard icon={Clock} label="Time practised" value={formatDuration(summary.total_time_seconds)} />
          {insight ? (
            <KpiCard
              icon={Sparkles}
              label="Predicted score"
              value={insight.predicted_score.toFixed(0)}
              sub={`band ${insight.predicted_band_low.toFixed(0)}–${insight.predicted_band_high.toFixed(0)}`}
            />
          ) : (
            <KpiCard icon={Sparkles} label="Best score" value={summary.best_score.toFixed(0)} />
          )}
        </div>
      ) : (
        <div className="rounded-[20px] border border-hairline bg-surface-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-fill/[0.1] text-brand">
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-ink">Your command centre is ready</h2>
              <p className="mt-1 max-w-[60ch] text-[14px] leading-relaxed text-ink-secondary">
                Take your first mock below to unlock progress tracking, AI performance insights,
                predicted score, and subject-wise mastery — all in one place.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---- AI insight + subject performance (real, only with data) ---- */}
      {hasData ? (
        <div className="grid gap-6 lg:grid-cols-5">
          {insight ? (
            <section className="relative overflow-hidden rounded-[20px] border border-hairline bg-surface-card p-6 shadow-[var(--shadow-card)] lg:col-span-3">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-fill/10 blur-[70px]"
              />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/70 px-3 py-1 text-[12px] font-medium tracking-[0.04em] text-ink-secondary">
                  <Sparkles className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
                  AI INSIGHT
                </span>
                <p className="mt-4 text-[16px] leading-relaxed text-ink">{insight.summary}</p>

                <div className="mt-5 flex flex-col gap-2.5">
                  {insight.persistent_strengths[0] ? (
                    <InsightLine tone="good" label="Strength" text={insight.persistent_strengths[0]} />
                  ) : null}
                  {(concepts[0]?.kc_name ?? insight.persistent_gaps[0]) ? (
                    <InsightLine
                      tone="bad"
                      label="Focus area"
                      text={concepts[0]?.kc_name ?? insight.persistent_gaps[0]}
                    />
                  ) : null}
                  {insight.study_plan[0] ? (
                    <InsightLine tone="next" label="Next step" text={insight.study_plan[0].action} />
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={onGoToDashboard}
                  className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand transition-opacity hover:opacity-70"
                >
                  View full analysis
                  <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>
            </section>
          ) : null}

          {/* Subject performance */}
          {subjects.length > 0 ? (
            <section className="rounded-[20px] border border-hairline bg-surface-card p-6 shadow-[var(--shadow-card)] lg:col-span-2">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                Subject performance
              </h2>
              <p className="mt-0.5 text-[12px] text-ink-secondary">Concept mastery by subject</p>
              <div className="mt-5 flex flex-col gap-4">
                {subjects.map((s) => (
                  <SubjectBar key={s.name} name={s.name} pct={s.pct} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {/* ---- Continue where you left off (real: last attempt) ---- */}
      {lastAttempt ? (
        <section className="rounded-[20px] border border-hairline bg-surface-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-secondary">
                Continue where you left off
              </p>
              <h2 className="mt-1.5 truncate text-[18px] font-semibold text-ink">
                {lastAttempt.mock_title}
              </h2>
              <p className="mt-1 text-[13px] text-ink-secondary">
                Last attempt · {formatDate(lastAttempt.submitted_at)} · scored{" "}
                {lastAttempt.score.toFixed(0)}/{lastAttempt.max_score.toFixed(0)}
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToDashboard}
              className="inline-flex h-[44px] shrink-0 items-center gap-2 rounded-[12px] bg-brand-fill px-5 text-[15px] font-medium text-brand-on transition-colors hover:bg-brand-fill-hover"
            >
              Review analysis
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </button>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink-secondary">
              <span>Accuracy</span>
              <span className="font-medium text-ink">{formatPct(lastAttempt.accuracy_pct)}</span>
            </div>
            <Bar pct={lastAttempt.accuracy_pct} />
          </div>
        </section>
      ) : null}

      {/* ---- Mock catalogue (tabbed) ---- */}
      <MockCatalog groups={groups} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[16px] border border-hairline bg-surface-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brand-fill/[0.1] text-brand">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <p className="min-w-0 truncate text-[13px] text-ink-secondary">{label}</p>
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-[12px] text-ink-secondary">{sub}</p> : null}
    </div>
  );
}

function InsightLine({
  tone,
  label,
  text,
}: {
  tone: "good" | "bad" | "next";
  label: string;
  text: string;
}) {
  const dot =
    tone === "good" ? "bg-success" : tone === "bad" ? "bg-error" : "bg-brand-fill";
  return (
    <div className="flex items-start gap-2.5">
      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <p className="text-[14px] leading-relaxed text-ink-secondary">
        <span className="font-medium text-ink">{label}:</span> {text}
      </p>
    </div>
  );
}

function SubjectBar({ name, pct }: { name: string; pct: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-ink">{name}</span>
        <span className="text-ink-secondary">{Math.round(pct)}%</span>
      </div>
      <Bar pct={pct} />
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-field">
      <div
        className="h-full rounded-full bg-brand-fill transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Tabbed mock catalogue. Only tabs the backend actually populates are shown. */
function MockCatalog({ groups }: { groups: MockTestGroups }) {
  const tabs = useMemo(() => {
    const subjectMocks = groups.subjects.flatMap((s) => s.subject_mocks);
    const chapterMocks = groups.subjects.flatMap((s) => s.chapter_mocks);
    return [
      { key: "full", label: "Full-Length Tests", mocks: groups.full_mocks },
      { key: "sectional", label: "Sectional Tests", mocks: [...groups.sectional_mocks, ...subjectMocks] },
      { key: "chapter", label: "Chapter Tests", mocks: chapterMocks },
    ].filter((t) => t.mocks.length > 0);
  }, [groups]);

  const [active, setActive] = useState(tabs[0]?.key ?? "full");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Mock tests</h2>
      </div>

      {tabs.length === 0 ? (
        <div className="rounded-[16px] border border-hairline bg-surface-card p-10 text-center">
          <p className="text-[15px] text-ink-secondary">No mocks are available for this stream yet.</p>
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Mock categories"
            className="mb-6 flex flex-wrap gap-2 border-b border-hairline"
          >
            {tabs.map((t) => {
              const selected = t.key === current?.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setActive(t.key)}
                  className={[
                    "-mb-px border-b-2 px-1 pb-3 text-[15px] font-medium transition-colors duration-200",
                    selected
                      ? "border-brand text-ink"
                      : "border-transparent text-ink-secondary hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                  <span className="ml-1.5 text-[13px] text-ink-secondary">{t.mocks.length}</span>
                </button>
              );
            })}
          </div>

          {current ? <MockGrid mocks={current.mocks} /> : null}
        </>
      )}
    </section>
  );
}

function MockGrid({ mocks }: { mocks: MockTest[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {mocks.map((mock) => (
        <MockCard key={mock.id} mock={mock} />
      ))}
    </div>
  );
}
