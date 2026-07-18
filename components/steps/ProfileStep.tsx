"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CardHeader } from "@/components/Card";
import { ReadOnlyField, SelectField, TextField } from "@/components/TextField";
import {
  ApiError,
  getCategoryExams,
  getCountries,
  getMockCategories,
  getStates,
  updateProfile,
} from "@/lib/api";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  digitsOnly,
  findCountry,
  formatNational,
  toE164,
  validatePhone,
} from "@/lib/phone";
import type { CatalogExam, RefItem, StateItem, User } from "@/lib/types";

/** Which field a structured 422 code points at, so the message lands inline. */
const ERROR_FIELD: Record<string, keyof FieldErrors> = {
  invalid_phone: "phone",
  invalid_state: "state_code",
  invalid_exam: "catalog_exam_code",
  exam_category_mismatch: "catalog_exam_code",
  country_required: "target_country_code",
  invalid_country: "target_country_code",
};

type FieldErrors = {
  full_name?: string;
  phone?: string;
  state_code?: string;
  mock_category_code?: string;
  catalog_exam_code?: string;
  target_country_code?: string;
};

export function ProfileStep({
  user,
  onCompleted,
  onUnauthorized,
}: {
  user: User;
  onCompleted: (updated: User) => void;
  onUnauthorized: () => void;
}) {
  // --- Reference data (dropdown options) -----------------------------------
  const [states, setStates] = useState<StateItem[]>([]);
  const [categories, setCategories] = useState<RefItem[]>([]);
  const [countries, setCountries] = useState<RefItem[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsError, setRefsError] = useState(false);

  // Every category's exams, prefetched once with the other reference data so
  // switching category filters client-side (instant) instead of a slow
  // per-selection round trip. The dataset is tiny (~4 categories, ~22 exams).
  const [examsByCategory, setExamsByCategory] = useState<Record<string, CatalogExam[]>>({});

  // --- Form fields (seeded from any partial server record) -----------------
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [phoneIso, setPhoneIso] = useState(DEFAULT_COUNTRY.iso);
  const [phoneNational, setPhoneNational] = useState("");
  const [stateCode, setStateCode] = useState(user.state_code ?? "");
  const [categoryCode, setCategoryCode] = useState(user.mock_category_code ?? "");
  const [examCode, setExamCode] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const phoneCountry = findCountry(phoneIso);
  // Instant, synchronous filter — no fetch on category change.
  const exams = examsByCategory[categoryCode] ?? [];
  const selectedExam = exams.find((exam) => exam.code === examCode) ?? null;
  const requiresCountry = selectedExam?.requires_country ?? false;

  const loadReferences = useCallback(async () => {
    setRefsLoading(true);
    setRefsError(false);
    try {
      const [s, c, co] = await Promise.all([getStates(), getMockCategories(), getCountries()]);
      setStates(s);
      setCategories(c);
      setCountries(co);
      // Prefetch every category's exams in parallel (tiny dataset) and key them
      // by category code, so selecting a category is a synchronous filter later.
      const examLists = await Promise.all(c.map((category) => getCategoryExams(category.code)));
      const byCategory: Record<string, CatalogExam[]> = {};
      c.forEach((category, index) => {
        byCategory[category.code] = examLists[index];
      });
      setExamsByCategory(byCategory);
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

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSubmitError(null);
  }

  function changeCategory(next: string) {
    setCategoryCode(next);
    // The old exam belongs to the old category; the country belongs to the old
    // exam. Both are now meaningless — reset them so the cascade restarts clean.
    setExamCode("");
    setCountryCode("");
    clearError("mock_category_code");
    setErrors((prev) => ({ ...prev, catalog_exam_code: undefined, target_country_code: undefined }));
  }

  function changeExam(next: string) {
    setExamCode(next);
    const exam = exams.find((e) => e.code === next) ?? null;
    // Pre-fill the default country (editable) when the exam names one; otherwise
    // start empty so a required country is a deliberate choice.
    setCountryCode(exam?.requires_country ? exam.default_country_code ?? "" : "");
    clearError("catalog_exam_code");
    setErrors((prev) => ({ ...prev, target_country_code: undefined }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!fullName.trim()) next.full_name = "Enter your full name.";
    const phoneError = validatePhone(phoneCountry, phoneNational);
    if (phoneError) next.phone = phoneError;
    if (!stateCode) next.state_code = "Select your state.";
    if (!categoryCode) next.mock_category_code = "Select what you're preparing for.";
    if (!examCode) next.catalog_exam_code = "Select the exam you're targeting.";
    if (requiresCountry && !countryCode) {
      next.target_country_code = "Select a target country for this exam.";
    }
    return next;
  }

  const canSubmit =
    !refsLoading &&
    !refsError &&
    fullName.trim() !== "" &&
    !validatePhone(phoneCountry, phoneNational) &&
    stateCode !== "" &&
    categoryCode !== "" &&
    examCode !== "" &&
    (!requiresCountry || countryCode !== "");

  const errorFor = (key: keyof FieldErrors) => (touched[key] ? errors[key] : undefined);

  const markTouched = (key: keyof FieldErrors) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors(validate());
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setTouched({
      full_name: true,
      phone: true,
      state_code: true,
      mock_category_code: true,
      catalog_exam_code: true,
      target_country_code: true,
    });
    if (Object.keys(found).length > 0) {
      const firstKey = (Object.keys(found) as (keyof FieldErrors)[])[0];
      document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await updateProfile({
        full_name: fullName.trim(),
        phone: toE164(phoneCountry, phoneNational),
        state_code: stateCode,
        mock_category_code: categoryCode,
        catalog_exam_code: examCode,
        target_country_code: requiresCountry ? countryCode : null,
      });
      onCompleted(updated);
    } catch (error) {
      // Never wipe the form — the user's input survives every failure path.
      if (error instanceof ApiError && error.unauthorized) {
        onUnauthorized();
        return;
      }
      if (error instanceof ApiError && error.code && ERROR_FIELD[error.code]) {
        // A structured 422: land the message on the field it belongs to.
        const field = ERROR_FIELD[error.code];
        setErrors((prev) => ({ ...prev, [field]: error.message }));
        setTouched((prev) => ({ ...prev, [field]: true }));
        document.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus();
      } else {
        setSubmitError(
          error instanceof ApiError ? error.message : "Something went wrong. Please try again."
        );
      }
      setSubmitting(false);
    }
  }

  // Reference data is required for the form to function; a load failure gets a
  // retry rather than a half-populated set of empty dropdowns.
  if (refsError) {
    return (
      <div className="animate-step-in text-center">
        <CardHeader
          title="Couldn't load the form"
          subtitle="We couldn't reach the server to load your options. Please try again."
        />
        <Button type="button" onClick={() => void loadReferences()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="animate-step-in">
      <CardHeader
        title="Complete your registration"
        subtitle="A few details so we can match you to the right mock exam."
      />

      {/* No fieldset-wide disable: Full name and phone don't need reference data,
          so they stay interactive from first render. Only the reference-backed
          dropdowns below gate on refsLoading. */}
      <fieldset className="flex flex-col gap-5">
        {user.email ? <ReadOnlyField label="Email" value={user.email} /> : null}

        <TextField
          label="Full name"
          data-field="full_name"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            clearError("full_name");
          }}
          onBlur={markTouched("full_name")}
          error={errorFor("full_name")}
          disabled={submitting}
          type="text"
          autoComplete="name"
          required
          autoFocus
        />

        {/* Phone: country-code select + national number, submitted as E.164. */}
        <div>
          <label
            htmlFor="phone-national"
            className="mb-2 block text-[13px] font-medium text-ink-secondary"
          >
            Mobile number
          </label>
          <div className="flex gap-2">
            <div className="relative shrink-0">
              <label htmlFor="phone-dial" className="sr-only">
                Country calling code
              </label>
              <select
                id="phone-dial"
                value={phoneIso}
                onChange={(event) => {
                  setPhoneIso(event.target.value);
                  clearError("phone");
                }}
                disabled={submitting}
                className={`h-[52px] w-[104px] cursor-pointer appearance-none rounded-[12px] border bg-surface-field pl-4 pr-7 text-[17px] text-ink transition-[border-color] duration-200 ease-out focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 ${
                  errorFor("phone") ? "border-error" : "border-hairline"
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
              id="phone-national"
              data-field="phone"
              value={formatNational(phoneCountry, phoneNational)}
              onChange={(event) => {
                setPhoneNational(digitsOnly(event.target.value).slice(0, 15));
                clearError("phone");
              }}
              onBlur={markTouched("phone")}
              disabled={submitting}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={phoneCountry.iso === "IN" ? "98765 43210" : "Mobile number"}
              aria-invalid={errorFor("phone") ? true : undefined}
              aria-describedby={errorFor("phone") ? "phone-error" : undefined}
              className={`h-[52px] w-full min-w-0 rounded-[12px] border bg-surface-field px-4 text-[17px] text-ink transition-[border-color] duration-200 ease-out placeholder:text-ink-secondary/70 focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 ${
                errorFor("phone") ? "border-error" : "border-hairline"
              }`}
            />
          </div>
          {errorFor("phone") ? (
            <p id="phone-error" role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] text-error">
              <span aria-hidden="true" className="mt-px font-semibold leading-none">
                !
              </span>
              <span>{errorFor("phone")}</span>
            </p>
          ) : null}
        </div>

        <SelectField
          label="State"
          data-field="state_code"
          value={stateCode}
          onChange={(event) => {
            setStateCode(event.target.value);
            clearError("state_code");
          }}
          onBlur={markTouched("state_code")}
          error={errorFor("state_code")}
          disabled={submitting || refsLoading}
          hint={refsLoading ? "Loading options…" : undefined}
          required
        >
          <option value="" disabled>
            {refsLoading ? "Loading…" : "Select your state"}
          </option>
          {states.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="What are you preparing for?"
          data-field="mock_category_code"
          value={categoryCode}
          onChange={(event) => changeCategory(event.target.value)}
          onBlur={markTouched("mock_category_code")}
          error={errorFor("mock_category_code")}
          disabled={submitting || refsLoading}
          hint={refsLoading ? "Loading options…" : undefined}
          required
        >
          <option value="" disabled>
            {refsLoading ? "Loading…" : "Select a mock type"}
          </option>
          {categories.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Exam you're targeting"
          data-field="catalog_exam_code"
          value={examCode}
          onChange={(event) => changeExam(event.target.value)}
          onBlur={markTouched("catalog_exam_code")}
          error={errorFor("catalog_exam_code")}
          // Disabled until a category is chosen; its exams are already prefetched.
          disabled={submitting || !categoryCode}
          hint={!categoryCode ? "Choose what you're preparing for first." : undefined}
          required
        >
          <option value="" disabled>
            Select an exam
          </option>
          {exams.map((exam) => (
            <option key={exam.code} value={exam.code}>
              {exam.name}
            </option>
          ))}
        </SelectField>

        {/* Country only exists for exams that require it. */}
        {requiresCountry ? (
          <SelectField
            label="Target country"
            data-field="target_country_code"
            value={countryCode}
            onChange={(event) => {
              setCountryCode(event.target.value);
              clearError("target_country_code");
            }}
            onBlur={markTouched("target_country_code")}
            error={errorFor("target_country_code")}
            disabled={submitting || refsLoading}
            required
          >
            <option value="" disabled>
              Select a country
            </option>
            {countries.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </SelectField>
        ) : null}
      </fieldset>

      {submitError ? (
        <p role="alert" className="mt-5 flex items-start gap-1.5 text-[13px] text-error">
          <span aria-hidden="true" className="mt-px font-semibold leading-none">
            !
          </span>
          <span>{submitError}</span>
        </p>
      ) : null}

      <div className="mt-6">
        <Button
          type="submit"
          disabled={!canSubmit}
          loading={submitting}
          loadingLabel="Submitting…"
        >
          Complete registration
        </Button>
      </div>
    </form>
  );
}
