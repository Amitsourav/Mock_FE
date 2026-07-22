"use client";

/**
 * The dashboard's atmosphere: three soft aurora pools drifting behind the glass
 * tiles, with a film-grain layer over them so the gradients read printed rather
 * than rendered. Purely decorative — hidden from AT and from print, drift stops
 * under prefers-reduced-motion (the global reset zeroes the animation).
 */
export function AuroraField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden print:hidden">
      <div
        className="animate-drift absolute -left-[12%] -top-[18%] h-[60vh] w-[52vw] rounded-full opacity-70 blur-[90px]"
        style={{ background: "radial-gradient(circle, var(--aurora-1), transparent 65%)" }}
      />
      <div
        className="animate-drift absolute -right-[10%] top-[8%] h-[52vh] w-[44vw] rounded-full opacity-60 blur-[90px]"
        style={{
          background: "radial-gradient(circle, var(--aurora-2), transparent 65%)",
          animationDelay: "-9s",
        }}
      />
      <div
        className="animate-drift absolute -bottom-[22%] left-[28%] h-[55vh] w-[48vw] rounded-full opacity-60 blur-[90px]"
        style={{
          background: "radial-gradient(circle, var(--aurora-3), transparent 65%)",
          animationDelay: "-17s",
        }}
      />
      <div className="grain-layer" />
    </div>
  );
}
