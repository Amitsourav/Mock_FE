import { cn } from "@/lib/utils";

/** A single shimmering placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-skeleton rounded-[8px] bg-surface-field", className)}
    />
  );
}

/** A labelled loading region: announces "Loading" once, then shimmer blocks. */
export function SkeletonPanel({
  label = "Loading",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      {children}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
