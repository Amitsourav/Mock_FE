import type { ReactNode } from "react";

/**
 * The surface each step sits on. Positioning is AuthLayout's job — this is
 * only the card itself, so it can be dropped into any column.
 */
export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-hairline bg-surface-card p-6 shadow-[var(--shadow-card)] sm:p-8 md:border-transparent md:bg-transparent md:p-0 md:shadow-none">
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 max-w-[40ch] text-[16px] leading-relaxed text-ink-secondary">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
