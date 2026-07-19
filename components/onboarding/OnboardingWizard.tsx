"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button, TextButton } from "@/components/Button";
import { ReadOnlyField, TextField } from "@/components/TextField";
import { SelectCard } from "@/components/ui/select-card";
import { Stepper } from "@/components/onboarding/Stepper";
import { categoryIcon, ONBOARDING_BENEFITS } from "@/components/onboarding/onboarding-meta";
import {
  ApiError,
  getCategoryExams,
  getCountries,
  getExamCatalog,
  getMockCategories,
  getStates,
  updateProfile,
} from "@/lib/api";
import { formatDuration } from "@/lib/format";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  digitsOnly,
  findCountry,
  formatNational,
  toE164,
  validatePhone,
} from "@/lib/phone";
import type { CatalogExam, ExamSummary, RefItem, StateItem, User } from "@/lib/types";

type Phase = 1 | 2 | 3;

/** A structured 422 code → the phase whose fields it belongs to. */
const ERROR_PHASE: Record<string, Phase> = {
  invalid_phone: 1,
  invalid_state: 1,
  invalid_exam: 3,
  exam_category_mismatch: 3,
  country_required: 3,
  invalid_country: 3,
};

export function OnboardingWizard({
  user,
  onEnterDashboard,
  onUnauthorized,
  onLogout,
}: {
  user: User;
  onEnterDashboard: (updated: User) => void;
  onUnauthorized: () => void;
  onLogout: () => void;
}) {
  // --- Reference data (prefetched once) ------------------------------------
  const [states, setStates] = useState<StateItem[]>([]);
  const [categories, setCategories] = useState<RefItem[]>([]);
  const [countries, setCountries] = useState<RefItem[]>([]);
  const [examsByCategory, setExamsByCategory] = useState<Record<string, CatalogExam[]>>({});
  const [examMeta, setExamMeta] = useState<Record<string, ExamSummary>>({});
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsError, setRefsError] = useState(false);

  // --- Flow + form state ---------------------------------------------------
  const [phase, setPhase] = useState<Phase>(1);
  const [welcomeUser, setWelcomeUser] = useState<User | null>(null);

  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [phoneIso, setPhoneIso] = useState(DEFAULT_COUNTRY.iso);
  const [phoneNational, setPhoneNational] = useState("");
  const [stateCode, setStateCode] = useState(user.state_code ?? "");
  const [categoryCode, setCategoryCode] = useState(user.mock_category_code ?? "");
  const [examCode, setExamCode] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const phoneCountry = findCountry(phoneIso);
  const exams = examsByCategory[categoryCode] ?? [];
  const selectedExam = exams.find((e) => e.code === examCode) ?? null;
  const requiresCountry = selectedExam?.requires_country ?? false;
  const selectedCategory = categories.find((c) => c.code === categoryCode) ?? null;

  const loadReferences = useCallback(async () => {
    setRefsLoading(true);
    setRefsError(false);
    try {
      const [s, c, co, catalog] = await Promise.all([
        getStates(),
        getMockCategories(),
        getCountries(),
        getExamCatalog(),
      ]);
      const examLists = await Promise.all(c.map((cat) => getCategoryExams(cat.code)));
      const byCategory: Record<string, CatalogExam[]> = {};
      c.forEach((cat, i) => {
        byCategory[cat.code] = examLists[i];
      });
      const meta: Record<string, ExamSummary> = {};
      catalog.forEach((e) => {
        meta[e.code] = e;
      });
      setStates(s);
      setCategories(c);
      setCountries(co);
      setExamsByCategory(byCategory);
      setExamMeta(meta);
    } catch (error) {
      if (error instanceof ApiError && error.unauthorized) {
        onUnauthorized();
        return;
      }
      setRefsError(true);
    } finally {
      setRefsLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void loadReferences();
  }, [loadReferences]);

  // --- Category / exam selection (cascade reset) ---------------------------
  function pickCategory(code: string) {
    setCategoryCode(code);
    setExamCode("");
    setCountryCode("");
    setStepError(null);
  }

  function pickExam(exam: CatalogExam) {
    setExamCode(exam.code);
    setCountryCode(exam.requires_country ? exam.default_country_code ?? "" : "");
    setStepError(null);
  }

  // --- Per-phase advance ---------------------------------------------------
  function continueFromBasics() {
    const nErr = fullName.trim() ? null : "Enter your full name.";
    const pErr = validatePhone(phoneCountry, phoneNational);
    const sErr = stateCode ? null : "Select your state.";
    setNameError(nErr);
    setPhoneError(pErr);
    setStateError(sErr);
    if (nErr || pErr || sErr) return;
    setPhase(2);
  }

  function continueFromGoal() {
    if (!categoryCode) {
      setStepError("Pick what you're preparing for to continue.");
      return;
    }
    setPhase(3);
  }

  async function finish() {
    if (!examCode) {
      setStepError("Choose your target exam to continue.");
      return;
    }
    if (requiresCountry && !countryCode) {
      setStepError("Select a target country for this exam.");
      return;
    }
    setSubmitting(true);
    setStepError(null);
    try {
      const updated = await updateProfile({
        full_name: fullName.trim(),
        phone: toE164(phoneCountry, phoneNational),
        state_code: stateCode,
        mock_category_code: categoryCode,
        catalog_exam_code: examCode,
        target_country_code: requiresCountry ? countryCode : null,
      });
      setWelcomeUser(updated);
    } catch (error) {
      if (error instanceof ApiError && error.unauthorized) {
        onUnauthorized();
        return;
      }
      if (error instanceof ApiError && error.code && ERROR_PHASE[error.code]) {
        const target = ERROR_PHASE[error.code];
        setPhase(target);
        if (target === 1) {
          if (error.code === "invalid_phone") setPhoneError(error.message);
          if (error.code === "invalid_state") setStateError(error.message);
        } else {
          setStepError(error.message);
        }
      } else {
        setStepError(
          error instanceof ApiError ? error.message : "Something went wrong. Please try again."
        );
      }
      setSubmitting(false);
    }
  }

  // --- Reference load failure ----------------------------------------------
  if (refsError) {
    return (
      <Shell onLogout={onLogout}>
        <div className="animate-step-in mx-auto max-w-[480px] py-16 text-center">
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">
            Couldn&apos;t load your onboarding
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-secondary">
            We couldn&apos;t reach the server. Please try again.
          </p>
          <div className="mx-auto mt-8 max-w-[240px]">
            <Button type="button" onClick={() => void loadReferences()}>
              Try again
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // --- Final welcome screen ------------------------------------------------
  if (welcomeUser) {
    const firstName = (welcomeUser.full_name ?? fullName).trim().split(/\s+/)[0] || "there";
    const examName = selectedExam?.name ?? examMeta[examCode]?.name ?? "your exam";
    return (
      <Shell onLogout={onLogout}>
        <div className="animate-step-in mx-auto flex max-w-[560px] flex-col items-center py-10 text-center md:py-16">
          <div
            aria-hidden="true"
            className="relative mb-7 flex h-20 w-20 items-center justify-center rounded-[24px] bg-brand-fill/[0.1] text-brand"
          >
            <span className="absolute inset-0 animate-[ping_1.6s_ease-out_1] rounded-[24px] bg-brand-fill/[0.12]" />
            <Sparkles className="relative h-9 w-9" strokeWidth={1.75} />
          </div>
          <h1
            aria-live="polite"
            className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink md:text-[36px]"
          >
            Welcome, {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-secondary">You&apos;re preparing for</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-fill/[0.06] px-5 py-2.5 text-[18px] font-semibold text-brand">
            {examName}
          </div>
          <p className="mt-6 max-w-[38ch] text-[16px] leading-relaxed text-ink-secondary">
            We&apos;ll now build your personalized preparation dashboard — mock tests, AI insights
            and a study roadmap tuned to you.
          </p>
          <div className="mt-9 w-full max-w-[300px]">
            <Button type="button" onClick={() => onEnterDashboard(welcomeUser)}>
              Enter Dashboard
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // --- Wizard --------------------------------------------------------------
  return (
    <Shell onLogout={onLogout}>
      <div className="mx-auto w-full max-w-[760px] pt-2">
        <Stepper current={phase} />
      </div>

      <div className="mx-auto w-full max-w-[1080px] flex-1 pt-10 md:pt-12">
        {phase === 1 ? (
          <BasicsStep
            user={user}
            fullName={fullName}
            onFullName={(v) => {
              setFullName(v);
              if (nameError) setNameError(null);
            }}
            nameError={nameError}
            phoneIso={phoneIso}
            onPhoneIso={(v) => {
              setPhoneIso(v);
              if (phoneError) setPhoneError(null);
            }}
            phoneNational={phoneNational}
            phoneCountry={phoneCountry}
            onPhoneNational={(v) => {
              setPhoneNational(v);
              if (phoneError) setPhoneError(null);
            }}
            phoneError={phoneError}
            states={states}
            stateCode={stateCode}
            onStateCode={(v) => {
              setStateCode(v);
              if (stateError) setStateError(null);
            }}
            stateError={stateError}
            refsLoading={refsLoading}
            onContinue={continueFromBasics}
          />
        ) : null}

        {phase === 2 ? (
          <GoalStep
            categories={categories}
            examsByCategory={examsByCategory}
            categoryCode={categoryCode}
            onPick={pickCategory}
            refsLoading={refsLoading}
            error={stepError}
            onBack={() => setPhase(1)}
            onContinue={continueFromGoal}
          />
        ) : null}

        {phase === 3 ? (
          <ExamStep
            categoryName={selectedCategory?.name ?? ""}
            exams={exams}
            examMeta={examMeta}
            examCode={examCode}
            onPick={pickExam}
            requiresCountry={requiresCountry}
            countries={countries}
            countryCode={countryCode}
            onCountry={(v) => {
              setCountryCode(v);
              if (stepError) setStepError(null);
            }}
            error={stepError}
            submitting={submitting}
            onBack={() => setPhase(2)}
            onFinish={finish}
          />
        ) : null}
      </div>
    </Shell>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout shell                                                                */
/* -------------------------------------------------------------------------- */

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto flex min-h-dvh max-w-[1200px] flex-col px-5 pb-10 pt-6 sm:px-8 md:px-10">
        <header className="mb-8 flex items-center justify-between md:mb-10">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand-fill text-[15px] font-bold text-brand-on">
              d
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">dMAT</span>
          </div>
          <TextButton type="button" onClick={onLogout}>
            Log out
          </TextButton>
        </header>
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — Basic details                                                      */
/* -------------------------------------------------------------------------- */

function BasicsStep(props: {
  user: User;
  fullName: string;
  onFullName: (v: string) => void;
  nameError: string | null;
  phoneIso: string;
  onPhoneIso: (v: string) => void;
  phoneNational: string;
  phoneCountry: ReturnType<typeof findCountry>;
  onPhoneNational: (v: string) => void;
  phoneError: string | null;
  states: StateItem[];
  stateCode: string;
  onStateCode: (v: string) => void;
  stateError: string | null;
  refsLoading: boolean;
  onContinue: () => void;
}) {
  const {
    user,
    fullName,
    onFullName,
    nameError,
    phoneIso,
    onPhoneIso,
    phoneNational,
    phoneCountry,
    onPhoneNational,
    phoneError,
    states,
    stateCode,
    onStateCode,
    stateError,
    refsLoading,
    onContinue,
  } = props;

  return (
    <div className="animate-step-in grid gap-10 md:grid-cols-[minmax(0,480px)_minmax(0,1fr)] md:gap-16">
      {/* Form column */}
      <div>
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-ink md:text-[36px]">
          Let&apos;s get to know you
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-secondary">
          We&apos;ll personalize your preparation experience.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onContinue();
          }}
          noValidate
          className="mt-8 flex flex-col gap-5"
        >
          {user.email ? <ReadOnlyField label="Email" value={user.email} /> : null}

          <TextField
            label="Full name"
            value={fullName}
            onChange={(e) => onFullName(e.target.value)}
            error={nameError}
            type="text"
            autoComplete="name"
            autoFocus
            required
          />

          {/* Phone: country code + national number, submitted as E.164. */}
          <div>
            <label
              htmlFor="ob-phone"
              className="mb-2 block text-[13px] font-medium text-ink-secondary"
            >
              Mobile number
            </label>
            <div className="flex gap-2">
              <div className="relative shrink-0">
                <label htmlFor="ob-dial" className="sr-only">
                  Country calling code
                </label>
                <select
                  id="ob-dial"
                  value={phoneIso}
                  onChange={(e) => onPhoneIso(e.target.value)}
                  className={`h-[52px] w-[104px] cursor-pointer appearance-none rounded-[12px] border bg-surface-field pl-4 pr-7 text-[17px] text-ink transition-[border-color] duration-200 ease-out focus:border-brand ${
                    phoneError ? "border-error" : "border-hairline"
                  }`}
                >
                  {COUNTRIES.map((o) => (
                    <option key={o.iso} value={o.iso}>
                      {o.flag} {o.dial}
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
                id="ob-phone"
                value={formatNational(phoneCountry, phoneNational)}
                onChange={(e) => onPhoneNational(digitsOnly(e.target.value).slice(0, 15))}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={phoneCountry.iso === "IN" ? "98765 43210" : "Mobile number"}
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={phoneError ? "ob-phone-error" : undefined}
                className={`h-[52px] w-full min-w-0 rounded-[12px] border bg-surface-field px-4 text-[17px] text-ink transition-[border-color] duration-200 ease-out placeholder:text-ink-secondary/70 focus:border-brand ${
                  phoneError ? "border-error" : "border-hairline"
                }`}
              />
            </div>
            {phoneError ? (
              <p
                id="ob-phone-error"
                role="alert"
                className="mt-2 flex items-start gap-1.5 text-[13px] text-error"
              >
                <span aria-hidden="true" className="mt-px font-semibold leading-none">
                  !
                </span>
                <span>{phoneError}</span>
              </p>
            ) : null}
          </div>

          {/* State stays here: the backend requires state_code on the profile. */}
          <div>
            <label htmlFor="ob-state" className="mb-2 block text-[13px] font-medium text-ink-secondary">
              State
            </label>
            <div className="relative">
              <select
                id="ob-state"
                value={stateCode}
                onChange={(e) => onStateCode(e.target.value)}
                disabled={refsLoading}
                aria-invalid={stateError ? true : undefined}
                className={`h-[52px] w-full cursor-pointer appearance-none rounded-[12px] border bg-surface-field px-4 pr-10 text-[17px] text-ink transition-[border-color] duration-200 ease-out focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 ${
                  stateError ? "border-error" : "border-hairline"
                }`}
              >
                <option value="" disabled>
                  {refsLoading ? "Loading…" : "Select your state"}
                </option>
                {states.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
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
            {stateError ? (
              <p role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] text-error">
                <span aria-hidden="true" className="mt-px font-semibold leading-none">
                  !
                </span>
                <span>{stateError}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-2">
            <Button type="submit">
              <span className="flex items-center justify-center gap-2">
                Continue <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </span>
            </Button>
          </div>
        </form>
      </div>

      {/* Benefits panel — desktop only. */}
      <aside className="relative hidden overflow-hidden rounded-[24px] border border-hairline bg-surface-card p-10 md:flex md:flex-col md:justify-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="animate-drift absolute -right-[14%] -top-[10%] h-[55%] w-[65%] rounded-full bg-brand-fill/20 blur-[90px]" />
          <div
            className="animate-drift absolute -bottom-[12%] -left-[10%] h-[50%] w-[60%] rounded-full bg-brand-fill/10 blur-[90px]"
            style={{ animationDelay: "-13s" }}
          />
        </div>
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/70 px-3.5 py-1.5 text-[12px] font-medium tracking-[0.04em] text-ink-secondary backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
            YOUR PREP, PERSONALIZED
          </span>
          <h2 className="mt-6 max-w-[16ch] text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">
            Everything you need to score higher.
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {ONBOARDING_BENEFITS.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                className="animate-card-in flex items-center gap-3.5"
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brand-fill/[0.1] text-brand">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <span className="text-[16px] font-medium text-ink">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 — Goal (category cards)                                              */
/* -------------------------------------------------------------------------- */

function GoalStep(props: {
  categories: RefItem[];
  examsByCategory: Record<string, CatalogExam[]>;
  categoryCode: string;
  onPick: (code: string) => void;
  refsLoading: boolean;
  error: string | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { categories, examsByCategory, categoryCode, onPick, refsLoading, error, onBack, onContinue } =
    props;

  return (
    <div className="animate-step-in">
      <div className="mx-auto max-w-[720px] text-center">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink md:text-[36px]">
          What are you preparing for?
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-secondary">
          Pick your goal — we&apos;ll tailor the exams and mock tests to match.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-[880px]">
        {refsLoading ? (
          <CardGridSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => {
              const Icon = categoryIcon(cat);
              const examList = examsByCategory[cat.code] ?? [];
              const description =
                examList
                  .slice(0, 4)
                  .map((e) => e.name)
                  .join(", ") || "Curated mock exams";
              return (
                <SelectCard
                  key={cat.code}
                  selected={categoryCode === cat.code}
                  onClick={() => onPick(cat.code)}
                  index={i}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand-fill/[0.1] text-brand transition-colors">
                    <Icon className="h-6 w-6" strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-ink">
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-secondary">
                    {description}
                  </p>
                </SelectCard>
              );
            })}
          </div>
        )}

        {error ? <StepError>{error}</StepError> : null}

        <NavBar
          onBack={onBack}
          onNext={onContinue}
          nextLabel="Continue"
          nextDisabled={!categoryCode}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 3 — Exam selection (exam cards)                                        */
/* -------------------------------------------------------------------------- */

function ExamStep(props: {
  categoryName: string;
  exams: CatalogExam[];
  examMeta: Record<string, ExamSummary>;
  examCode: string;
  onPick: (exam: CatalogExam) => void;
  requiresCountry: boolean;
  countries: RefItem[];
  countryCode: string;
  onCountry: (v: string) => void;
  error: string | null;
  submitting: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  const {
    categoryName,
    exams,
    examMeta,
    examCode,
    onPick,
    requiresCountry,
    countries,
    countryCode,
    onCountry,
    error,
    submitting,
    onBack,
    onFinish,
  } = props;

  return (
    <div className="animate-step-in">
      <div className="mx-auto max-w-[720px] text-center">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink md:text-[36px]">
          Choose your target exam
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-secondary">
          {categoryName ? `Exams under ${categoryName}.` : "Select the exam you're aiming for."}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-[880px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {exams.map((exam, i) => {
            const meta = examMeta[exam.code];
            const description = meta?.description?.trim();
            const duration =
              meta?.total_duration_seconds != null
                ? formatDuration(meta.total_duration_seconds)
                : null;
            return (
              <SelectCard
                key={exam.code}
                selected={examCode === exam.code}
                onClick={() => onPick(exam)}
                index={i}
                variant="row"
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                      {exam.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-ink-secondary">
                      {description || "Full-length mock exam"}
                    </p>
                  </div>
                </div>
                {duration ? (
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-field px-2.5 py-1 text-[12px] font-medium text-ink-secondary">
                    ~ {duration}
                  </span>
                ) : null}
              </SelectCard>
            );
          })}
        </div>

        {/* Country only appears for exams that require it (e.g. study abroad). */}
        {requiresCountry ? (
          <div className="animate-step-in mx-auto mt-6 max-w-[420px]">
            <label
              htmlFor="ob-country"
              className="mb-2 block text-center text-[13px] font-medium text-ink-secondary"
            >
              Target country for this exam
            </label>
            <div className="relative">
              <select
                id="ob-country"
                value={countryCode}
                onChange={(e) => onCountry(e.target.value)}
                className="h-[52px] w-full cursor-pointer appearance-none rounded-[12px] border border-hairline bg-surface-field px-4 pr-10 text-[17px] text-ink transition-[border-color] duration-200 ease-out focus:border-brand"
              >
                <option value="" disabled>
                  Select a country
                </option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
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
          </div>
        ) : null}

        {error ? <StepError>{error}</StepError> : null}

        <NavBar
          onBack={onBack}
          onNext={onFinish}
          nextLabel="Complete registration"
          nextDisabled={!examCode || (requiresCountry && !countryCode)}
          loading={submitting}
          loadingLabel="Setting up…"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                               */
/* -------------------------------------------------------------------------- */

function NavBar({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  loading,
  loadingLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled: boolean;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="inline-flex h-[52px] items-center gap-2 rounded-[12px] px-4 text-[16px] font-medium text-ink-secondary transition-colors duration-200 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
        Back
      </button>
      <div className="w-full max-w-[280px]">
        <Button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          loading={loading}
          loadingLabel={loadingLabel}
        >
          <span className="flex items-center justify-center gap-2">
            {nextLabel}
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </span>
        </Button>
      </div>
    </div>
  );
}

function StepError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-6 flex items-center justify-center gap-1.5 text-[14px] text-error">
      <span aria-hidden="true" className="font-semibold leading-none">
        !
      </span>
      <span>{children}</span>
    </p>
  );
}

function CardGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-skeleton h-[152px] rounded-[16px] border border-hairline bg-surface-card"
        />
      ))}
    </div>
  );
}
