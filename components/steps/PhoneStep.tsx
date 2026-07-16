"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { CardHeader } from "@/components/Card";
import { FieldError } from "@/components/TextField";
import { supabase } from "@/lib/supabase";
import { humanizeAuthError, logAuthError } from "@/lib/authErrors";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  digitsOnly,
  findCountry,
  formatNational,
  toE164,
  validatePhone,
} from "@/lib/phone";

export function PhoneStep({
  initialPhone,
  onSent,
}: {
  /** National digits carried back when the user taps "Change number". */
  initialPhone?: { iso: string; national: string };
  onSent: (e164: string) => void;
}) {
  const [iso, setIso] = useState(initialPhone?.iso ?? DEFAULT_COUNTRY.iso);
  const [national, setNational] = useState(initialPhone?.national ?? "");
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const country = findCountry(iso);
  const validationError = useMemo(() => validatePhone(country, national), [country, national]);
  const canSubmit = !validationError && !sending;

  // Only nag after blur or a submit attempt — not while they're still typing.
  const shownError = submitError ?? (touched ? validationError : null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setSubmitError(null);
    if (validationError) return;

    const phone = toE164(country, national);
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setSending(false);

    if (error) {
      logAuthError(error, "send");
      setSubmitError(humanizeAuthError(error, "send"));
      return;
    }
    onSent(phone);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="animate-step-in">
      <CardHeader
        title="Enter your mobile number"
        subtitle="We'll text you a 6-digit code to verify it's you."
      />

      <div>
        <label htmlFor="phone" className="mb-2 block text-[13px] font-medium text-ink-secondary">
          Mobile number
        </label>

        <div className="flex gap-2">
          <div className="relative shrink-0">
            <label htmlFor="country" className="sr-only">
              Country calling code
            </label>
            <select
              id="country"
              value={iso}
              onChange={(event) => {
                setIso(event.target.value);
                setSubmitError(null);
              }}
              disabled={sending}
              className={`h-[52px] w-[104px] cursor-pointer appearance-none rounded-[12px] border bg-surface-field pl-4 pr-7 text-[17px] text-ink transition-[border-color] duration-200 ease-out focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 ${
                shownError ? "border-error" : "border-hairline"
              }`}
            >
              {COUNTRIES.map((option) => (
                <option key={option.iso} value={option.iso}>
                  {option.flag} {option.dial}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 12 12"
              className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-secondary"
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

          <input
            id="phone"
            value={formatNational(country, national)}
            onChange={(event) => {
              const next = digitsOnly(event.target.value).slice(0, 15);
              setNational(next);
              setSubmitError(null);
            }}
            onBlur={() => setTouched(true)}
            disabled={sending}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus
            placeholder={country.iso === "IN" ? "98765 43210" : "Mobile number"}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? "phone-error" : undefined}
            className={`h-[52px] w-full min-w-0 rounded-[12px] border bg-surface-field px-4 text-[17px] text-ink transition-[border-color] duration-200 ease-out placeholder:text-ink-secondary/70 focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 ${
              shownError ? "border-error" : "border-hairline"
            }`}
          />
        </div>

        {shownError ? <FieldError id="phone-error">{shownError}</FieldError> : null}
      </div>

      <div className="mt-6">
        <Button type="submit" disabled={!canSubmit} loading={sending} loadingLabel="Sending…">
          Send code
        </Button>
      </div>

      <p className="mt-4 text-center text-[13px] leading-relaxed text-ink-secondary">
        By continuing you agree to receive a one-time SMS. Message rates may apply.
      </p>
    </form>
  );
}
