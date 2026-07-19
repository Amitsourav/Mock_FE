"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LineChart } from "lucide-react";
import { Panel } from "@/components/app/Panel";
import { Skeleton } from "@/components/app/Skeleton";
import { StatTile } from "@/components/app/dashboard/StatTile";
import { ReadinessHero } from "@/components/app/dashboard/ReadinessHero";
import { AttemptsList } from "@/components/app/dashboard/AttemptsList";
import { AttemptDetail } from "@/components/app/dashboard/AttemptDetail";
import { TrendChart } from "@/components/app/chart/TrendChart";
import type { TrendSeries } from "@/components/app/chart/TrendChart";
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
import { compactNumber, formatDate, formatDuration, formatMs, formatPct } from "@/lib/format";
import type {
  AttemptListItem,
  ConceptMastery,
  DashboardInsight,
  DashboardSummary,
  SkillStat,
  StrategyData,
} from "@/lib/types";

/** Editorial section framing: a display-face title + a one-line "what this tells you". */
function SectionHeader({ title, subline }: { title: string; subline: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-[21px] font-semibold tracking-[-0.01em] text-ink sm:text-[24px]">
        {title}
      </h2>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-secondary">{subline}</p>
    </div>
  );
}

/** A section that rises into place on load; delay staggers the sequence. */
function Section({
  title,
  subline,
  delay,
  children,
}: {
  title: string;
  subline: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <section className="reveal" style={{ animationDelay: `${delay}ms` }}>
      <SectionHeader title={title} subline={subline} />
      {children}
    </section>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading dashboard" className="flex flex-col gap-12">
      <Skeleton className="h-[260px] rounded-[24px]" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-[200px]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-[280px] lg:col-span-3" />
        <Skeleton className="h-[280px] lg:col-span-2" />
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="reveal rounded-[24px] border border-hairline bg-surface-card p-12 text-center shadow-[var(--shadow-card)]">
      <div
        aria-hidden="true"
        className="mx-auto mb-5 flex size-14 items-center justify-center rounded-[16px] bg-brand-fill/10 text-brand"
      >
        <LineChart className="size-7" strokeWidth={2} />
      </div>
      <h2 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-ink">
        Your readiness report is waiting
      </h2>
      <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-relaxed text-ink-secondary">
        Take your first mock and this becomes your command centre — a predicted score, a written
        diagnosis of what to fix next, concept mastery, your testing personality, and every attempt
        broken down.
      </p>
    </div>
  );
}

/** Per-skill accuracy + time, revealed on demand behind the radar (kills chart redundancy). */
function SkillTable({ skills }: { skills: SkillStat[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-left">
        <thead>
          <tr className="border-b border-hairline text-[12px] font-medium text-ink-secondary">
            <th className="pb-2 pr-3 font-medium">Skill</th>
            <th className="pb-2 px-3 text-right font-medium">Accuracy</th>
            <th className="pb-2 pl-3 text-right font-medium">Avg time / Q</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((s) => (
            <tr key={s.skill_code} className="border-b border-hairline/60 last:border-0">
              <td className="py-2.5 pr-3 text-[14px] text-ink">{s.skill_name}</td>
              <td
                className="py-2.5 px-3 text-right text-[14px] font-medium text-ink"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatPct(s.avg_accuracy_pct)}
              </td>
              <td
                className="py-2.5 pl-3 text-right text-[14px] text-ink-secondary"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatMs(s.avg_time_ms)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The analytics dashboard — a personal performance report. Loads the full
 * insight/summary/concepts/skills/strategy set together; the hero anchors it,
 * sections descend most-decisive-first, and clicking any attempt drills in.
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
  const [showSkillDetails, setShowSkillDetails] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
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

  // The AI insight is the canonical "has data" signal — null until the first attempt.
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
  const improvementValue = `${improvementPositive ? "+" : ""}${summary.improvement_pct.toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      {/* 1 — Readiness hero: the cinematic centrepiece. */}
      <ReadinessHero insight={insight} summary={summary} />

      {/* 2 — Your coach's read. */}
      <Section
        title="Your coach's read"
        subline="What the AI sees in your attempts, and what to do next."
        delay={80}
      >
        <StoryCard insight={insight} />
      </Section>

      {/* 3 — Fix these first: Learn vs Revise. */}
      <Section
        title="Fix these first"
        subline="Weakest concepts to learn, and mastered ones you're starting to forget."
        delay={140}
      >
        <ReadyToFix concepts={concepts} />
      </Section>

      {/* 4 — Trajectory: full-width trend with the improvement celebrated. */}
      <Section
        title="Trajectory"
        subline="Accuracy and score across every mock, oldest to newest."
        delay={200}
      >
        <Panel>
          <div className="mb-5 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span
              className={`font-display text-[38px] font-semibold leading-none tracking-[-0.02em] sm:text-[44px] ${
                improvementPositive ? "text-success" : "text-error"
              }`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {improvementValue}
            </span>
            <span className="pb-1 text-[14px] text-ink-secondary">
              accuracy since your first mock
            </span>
          </div>
          <TrendChart series={trendSeries} />
        </Panel>
      </Section>

      {/* 5 — Skill map: one primary chart (radar), detail on demand. */}
      <Section title="Skill map" subline="Your accuracy shape across skills." delay={260}>
        <Panel>
          {skills.length >= 3 ? (
            <>
              <SkillRadar skills={skills} />
              <div className="mt-4 border-t border-hairline pt-4">
                <button
                  type="button"
                  onClick={() => setShowSkillDetails((v) => !v)}
                  aria-expanded={showSkillDetails}
                  className="text-[13px] font-medium text-brand transition-opacity hover:opacity-70"
                >
                  {showSkillDetails ? "Hide per-skill detail" : "Show per-skill accuracy & time"}
                </button>
                {showSkillDetails ? (
                  <div className="mt-4">
                    <SkillTable skills={skills} />
                  </div>
                ) : null}
              </div>
            </>
          ) : skills.length > 0 ? (
            <SkillTable skills={skills} />
          ) : (
            <p className="text-[14px] text-ink-secondary">No skill data yet.</p>
          )}
        </Panel>
      </Section>

      {/* 6 — How you test: the behaviour breakdown. */}
      <Section
        title="How you test"
        subline="Your testing personality — where marks leak, and how you pace."
        delay={320}
      >
        {strategy ? (
          <StrategyPanel strategy={strategy} />
        ) : (
          <Panel>
            <p className="text-[14px] text-ink-secondary">No strategy data yet.</p>
          </Panel>
        )}
      </Section>

      {/* 7 — Attempt history. */}
      <Section
        title="Attempt history"
        subline="Every mock you've taken — open one for a full breakdown."
        delay={380}
      >
        <Panel>
          {attempts.length > 0 ? (
            <AttemptsList attempts={attempts} onOpen={setOpenAttempt} />
          ) : (
            <p className="text-[14px] text-ink-secondary">No attempts recorded.</p>
          )}
        </Panel>
      </Section>

      {/* 8 — All numbers: full grid, collapsed. Raw scores labelled + kept apart
          from the /100 predicted score in the hero. */}
      <details className="reveal group rounded-[16px] border border-hairline bg-surface-card" style={{ animationDelay: "440ms" }}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-[13px] font-medium uppercase tracking-[0.06em] text-ink-secondary">
          All numbers
          <ChevronDown
            className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
            strokeWidth={2}
            aria-hidden="true"
          />
        </summary>
        <div className="border-t border-hairline p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="Mocks taken" value={compactNumber(summary.total_attempts)} />
            <StatTile label="Average score" value={summary.avg_score.toFixed(1)} hint="raw score" />
            <StatTile label="Best score" value={summary.best_score.toFixed(0)} hint="raw score" />
            <StatTile label="Average accuracy" value={formatPct(summary.avg_accuracy_pct)} />
            <StatTile
              label="Latest percentile"
              value={summary.latest_percentile.toFixed(1)}
              hint="percentile"
            />
            <StatTile
              label="Improvement"
              value={improvementValue}
              delta={{ value: "since your first mock", positive: improvementPositive }}
            />
            <StatTile label="Time practised" value={formatDuration(summary.total_time_seconds)} />
            <StatTile
              label="First accuracy"
              value={formatPct(summary.first_accuracy_pct)}
              hint="where you started"
            />
          </div>
        </div>
      </details>
    </div>
  );
}
