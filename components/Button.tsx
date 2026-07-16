"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="animate-spin-slow inline-block h-[18px] w-[18px] shrink-0 rounded-full border-2 border-current border-t-transparent opacity-70"
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  /** Shown in place of children while `loading` — e.g. "Sending…". */
  loadingLabel?: string;
  children: ReactNode;
};

/**
 * Primary CTA: full-width, 52px, filled brand. `loading` keeps the button
 * mounted (no layout jump) and swaps the label, so screen readers hear the
 * state change via aria-live rather than a disappearing control.
 */
export function Button({
  loading = false,
  loadingLabel,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-brand-fill px-4 text-[17px] font-medium text-brand-on transition-[background-color,opacity] duration-200 ease-out hover:bg-brand-fill-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-fill ${className}`}
    >
      {loading ? <Spinner /> : null}
      <span>{loading ? (loadingLabel ?? children) : children}</span>
    </button>
  );
}

/** Low-emphasis text action ("Change number", "Resend code"). 44px tall for touch. */
export function TextButton({
  disabled,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-[8px] px-2 text-[15px] font-medium text-brand transition-opacity duration-200 ease-out hover:opacity-70 disabled:cursor-not-allowed disabled:text-ink-secondary disabled:opacity-100 disabled:hover:opacity-100 ${className}`}
    >
      {children}
    </button>
  );
}
