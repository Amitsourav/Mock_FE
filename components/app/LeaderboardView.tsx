"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ClipboardList,
  Copy,
  MessageCircle,
  Share2,
  Trophy,
} from "lucide-react";
import { Tile } from "@/components/app/dashboard/DashboardView";
import { Skeleton } from "@/components/app/Skeleton";
import { ApiError, createShareLink, getLeaderboard } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardOut, ShareLinkOut } from "@/lib/types";

const METRIC_LABEL: Record<string, string> = {
  best_score: "Best score",
  latest_percentile: "Latest percentile",
  avg_accuracy: "Average accuracy",
};

/** Medal treatment for the podium + list chips. Decorative; rank number always shown. */
const MEDAL: Record<number, { fg: string; bg: string }> = {
  1: { fg: "#a16207", bg: "rgba(212, 160, 23, 0.18)" },
  2: { fg: "#6b7280", bg: "rgba(156, 163, 175, 0.22)" },
  3: { fg: "#9a5b2d", bg: "rgba(176, 106, 58, 0.18)" },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatValue(v: number | null): string {
  if (v == null) return "—";
  return Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1);
}

/** ▲/▼ movement vs the previous period; hidden when the backend omits it. */
function Delta({ delta }: { delta?: number | null }) {
  if (delta == null || delta === 0) {
    return <span className="w-8 text-center text-[11px] text-ink-secondary/60">—</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex w-8 items-center justify-center gap-0.5 text-[11px] font-semibold",
        up ? "text-success" : "text-error"
      )}
      style={{ fontVariantNumeric: "tabular-nums" }}
      aria-label={`moved ${up ? "up" : "down"} ${Math.abs(delta)} place${Math.abs(delta) === 1 ? "" : "s"}`}
    >
      {up ? (
        <ArrowUp className="size-3" strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <ArrowDown className="size-3" strokeWidth={2.5} aria-hidden="true" />
      )}
      {Math.abs(delta)}
    </span>
  );
}

/** One podium column: avatar + name + score standing on a stepped pedestal —
 *  the champion's step rises tallest, so the tile's height becomes the design. */
function PodiumSpot({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const medal = MEDAL[place];
  const isFirst = place === 1;
  const stepHeight = place === 1 ? 88 : place === 2 ? 56 : 40;
  return (
    <div className="flex max-w-[140px] flex-1 flex-col items-center justify-end gap-2 self-end">
      {isFirst ? (
        <Trophy className="size-5" style={{ color: medal.fg }} strokeWidth={2} aria-hidden="true" />
      ) : null}
      <div
        className="flex items-center justify-center rounded-full font-semibold"
        style={{
          backgroundColor: medal.bg,
          color: medal.fg,
          width: isFirst ? 64 : 52,
          height: isFirst ? 64 : 52,
          fontSize: isFirst ? 18 : 15,
        }}
        aria-hidden="true"
      >
        {initials(entry.display_name)}
      </div>
      <div className="text-center">
        <p className="max-w-[120px] truncate text-[13px] font-semibold text-ink">{entry.display_name}</p>
        <p
          className="font-display text-[20px] font-semibold leading-tight text-ink"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatValue(entry.value)}
        </p>
      </div>
      {/* the pedestal */}
      <div
        className="flex w-full items-start justify-center rounded-t-[12px] pt-2"
        style={{ height: stepHeight, backgroundColor: medal.bg }}
      >
        <span className="text-[14px] font-bold" style={{ color: medal.fg }}>
          {place}
        </span>
      </div>
    </div>
  );
}

/** One list row. `meLabel` names the highlighted person ("You", or the sharer). */
function Row({ e, meLabel = "You" }: { e: LeaderboardEntry; meLabel?: string }) {
  const medal = e.rank <= 3 ? MEDAL[e.rank] : null;
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-[12px] px-3 py-2.5",
        e.is_me ? "border border-brand/25 bg-brand/[0.08]" : "bg-surface"
      )}
    >
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums"
        style={
          medal
            ? { backgroundColor: medal.bg, color: medal.fg }
            : e.is_me
              ? { backgroundColor: "var(--brand-fill)", color: "var(--brand-on)" }
              : { backgroundColor: "var(--surface-field)", color: "var(--ink-secondary)" }
        }
      >
        {e.rank}
      </span>
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-fill/[0.08] text-[11px] font-semibold text-brand"
      >
        {initials(e.display_name)}
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-[14px] text-ink", e.is_me && "font-semibold")}>
        {e.display_name}
        {e.is_me ? <span className="ml-1.5 text-[11px] font-semibold text-brand">{meLabel}</span> : null}
      </span>
      <Delta delta={e.delta_rank} />
      <span
        className="w-10 shrink-0 text-right text-[14px] font-semibold text-ink"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatValue(e.value)}
      </span>
    </li>
  );
}

/**
 * The read-only board (podium + top-10 + around-slice) — reused by the public
 * share page, where `meLabel` becomes the sharer's name instead of "You".
 */
export function LeaderboardBoard({ data, meLabel = "You" }: { data: LeaderboardOut; meLabel?: string }) {
  const top3 = data.entries.slice(0, 3);
  const meInList = data.entries.some((e) => e.is_me);
  return (
    <div className="flex flex-col gap-4">
      <Tile delay={60} className="pb-0">
        {top3.length === 3 ? (
          <div className="flex w-full items-end justify-center gap-2 pt-2 sm:gap-8">
            <PodiumSpot entry={top3[1]} place={2} />
            <PodiumSpot entry={top3[0]} place={1} />
            <PodiumSpot entry={top3[2]} place={3} />
          </div>
        ) : (
          <p className="pb-5 text-[14px] text-ink-secondary">Not enough ranked students yet.</p>
        )}
      </Tile>
      <Tile title="Top 10" delay={100}>
        <ol className="flex flex-col gap-1.5">
          {data.entries.map((e) => (
            <Row key={`${e.rank}-${e.display_name}`} e={e} meLabel={meLabel} />
          ))}
        </ol>
      </Tile>
      {!meInList && (data.around_me?.length ?? 0) > 0 ? (
        <Tile title={meLabel === "You" ? "Around you" : `Around ${meLabel}`} delay={140}>
          <ol className="flex flex-col gap-1.5">
            {data.around_me!.map((e) => (
              <Row key={`${e.rank}-${e.display_name}`} e={e} meLabel={meLabel} />
            ))}
          </ol>
        </Tile>
      ) : null}
    </div>
  );
}

/**
 * The square share CTA on the right rail: an illustrated "challenge your
 * friends" card with one-tap WhatsApp, copy-link and OS-share actions. The
 * share link is created once (POST /share {scope:"leaderboard"}) and reused
 * across all three buttons.
 */
function ShareRankCard({
  me,
  onUnauthorized,
}: {
  me: LeaderboardOut["me"];
  onUnauthorized: () => void;
}) {
  const [link, setLink] = useState<ShareLinkOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareText =
    me.rank != null
      ? `I'm ranked #${me.rank} of ${me.total_participants} on the dMAT leaderboard — think you can beat me? 🏆`
      : "Check out my dMAT leaderboard standing 🏆";

  /** Create the link once; every button funnels through here. */
  async function ensureLink(): Promise<ShareLinkOut | null> {
    if (link) return link;
    setBusy(true);
    setError(null);
    try {
      const created = await createShareLink({ scope: "leaderboard" });
      setLink(created);
      return created;
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return null;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't create the link. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function shareWhatsApp() {
    const l = await ensureLink();
    if (!l) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText} ${l.url}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copyLink() {
    const l = await ensureLink();
    if (!l) return;
    try {
      await navigator.clipboard.writeText(l.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — nothing else to do; the link stays reusable.
    }
  }

  async function shareNative() {
    const l = await ensureLink();
    if (!l) return;
    try {
      await navigator.share?.({ title: "My dMAT leaderboard rank", text: shareText, url: l.url });
    } catch {
      // Sheet dismissed.
    }
  }

  return (
    <section className="glass-tile glass-hover reveal rounded-[20px] p-6 text-center" style={{ animationDelay: "140ms" }}>
      {/* Illustration — decorative trophy medallion with the rank pinned on. */}
      <div aria-hidden="true" className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-brand-fill/20 blur-2xl" />
        <div className="absolute inset-1 rounded-full border border-dashed border-brand/25" />
        <div className="relative flex size-20 items-center justify-center rounded-[26px] bg-brand-fill/[0.12] text-brand ring-1 ring-brand/20">
          <Trophy className="size-9" strokeWidth={1.7} />
        </div>
        {me.rank != null ? (
          <span className="absolute -right-1 top-0 rounded-full bg-ink px-2.5 py-1 text-[12px] font-bold text-surface shadow-[var(--shadow-card)]">
            #{me.rank}
          </span>
        ) : null}
      </div>

      <h2 className="font-display text-[20px] font-semibold leading-snug tracking-[-0.01em] text-ink">
        Challenge your friends
      </h2>
      <p className="mx-auto mt-1.5 max-w-[24ch] text-[13px] leading-relaxed text-ink-secondary">
        Share your rank and see who can beat it.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void shareWhatsApp()}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: "#1faa55" }}
        >
          <MessageCircle className="size-4" strokeWidth={2.25} aria-hidden="true" />
          Share on WhatsApp
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-hairline bg-surface px-4 text-[14px] font-medium text-ink transition-colors hover:bg-surface-field disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copied ? (
            <>
              <Check className="size-4 text-success" strokeWidth={2.5} aria-hidden="true" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-4" strokeWidth={2} aria-hidden="true" />
              Copy link
            </>
          )}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator ? (
          <button
            type="button"
            onClick={() => void shareNative()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-hairline bg-surface px-4 text-[14px] font-medium text-ink transition-colors hover:bg-surface-field disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Share2 className="size-4" strokeWidth={2} aria-hidden="true" />
            More options
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[12px] leading-relaxed text-error">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-ink-secondary">
          Friends see a snapshot — no login needed.
        </p>
      )}
    </section>
  );
}

/**
 * The Leaderboard destination: podium, your-rank hero with movement and the
 * "overtake" target, the ranked list with weekly movement, an around-you slice
 * when you sit outside the top-10, and a straight path back to taking a mock.
 */
export function LeaderboardView({
  onUnauthorized,
  onGoToMocks,
}: {
  onUnauthorized: () => void;
  onGoToMocks?: () => void;
}) {
  const [timeframe, setTimeframe] = useState<"week" | "all">("all");
  const [data, setData] = useState<LeaderboardOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real data from the backend — ranked live from attempt_results, per timeframe.
  useEffect(() => {
    let active = true;
    setLoading(true);
    getLeaderboard(timeframe)
      .then((d) => {
        if (!active) return;
        setData(d);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.unauthorized) {
          onUnauthorized();
          return;
        }
        if (active) setError(err instanceof ApiError ? err.message : "Couldn't load the leaderboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [timeframe, onUnauthorized]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-14 w-96 max-w-full" />
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
          <Skeleton className="h-[220px] rounded-[20px]" />
          <Skeleton className="h-[220px] rounded-[20px]" />
          <Skeleton className="h-[220px] rounded-[20px]" />
        </div>
        <Skeleton className="h-[320px] rounded-[20px]" />
      </div>
    );
  }
  if (error) {
    return (
      <Tile>
        <p role="alert" className="text-[14px] text-ink-secondary">
          {error}
        </p>
      </Tile>
    );
  }
  if (!data) return null;

  const metricLabel = METRIC_LABEL[data.metric] ?? data.metric.replace(/_/g, " ");
  const top3 = data.entries.slice(0, 3);
  const meInList = data.entries.some((e) => e.is_me);
  const topPct =
    data.me.rank != null && data.me.total_participants > 0
      ? Math.max(1, Math.round((data.me.rank / data.me.total_participants) * 1000) / 10)
      : null;

  // The obvious path to improve: the person one rank above, and the gap to them.
  const pool = meInList ? data.entries : (data.around_me ?? []);
  const nextAbove =
    data.me.rank != null ? pool.find((e) => e.rank === (data.me.rank ?? 0) - 1) : undefined;
  const gap =
    nextAbove && data.me.value != null ? Math.max(0, nextAbove.value - data.me.value) : null;

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header + timeframe tabs */}
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
            Stream leaderboard
          </h1>
          <p className="mt-1 text-[14px] text-ink-secondary">
            {metricLabel} · {data.me.total_participants} students in your stream
          </p>
        </div>
        <div className="flex rounded-[12px] border border-hairline bg-surface-card p-1">
          {(["week", "all"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={timeframe === t}
              onClick={() => setTimeframe(t)}
              className={cn(
                "h-8 rounded-[9px] px-3.5 text-[13px] font-medium transition-colors",
                timeframe === t ? "bg-ink text-surface" : "text-ink-secondary hover:text-ink"
              )}
            >
              {t === "week" ? "This week" : "All time"}
            </button>
          ))}
        </div>
      </div>

      {/* Hero row: your rank (dark glass) · the podium · the share CTA */}
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <section
          className="glass-dark glass-hover reveal flex flex-col justify-between rounded-[20px] p-6 text-surface"
          style={{ animationDelay: "60ms" }}
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-surface/60">
              Your rank
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <p
                className="font-display text-[56px] font-semibold leading-none tracking-[-0.02em]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                #{data.me.rank ?? "—"}
              </p>
              {data.me.delta_rank != null && data.me.delta_rank !== 0 ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-semibold",
                    data.me.delta_rank > 0 ? "bg-success/20 text-success" : "bg-error/20 text-error"
                  )}
                >
                  {data.me.delta_rank > 0 ? (
                    <ArrowUp className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <ArrowDown className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  )}
                  {Math.abs(data.me.delta_rank)} this week
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[13px] text-surface/60">
              {topPct != null ? `Top ${topPct}% of your stream` : "Take a mock to get ranked"}
              {data.me.value != null ? ` · ${metricLabel.toLowerCase()} ${formatValue(data.me.value)}` : ""}
            </p>

            {/* Road to the crown — fills the card's middle with the chase. */}
            {data.me.value != null && data.entries[0] ? (
              <div className="mt-7 flex flex-col gap-5">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-surface/60">
                      Road to the crown
                    </p>
                    <p className="text-[12px] text-surface/70" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatValue(data.me.value)} / {formatValue(data.entries[0].value)}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface/15">
                    <div
                      className="h-full rounded-full bg-surface transition-[width] duration-700 ease-out"
                      style={{
                        width: `${Math.min(100, Math.max(4, (data.me.value / Math.max(1, data.entries[0].value)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {data.me.rank != null ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-surface/60">Students behind you</span>
                      <span
                        className="text-[15px] font-semibold text-surface"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {Math.max(0, data.me.total_participants - data.me.rank)}
                      </span>
                    </div>
                  ) : null}
                  {data.me.rank != null && data.me.rank > 3 && data.entries[2] ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-surface/60">Marks to the podium (#3)</span>
                      <span
                        className="text-[15px] font-semibold text-surface"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {Math.max(0, data.entries[2].value - data.me.value)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          {nextAbove && gap != null ? (
            <div className="mt-6 border-t border-surface/15 pt-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-surface/60">
                Next target
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-surface/90">
                <span className="font-semibold text-surface">
                  {gap === 0 ? "Tied — one more mark" : `${gap} mark${gap === 1 ? "" : "s"}`}
                </span>{" "}
                to overtake {nextAbove.display_name} (#{nextAbove.rank}).
              </p>
            </div>
          ) : null}
        </section>

        {/* Podium: 2 · 1 · 3, standing on stepped pedestals. The headline turns
            the tall upper zone into the hook: the score to beat + your gap. */}
        <Tile delay={100} className="relative flex flex-col overflow-hidden pb-0">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full blur-[60px]"
            style={{ backgroundColor: "rgba(212, 160, 23, 0.14)" }}
          />
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-secondary">
              Podium · {timeframe === "week" ? "this week" : "all time"}
            </p>
            {top3.length === 3 ? (
              <>
                <h2 className="mt-2 font-display text-[22px] font-semibold leading-snug tracking-[-0.01em] text-ink">
                  {formatValue(top3[0].value)} is the score to beat.
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                  {data.me.value != null && data.me.rank != null ? (
                    data.me.rank === 1 ? (
                      <>You hold the crown — defend it. 👑</>
                    ) : (
                      <>
                        {top3[0].display_name} holds the crown — you&apos;re{" "}
                        <span className="font-semibold text-ink">
                          {Math.max(0, top3[0].value - data.me.value)} marks
                        </span>{" "}
                        away.
                      </>
                    )
                  ) : (
                    <>Take a mock to enter the race.</>
                  )}
                </p>
              </>
            ) : null}
          </div>
          {top3.length === 3 ? (
            <div className="relative mt-auto flex w-full items-end justify-center gap-2 pt-4 sm:gap-8">
              <PodiumSpot entry={top3[1]} place={2} />
              <PodiumSpot entry={top3[0]} place={1} />
              <PodiumSpot entry={top3[2]} place={3} />
            </div>
          ) : (
            <p className="py-4 text-[14px] text-ink-secondary">Not enough ranked students yet.</p>
          )}
        </Tile>

        {/* Share CTA — completes the hero band */}
        <ShareRankCard me={data.me} onUnauthorized={onUnauthorized} />
      </div>

      {/* The board — two columns of five at full width */}
      <Tile title="Top 10" delay={160}>
        <div className="grid gap-x-8 gap-y-1.5 lg:grid-cols-2">
          <ol className="flex flex-col gap-1.5">
            {data.entries.slice(0, 5).map((e) => (
              <Row key={`${e.rank}-${e.display_name}`} e={e} />
            ))}
          </ol>
          <ol className="flex flex-col gap-1.5">
            {data.entries.slice(5, 10).map((e) => (
              <Row key={`${e.rank}-${e.display_name}`} e={e} />
            ))}
          </ol>
        </div>
      </Tile>

      {/* Around you — only when you're outside the visible top-10 */}
      {!meInList && (data.around_me?.length ?? 0) > 0 ? (
        <Tile
          title="Around you"
          delay={200}
          action={
            <span className="text-[12px] text-ink-secondary">your nearest rivals</span>
          }
        >
          <ol className="flex flex-col gap-1.5">
            {data.around_me!.map((e) => (
              <Row key={`${e.rank}-${e.display_name}`} e={e} />
            ))}
          </ol>
        </Tile>
      ) : null}

      {/* The path up */}
      <section
        className="glass-tile reveal flex flex-wrap items-center justify-between gap-4 rounded-[20px] p-5"
        style={{ animationDelay: "240ms" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-fill/[0.1] text-brand">
            <ClipboardList className="size-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">Climb the board</p>
            <p className="text-[13px] text-ink-secondary">
              Every mock counts towards your {metricLabel.toLowerCase()}.
            </p>
          </div>
        </div>
        {onGoToMocks ? (
          <button
            type="button"
            onClick={onGoToMocks}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-brand-fill px-4 text-[14px] font-medium text-brand-on transition-colors hover:bg-brand-fill-hover"
          >
            Take a mock
            <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
        ) : null}
      </section>
    </div>
  );
}
