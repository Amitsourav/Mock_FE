import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A titled card surface — the repeating container for every dashboard panel. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  /** Optional control shown at the right of the header (e.g. a toggle). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        // min-w-0 lets this shrink below its content's intrinsic width when it's a
        // grid/flex item, so a wide chart/table scrolls inside its own overflow
        // container instead of pushing the page sideways.
        "min-w-0 rounded-[16px] border border-hairline bg-surface-card p-5 shadow-[var(--shadow-card)]",
        className
      )}
    >
      {title || action ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
