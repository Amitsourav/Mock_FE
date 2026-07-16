"use client";

import { Briefcase, GraduationCap, NotebookPen } from "lucide-react";
import type { ReactNode } from "react";
import { ExamCardWall } from "@/components/ui/exam-card-wall";
import { Typewriter, useTypewriterCycle } from "@/components/ui/typewriter";
import { EXAM_SHOWCASE } from "@/lib/exam-showcase";

const PURSUITS = [
  { label: "Mock Test", Icon: NotebookPen, delay: "0s" },
  { label: "Higher Study", Icon: GraduationCap, delay: "2s" },
  { label: "Job", Icon: Briefcase, delay: "4s" },
];

/** Module scope keeps the identity stable, so the cycle timer never resets. */
const EYEBROWS = EXAM_SHOWCASE.map((exam) => exam.eyebrow);

/**
 * The ambient panel: drifting light, a wall of exam cards, three floating
 * pursuit chips, one headline.
 *
 * A single typewriter cycle is the clock for the whole panel — the eyebrow it
 * types, the tagline beneath it, and the card wall behind it all key off the
 * same `index`, so they can never drift out of step.
 */
function BrandPanel() {
  const { visible, index, reduced } = useTypewriterCycle({
    phrases: EYEBROWS,
    speed: 55,
    deleteSpeed: 25,
    delay: 5200,
    loop: true,
  });
  // Reduced motion parks on dMAT — the product's own exam is the right thing to
  // rest on, and the alternative (Typewriter's join(" · ")) would run all eight
  // names together in a 13px line.
  const exam = EXAM_SHOWCASE[reduced ? 0 : index] ?? EXAM_SHOWCASE[0];

  return (
    <aside
      // Decorative marketing beside a login form: exposing it would put 45 card
      // nodes in the a11y tree and swap them every 8s over someone typing an OTP.
      // Nothing here is actionable and nothing here is unique — so it stays out.
      // Note this also makes Typewriter's own sr-only copy inert: aria-hidden on
      // an ancestor cannot be undone by a descendant.
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-surface-card md:block"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute -left-[10%] top-[6%] h-[52%] w-[62%] rounded-full bg-brand-fill/25 blur-[90px]" />
        <div
          className="animate-drift absolute -right-[12%] bottom-[4%] h-[48%] w-[58%] rounded-full bg-brand-fill/15 blur-[90px]"
          style={{ animationDelay: "-13s" }}
        />
      </div>

      {/* Hairline grid — texture at ~4% opacity, not a pattern you'd notice. */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <ExamCardWall exam={exam} reduced={reduced} />

      <div className="pointer-events-none relative z-20 flex h-full flex-col justify-end p-12">
        {/* The pursuit chips live in the text block rather than floating over
            the wall. Floating them there put "Mock Test" on top of a card
            mid-sentence — with the wall filling the panel there is no clear
            band left to float in, and unreadable copy is worse than no depth.
            They keep the staggered float so the row still breathes. */}
        <div className="mb-8 flex flex-wrap gap-2">
          {PURSUITS.map(({ label, Icon, delay }) => (
            <span
              key={label}
              className="animate-float-chip flex items-center gap-2 rounded-full border border-hairline bg-surface/70 px-4 py-2 text-[13px] font-medium text-ink shadow-[var(--shadow-card)] backdrop-blur-md"
              style={{ animationDelay: delay }}
            >
              <Icon className="size-4 text-brand" strokeWidth={2} />
              {label}
            </span>
          ))}
        </div>

        {/* The typed exam name. Not uppercased: the lower-case "d" is the
            product's name, and text-transform would render it "DMAT". The caret
            keeps the line from collapsing while the text is empty. */}
        <p
          data-testid="eyebrow"
          className="text-[13px] font-medium tracking-[0.06em] text-ink-secondary"
        >
          {visible}
          {reduced ? null : (
            <span className="animate-caret font-light opacity-70">|</span>
          )}
        </p>
        <p className="mt-3 max-w-[22ch] text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink">
          Practise for{" "}
          <Typewriter
            text={["the Mock Test.", "Higher Study.", "the Job you want."]}
            speed={70}
            deleteSpeed={35}
            delay={1800}
            loop
            className="text-brand"
          />
        </p>
        {/* min-h reserves two lines: a taller tagline would shove the headline
            upward, since this column is bottom-aligned. */}
        <p
          data-testid="tagline"
          className="mt-4 min-h-[3.25rem] max-w-[38ch] text-[15px] leading-relaxed text-ink-secondary"
        >
          {exam.tagline}
        </p>
      </div>
    </aside>
  );
}

/**
 * Split screen: the flow on the left, ambient brand panel on the right.
 * The panel is md-and-up only — on a phone the form is the whole screen, so
 * the single-column, one-focal-point layout is untouched.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-2">
      <main className="flex min-h-dvh items-center justify-center px-6 py-12 md:min-h-0">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      <BrandPanel />
    </div>
  );
}
