"use client";

import { formatE164ForDisplay } from "@/lib/phone";
import type { User } from "@/lib/types";

function SuccessMark() {
  return (
    <div
      aria-hidden="true"
      className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-success/12 text-success"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7">
        <path
          d="M5 12.5 10 17.5 19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * The two terminal screens. `variant` is driven by whether we just submitted a
 * profile or found one already complete — the copy is the only difference.
 */
export function DoneStep({ user, variant }: { user: User; variant: "registered" | "already" }) {
  const title =
    variant === "registered" ? "Thanks for registering." : "You're already registered.";
  const body =
    variant === "registered"
      ? "We've got your details. We'll get back to you with your dMAT mock exam schedule."
      : "This number is already on the list. Thank you — there's nothing more to do right now.";

  return (
    <div className="animate-step-in flex flex-col items-center text-center">
      <SuccessMark />

      {/* aria-live so the change of screen is announced, not just seen. */}
      <h1
        aria-live="polite"
        className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink"
      >
        {title}
      </h1>

      <p className="mt-3 max-w-[40ch] text-[16px] leading-relaxed text-ink-secondary">{body}</p>

      <dl className="mt-8 w-full border-t border-hairline pt-5 text-left">
        {user.full_name ? (
          <div className="flex items-baseline justify-between gap-4 py-1.5">
            <dt className="text-[13px] text-ink-secondary">Name</dt>
            <dd className="text-[15px] text-ink">{user.full_name}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="text-[13px] text-ink-secondary">Mobile</dt>
          <dd className="text-[15px] text-ink">{formatE164ForDisplay(user.phone)}</dd>
        </div>
        {user.target_country ? (
          <div className="flex items-baseline justify-between gap-4 py-1.5">
            <dt className="text-[13px] text-ink-secondary">Applying to</dt>
            <dd className="text-[15px] text-ink">{user.target_country}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
