"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postAttemptEvents } from "@/lib/api";
import type { IntegrityEvent, IntegrityEventType } from "@/lib/types";

/** One physical "leave" can trigger several DOM signals; count it once within this window. */
const VIOLATION_DEBOUNCE_MS = 800;
const FLUSH_DELAY_MS = 1500;
/** After this many violations the test ends automatically. */
const MAX_VIOLATIONS = 3;

/**
 * Best-effort exam integrity: enter fullscreen, detect when the student leaves
 * (tab hidden, window blurred, fullscreen exited), log every signal to the
 * server (batched), and enforce the locked policy — 2 warnings, auto-submit on
 * the 3rd. True lockdown needs native proctoring; this deters and records.
 *
 * Violations are debounced so one action counts once; the raw events are still
 * all posted so the server has the full record.
 */
export function useExamIntegrity({
  enabled,
  attemptId,
  onLimitReached,
}: {
  /** Only monitor while actually taking the test (the "playing" phase). */
  enabled: boolean;
  attemptId: string;
  /** Called on the 3rd violation — the player auto-submits. */
  onLimitReached: () => void;
}) {
  const [warning, setWarning] = useState<{ count: number; fullscreen: boolean } | null>(null);

  const violations = useRef(0);
  const lastLeaveAt = useRef(0);
  const buffer = useRef<IntegrityEvent[]>([]);
  const flushTimer = useRef<number | undefined>(undefined);
  // Set while WE programmatically exit fullscreen (on submit), so that exit
  // isn't mistaken for the student leaving.
  const tearingDown = useRef(false);

  const flush = useCallback(() => {
    if (buffer.current.length === 0) return;
    const batch = buffer.current;
    buffer.current = [];
    // Fire-and-forget: integrity logging must never break the test.
    void postAttemptEvents(attemptId, batch).catch(() => {});
  }, [attemptId]);

  const logEvent = useCallback(
    (type: IntegrityEventType) => {
      buffer.current.push({ event_type: type, client_occurred_at: new Date().toISOString() });
      if (flushTimer.current === undefined) {
        flushTimer.current = window.setTimeout(() => {
          flushTimer.current = undefined;
          flush();
        }, FLUSH_DELAY_MS);
      }
    },
    [flush]
  );

  const enterFullscreen = useCallback(() => {
    // Optional-chain the call AND the returned promise: the method may be absent
    // and requestFullscreen rejects without a user gesture / when unsupported.
    document.documentElement.requestFullscreen?.()?.catch(() => {});
  }, []);

  const exitFullscreen = useCallback(() => {
    tearingDown.current = true;
    if (document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {});
  }, []);

  // A "leave" signal: log it, and (debounced) count a violation.
  const registerLeave = useCallback(
    (type: IntegrityEventType) => {
      logEvent(type);
      const now = Date.now();
      if (now - lastLeaveAt.current < VIOLATION_DEBOUNCE_MS) return;
      lastLeaveAt.current = now;

      violations.current += 1;
      const count = violations.current;
      // Post the record immediately for a violation rather than waiting.
      flush();
      if (count >= MAX_VIOLATIONS) {
        onLimitReached();
      } else {
        setWarning({ count, fullscreen: !document.fullscreenElement });
      }
    },
    [logEvent, flush, onLimitReached]
  );

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.hidden) registerLeave("focus_lost");
      else logEvent("focus_regained");
    };
    const onBlur = () => registerLeave("focus_lost"); // secondary: app/window switch
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        logEvent("fullscreen_enter");
      } else if (!tearingDown.current) {
        registerLeave("fullscreen_exit");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (flushTimer.current !== undefined) {
        window.clearTimeout(flushTimer.current);
        flushTimer.current = undefined;
      }
      flush();
    };
  }, [enabled, registerLeave, logEvent, flush]);

  const dismissWarning = useCallback(() => {
    setWarning(null);
    enterFullscreen(); // returning to the test re-enters fullscreen
  }, [enterFullscreen]);

  return { warning, dismissWarning, enterFullscreen, exitFullscreen, maxViolations: MAX_VIOLATIONS };
}
