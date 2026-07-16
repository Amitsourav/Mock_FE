"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const fieldClasses =
  "h-[52px] w-full rounded-[12px] border border-hairline bg-surface-field px-4 text-[17px] text-ink transition-[border-color] duration-200 ease-out placeholder:text-ink-secondary/70 focus:border-brand disabled:cursor-not-allowed disabled:opacity-50";

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] text-error">
      {/* Never colour alone: the glyph carries the same signal for anyone who can't see red. */}
      <span aria-hidden="true" className="mt-px font-semibold leading-none">
        !
      </span>
      <span>{children}</span>
    </p>
  );
}

function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-medium text-ink-secondary">
      {children}
      {optional ? <span className="font-normal"> (optional)</span> : null}
    </label>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  /** Lets a form move focus to its first invalid control on submit. */
  "data-field"?: string;
};

export function TextField({ label, error, hint, optional, ...props }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`${fieldClasses} ${error ? "border-error" : ""}`}
      />
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : hint ? (
        <p id={hintId} className="mt-2 text-[13px] text-ink-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  /** Lets a form move focus to its first invalid control on submit. */
  "data-field"?: string;
};

export function SelectField({ label, error, hint, optional, children, ...props }: SelectFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <div className="relative">
        <select
          {...props}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`${fieldClasses} cursor-pointer appearance-none pr-10 ${error ? "border-error" : ""}`}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-secondary"
        >
          <path
            d="M2 4.5 6 8.5 10 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : hint ? (
        <p id={hintId} className="mt-2 text-[13px] text-ink-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The verified phone, shown so the user knows which number they're registering. */
export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div
        id={id}
        // Unfilled, unlike the editable fields — the absence of a fill plus the
        // check mark says "not a control" without relying on colour.
        className="flex h-[52px] w-full items-center gap-2 rounded-[12px] border border-dashed border-hairline bg-transparent px-4 text-[17px] text-ink"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-success">
          <path
            d="M3 8.5 6.2 11.5 13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{value}</span>
        <span className="sr-only">(verified, cannot be changed)</span>
      </div>
    </div>
  );
}
