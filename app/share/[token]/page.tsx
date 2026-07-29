"use client";

import { use, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  Clock,
  Download,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { AuroraField } from "@/components/app/dashboard/AuroraField";
import { ReadinessHero } from "@/components/app/dashboard/ReadinessHero";
import {
  AnimatedNumber,
  BandCard,
  BigStat,
  MiniStat,
  Ring,
  Tile,
  accuracyColor,
} from "@/components/app/dashboard/DashboardView";
import { AttemptDetail } from "@/components/app/dashboard/AttemptDetail";
import { LeaderboardBoard } from "@/components/app/LeaderboardView";
import { ReadyToFix } from "@/components/app/dashboard/ReadyToFix";
import { ErrorDonut } from "@/components/app/chart/ErrorDonut";
import { LollipopTrend } from "@/components/app/chart/LollipopTrend";
import type { LollipopPoint } from "@/components/app/chart/LollipopTrend";
import Link from "next/link";
import { getSharedReport } from "@/lib/api";
import { compactNumber, formatDate, formatDuration, formatMs, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SharedDashboardSnapshot, SharedReport } from "@/lib/types";

const TREND_LIMIT = 12;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-surface-field print:bg-white">
      <AuroraField />
      <div className="relative mx-auto w-full max-w-[1200px] px-5 py-6 sm:px-8">
        {/* Public chrome: brand mark + a way into the product. */}
        <header className="mb-8 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand-fill text-[15px] font-bold text-brand-on">
              d
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">dMAT</span>
            <span className="text-[13px] text-ink-secondary">Mock</span>
          </div>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-[10px] bg-brand-fill px-3.5 text-[13px] font-medium text-brand-on transition-colors hover:bg-brand-fill-hover"
          >
            Practise on dMAT →
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}

/** The read-only dashboard snapshot, composed from the same bento pieces. */
function SharedDashboard({ snap }: { snap: SharedDashboardSnapshot }) {
  const { summary, insight, skills, concepts, strategy, attempts } = snap;
  const improvementPositive = summary.improvement_pct >= 0;
  const improvementValue = `${improvementPositive ? "+" : ""}${summary.improvement_pct.toFixed(1)}%`;

  const trendWindow = attempts.slice(-TREND_LIMIT);
  const trendOffset = attempts.length - trendWindow.length;
  const trendPoints: LollipopPoint[] = trendWindow.map((a, i) => ({
    label: `${trendOffset + i + 1}`,
    title: `${a.mock_title} · ${formatDate(a.submitted_at)}`,
    value: a.accuracy_pct,
    pill:
      a.percentile != null
        ? `${formatPct(a.accuracy_pct)} · ${a.percentile.toFixed(1)} %ile`
        : formatPct(a.accuracy_pct),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting band */}
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[34px]">
            {snap.shared_by}&apos;s performance report
          </h1>
          <p className="mt-1 text-[14px] text-ink-secondary">
            Snapshot shared {formatDate(snap.generated_at)} · {compactNumber(summary.total_attempts)}{" "}
            mocks in
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

      {/* Giant KPI band */}
      <div className="reveal flex flex-wrap gap-x-12 gap-y-6" style={{ animationDelay: "60ms" }}>
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

      {/* Bento grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        {insight ? (
          <>
            <div className="lg:col-span-5">
              <ReadinessHero insight={insight} />
            </div>
            <BandCard insight={insight} delay={120} />
          </>
        ) : null}

        <Tile
          title="Module performance"
          delay={160}
          className={insight ? "lg:col-span-4" : "lg:col-span-12"}
        >
          <ul className="flex flex-col gap-3.5">
            {skills.slice(0, 4).map((s) => (
              <li key={s.skill_code} className="flex items-center gap-3.5">
                <Ring pct={s.avg_accuracy_pct} color={accuracyColor(s.avg_accuracy_pct)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{s.skill_name}</p>
                  {s.avg_time_ms > 0 ? (
                    <p className="text-[12px] text-ink-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatMs(s.avg_time_ms)} / question
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
            {skills.length === 0 ? (
              <li className="text-[13px] text-ink-secondary">No module data in this snapshot.</li>
            ) : null}
          </ul>
        </Tile>

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
            <p className="text-[14px] text-ink-secondary">No strategy data in this snapshot.</p>
          )}
        </Tile>

        <Tile title="Fix these first" delay={280} className="lg:col-span-8">
          {insight && insight.persistent_strengths.length > 0 ? (
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
      </div>

      <p className="pb-4 text-center text-[12px] text-ink-secondary">
        This is a frozen snapshot — it doesn&apos;t update as {snap.shared_by} takes more mocks.
      </p>
    </div>
  );
}

/**
 * The public share page: /share/[token]. Works fully logged-out — it fetches
 * the frozen snapshot from the public endpoint (no auth header) and renders it
 * read-only with the same components the dashboard uses.
 */
export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getSharedReport(token)
      .then((r) => {
        if (active) setReport(r);
      })
      .catch(() => {
        // Bad, expired or revoked all read the same — deliberately generic.
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center py-24 text-center">
          <Loader2 className="size-6 animate-spin text-brand" strokeWidth={2} aria-hidden="true" />
          <p role="status" className="mt-3 text-[15px] text-ink-secondary">
            Loading the report…
          </p>
        </div>
      </Shell>
    );
  }

  if (error || !report) {
    return (
      <Shell>
        <div className="glass-tile reveal mx-auto max-w-[440px] rounded-[20px] p-10 text-center">
          <h1 className="font-display text-[24px] font-semibold tracking-[-0.01em] text-ink">
            This link is unavailable
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
            It may have expired or been revoked by its owner.
          </p>
        </div>
      </Shell>
    );
  }

  if (report.scope === "leaderboard") {
    const first = report.shared_by.trim().split(/\s+/)[0] || report.shared_by;
    return (
      <Shell>
        <div className="mx-auto w-full max-w-[720px]">
          <div className="mb-5">
            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
              {report.shared_by}&apos;s leaderboard standing
            </h1>
            <p className="mt-1 text-[14px] text-ink-secondary">
              Snapshot shared {formatDate(report.generated_at)} ·{" "}
              {report.leaderboard.me.total_participants} students in the stream
            </p>
          </div>
          <LeaderboardBoard data={report.leaderboard} meLabel={first} />
          <p className="py-6 text-center text-[12px] text-ink-secondary">
            This is a frozen snapshot — it doesn&apos;t update.
          </p>
        </div>
      </Shell>
    );
  }

  if (report.scope === "attempt") {
    const detail = report.attempt;
    return (
      <Shell>
        <div className="mb-5">
          <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
            {report.shared_by}&apos;s mock result
          </h1>
          <p className="mt-1 text-[14px] text-ink-secondary">
            Snapshot shared {formatDate(report.generated_at)}
          </p>
        </div>
        <AttemptDetail
          attemptId={detail.attempt.id}
          snapshot={detail}
          readOnly
          onBack={() => {}}
          onUnauthorized={() => {}}
        />
        <p className="py-6 text-center text-[12px] text-ink-secondary">
          This is a frozen snapshot — it doesn&apos;t update.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <SharedDashboard snap={report} />
    </Shell>
  );
}
