"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, RefreshCw, Search } from "lucide-react";
import { Modal } from "@/components/app/Modal";
import { Skeleton, SkeletonPanel } from "@/components/app/Skeleton";
import { ApiError, getNews, getNewsDates } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ImportantDate, NewsCategory, NewsItem } from "@/lib/types";

/* --------------------------------------------------------------------------
   Dates & News as a modern news front page (The Hindu-style), in the app's
   own design system: flat white sheet, hairline column rules, Fraunces
   headlines, coloured section caps, serif body. Centre carries the lead and
   the story grid, the left rail lists more headlines, and the right rail is
   the sticky dates panel (countdown + schedule) where a news site would put
   "Most Popular". Clicking any story opens the detail popup; "Read more"
   goes to the official source. Pure render — everything from the backend.
-------------------------------------------------------------------------- */

const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", Times, serif';
const MONO =
  'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

const PAGE_SIZE = 10;
/** Stories younger than this many days get the red "NEW" live dot. */
const NEW_DAYS = 7;

const CATEGORY_META: Record<NewsCategory, { label: string; color: string }> = {
  dmat: { label: "dMAT", color: "var(--brand)" },
  aps: { label: "APS", color: "var(--et-careless)" },
  visa: { label: "Visa", color: "var(--et-guess)" },
  exams: { label: "Exams", color: "var(--mastery-developing)" },
  deadlines: { label: "Deadlines", color: "var(--error)" },
  scholarships: { label: "Scholarships", color: "var(--mastery-strong)" },
  general: { label: "General", color: "var(--ink-secondary)" },
};
const CATEGORY_ORDER = Object.keys(CATEGORY_META) as NewsCategory[];

/** Local-timezone ISO day (toISOString would drift a day around midnight IST). */
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-09-15" → local midnight Date. */
function atMidnight(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function ageDays(iso: string, now: Date | null): number | null {
  if (!now) return null;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

/** Editorial-style relative age: "today", "yesterday", "2 weeks ago"… */
function timeAgo(iso: string, now: Date | null): string | null {
  const days = ageDays(iso, now);
  if (days === null) return null;
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function categoryOf(item: NewsItem) {
  return CATEGORY_META[item.category] ?? CATEGORY_META.general;
}

/** Small coloured section cap, the page's signature label. */
function SectionCap({ item, className }: { item: NewsItem; className?: string }) {
  return (
    <span
      className={cn("text-[11px] font-bold uppercase tracking-[0.08em]", className)}
      style={{ color: categoryOf(item).color }}
    >
      {categoryOf(item).label}
    </span>
  );
}

export function DatesNewsView({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [items, setItems] = useState<ImportantDate[] | null>(null);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NewsCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  /** The story open in the detail popup. */
  const [active, setActive] = useState<NewsItem | null>(null);
  // Ticks every second after mount; null during SSR so markup matches.
  const [now, setNow] = useState<Date | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([getNewsDates(), getNews({ limit: 100 })])
      .then(([dates, feed]) => {
        setItems(dates.items);
        setNews(feed.items);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.unauthorized) {
          onUnauthorized();
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Couldn't load the schedule. Try again."
        );
      });
  }, [onUnauthorized]);

  useEffect(load, [load]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // New filter/search → restart pagination.
  useEffect(() => setVisible(PAGE_SIZE), [filter, query]);

  const today = now ? localISO(now) : null;
  const next =
    today && items ? items.find((i) => i.date && i.date >= today) ?? null : null;

  let clock: { d: string; h: string; m: string; s: string } | null = null;
  if (now && next?.date) {
    const ms = Math.max(0, atMidnight(next.date).getTime() - now.getTime());
    clock = {
      d: String(Math.floor(ms / 86_400_000)).padStart(2, "0"),
      h: String(Math.floor((ms % 86_400_000) / 3_600_000)).padStart(2, "0"),
      m: String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, "0"),
      s: String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0"),
    };
  }

  const counts = useMemo(() => {
    const c = new Map<NewsCategory, number>();
    for (const n of news ?? []) c.set(n.category, (c.get(n.category) ?? 0) + 1);
    return c;
  }, [news]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (news ?? []).filter(
      (n) =>
        (filter === "all" || n.category === filter) &&
        (q === "" ||
          n.title.toLowerCase().includes(q) ||
          (n.summary ?? "").toLowerCase().includes(q))
    );
  }, [news, filter, query]);

  // Front-page distribution: lead in the centre, next few in the left rail,
  // the rest in the centre grid (which is what "load more" extends).
  const shown = filtered.slice(0, visible);
  const lead = shown[0] ?? null;
  const rail = shown.slice(1, 6);
  const grid = shown.slice(6);

  const openStory = (n: NewsItem) => setActive(n);
  const storyKeys = (n: NewsItem) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-haspopup": "dialog" as const,
    onClick: () => openStory(n),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openStory(n);
      }
    },
  });

  if (error) {
    return (
      <div className="glass-tile reveal mx-auto mt-16 flex max-w-[380px] flex-col items-center gap-4 rounded-[20px] p-8 text-center">
        <p className="text-[15px] font-medium text-ink">{error}</p>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-full bg-brand-fill px-5 py-2.5 text-[14px] font-semibold text-brand-on transition-colors hover:bg-brand-fill-hover"
        >
          <RefreshCw className="size-4" strokeWidth={2} aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (items === null || news === null) {
    return (
      <SkeletonPanel label="Loading dates and news">
        <div className="rounded-[20px] border border-hairline bg-surface p-6">
          <Skeleton className="mx-auto h-9 w-56" />
          <Skeleton className="mt-5 h-5 w-full" />
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <Skeleton className="h-[380px] lg:col-span-3" />
            <Skeleton className="h-[380px] lg:col-span-6" />
            <Skeleton className="h-[380px] lg:col-span-3" />
          </div>
        </div>
      </SkeletonPanel>
    );
  }

  return (
    <div className="news-sheet reveal rounded-[20px] border border-hairline bg-surface shadow-[var(--shadow-card)]">
      <style>{`
        .news-story h3 { text-decoration: underline transparent; text-underline-offset: 3px; transition: text-decoration-color 200ms ease; }
        .news-story:hover h3, .news-story:focus-visible h3 { text-decoration-color: currentColor; }
        .news-story { transition: background-color 160ms ease; }
        .news-story:hover, .news-story:focus-visible { background-color: var(--surface-field); }
        @keyframes news-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .news-live { animation: news-pulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .news-live { animation: none; }
          .news-story h3 { transition: none; }
        }
      `}</style>

      {/* ======================= Page title ======================= */}
      <header className="px-5 pt-5 sm:px-8">
        <div className="flex items-center gap-4">
          {/* Stacked rules flanking the title, like a wire masthead. */}
          <div aria-hidden="true" className="flex flex-1 flex-col gap-[3px]">
            <div className="border-t border-hairline" />
            <div className="border-t border-hairline" />
            <div className="border-t border-hairline" />
          </div>
          <h1 className="shrink-0 font-display text-[30px] font-bold leading-none tracking-[-0.01em] text-ink">
            Dates <span className="text-brand">&amp;</span> News
          </h1>
          <div aria-hidden="true" className="flex flex-1 flex-col gap-[3px]">
            <div className="border-t border-hairline" />
            <div className="border-t border-hairline" />
            <div className="border-t border-hairline" />
          </div>
        </div>

        {/* Section nav + search */}
        <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-hairline-strong pb-3">
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={cn(
              "px-1.5 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors",
              filter === "all"
                ? "text-brand underline decoration-2 underline-offset-[6px]"
                : "text-ink hover:text-brand"
            )}
          >
            All
          </button>
          {CATEGORY_ORDER.filter((c) => (counts.get(c) ?? 0) > 0).map((c) => (
            <span key={c} className="flex items-center">
              <span aria-hidden="true" className="mx-1 text-hairline-strong text-ink-secondary/40">
                /
              </span>
              <button
                type="button"
                onClick={() => setFilter(c)}
                aria-pressed={filter === c}
                className={cn(
                  "px-1.5 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors",
                  filter === c
                    ? "text-brand underline decoration-2 underline-offset-[6px]"
                    : "text-ink hover:text-brand"
                )}
              >
                {CATEGORY_META[c].label}
                <span
                  className="ml-1 text-[11px] font-semibold text-ink-secondary"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {counts.get(c)}
                </span>
              </button>
            </span>
          ))}
          <label className="ml-auto flex min-w-[170px] items-center gap-2 rounded-full border border-hairline bg-surface-field px-3 py-1.5 transition-colors focus-within:border-brand sm:max-w-[220px]">
            <Search className="size-3.5 shrink-0 text-ink-secondary" strokeWidth={2} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stories…"
              aria-label="Search news"
              className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-secondary"
            />
          </label>
        </div>
      </header>

      {/* ======================= Front page ======================= */}
      <div className="grid gap-0 px-5 pb-6 pt-5 sm:px-8 lg:grid-cols-12">
        {/* ---- Left rail: more headlines ---- */}
        <aside
          aria-label="More headlines"
          className="order-2 lg:order-1 lg:col-span-3 lg:border-r lg:border-hairline lg:pr-5"
        >
          {rail.length === 0 ? null : (
            <ol>
              {rail.map((n) => (
                <li key={n.id} className="border-b border-hairline last:border-b-0">
                  <article
                    {...storyKeys(n)}
                    className="news-story -mx-2 cursor-pointer rounded-[8px] px-2 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <SectionCap item={n} />
                    <h3 className="mt-1 font-display text-[15.5px] font-semibold leading-snug text-ink">
                      {n.title}
                    </h3>
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary underline decoration-hairline underline-offset-2">
                      {n.source_name}
                    </p>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </aside>

        {/* ---- Centre: lead + story grid ---- */}
        <section
          aria-label="Top stories"
          className="order-1 min-w-0 lg:order-2 lg:col-span-6 lg:px-6"
        >
          {shown.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-[19px] font-semibold text-ink">
                {query ? `No stories match “${query}”.` : "No updates yet."}
              </p>
              <p className="mt-1.5 text-[13px] text-ink-secondary">
                {query
                  ? "Try a different search or another section."
                  : "New announcements land here automatically."}
              </p>
            </div>
          ) : (
            <>
              {/* Lead story */}
              {lead ? (
                <article
                  {...storyKeys(lead)}
                  className="news-story -mx-3 cursor-pointer rounded-[10px] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <h2 className="font-display text-[26px] font-bold leading-[1.18] tracking-[-0.01em] text-ink sm:text-[30px]">
                    {lead.title}
                  </h2>
                  {lead.summary && lead.summary !== lead.title ? (
                    <p
                      className="mt-3 text-[15px] leading-[1.6] text-ink/85"
                      style={{ fontFamily: SERIF }}
                    >
                      {lead.summary.length > 320
                        ? `${lead.summary.slice(0, 320).trimEnd()}…`
                        : lead.summary}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline-strong pb-3">
                    <SectionCap item={lead} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary underline decoration-hairline underline-offset-2">
                      {lead.source_name}
                    </span>
                    <span
                      className="ml-auto text-[11px] text-ink-secondary"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatDate(lead.published_at)}
                      {timeAgo(lead.published_at, now) ? ` · ${timeAgo(lead.published_at, now)}` : ""}
                    </span>
                  </div>
                </article>
              ) : null}

              {/* Story grid, two columns like the reference's sub-leads */}
              {grid.length > 0 ? (
                <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
                  {grid.map((n) => {
                    const fresh = (ageDays(n.published_at, now) ?? 99) < NEW_DAYS;
                    return (
                      <article
                        key={n.id}
                        {...storyKeys(n)}
                        className="news-story -mx-2 cursor-pointer rounded-[8px] border-b border-hairline px-2 py-4 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <div className="flex items-center gap-2">
                          {fresh ? (
                            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-error">
                              <span className="news-live size-2 rounded-full bg-error" aria-hidden="true" />
                              New
                            </span>
                          ) : (
                            <SectionCap item={n} />
                          )}
                          <span
                            className="ml-auto text-[11px] text-ink-secondary"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {timeAgo(n.published_at, now) ?? formatDate(n.published_at)}
                          </span>
                        </div>
                        <h3 className="mt-1.5 font-display text-[17px] font-semibold leading-snug text-ink">
                          {n.title}
                        </h3>
                        {n.summary && n.summary !== n.title ? (
                          <p
                            className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-secondary"
                            style={{ fontFamily: SERIF }}
                          >
                            {n.summary}
                          </p>
                        ) : null}
                        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary underline decoration-hairline underline-offset-2">
                          {fresh ? `${categoryOf(n).label} · ` : ""}
                          {n.source_name}
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : null}

              {/* Load more — the reference's bottom chevron */}
              {filtered.length > visible ? (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    aria-label={`Load ${Math.min(PAGE_SIZE, filtered.length - visible)} more stories`}
                    className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-5 py-2.5 text-[13px] font-semibold text-ink shadow-[var(--shadow-card)] transition-colors hover:border-brand hover:text-brand"
                  >
                    <ChevronDown className="size-4" strokeWidth={2.5} aria-hidden="true" />
                    More stories
                    <span className="text-ink-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
                      ({filtered.length - visible})
                    </span>
                  </button>
                </div>
              ) : (
                <p className="mt-6 text-center text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
                  You&apos;re all caught up · Confirm on official pages before travelling or paying fees
                </p>
              )}
            </>
          )}
        </section>

        {/* ---- Right rail: the dates panel (sticky) ---- */}
        <aside
          aria-label="dMAT schedule"
          className="order-3 lg:col-span-3 lg:border-l lg:border-hairline lg:pl-5"
        >
          <div className="lg:sticky lg:top-5">
            {/* Fancy heading with flanking rules, like "Most Popular" */}
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="flex flex-1 flex-col gap-[3px]">
                <div className="border-t border-hairline" />
                <div className="border-t border-hairline" />
              </div>
              <h2 className="shrink-0 font-display text-[19px] font-bold italic text-brand">
                Important Dates
              </h2>
              <div aria-hidden="true" className="flex flex-1 flex-col gap-[3px]">
                <div className="border-t border-hairline" />
                <div className="border-t border-hairline" />
              </div>
            </div>

            {/* Countdown */}
            {next && clock ? (
              <div className="mt-4 rounded-[12px] border border-hairline bg-surface-field/60 p-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">
                  {next.label} · {next.display}
                </p>
                <p
                  className="mt-1.5 text-[22px] font-semibold text-ink"
                  style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}
                  aria-label={`${Number(clock.d)} days remaining`}
                >
                  {clock.d}
                  <span className="text-ink-secondary/60">:</span>
                  {clock.h}
                  <span className="text-ink-secondary/60">:</span>
                  {clock.m}
                  <span className="text-ink-secondary/60">:</span>
                  {clock.s}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-secondary">
                  days · hrs · min · sec
                </p>
              </div>
            ) : null}

            {/* Schedule list */}
            {items.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-secondary">No schedule published yet.</p>
            ) : (
              <ol className="mt-2">
                {items.map((item) => {
                  const isPast = item.date !== null && today !== null && item.date < today;
                  const isNext = next !== null && item.date !== null && item.date === next.date;
                  return (
                    <li
                      key={item.label}
                      className={cn(
                        "flex items-start gap-3 border-b border-hairline py-3 last:border-b-0",
                        isPast && "opacity-45"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-[5px] size-2 shrink-0 rounded-full",
                          isNext ? "news-live bg-error" : isPast ? "bg-success" : "bg-ink-secondary/40"
                        )}
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-[13px] font-bold",
                            isNext ? "text-error" : "text-ink"
                          )}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {item.display}
                        </p>
                        <p
                          className={cn(
                            "text-[13px] leading-snug text-ink-secondary",
                            isPast && "line-through"
                          )}
                        >
                          {item.label}
                        </p>
                      </div>
                      {isNext ? (
                        <span className="ml-auto mt-0.5 shrink-0 rounded-[4px] bg-error/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-error">
                          Next
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}

            <p className="mt-3 border-t border-hairline pt-2.5 text-[10px] uppercase leading-relaxed tracking-[0.1em] text-ink-secondary">
              From aps-india.de &amp; g.a.s.t. · auto-checked every 6h
            </p>
          </div>
        </aside>
      </div>

      {/* ---- Story detail popup ---- */}
      <Modal open={active !== null} onClose={() => setActive(null)} size="lg">
        {active ? (
          <div className="flex max-h-[80dvh] flex-col">
            <div className="min-h-0 overflow-y-auto px-6 pt-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <SectionCap item={active} />
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatDate(active.published_at)} · {active.source_name}
                </span>
              </div>
              <h2 className="mt-2.5 font-display text-[22px] font-bold leading-[1.25] tracking-[-0.01em] text-ink">
                {active.title}
              </h2>
              {active.summary && active.summary !== active.title ? (
                <p className="mt-3 text-[15px] leading-[1.7] text-ink/85" style={{ fontFamily: SERIF }}>
                  {active.summary}
                </p>
              ) : null}
              <p className="mt-4 text-[12px] leading-relaxed text-ink-secondary">
                Always confirm against the official page before travelling or paying fees.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-4">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-full px-4 py-2.5 text-[14px] font-medium text-ink-secondary transition-colors hover:bg-surface-field hover:text-ink"
              >
                Close
              </button>
              <a
                href={active.url ?? "https://aps-india.de/dmat/"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand-fill px-5 py-2.5 text-[14px] font-semibold text-brand-on transition-colors hover:bg-brand-fill-hover"
              >
                Read more
                <ExternalLink className="size-4" strokeWidth={2} aria-hidden="true" />
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
