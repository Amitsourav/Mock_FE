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
  onChangeStream,
  onGoToDashboard,
}: {
  examName: string;
  groups: MockTestGroups;
  summary: DashboardSummary | null;
  attempts: AttemptListItem[];
  insight: DashboardInsight | null;
  onChangeStream: () => void;
  onGoToDashboard: () => void;
}) {
  const hasData = Boolean(summary && summary.total_attempts > 0);
  const questionsSolved = useMemo(
    () => attempts.reduce((sum, a) => sum + a.total_questions, 0),
    [attempts]
  );
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  return (
    <div className="animate-step-in flex flex-col gap-5">
      {/* ---- Hero ---- */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink md:text-[30px]">
            {examName} Preparation Hub
          </h1>
          <p className="mt-1 max-w-[52ch] text-[15px] leading-relaxed text-ink-secondary">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

      {/* AI insight & subject performance intentionally live on the Dashboard tab
          only, to keep the Mock Test hub focused on progress + the catalogue. */}

      {/* ---- Continue where you left off (real: last attempt) — compact one-liner ---- */}
      {lastAttempt ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-hairline bg-surface-card px-4 py-3 shadow-[var(--shadow-card)]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brand-fill/[0.1] text-brand sm:flex">
              <ClipboardCheck className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">
                <span className="font-medium text-ink-secondary">Continue: </span>
                {lastAttempt.mock_title}
              </p>
              <p className="truncate text-[12px] text-ink-secondary">
                {formatDate(lastAttempt.submitted_at)} · scored {lastAttempt.score.toFixed(0)}/
                {lastAttempt.max_score.toFixed(0)} · {formatPct(lastAttempt.accuracy_pct)} accuracy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToDashboard}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-brand-fill px-3.5 text-[13px] font-medium text-brand-on transition-colors hover:bg-brand-fill-hover"
          >
            Review analysis
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </button>
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
    <div className="rounded-[14px] border border-hairline bg-surface-card px-3.5 py-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-fill/[0.1] text-brand">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <p className="truncate text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {value}
        </p>
      </div>
      <p className="mt-2 truncate text-[12px] text-ink-secondary">
        {label}
        {sub ? ` · ${sub}` : ""}
      </p>
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
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Mock tests</h2>
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
