"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ApiError, getLeaderboard } from "@/lib/api";
import type { LeaderboardOut } from "@/lib/types";

const METRIC_LABEL: Record<string, string> = {
  best_score: "Best score",
  latest_percentile: "Latest percentile",
  avg_accuracy: "Average accuracy",
};

function formatValue(v: number | null): string {
  if (v == null) return "—";
  return Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1);
}

/**
 * Stream leaderboard: the top-10 with the student's own row highlighted, and a
 * pinned "You" row when they sit outside the top-10. Fetches independently so a
 * leaderboard hiccup never takes the rest of the dashboard down.
 */
export function LeaderboardTile({
  onUnauthorized,
  limit,
}: {
  onUnauthorized: () => void;
  /** Show only the first N entries (dashboard tile: 3 → top-3 + pinned "You"). */
  limit?: number;
}) {
  const [data, setData] = useState<LeaderboardOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getLeaderboard()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.unauthorized) {
          onUnauthorized();
          return;
        }
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onUnauthorized]);

  if (loading) {
    return (
      <div role="status" aria-label="Loading leaderboard" className="flex flex-col gap-2 py-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="animate-skeleton h-10 rounded-[10px] bg-surface-field" />
        ))}
        <span className="sr-only">Loading leaderboard…</span>
      </div>
    );
  }

  if (error || !data) {
    return <p className="py-2 text-[14px] text-ink-secondary">Couldn&apos;t load the leaderboard.</p>;
  }

  if (data.entries.length === 0 || data.me.rank == null) {
    return <p className="py-2 text-[14px] text-ink-secondary">No ranked attempts yet.</p>;
  }

  const visible = limit ? data.entries.slice(0, limit) : data.entries;
  const meInTop = visible.some((e) => e.is_me);
  const metricLabel = METRIC_LABEL[data.metric] ?? data.metric.replace(/_/g, " ");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-1 flex items-center justify-between text-[11px] text-ink-secondary">
        <span className="font-medium uppercase tracking-[0.08em]">{metricLabel}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {data.me.total_participants} students
        </span>
      </div>

      <ol className="flex flex-col gap-1.5">
        {visible.map((e) => (
          <li
            key={`${e.rank}-${e.display_name}`}
            className={cn(
              "flex items-center gap-3 rounded-[12px] px-3 py-2",
              e.is_me ? "bg-brand/[0.08]" : "bg-surface"
            )}
          >
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums",
                e.rank === 1
                  ? "bg-ink text-surface"
                  : e.is_me
                    ? "bg-brand-fill text-brand-on"
                    : "bg-surface-field text-ink-secondary"
              )}
            >
              {e.rank}
            </span>
            <span className={cn("min-w-0 flex-1 truncate text-[14px]", e.is_me ? "font-semibold text-ink" : "text-ink")}>
              {e.display_name}
              {e.is_me ? <span className="ml-1.5 text-[11px] font-semibold text-brand">You</span> : null}
            </span>
            <span
              className="shrink-0 text-[14px] font-semibold text-ink"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatValue(e.value)}
            </span>
          </li>
        ))}
      </ol>

      {/* Pinned "You" row when the student sits outside the visible top-10. */}
      {!meInTop ? (
        <div className="mt-1 flex items-center gap-3 rounded-[12px] border border-brand/25 bg-brand/[0.08] px-3 py-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-fill text-[12px] font-semibold tabular-nums text-brand-on">
            {data.me.rank}
          </span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
            You <span className="font-normal text-ink-secondary">· rank {data.me.rank} of {data.me.total_participants}</span>
          </span>
          <span className="shrink-0 text-[14px] font-semibold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatValue(data.me.value)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
