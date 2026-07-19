"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/Card";
import { AuthLayout } from "@/components/ui/auth-layout";
import { Button } from "@/components/Button";
import { PhoneStep } from "@/components/steps/PhoneStep";
import { OtpStep } from "@/components/steps/OtpStep";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AppShell } from "@/components/app/AppShell";
import { ApiError, getMe } from "@/lib/api";
import type { AuthTarget } from "@/lib/authTarget";
import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";

type Step =
  | { name: "boot" }
  | { name: "phone" }
  | { name: "otp"; target: AuthTarget }
  | { name: "loadingProfile" }
  | { name: "profile"; user: User }
  | { name: "app"; user: User }
  | { name: "error"; message: string };

export default function Page() {
  const [step, setStep] = useState<Step>({ name: "boot" });
  // Remembered so "Change number/email" returns a pre-filled field, not a blank one.
  const lastTarget = useRef<AuthTarget | undefined>(undefined);

  /** GET /me is the single branch point: it decides form vs. "already registered". */
  const loadProfile = useCallback(async () => {
    setStep({ name: "loadingProfile" });
    try {
      const user = await getMe();
      // A completed profile lands straight in the app; an incomplete one goes to
      // the registration form (which is untouched by this change).
      setStep(
        user.profile_completed ? { name: "app", user } : { name: "profile", user }
      );
    } catch (error) {
      if (error instanceof ApiError && error.unauthorized) {
        await supabase.auth.signOut();
        setStep({ name: "phone" });
        return;
      }
      setStep({
        name: "error",
        message: error instanceof ApiError ? error.message : "Something went wrong.",
      });
    }
  }, []);

  // A persisted session skips straight to the branch — supabase-js restores it,
  // we never read storage ourselves.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) void loadProfile();
      else setStep({ name: "phone" });
    });
    return () => {
      active = false;
    };
  }, [loadProfile]);

  const handleUnauthorized = useCallback(async () => {
    await supabase.auth.signOut();
    setStep({ name: "phone" });
  }, []);

  const handleLogout = useCallback(async () => {
    lastTarget.current = undefined;
    await supabase.auth.signOut();
    setStep({ name: "phone" });
  }, []);

  if (step.name === "boot" || step.name === "loadingProfile") {
    return (
      <AuthLayout>
        <p role="status" className="text-center text-[15px] text-ink-secondary">
          <span
            aria-hidden="true"
            className="animate-spin-slow mr-2 inline-block h-4 w-4 -mb-0.5 rounded-full border-2 border-current border-t-transparent opacity-50"
          />
          Loading…
        </p>
      </AuthLayout>
    );
  }

  // The onboarding wizard is a full-viewport premium flow, not the centred auth
  // card. It owns its own "Welcome → Enter Dashboard" screen, which lands here.
  if (step.name === "profile") {
    return (
      <OnboardingWizard
        user={step.user}
        onEnterDashboard={(user) => setStep({ name: "app", user })}
        onUnauthorized={() => void handleUnauthorized()}
        onLogout={() => void handleLogout()}
      />
    );
  }

  // The post-login app takes the whole viewport — not the centred auth card.
  if (step.name === "app") {
    return (
      <AppShell
        user={step.user}
        onLogout={() => void handleLogout()}
        onUnauthorized={() => void handleUnauthorized()}
      />
    );
  }

  if (step.name === "error") {
    return (
      <AuthLayout>
        <Card>
          <div className="animate-step-in text-center">
            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink">
              Something went wrong
            </h1>
            <p role="alert" className="mt-3 text-[16px] leading-relaxed text-ink-secondary">
              {step.message}
            </p>
            <div className="mt-8">
              <Button type="button" onClick={() => void loadProfile()}>
                Try again
              </Button>
            </div>
          </div>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card>
        {step.name === "phone" ? (
          <PhoneStep
            initial={lastTarget.current}
            onSent={(target) => {
              lastTarget.current = target;
              setStep({ name: "otp", target });
            }}
          />
        ) : null}

        {step.name === "otp" ? (
          <OtpStep
            target={step.target}
            onVerified={() => void loadProfile()}
            onChangeNumber={() => setStep({ name: "phone" })}
          />
        ) : null}
      </Card>
    </AuthLayout>
  );
}
