"use client";

import { useEffect, useMemo, useState } from "react";

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}

type Phase = "typing" | "deleting";

export type TypewriterCycleOptions = {
  /** Keep this identity stable (module constant or useMemo) — it drives the timer. */
  phrases: string[];
  speed?: number;
  deleteSpeed?: number;
  delay?: number;
  loop?: boolean;
};

export type TypewriterCycle = {
  /** The phrase clipped to the characters typed so far. */
  visible: string;
  /** Which phrase is showing. Advances the moment a delete completes. */
  index: number;
  /** True when the user asked for reduced motion — the timer is not running. */
  reduced: boolean;
};

/**
 * The typing state machine, exposed as a hook so a caller can react to `index`
 * (to swap sibling content in step with the phrase) rather than only watching
 * the letters appear.
 *
 * Driven by a single timer keyed off an explicit phase, so exactly one timeout
 * is ever pending and every path cleans up after itself.
 *
 * Under reduced motion the timer never starts and `index` stays 0 — callers get
 * a stable first phrase to render instead of a frozen animation.
 */
export function useTypewriterCycle({
  phrases,
  speed = 100,
  deleteSpeed = 50,
  delay = 1500,
  loop = false,
}: TypewriterCycleOptions): TypewriterCycle {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const current = phrases[index] ?? "";
  // Cycling is only meaningful when there is somewhere to cycle to.
  const cycles = loop || phrases.length > 1;

  useEffect(() => {
    if (reduced) return;

    if (phase === "typing") {
      if (count < current.length) {
        const t = setTimeout(() => setCount((c) => c + 1), speed);
        return () => clearTimeout(t);
      }
      if (!cycles) return; // Finished, nothing left to do — no timer left pending.
      const t = setTimeout(() => setPhase("deleting"), delay);
      return () => clearTimeout(t);
    }

    if (count > 0) {
      const t = setTimeout(() => setCount((c) => c - 1), deleteSpeed);
      return () => clearTimeout(t);
    }
    setPhase("typing");
    setIndex((i) => (i + 1) % phrases.length);
  }, [phase, count, current, cycles, speed, deleteSpeed, delay, phrases.length, reduced]);

  // Reduced motion never advances `count`, so slicing by it would render an
  // empty string forever. Hand back the whole phrase instead: the caller wants
  // the words, just not the typing.
  return { visible: reduced ? current : current.slice(0, count), index, reduced };
}

/**
 * Types a string (or cycles a list) one character at a time.
 *
 * The animated text is aria-hidden and paired with an sr-only static copy:
 * a live-updating character-by-character node would make a screen reader
 * announce the same phrase dozens of times. (Note that inside an aria-hidden
 * ancestor even the sr-only copy is inert — aria-hidden cannot be undone by a
 * descendant. This component is only self-sufficient when rendered in exposed
 * content.)
 */
export function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
}: TypewriterProps) {
  const phrases = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);
  const { visible, reduced } = useTypewriterCycle({ phrases, speed, deleteSpeed, delay, loop });

  // Reduced motion: no typing, no caret — just the words.
  if (reduced) {
    return <span className={className}>{phrases.join(" · ")}</span>;
  }

  return (
    <>
      <span className="sr-only">{phrases.join(", ")}</span>
      <span aria-hidden="true" className={className}>
        {visible}
        <span className="animate-caret font-light opacity-70">{cursor}</span>
      </span>
    </>
  );
}
