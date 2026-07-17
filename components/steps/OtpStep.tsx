"use client";

import { useEffect, useRef, useState } from "react";
import { Button, TextButton } from "@/components/Button";
import { CardHeader } from "@/components/Card";
import { OtpInput } from "@/components/OtpInput";
import { supabase } from "@/lib/supabase";
import { humanizeAuthError, logAuthError } from "@/lib/authErrors";
import { describeTarget, type AuthTarget } from "@/lib/authTarget";

const RESEND_SECONDS = 30;

export function OtpStep({
  target,
  onVerified,
  onChangeNumber,
}: {
  target: AuthTarget;
  onVerified: () => void;
  onChangeNumber: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [shakeKey, setShakeKey] = useState(0);
  // Auto-submit fires from the input's onComplete; this stops a re-render or a
  // fast re-paste from firing a second verify while one is in flight.
  const inFlight = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function verify(candidate: string) {
    if (inFlight.current) return;
    if (candidate.length !== 6) {
      setError("Enter all 6 digits.");
      return;
    }

    inFlight.current = true;
    setVerifying(true);
    setError(null);
    setNotice(null);

    const { error: authError } =
      target.channel === "phone"
        ? await supabase.auth.verifyOtp({ phone: target.phone, token: candidate, type: "sms" })
        : await supabase.auth.verifyOtp({ email: target.email, token: candidate, type: "email" });

    inFlight.current = false;
    setVerifying(false);

    if (authError) {
      logAuthError(authError, "verify");
      setError(humanizeAuthError(authError, "verify"));
      setCode("");
      setShakeKey((k) => k + 1);
      return;
    }

    onVerified();
  }

  async function resend() {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setError(null);
    setNotice(null);

    const { error: authError } =
      target.channel === "phone"
        ? await supabase.auth.signInWithOtp({ phone: target.phone })
        : await supabase.auth.signInWithOtp({ email: target.email });
    setResending(false);

    if (authError) {
      logAuthError(authError, "send");
      setError(humanizeAuthError(authError, "send"));
      // Still start the countdown — the common cause is rate limiting, and
      // letting them hammer Resend only deepens the block.
      setSecondsLeft(RESEND_SECONDS);
      return;
    }

    setCode("");
    setNotice("We've sent a new code.");
    setSecondsLeft(RESEND_SECONDS);
  }

  return (
    <div className="animate-step-in">
      <CardHeader
        title="Enter the code"
        subtitle={
          <>
            We sent a 6-digit code to{" "}
            <span className="whitespace-nowrap font-medium text-ink">
              {describeTarget(target)}
            </span>
            .
          </>
        }
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void verify(code);
        }}
        noValidate
      >
        <OtpInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          onComplete={(next) => void verify(next)}
          disabled={verifying}
          invalid={Boolean(error)}
          shakeKey={shakeKey}
        />

        {/* Reserve the line so the layout doesn't jump when a message appears. */}
        <div className="mt-3 min-h-[20px]" aria-live="polite">
          {error ? (
            <p role="alert" className="flex items-start gap-1.5 text-[13px] text-error">
              <span aria-hidden="true" className="mt-px font-semibold leading-none">
                !
              </span>
              <span>{error}</span>
            </p>
          ) : notice ? (
            <p className="flex items-start gap-1.5 text-[13px] text-success">
              <span aria-hidden="true" className="mt-px font-semibold leading-none">
                ✓
              </span>
              <span>{notice}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <Button
            type="submit"
            disabled={code.length !== 6 || verifying}
            loading={verifying}
            loadingLabel="Verifying…"
          >
            Verify
          </Button>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-between">
        <TextButton type="button" onClick={onChangeNumber} disabled={verifying}>
          {target.channel === "phone" ? "Change number" : "Change email"}
        </TextButton>

        <TextButton
          type="button"
          onClick={() => void resend()}
          disabled={secondsLeft > 0 || resending || verifying}
        >
          {resending ? "Sending…" : secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
        </TextButton>
      </div>
    </div>
  );
}
