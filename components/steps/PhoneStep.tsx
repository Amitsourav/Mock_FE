"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { CardHeader } from "@/components/Card";
import { FieldError } from "@/components/TextField";
import { supabase } from "@/lib/supabase";
import { humanizeAuthError, logAuthError } from "@/lib/authErrors";
import type { AuthTarget } from "@/lib/authTarget";
import { validateEmail } from "@/lib/email";
import {
  DEFAULT_COUNTRY,
  digitsOnly,
  formatNational,
  parseE164,
  toE164,
  validatePhone,
} from "@/lib/phone";

// India is the only phone origin here (spec: "+91 prefix + 10 digits"). The
// multi-country picker still lives in lib/phone if the intake ever widens again.
const INDIA = DEFAULT_COUNTRY;

type Channel = "email" | "phone";

/**
 * Screen 1: pick a channel, enter the matching identifier, request an OTP.
 * (Named PhoneStep for history — it now covers email too.) On success it hands
 * the whole AuthTarget up so the code screen knows how to verify it.
 */
export function PhoneStep({
  initial,
  onSent,
}: {
  /** Carried back when the user taps "Change …", so the field returns pre-filled. */
  initial?: AuthTarget;
  onSent: (target: AuthTarget) => void;
}) {
  const [channel, setChannel] = useState<Channel>(initial?.channel ?? "email");
  const [email, setEmail] = useState(initial?.channel === "email" ? initial.email : "");
  const [national, setNational] = useState(
    initial?.channel === "phone" ? parseE164(initial.phone)?.national ?? "" : ""
  );
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const validationError = useMemo(
    () => (channel === "email" ? validateEmail(email) : validatePhone(INDIA, national)),
    [channel, email, national]
  );
  const canSubmit = !validationError && !sending;

  // Only nag after blur or a submit attempt — not while they're still typing.
  const shownError = submitError ?? (touched ? validationError : null);

  function switchChannel(next: Channel) {
    if (next === channel) return;
    setChannel(next);
    // The other field's validity has nothing to say about this one — start clean.
    setTouched(false);
    setSubmitError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setSubmitError(null);
    if (validationError) return;

    const target: AuthTarget =
      channel === "email"
        ? { channel: "email", email: email.trim() }
        : { channel: "phone", phone: toE164(INDIA, national) };

    setSending(true);
    const { error } =
      target.channel === "email"
        ? await supabase.auth.signInWithOtp({ email: target.email })
        : await supabase.auth.signInWithOtp({ phone: target.phone });
    setSending(false);

    if (error) {
      logAuthError(error, "send");
      setSubmitError(humanizeAuthError(error, "send"));
      return;
    }
    onSent(target);
  }

  const inputClass = `h-[52px] w-full min-w-0 rounded-[12px] border bg-surface-field px-4 text-[17px] text-ink transition-[border-color] duration-200 ease-out placeholder:text-ink-secondary/70 focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 ${
    shownError ? "border-error" : "border-hairline"
  }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="animate-step-in">
      <CardHeader
        title="Sign in to continue"
        subtitle="We'll send you a 6-digit code to verify it's you."
      />

      {/* Channel toggle — one input swaps beneath it. */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-[12px] border border-hairline bg-surface-field p-1">
        {(["email", "phone"] as const).map((option) => {
          const active = channel === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => switchChannel(option)}
              disabled={sending}
              className={`h-10 rounded-[9px] text-[15px] font-medium transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "bg-surface-card text-ink shadow-[var(--shadow-card)]"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              {option === "email" ? "Email" : "Phone"}
            </button>
          );
        })}
      </div>

      <div>
        <label
          htmlFor="credential"
          className="mb-2 block text-[13px] font-medium text-ink-secondary"
        >
          {channel === "email" ? "Email address" : "Mobile number"}
        </label>

        {channel === "email" ? (
          <input
            id="credential"
            key="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setSubmitError(null);
            }}
            onBlur={() => setTouched(true)}
            disabled={sending}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? "credential-error" : undefined}
            className={inputClass}
          />
        ) : (
          <div className="flex gap-2">
            {/* Fixed +91 — a static prefix, not the old country dropdown. */}
            <div className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-[12px] border border-hairline bg-surface-field px-4 text-[17px] text-ink">
              <span aria-hidden="true">{INDIA.flag}</span>
              <span>{INDIA.dial}</span>
            </div>
            <input
              id="credential"
              key="phone"
              value={formatNational(INDIA, national)}
              onChange={(event) => {
                setNational(digitsOnly(event.target.value).slice(0, 10));
                setSubmitError(null);
              }}
              onBlur={() => setTouched(true)}
              disabled={sending}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              autoFocus
              placeholder="98765 43210"
              aria-invalid={shownError ? true : undefined}
              aria-describedby={shownError ? "credential-error" : undefined}
              className={inputClass}
            />
          </div>
        )}

        {shownError ? <FieldError id="credential-error">{shownError}</FieldError> : null}
      </div>

      <div className="mt-6">
        <Button type="submit" disabled={!canSubmit} loading={sending} loadingLabel="Sending…">
          Send OTP
        </Button>
      </div>

      <p className="mt-4 text-center text-[13px] leading-relaxed text-ink-secondary">
        {channel === "phone"
          ? "By continuing you agree to receive a one-time SMS. Message rates may apply."
          : "We'll email you a one-time code. Check your spam folder if it doesn't arrive."}
      </p>
    </form>
  );
}
