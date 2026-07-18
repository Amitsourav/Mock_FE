"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog: focus trap, Escape to close, backdrop click to
 * dismiss, `aria-modal` + labelled title, and focus restored to the opener on
 * close. Motion honours prefers-reduced-motion via the shared animate classes.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  labelledBy,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  /** Rendered as the dialog heading unless `labelledBy` points elsewhere. */
  title?: ReactNode;
  children: ReactNode;
  labelledBy?: string;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable control, or the panel itself.
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    // Lock body scroll behind the modal.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth =
    size === "sm" ? "max-w-[380px]" : size === "lg" ? "max-w-[720px]" : "max-w-[480px]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      // Backdrop: click outside the panel dismisses.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? headingId : undefined)}
        tabIndex={-1}
        className={cn(
          "animate-modal-in relative w-full rounded-t-[20px] border border-hairline bg-surface-card shadow-[var(--shadow-card)] outline-none sm:rounded-[20px]",
          maxWidth
        )}
      >
        {title ? (
          <h2
            id={headingId}
            className="px-6 pt-6 text-[20px] font-semibold tracking-[-0.01em] text-ink"
          >
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>
  );
}
