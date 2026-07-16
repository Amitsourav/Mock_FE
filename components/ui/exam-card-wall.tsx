"use client";

import { memo } from "react";
import { Lightbulb, Sparkles } from "lucide-react";
import type { ShowcaseCard, ShowcaseExam } from "@/lib/exam-showcase";
import { cn } from "@/lib/utils";

/** Card box height and the gap below it. Pitch (140) is what the loop maths uses. */
const CARD_HEIGHT = 120;
const CARD_GAP = 20;
const PER_COLUMN = 5;
const COLUMNS = 3;

/**
 * One copy of a column, measured top-of-card-1 to top-of-the-next-copy's-card-1.
 * Shifting the track by exactly this lands copy 2 where copy 1 began, which is
 * what makes the loop seamless.
 */
const COPY_HEIGHT = PER_COLUMN * (CARD_HEIGHT + CARD_GAP);

/** Desynced so the columns read as drifting, not as one sliding slab. */
const COLUMN_DURATIONS = ["38s", "46s", "42s"];

function Card({ card, index }: { card: ShowcaseCard; index: number }) {
  const isBenefit = card.kind === "benefit";
  const Icon = isBenefit ? Sparkles : Lightbulb;

  return (
    <article
      // No backdrop-blur and no shadow here on purpose: the panel already pays
      // for two blur(90px) auroras and three backdrop-blur chips, and 45 moving
      // backdrop-filter nodes would re-read the backdrop every frame.
      className="animate-card-in flex h-[120px] shrink-0 flex-col justify-center gap-1.5 rounded-[14px] border border-hairline bg-surface/90 p-4"
      // Staggered entrance, capped so the last card is not visibly late.
      style={{ animationDelay: `${Math.min(index, 4) * 40}ms` }}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
          isBenefit ? "text-brand" : "text-ink-secondary"
        )}
      >
        <Icon className="size-3 shrink-0" strokeWidth={2.5} />
        {card.label}
      </span>
      <p className="text-[12px] leading-snug text-ink">{card.body}</p>
    </article>
  );
}

/**
 * A wall of the active exam's 15 cards, drifting vertically in three columns.
 *
 * Memoised on `exam`: the panel re-renders once per typed character (~18x a
 * second) and must not drag 45 card nodes through reconciliation each time.
 * `exam` is an element of a module constant, so its identity is stable per
 * index and this bails out on all but the swap.
 */
export const ExamCardWall = memo(function ExamCardWall({
  exam,
  reduced,
}: {
  exam: ShowcaseExam;
  reduced: boolean;
}) {
  // One unrepeated set under reduced motion: with the animation off, three
  // copies would just render the same five cards three times and read as a bug.
  const copies = reduced ? 1 : 3;

  return (
    <div
      data-testid="card-wall"
      className={cn(
        // bottom clears the text block: chips row + eyebrow + headline + a
        // two-line tagline, plus the p-12 padding above and below it.
        "card-wall pointer-events-auto absolute inset-x-0 bottom-[320px] top-0 z-0 overflow-hidden px-10",
        // Keep overflow-hidden alongside the mask: mask-repeat defaults to
        // repeat, so content past the box would tile the gradient and cards
        // would reappear below the fade.
        "[mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_76%,transparent)]",
        "[-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_76%,transparent)]"
      )}
    >
      {/* Fluid columns, not fixed widths — a fixed 200px column only fills the
          panel at exactly 1440px wide and leaves dead space above that. The
          loop maths depends on card height alone, so width is free to flex. */}
      <div className="grid h-full grid-cols-3 gap-5">
        {Array.from({ length: COLUMNS }, (_, column) => (
          <div key={column} className="relative overflow-hidden">
            <div
              data-testid={`marquee-track-${column}`}
              className={cn("flex flex-col gap-5", !reduced && "animate-marquee-y")}
              style={
                {
                  "--marquee-shift": `${COPY_HEIGHT}px`,
                  "--marquee-duration": COLUMN_DURATIONS[column],
                  // Column 2 drifts down instead of up. Same loop, played
                  // backwards — equally seamless.
                  animationDirection: column === 1 ? "reverse" : undefined,
                } as React.CSSProperties
              }
            >
              {Array.from({ length: copies }, (_, copy) =>
                exam.cards
                  .slice(column * PER_COLUMN, column * PER_COLUMN + PER_COLUMN)
                  .map((card, i) => (
                    // Keyed on the exam so a swap remounts only these leaves and
                    // replays their entrance. The track itself stays mounted, so
                    // its transform animation never restarts.
                    <Card key={`${exam.code}-${copy}-${i}`} card={card} index={i} />
                  ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
