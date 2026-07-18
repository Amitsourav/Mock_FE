"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/TextField";
import { Modal } from "@/components/app/Modal";
import {
  ApiError,
  getCategoryExams,
  getCountries,
  getMockCategories,
  switchStream,
} from "@/lib/api";
import type { CatalogExam, RefItem, StreamOut } from "@/lib/types";

/**
 * Switch Exam Stream. Reuses the registration cascade endpoints
 * (mock-categories → exams → countries) and POSTs to /me/stream. Append-only on
 * the server — the UI only reflects the new current selection.
 */
export function StreamPicker({
  open,
  current,
  onClose,
  onSwitched,
  onUnauthorized,
}: {
  open: boolean;
  current: StreamOut | null;
  onClose: () => void;
  onSwitched: (next: StreamOut) => void;
  onUnauthorized: () => void;
}) {
  const [categories, setCategories] = useState<RefItem[]>([]);
  const [countries, setCountries] = useState<RefItem[]>([]);
  const [examsByCategory, setExamsByCategory] = useState<Record<string, CatalogExam[]>>({});
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsError, setRefsError] = useState(false);

  const [categoryCode, setCategoryCode] = useState("");
  const [examCode, setExamCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const exams = examsByCategory[categoryCode] ?? [];
  const selectedExam = exams.find((e) => e.code === examCode) ?? null;
  const requiresCountry = selectedExam?.requires_country ?? false;

  const load = useCallback(async () => {
    setRefsLoading(true);
    setRefsError(false);
    try {
      const [cats, cos] = await Promise.all([getMockCategories(), getCountries()]);
      const examLists = await Promise.all(cats.map((c) => getCategoryExams(c.code)));
      const byCategory: Record<string, CatalogExam[]> = {};
      cats.forEach((c, i) => {
        byCategory[c.code] = examLists[i];
      });
      setCategories(cats);
      setCountries(cos);
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

  // Load on open, and seed the cascade from the current stream.
  useEffect(() => {
    if (!open) return;
    void load();
    setCategoryCode(current?.category_code ?? "");
    setExamCode(current?.catalog_exam_code ?? "");
    setCountryCode(current?.target_country_code ?? "");
    setFieldError(null);
    setSubmitError(null);
  }, [open, current, load]);

  function changeCategory(next: string) {
    setCategoryCode(next);
    setExamCode("");
    setCountryCode("");
    setFieldError(null);
    setSubmitError(null);
  }

  function changeExam(next: string) {
    setExamCode(next);
    const exam = exams.find((e) => e.code === next) ?? null;
    setCountryCode(exam?.requires_country ? exam.default_country_code ?? "" : "");
    setFieldError(null);
    setSubmitError(null);
  }

  const canSubmit =
    !refsLoading &&
    !refsError &&
    categoryCode !== "" &&
    examCode !== "" &&
    (!requiresCountry || countryCode !== "") &&
    !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (requiresCountry && !countryCode) {
      setFieldError("Select a target country for this exam.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const next = await switchStream({
        catalog_exam_code: examCode,
        variant_code: null,
        target_country_code: requiresCountry ? countryCode : null,
      });
      onSwitched(next);
    } catch (error) {
      if (error instanceof ApiError && error.unauthorized) {
        onUnauthorized();
        return;
      }
      if (error instanceof ApiError && error.code === "country_required") {
        setFieldError(error.message);
      } else {
        setSubmitError(
          error instanceof ApiError ? error.message : "Something went wrong. Please try again."
        );
      }
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Switch exam stream">
      <form onSubmit={handleSubmit} noValidate className="px-6 pb-6 pt-4">
        {refsError ? (
          <div className="py-2">
            <p role="alert" className="mb-4 text-[14px] text-ink-secondary">
              We couldn&apos;t load the options. Please try again.
            </p>
            <Button type="button" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : (
          <fieldset disabled={refsLoading} className="flex flex-col gap-4">
            <SelectField
              label="What are you preparing for?"
              value={categoryCode}
              onChange={(e) => changeCategory(e.target.value)}
              required
            >
              <option value="" disabled>
                {refsLoading ? "Loading…" : "Select a mock type"}
              </option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Exam"
              value={examCode}
              onChange={(e) => changeExam(e.target.value)}
              disabled={!categoryCode}
              hint={!categoryCode ? "Choose a mock type first." : undefined}
              required
            >
              <option value="" disabled>
                Select an exam
              </option>
              {exams.map((e) => (
                <option key={e.code} value={e.code}>
                  {e.name}
                </option>
              ))}
            </SelectField>

            {requiresCountry ? (
              <SelectField
                label="Target country"
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setFieldError(null);
                }}
                error={fieldError}
                required
              >
                <option value="" disabled>
                  Select a country
                </option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
            ) : null}

            {submitError ? (
              <p role="alert" className="flex items-start gap-1.5 text-[13px] text-error">
                <span aria-hidden="true" className="mt-px font-semibold leading-none">
                  !
                </span>
                <span>{submitError}</span>
              </p>
            ) : null}

            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-[52px] flex-1 rounded-[12px] border border-hairline bg-surface-field text-[17px] font-medium text-ink transition-colors duration-200 ease-out hover:bg-surface"
              >
                Cancel
              </button>
              <div className="flex-1">
                <Button type="submit" disabled={!canSubmit} loading={submitting} loadingLabel="Saving…">
                  Switch
                </Button>
              </div>
            </div>
          </fieldset>
        )}
      </form>
    </Modal>
  );
}
