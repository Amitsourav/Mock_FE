"use client";

import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";
import { Panel } from "@/components/app/Panel";
import { QuestionGrid } from "@/components/app/dashboard/QuestionGrid";
import { Skeleton } from "@/components/app/Skeleton";
import { ApiError, getAttemptDetail } from "@/lib/api";
import { formatDate, formatMs, formatPct } from "@/lib/format";
import type { AttemptDetail as AttemptDetailData, AttemptInsight } from "@/lib/types";

/** The qualitative read for one attempt — the story before the tables. */
function InsightBlock({ insight }: { insight: AttemptInsight }) {
  return (
    <section className="rounded-[16px] border border-hairline bg-surface-card p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-field px-2.5 py-1 text-[11px] font-medium text-ink-secondary">
        <Sparkles className="size-3 text-brand" strokeWidth={2.5} aria-hidden="true" />
        AI insight
      </div>
      <h3 className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-ink">
        {insight.headline}
      </h3>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Where you are", value: insight.current_status },
          { label: "The gap", value: insight.gap_diagnosis },
          { label: "Calibration", value: insight.calibration_note },
        ].map((row) => (
          <div key={row.label} className="rounded-[12px] bg-surface-field p-3.5">
            <dt className="text-[12px] font-medium text-ink-secondary">{row.label}</dt>
            <dd className="mt-1 text-[13px] leading-relaxed text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      {insight.next_actions.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-medium text-ink-secondary">Next actions</p>
          <ul className="flex flex-col gap-2">
            {insight.next_actions.map((action, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[11px] font-semibold text-brand"
                >
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The drill-down for a single past attempt: section-wise and skill-wise
 * breakdowns plus the per-question grid. Pure result-viewing — no test is
 * started here, so no coming-soon gate applies.
 */
export function AttemptDetail({
  attemptId,
  onBack,
  onUnauthorized,
}: {
  attemptId: string;
  onBack: () => void;
  onUnauthorized: () => void;
}) {
  const [data, setData] = useState<AttemptDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getAttemptDetail(attemptId)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.unauthorized) {
          onUnauthorized();
          return;
        }
        setError(err instanceof ApiError ? err.message : "Couldn't load this attempt.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attemptId, onUnauthorized]);

  // Print just this report: `print-attempt` on <body> hides everything tagged
  // .print-dash (see globals.css), so window.print() captures only this region.
  function downloadPdf() {
    document.body.classList.add("print-attempt");
    const cleanup = () => {
      document.body.classList.remove("print-attempt");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <div className="animate-step-in flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand transition-opacity hover:opacity-70"
        >
          <X className="size-4" strokeWidth={2} aria-hidden="true" />
          Close report
        </button>
        {data ? (
          <button
            type="button"
            onClick={downloadPdf}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-hairline bg-surface-card px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-field"
          >
            <Download className="size-3.5" strokeWidth={2} aria-hidden="true" />
            Download PDF
          </button>
        ) : null}
      </div>

      {loading ? (
        <div role="status" aria-busy="true" aria-label="Loading attempt" className="flex flex-col gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-48" />
          <Skeleton className="h-40" />
          <span className="sr-only">Loading attempt…</span>
        </div>
      ) : error ? (
        <Panel>
          <p role="alert" className="text-[14px] text-ink-secondary">
            {error}
          </p>
        </Panel>
      ) : data ? (
        <>
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
              {data.attempt.mock_title}
            </h2>
            <p className="mt-1 text-[13px] text-ink-secondary">
              {formatDate(data.attempt.submitted_at)} · Score {data.attempt.score}/
              {data.attempt.max_score} · {formatPct(data.attempt.accuracy_pct)} accuracy
              {data.attempt.percentile != null
                ? ` · ${data.attempt.percentile.toFixed(0)}th percentile`
                : ""}
            </p>
          </div>

          {/* The qualitative insight leads — the story before the tables. */}
          {data.insight ? <InsightBlock insight={data.insight} /> : null}

          {/* Section-wise breakdown */}
          <Panel title="By section">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]" style={{ fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr className="border-b border-hairline text-left text-ink-secondary">
                    <th className="pb-2 pr-4 font-medium">Section</th>
                    <th className="pb-2 pr-4 text-right font-medium">Correct</th>
                    <th className="pb-2 pr-4 text-right font-medium">Wrong</th>
                    <th className="pb-2 pr-4 text-right font-medium">Skipped</th>
                    <th className="pb-2 pr-4 text-right font-medium">Accuracy</th>
                    <th className="pb-2 text-right font-medium">Avg time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sections.map((s) => (
                    <tr key={s.section_name} className="border-b border-hairline last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-ink">{s.section_name}</td>
                      <td className="py-2.5 pr-4 text-right text-ink">{s.correct}</td>
                      <td className="py-2.5 pr-4 text-right text-ink">{s.wrong}</td>
                      <td className="py-2.5 pr-4 text-right text-ink">{s.skipped}</td>
                      <td className="py-2.5 pr-4 text-right text-ink">{formatPct(s.accuracy_pct)}</td>
                      <td className="py-2.5 text-right text-ink-secondary">{formatMs(s.avg_time_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Skill-wise breakdown */}
          {data.skills.length > 0 ? (
            <Panel title="By skill">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-[13px]" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <thead>
                    <tr className="border-b border-hairline text-left text-ink-secondary">
                      <th className="pb-2 pr-4 font-medium">Skill</th>
                      <th className="pb-2 pr-4 text-right font-medium">Correct</th>
                      <th className="pb-2 pr-4 text-right font-medium">Total</th>
                      <th className="pb-2 pr-4 text-right font-medium">Accuracy</th>
                      <th className="pb-2 text-right font-medium">Avg time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.skills.map((s) => (
                      <tr key={s.skill_code} className="border-b border-hairline last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-ink">{s.skill_name}</td>
                        <td className="py-2.5 pr-4 text-right text-ink">{s.correct}</td>
                        <td className="py-2.5 pr-4 text-right text-ink">{s.total}</td>
                        <td className="py-2.5 pr-4 text-right text-ink">{formatPct(s.accuracy_pct)}</td>
                        <td className="py-2.5 text-right text-ink-secondary">{formatMs(s.avg_time_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}

          {/* Per-question grid */}
          {data.questions.length > 0 ? (
            <Panel title={`Questions (${data.questions.length})`}>
              <QuestionGrid questions={data.questions} />
            </Panel>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
