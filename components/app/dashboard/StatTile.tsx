import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single summary figure. Optional signed delta whose colour reads direction
 * (up = good here) with an icon, so it never signals by colour alone.
 */
export function StatTile({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: { value: string; positive: boolean };
}) {
  return (
    <div className="rounded-[14px] border border-hairline bg-surface-card p-4">
      <p className="text-[13px] text-ink-secondary">{label}</p>
      <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink">
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[13px] font-medium",
            delta.positive ? "text-success" : "text-error"
          )}
        >
          {delta.positive ? (
            <ArrowUpRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <ArrowDownRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          )}
          {delta.value}
        </p>
      ) : hint ? (
        <p className="mt-2 text-[12px] text-ink-secondary">{hint}</p>
      ) : null}
    </div>
  );
}
