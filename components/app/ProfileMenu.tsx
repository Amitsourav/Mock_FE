"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut, Repeat } from "lucide-react";
import type { StreamOut, User } from "@/lib/types";
import { formatE164ForDisplay } from "@/lib/phone";

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * Top-right profile menu: avatar + name button opening a popover with the user's
 * read-only details, the current exam stream, and the two actions.
 */
export function ProfileMenu({
  user,
  stream,
  streamLoading,
  onSwitchStream,
  onLogout,
}: {
  user: User;
  stream: StreamOut | null;
  streamLoading: boolean;
  onSwitchStream: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const displayName = user.full_name?.trim() || user.email || "Account";

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDocDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex items-center gap-2 rounded-full border border-hairline bg-surface-card py-1.5 pl-1.5 pr-3 text-[14px] font-medium text-ink transition-colors duration-200 ease-out hover:bg-surface-field"
      >
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-brand-on"
        >
          {initials(user.full_name, user.email)}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{displayName}</span>
        <ChevronDown className="size-4 text-ink-secondary" strokeWidth={2} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="animate-modal-in absolute right-0 z-40 mt-2 w-[300px] overflow-hidden rounded-[16px] border border-hairline bg-surface-card shadow-[var(--shadow-card)]"
        >
          <div className="border-b border-hairline p-4">
            <p className="truncate text-[15px] font-semibold text-ink">{displayName}</p>
            {user.email ? (
              <p className="mt-0.5 truncate text-[13px] text-ink-secondary">{user.email}</p>
            ) : null}
            {user.phone ? (
              <p className="mt-0.5 truncate text-[13px] text-ink-secondary">
                {formatE164ForDisplay(user.phone)}
              </p>
            ) : null}

            <div className="mt-3 rounded-[10px] bg-surface-field px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-secondary">
                Exam stream
              </p>
              <p className="mt-0.5 text-[14px] font-medium text-ink">
                {streamLoading ? "Loading…" : stream?.catalog_exam_name ?? "Not selected"}
              </p>
            </div>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSwitchStream();
              }}
              className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium text-ink transition-colors hover:bg-surface-field"
            >
              <Repeat className="size-[18px] text-ink-secondary" strokeWidth={2} aria-hidden="true" />
              Switch exam stream
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium text-error transition-colors hover:bg-error/10"
            >
              <LogOut className="size-[18px]" strokeWidth={2} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
