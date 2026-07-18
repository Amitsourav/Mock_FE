"use client";

import { useEffect, useState } from "react";
import { LineChart } from "lucide-react";
import { Panel } from "@/components/app/Panel";
import { Skeleton } from "@/components/app/Skeleton";
import { StatTile } from "@/components/app/dashboard/StatTile";
import { AttemptsList } from "@/components/app/dashboard/AttemptsList";
import { AttemptDetail } from "@/components/app/dashboard/AttemptDetail";
import { TrendChart } from "@/components/app/chart/TrendChart";
import type { TrendSeries } from "@/components/app/chart/TrendChart";
import { SkillBars } from "@/components/app/chart/SkillBars";
import { SkillRadar } from "@/components/app/chart/SkillRadar";
import { StoryCard } from "@/components/app/dashboard/StoryCard";
import { ReadyToFix } from "@/components/app/dashboard/ReadyToFix";
import { StrategyPanel } from "@/components/app/dashboard/StrategyPanel";
import {
  ApiError,
  getAttempts,
  getConcepts,
  getDashboardSummary,
  getInsight,
  getSkills,
  getStrategy,
} from "@/lib/api";
import { compactNumber, formatDate, formatDuration, formatPct } from "@/lib/format";
import type {
  AttemptListItem,
  ConceptMastery,
  DashboardInsight,
  DashboardSummary,
  SkillStat,
  StrategyData,
} from "@/lib/types";

function LoadingState() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading dashboard" className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-5">
        <Skeleton className="h-[320px] lg:col-span-3" />
        <Skeleton className="h-[320px] lg:col-span-2" />
      </div>
      <Skeleton className="h-[220px]" />
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[16px] border border-hairline bg-surface-card p-12 text-center">
      <div
        aria-hidden="true"
        className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface-field text-ink-secondary"
      >
        <LineChart className="size-6" strokeWidth={2} />
      </div>
      <h2 className="text-[18px] font-semibold text-ink">Take a mock to unlock your AI insights</h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-relaxed text-ink-secondary">
        Your analytics appear here once you take a test — a written diagnosis of what to
        fix next, concept mastery, strategy, score trends, and a breakdown of every attempt.
      </p>
    </div>
  );
}

/**
 * The performance analytics view. Loads summary, attempts (oldest→newest) and
 * skills (weakest-first) together; clicking any attempt opens its drill-down.
 */
export function DashboardView({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [skills, setSkills] = useState<SkillStat[]>([]);
  const [insight, setInsight] = useState<DashboardInsight | null>(null);
  const [concepts, setConcepts] = useState<ConceptMastery[]>([]);
  const [strategy, setStrategy] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    // The story/concepts/strategy layer loads alongside the quantitative data.
    Promise.all([
      getDashboardSummary(),
      getAttempts(),
      getSkills(),
      getInsight(),
      getConcepts(),
      getStrategy(),
    ])
      .then(([s, a, sk, ins, con, str]) => {
        if (!active) return;
        setSummary(s);
        setAttempts(a);
        setSkills(sk);
        setInsight(ins);
        setConcepts(con);
        setStrategy(str);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.unauthorized) {
          onUnauthorized();
          return;
        }
        setError(err instanceof ApiError ? err.message : "Couldn't load your dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onUnauthorized]);

  if (openAttempt) {
    return (
      <AttemptDetail
        attemptId={openAttempt}
        onBack={() => setOpenAttempt(null)}
        onUnauthorized={onUnauthorized}
      />
    );
  }

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <Panel>
        <p role="alert" className="text-[14px] text-ink-secondary">
          {error}
        </p>
      </Panel>
    );
  }

  // The AI insight is the canonical "has data" signal — it's null until the
  // first attempt exists.
  if (!insight || !summary || summary.total_attempts === 0) return <EmptyState />;

  const trendSeries: TrendSeries[] = [
    {
      key: "accuracy",
      label: "Accuracy",
      points: attempts.map((a) => ({ label: formatDate(a.submitted_at), value: a.accuracy_pct })),
      format: (v) => formatPct(v),
      max: 100,
    },
    {
      key: "score",
      label: "Score",
      points: attempts.map((a) => ({ label: formatDate(a.submitted_at), value: a.score })),
      format: (v) => v.toFixed(0),
    },
  ];

  const improvementPositive = summary.improvement_pct >= 0;

  return (
    <div className="animate-step-in flex flex-col gap-6">
      {/* 1 — Headline Story: the AI narrative + predicted outcome + next moves. */}
      <StoryCard insight={insight} />

      {/* 2 — Ready to Fix Next: the primary action surface, weakest concepts first. */}
      <Panel title="Ready to fix next">
        <ReadyToFix concepts={concepts} />
      </Panel>

      {/* 3 — Test Strategy & Behaviour: the error-type breakdown differentiator. */}
      {strategy ? <StrategyPanel strategy={strategy} /> : null}

      {/* 4 — Quantitative evidence beneath the story. */}
      <div className="mt-2 border-t border-hairline pt-6">
        <h2 className="mb-4 text-[13px] font-medium uppercase tracking-[0.06em] text-ink-secondary">
          The numbers behind it
        </h2>
        <div className="flex flex-col gap-6">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Mocks taken" value={compactNumber(summary.total_attempts)} />
        <StatTile label="Average score" value={summary.avg_score.toFixed(1)} />
        <StatTile label="Best score" value={summary.best_score.toFixed(0)} />
        <StatTile label="Average accuracy" value={formatPct(summary.avg_accuracy_pct)} />
        <StatTile label="Latest percentile" value={`${summary.latest_percentile.toFixed(1)}`} hint="percentile" />
        <StatTile
          label="Improvement"
          value={`${improvementPositive ? "+" : ""}${summary.improvement_pct.toFixed(1)}%`}
          delta={{
            value: `since your first mock`,
            positive: improvementPositive,
          }}
        />
        <StatTile label="Time practised" value={formatDuration(summary.total_time_seconds)} />
        <StatTile label="First accuracy" value={formatPct(summary.first_accuracy_pct)} hint="where you started" />
      </div>

      {/* Trend + skills — items-start so each panel sizes to its own content
          instead of the trend card stretching to the taller skills card. */}
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-5">
        <Panel title="Progress over time" className="lg:col-span-3">
          <TrendChart series={trendSeries} />
        </Panel>

        <Panel title="Skills — weakest first" className="lg:col-span-2">
          {skills.length > 0 ? (
            <div className="flex flex-col gap-6">
              <SkillBars skills={skills} />
              <SkillRadar skills={skills} />
            </div>
          ) : (
            <p className="text-[14px] text-ink-secondary">No skill data yet.</p>
          )}
        </Panel>
      </div>

          {/* Recent attempts */}
          <Panel title="Recent attempts">
            {attempts.length > 0 ? (
              <AttemptsList attempts={attempts} onOpen={setOpenAttempt} />
            ) : (
              <p className="text-[14px] text-ink-secondary">No attempts recorded.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
