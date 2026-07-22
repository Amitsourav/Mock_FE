"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  Clock,
  Download,
  LineChart,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Panel } from "@/components/app/Panel";
import { Skeleton } from "@/components/app/Skeleton";
import { ReadinessHero } from "@/components/app/dashboard/ReadinessHero";
import { useCountUp } from "@/components/app/dashboard/useCountUp";
import { AttemptsList } from "@/components/app/dashboard/AttemptsList";
import { AttemptDetail } from "@/components/app/dashboard/AttemptDetail";
import { LollipopTrend } from "@/components/app/chart/LollipopTrend";
import type { LollipopPoint } from "@/components/app/chart/LollipopTrend";
import { ErrorDonut } from "@/components/app/chart/ErrorDonut";
import { SkillRadar } from "@/components/app/chart/SkillRadar";
import { StoryCard } from "@/components/app/dashboard/StoryCard";
import { ReadyToFix } from "@/components/app/dashboard/ReadyToFix";
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
import { cn } from "@/lib/utils";
import type {
  AttemptListItem,
  ConceptMastery,
  DashboardInsight,
  DashboardSummary,
  SkillStat,
  StrategyData,
  User,
} from "@/lib/types";

// Section toggles — hidden for now, flip to `true` to bring a section back.
const SHOW_COACHS_READ = false;
const SHOW_SKILL_MAP = false;

/** The trend chart shows at most this many recent attempts. */
const TREND_LIMIT = 12;

/* -------------------------------------------------------------------------- */
/* Bento primitives                                                            */
/* -------------------------------------------------------------------------- */

/** A bento tile: white card, compact internal title, optional right-side action. */
function Tile({
  title,
  action,
  delay = 0,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("glass-tile glass-hover reveal min-w-0 rounded-[20px] p-5", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {title || action ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading dashboard" className="flex flex-col gap-6">
      <Skeleton className="h-16 w-96 max-w-full" />
      <div className="flex flex-wrap gap-10">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[64px] w-[140px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-[320px] rounded-[20px] lg:col-span-5" />
        <Skeleton className="h-[320px] rounded-[20px] lg:col-span-3" />
        <Skeleton className="h-[320px] rounded-[20px] lg:col-span-4" />
        <Skeleton className="h-[300px] rounded-[20px] lg:col-span-8" />
        <Skeleton className="h-[300px] rounded-[20px] lg:col-span-4" />
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-tile reveal rounded-[24px] p-12 text-center">
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

/** A number that counts up on load (respects reduced motion via useCountUp). */
function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const shown = useCountUp(value, 1100);
  return (
    <>
      {prefix}
      {shown.toFixed(decimals)}
      {suffix}
    </>
  );
}

/** One giant boxless number in the header band (ref-3's KPI row). */
function BigStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-hairline bg-surface-card text-ink-secondary">
        <Icon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-display text-[34px] font-semibold leading-none tracking-[-0.02em] sm:text-[40px]",
            tone === "good" ? "text-success" : tone === "bad" ? "text-error" : "text-ink"
          )}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </p>
        <p className="mt-1 text-[12px] text-ink-secondary">{label}</p>
      </div>
    </div>
  );
}

/**
 * The dark jewel of the hero row: likely band as a trophy statement + the one
 * next move. (Becomes the Rank card once the leaderboard backend exists.)
 */
function BandCard({ insight, delay }: { insight: DashboardInsight; delay: number }) {
  const nextMove = insight.study_plan[0] ?? null;
  return (
    <section
      className="glass-dark glass-hover reveal flex min-w-0 flex-col justify-between rounded-[20px] p-6 text-surface lg:col-span-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-surface/60">
          Likely score band
        </p>
        <p
          className="mt-3 font-display text-[54px] font-semibold leading-none tracking-[-0.02em]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(insight.predicted_band_low)}–{Math.round(insight.predicted_band_high)}
        </p>
        <p className="mt-2 text-[13px] text-surface/60">out of 100, on current form</p>
      </div>
      {nextMove ? (
        <div className="mt-8 border-t border-surface/15 pt-4">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-surface/60">
            <Sparkles className="size-3.5" strokeWidth={2} aria-hidden="true" />
            Next move
          </p>
          <p className="mt-2 line-clamp-4 text-[14px] leading-relaxed text-surface/90">
            <span className="font-semibold text-surface">{nextMove.focus}.</span> {nextMove.action}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** Accuracy band → the shared mastery ramp (never colour alone; % always shown). */
function accuracyColor(pct: number): string {
  if (pct < 50) return "var(--mastery-weak)";
  if (pct < 80) return "var(--mastery-developing)";
  return "var(--mastery-strong)";
}

/** A compact accuracy dial that sweeps to its value on load (micro-interaction;
 *  the global reduced-motion reset collapses the transition to instant). */
function Ring({ pct, color, size = 52, stroke = 5 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setDrawn(true), 80);
    return () => window.clearTimeout(t);
  }, []);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = drawn ? circ * (1 - Math.max(0, Math.min(100, pct)) / 100) : circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-field)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center text-[12px] font-semibold"
        style={{ color, fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(pct)}
      </span>
    </div>
  );
}

/** A quiet stat under the trajectory chart. */
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[15px] font-semibold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-secondary">{label}</p>
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

/* -------------------------------------------------------------------------- */
/* The dashboard                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The performance report as a single bento composition on the soft field frame:
 * a greeting band with giant KPIs, then one tiled grid — readiness gauge, the
 * dark band card, module dials, lollipop trajectory, testing behaviour, the
 * fix-first surface and attempt history — with each attempt's full report
 * opening INLINE below the grid. Print = the browser's save-as-PDF.
 */
export function DashboardView({
  user,
  onUnauthorized,
}: {
  user: User;
  onUnauthorized: () => void;
}) {
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
  const reportRef = useRef<HTMLDivElement>(null);

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

  // Bring a freshly opened inline report into view (gently; respects reduced motion).
  useEffect(() => {
    if (!openAttempt) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    reportRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [openAttempt]);

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

  const firstName = (user.full_name ?? "").trim().split(/\s+/)[0] || "there";
  const improvementPositive = summary.improvement_pct >= 0;
  const improvementValue = `${improvementPositive ? "+" : ""}${summary.improvement_pct.toFixed(1)}%`;

  // Latest attempts for the lollipop, labelled by their overall attempt number.
  const trendWindow = attempts.slice(-TREND_LIMIT);
  const trendOffset = attempts.length - trendWindow.length;
  const trendPoints: LollipopPoint[] = trendWindow.map((a, i) => ({
    label: `${trendOffset + i + 1}`,
    title: `${a.mock_title} · ${formatDate(a.submitted_at)}`,
    value: a.accuracy_pct,
    // Accuracy + percentile together, when the backend has a percentile for it.
    pill:
      a.percentile != null
        ? `${formatPct(a.accuracy_pct)} · ${a.percentile.toFixed(1)} %ile`
        : formatPct(a.accuracy_pct),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Greeting band ---- */}
      <div className="print-dash reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[36px]">
            Hey {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-1 text-[15px] text-ink-secondary">
            Your dMAT performance report, {compactNumber(summary.total_attempts)} mocks in.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-hairline bg-surface-card px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface print:hidden"
        >
          <Download className="size-3.5" strokeWidth={2} aria-hidden="true" />
          Download PDF
        </button>
      </div>

      {/* ---- Giant KPI band (boxless) ---- */}
      <div className="print-dash reveal flex flex-wrap gap-x-12 gap-y-6" style={{ animationDelay: "60ms" }}>
        <BigStat
          icon={ClipboardCheck}
          value={<AnimatedNumber value={summary.total_attempts} />}
          label="Mocks taken"
        />
        <BigStat
          icon={TrendingUp}
          value={<AnimatedNumber value={summary.latest_percentile} decimals={1} />}
          label="Latest percentile"
        />
        <BigStat
          icon={improvementPositive ? ArrowUpRight : ArrowDownRight}
          value={
            <AnimatedNumber
              value={summary.improvement_pct}
              decimals={1}
              prefix={improvementPositive ? "+" : ""}
              suffix="%"
            />
          }
          label="Accuracy since mock 1"
          tone={improvementPositive ? "good" : "bad"}
        />
        <BigStat icon={Clock} value={formatDuration(summary.total_time_seconds)} label="Time practised" />
      </div>

      {/* ---- The bento grid ---- */}
      <div className="print-dash grid gap-4 lg:grid-cols-12">
        {/* Readiness gauge */}
        <div className="lg:col-span-5">
          <ReadinessHero insight={insight} />
        </div>

        {/* Dark band + next move */}
        <BandCard insight={insight} delay={120} />

        {/* Module dials */}
        <Tile title="Module performance" delay={160} className="lg:col-span-4">
          <ul className="flex flex-col gap-3.5">
            {skills.slice(0, 4).map((s) => (
              <li key={s.skill_code} className="flex items-center gap-3.5">
                <Ring pct={s.avg_accuracy_pct} color={accuracyColor(s.avg_accuracy_pct)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{s.skill_name}</p>
                  <p className="text-[12px] text-ink-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatMs(s.avg_time_ms)} / question
                  </p>
                </div>
              </li>
            ))}
            {skills.length === 0 ? (
              <li className="text-[13px] text-ink-secondary">No module data yet.</li>
            ) : null}
          </ul>
        </Tile>

        {/* Trajectory */}
        <Tile
          title="Trajectory"
          delay={200}
          className="lg:col-span-8"
          action={
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold",
                improvementPositive ? "bg-success/12 text-success" : "bg-error/12 text-error"
              )}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {improvementPositive ? (
                <ArrowUpRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <ArrowDownRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              )}
              {improvementValue} vs mock 1
            </span>
          }
        >
          <LollipopTrend points={trendPoints} />
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-hairline pt-4 sm:grid-cols-4">
            <MiniStat label="Average accuracy" value={formatPct(summary.avg_accuracy_pct)} />
            <MiniStat label="First-mock accuracy" value={formatPct(summary.first_accuracy_pct)} />
            <MiniStat label="Average score · raw" value={summary.avg_score.toFixed(1)} />
            <MiniStat label="Best score · raw" value={summary.best_score.toFixed(0)} />
          </div>
        </Tile>

        {/* How you test */}
        <Tile
          title="How you test"
          delay={240}
          className="lg:col-span-4"
          action={
            strategy ? (
              <span className="inline-flex items-center rounded-full bg-brand/12 px-2.5 py-1 text-[12px] font-semibold text-brand">
                {strategy.dominant_archetype}
              </span>
            ) : undefined
          }
        >
          {strategy ? (
            <div className="flex flex-col gap-4">
              <ErrorDonut distribution={strategy.error_distribution} />
              <p className="border-t border-hairline pt-3 text-[13px] leading-relaxed text-ink-secondary">
                {strategy.pacing_note}
              </p>
            </div>
          ) : (
            <p className="text-[14px] text-ink-secondary">No strategy data yet.</p>
          )}
        </Tile>

        {/* Fix these first */}
        <Tile title="Fix these first" delay={280} className="lg:col-span-7">
          {insight.persistent_strengths.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12px] font-medium text-ink-secondary">Strong spots</span>
              {insight.persistent_strengths.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-success/12 px-2.5 py-1 text-[12px] font-medium text-success"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}
          <ReadyToFix concepts={concepts} />
        </Tile>

        {/* Attempt history */}
        <Tile
          title="Attempt history"
          delay={320}
          className="lg:col-span-5"
          action={
            <span className="text-[12px] text-ink-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
              {attempts.length} mocks
            </span>
          }
        >
          {attempts.length > 0 ? (
            <AttemptsList attempts={attempts} onOpen={setOpenAttempt} />
          ) : (
            <p className="text-[14px] text-ink-secondary">No attempts recorded.</p>
          )}
        </Tile>

        {/* Hidden — Your coach's read. (SHOW_COACHS_READ) */}
        {SHOW_COACHS_READ ? (
          <div className="lg:col-span-12">
            <StoryCard insight={insight} />
          </div>
        ) : null}

        {/* Hidden — Skill map. (SHOW_SKILL_MAP) */}
        {SHOW_SKILL_MAP ? (
          <Tile title="Skill map" delay={360} className="lg:col-span-12">
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
          </Tile>
        ) : null}
      </div>

      {/* ---- Inline attempt report (full width, prints alone in attempt mode) ---- */}
      {openAttempt ? (
        <div ref={reportRef} className="scroll-mt-20">
          <AttemptDetail
            attemptId={openAttempt}
            onBack={() => setOpenAttempt(null)}
            onUnauthorized={onUnauthorized}
          />
        </div>
      ) : null}
    </div>
  );
}
