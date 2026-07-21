/** Small, dependency-free formatters shared across the dashboard and mock views. */

/** 1284 → "1,284"; 12900 → "12.9K"; keeps stat tiles compact. */
export function compactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (Math.abs(value) >= 10_000) return `${trim(value / 1000)}K`;
  return Math.round(value).toLocaleString("en-IN");
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** 42269s → "11h 44m"; 4200s → "1h 10m"; 300s → "5m". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Seconds → a ticking clock "3:29:52" or "9:58" (no hours). For the exam countdown. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Milliseconds → "1.4s" / "820ms" for per-question / per-skill timing. */
export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/** A percentage to one decimal, e.g. 68.26 → "68.3%". */
export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** ISO date → "12 Jul 2026" — short, unambiguous, locale-stable. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
