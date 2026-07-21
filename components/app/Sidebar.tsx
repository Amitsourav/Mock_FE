"use client";

import { BarChart3, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// "exam" is a full-screen takeover, not a nav destination, so it's absent from NAV.
export type AppView = "dashboard" | "mocks" | "exam";

const NAV: { view: Exclude<AppView, "exam">; label: string; Icon: LucideIcon }[] = [
  { view: "dashboard", label: "Dashboard", Icon: BarChart3 },
  { view: "mocks", label: "Mock Test", Icon: ClipboardList },
];

function NavItems({
  view,
  onNavigate,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <>
      {NAV.map(({ view: v, label, Icon }) => {
        const active = view === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onNavigate(v)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-medium transition-colors duration-200 ease-out",
              active
                ? "bg-surface-field text-ink"
                : "text-ink-secondary hover:bg-surface-field/60 hover:text-ink"
            )}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </>
  );
}

/** Desktop rail (md+): brand mark + primary nav. */
export function Sidebar({
  view,
  onNavigate,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-r border-hairline bg-surface-card px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-3">
        <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">dMAT</span>
        <span className="text-[13px] text-ink-secondary">Mock</span>
      </div>
      <nav aria-label="Primary" className="flex flex-col gap-1">
        <NavItems view={view} onNavigate={onNavigate} />
      </nav>
    </aside>
  );
}

/** Mobile bottom bar: same two destinations, thumb-reachable. */
export function MobileNav({
  view,
  onNavigate,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-hairline bg-surface-card/95 backdrop-blur-md md:hidden"
    >
      {NAV.map(({ view: v, label, Icon }) => {
        const active = view === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onNavigate(v)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-brand" : "text-ink-secondary"
            )}
          >
            <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
