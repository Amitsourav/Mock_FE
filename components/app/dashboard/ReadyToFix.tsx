"use client";

import { useState } from "react";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import type { ConceptMastery } from "@/lib/types";

const PREVIEW = 4;

/** Mastery band → colour + label from the shared mastery ramp. Never colour-only. */
function masteryBand(p: number): { color: string; label: string } {
  if (p < 0.5) return { color: "var(--mastery-weak)", label: "Weak" };
  if (p < 0.8) return { color: "var(--mastery-developing)", label: "Developing" };
  return { color: "var(--mastery-strong)", label: "Strong" };
}

/**
 * Revise, not learn: mastered once (high p_mastery) but retained memory has
 * decayed. Split out so a 97 %-mastery topic never sits among never-learned ones.
 */
function isRevise(c: ConceptMastery): boolean {
  return c.p_mastery >= 0.8 && c.retention_probability < c.p_mastery - 0.25;
}

/** A compact mastery dial — reads faster and packs tighter than a full-width bar. */
function MasteryRing({
  pct,
  color,
  size = 42,
  stroke = 4.5,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
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
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center text-[11px] font-semibold"
        style={{ color, fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(pct)}
      </span>
    </div>
  );
}

function ConceptRow({ c, revise }: { c: ConceptMastery; revise?: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, c.p_mastery)) * 100);
  const retentionPct = Math.round(Math.max(0, Math.min(1, c.retention_probability)) * 100);
  const band = masteryBand(c.p_mastery);
  return (
    <li
      className="flex items-center gap-3 rounded-[12px] border border-hairline bg-surface p-2.5"
      role="img"
      aria-label={`${c.kc_name}, ${c.subject_name}: ${pct}% mastery (${band.label})${
        revise ? `, memory ${retentionPct}% and fading` : ""
      }.`}
    >
      <MasteryRing pct={pct} color={band.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{c.kc_name}</p>
        <p className="truncate text-[11.5px] text-ink-secondary">
          {c.subject_name}
          {revise ? ` · memory ${retentionPct}% & fading` : null}
        </p>
      </div>
    </li>
  );
}

/** The single highest-impact concept, given hero treatment to draw the eye in. */
function FocusCard({ c }: { c: ConceptMastery }) {
  const pct = Math.round(Math.max(0, Math.min(1, c.p_mastery)) * 100);
  const band = masteryBand(c.p_mastery);
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-hairline bg-surface-card p-5 shadow-[var(--shadow-card)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[60px]"
        style={{ backgroundColor: "color-mix(in srgb, var(--mastery-weak) 22%, transparent)" }}
      />
      <div className="relative flex items-center gap-5">
        <MasteryRing pct={pct} color={band.color} size={72} stroke={6} />
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--mastery-weak) 14%, transparent)",
              color: "var(--mastery-weak)",
            }}
          >
            <Sparkles className="size-3" strokeWidth={2.5} aria-hidden="true" />
            Start here
          </span>
          <p className="mt-1.5 text-[18px] font-semibold tracking-[-0.01em] text-ink">{c.kc_name}</p>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            {c.subject_name} · your highest-impact fix right now
          </p>
        </div>
      </div>
    </div>
  );
}

/** A labelled sub-panel for one group, with a colour-dot header + count and expander. */
function GroupPanel({
  title,
  hint,
  dotColor,
  icon,
  concepts,
  revise,
}: {
  title: string;
  hint: string;
  dotColor: string;
  icon?: React.ReactNode;
  concepts: ConceptMastery[];
  revise?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? concepts : concepts.slice(0, PREVIEW);

  return (
    <div className="rounded-[16px] border border-hairline bg-surface-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
          {title}
          {icon}
          <span className="rounded-full bg-surface-field px-1.5 py-0.5 text-[11px] font-medium text-ink-secondary">
            {concepts.length}
          </span>
        </h3>
        <span className="text-[11.5px] text-ink-secondary">{hint}</span>
      </div>

      {concepts.length === 0 ? (
        <p className="py-2 text-[13px] text-ink-secondary">Nothing here — nicely done.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((c) => (
            <ConceptRow key={c.kc_code} c={c} revise={revise} />
          ))}
        </ul>
      )}

      {concepts.length > PREVIEW ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand transition-opacity hover:opacity-70"
        >
          {expanded ? "Show fewer" : `See all ${concepts.length}`}
          {!expanded ? <ArrowRight className="size-3.5" strokeWidth={2.25} aria-hidden="true" /> : null}
        </button>
      ) : null}
    </div>
  );
}

/**
 * The primary action surface, redesigned to be scannable and motivating rather
 * than a tall wall of bars: one hero "Start here" concept, then two side-by-side
 * panels — Learn (never mastered) and Revise (mastered but fading) — with compact
 * mastery rings and a plain-language legend.
 */
export function ReadyToFix({ concepts }: { concepts: ConceptMastery[] }) {
  if (concepts.length === 0) {
    return (
      <div className="rounded-[16px] border border-hairline bg-surface-card p-6">
        <p className="text-[14px] text-ink-secondary">No concept data yet.</p>
      </div>
    );
  }

  const revise = concepts
    .filter(isRevise)
    .sort((a, b) => b.p_mastery - b.retention_probability - (a.p_mastery - a.retention_probability));
  const learnAll = concepts
    .filter((c) => !isRevise(c))
    .sort((a, b) => b.gap_priority - a.gap_priority);

  const focus = learnAll[0] ?? null;
  const learnRest = focus ? learnAll.slice(1) : learnAll;

  const bothGroups = learnRest.length > 0 && revise.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {focus ? <FocusCard c={focus} /> : null}

      <div className={bothGroups ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
        {learnRest.length > 0 || !focus ? (
          <GroupPanel
            title="Learn"
            hint="never mastered"
            dotColor="var(--mastery-weak)"
            concepts={learnRest}
          />
        ) : null}
        {revise.length > 0 ? (
          <GroupPanel
            title="Revise"
            hint="learned, but fading"
            dotColor="var(--mastery-developing)"
            icon={<RotateCcw className="size-3.5 text-ink-secondary" strokeWidth={2.25} aria-hidden="true" />}
            concepts={revise}
            revise
          />
        ) : null}
      </div>

      {/* Legend — makes a high-% "Revise" ring make sense. */}
      <p className="text-[12px] leading-relaxed text-ink-secondary">
        <span className="font-medium text-ink">Learn</span> — build from the ground up.{" "}
        <span className="font-medium text-ink">Revise</span> — you mastered it, but memory is
        decaying, so a high % can still need a refresh. The ring shows current mastery.
      </p>
    </div>
  );
}
