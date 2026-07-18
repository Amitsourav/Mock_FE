"use client";

import { Gauge } from "lucide-react";
import { Panel } from "@/components/app/Panel";
import { ErrorDonut } from "@/components/app/chart/ErrorDonut";
import { formatPct } from "@/lib/format";
import type { StrategyData } from "@/lib/types";

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-hairline bg-surface p-3.5">
      <p className="text-[12px] text-ink-secondary">{label}</p>
      <p className="mt-1 text-[20px] font-semibold leading-none tracking-[-0.01em] text-ink">
        {value}
      </p>
    </div>
  );
}

/**
 * Test strategy & behaviour. The error-type breakdown is the differentiator, so
 * it leads; callout tiles and the archetype badge summarise the behavioural read,
 * with the pacing note as the one-line takeaway.
 */
export function StrategyPanel({ strategy }: { strategy: StrategyData }) {
  return (
    <Panel title="Test strategy & behaviour">
      {/* Pacing takeaway — the sentence first, evidence beneath. */}
      <div className="mb-5 flex items-start gap-2.5 rounded-[12px] bg-surface-field px-4 py-3">
        <Gauge className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2} aria-hidden="true" />
        <p className="text-[14px] leading-relaxed text-ink">{strategy.pacing_note}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-[13px] font-medium text-ink-secondary">Where your answers go</p>
          <ErrorDonut distribution={strategy.error_distribution} />
        </div>

        <div className="grid grid-cols-2 gap-3 self-start">
          <Callout label="Careless share of wrong" value={formatPct(strategy.careless_share_pct)} />
          <Callout label="Avg guess rate" value={formatPct(strategy.avg_guess_rate)} />
          <Callout
            label="Negative-marking loss"
            value={`−${strategy.total_negative_marking_loss.toFixed(1)}`}
          />
          <div className="rounded-[12px] border border-hairline bg-surface p-3.5">
            <p className="text-[12px] text-ink-secondary">Behaviour</p>
            <span className="mt-1.5 inline-flex items-center rounded-full bg-brand/12 px-2.5 py-1 text-[13px] font-semibold text-brand">
              {strategy.dominant_archetype}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
