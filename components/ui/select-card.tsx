"use client";

import { Check } from "lucide-react";

/**
 * A premium selectable card, shared by the onboarding wizard and the exam-stream
 * discovery page. Default → hairline border on the card surface; hover lifts and
 * deepens the shadow; selected → brand border, soft brand tint, and a checkmark
 * (reinforced by border + tint, never colour alone). `index` staggers the
 * entrance so a grid reveals in sequence.
 */
export function SelectCard({
  selected,
  onClick,
  index = 0,
  variant = "tile",
  className = "",
  children,
}: {
  selected: boolean;
  onClick: () => void;
  index?: number;
  variant?: "tile" | "row";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{ animationDelay: `${index * 60}ms` }}
      className={[
        "animate-card-in group relative flex flex-col rounded-[16px] border p-5 text-left",
        "transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
        variant === "row" ? "min-h-[112px]" : "",
        selected
          ? "border-brand bg-brand-fill/[0.06] shadow-[var(--shadow-card)]"
          : "border-hairline bg-surface-card hover:border-hairline-strong",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200",
          selected ? "scale-100 bg-brand-fill text-brand-on" : "scale-75 opacity-0",
        ].join(" ")}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      {children}
    </button>
  );
}
