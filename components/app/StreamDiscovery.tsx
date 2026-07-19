"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Star, X } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/app/Modal";
import { SelectCard } from "@/components/ui/select-card";
import { categoryTheme } from "@/components/onboarding/onboarding-meta";
import {
  ApiError,
  getCategoryExams,
  getCountries,
  getExamCatalog,
  getMockCategories,
  switchStream,
} from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { CatalogExam, ExamSummary, RefItem, StreamOut, User } from "@/lib/types";

/**
 * The unified exam-stream discovery experience. Replaces both the old "single
 * button" empty state and the dropdown "switch stream" modal. Category cards and
 * an inline-expanding exam section live on one page — no modal, no navigation.
 * Categories, exams and durations are all rendered from live API data. On
 * confirm it hands the new StreamOut up; AppShell re-fetches the catalogue.
 */
export function StreamDiscovery({
  user,
  current,
  onSwitched,
  onCancel,
  onUnauthorized,
}: {
  user: User;
  /** When switching an existing stream, seeds the selection and enables Cancel. */
  current?: StreamOut | null;
  onSwitched: (next: StreamOut) => void;
  onCancel?: () => void;
  onUnauthorized: () => void;
}) {
  const [categories, setCategories] = useState<RefItem[]>([]);
  const [examsByCategory, setExamsByCategory] = useState<Record<string, CatalogExam[]>>({});
  const [examMeta, setExamMeta] = useState<Record<string, ExamSummary>>({});
  const [countries, setCountries] = useState<RefItem[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsError, setRefsError] = useState(false);

  // The category whose exam-picker dialog is open (null = closed).
  const [pickerCategory, setPickerCategory] = useState<RefItem | null>(null);
  const [examCode, setExamCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalExams = pickerCategory ? examsByCategory[pickerCategory.code] ?? [] : [];
  const selectedExam = modalExams.find((e) => e.code === examCode) ?? null;
  const requiresCountry = selectedExam?.requires_country ?? false;
  const firstName = (user.full_name ?? "").trim().split(/\s+/)[0] || "there";
  const canContinue = Boolean(examCode) && (!requiresCountry || Boolean(countryCode));

  // The category to feature at the top: the stream being switched, else the goal
  // the student picked at onboarding. Drives the featured card + "Recommended" badge.
  const featuredCode = current?.category_code ?? user.mock_category_code ?? "";
  const featuredCategory = categories.find((c) => c.code === featuredCode) ?? null;
  const featuredBadge = current?.category_code ? "Your current stream" : "Recommended for you";

  const load = useCallback(async () => {
    setRefsLoading(true);
    setRefsError(false);
    try {
      const [cats, cos, catalog] = await Promise.all([
        getMockCategories(),
        getCountries(),
        getExamCatalog(),
      ]);
      const examLists = await Promise.all(cats.map((c) => getCategoryExams(c.code)));
      const byCategory: Record<string, CatalogExam[]> = {};
      cats.forEach((c, i) => {
        byCategory[c.code] = examLists[i];
      });
      const meta: Record<string, ExamSummary> = {};
      catalog.forEach((e) => {
        meta[e.code] = e;
      });
      setCategories(cats);
      setCountries(cos);
      setExamsByCategory(byCategory);
      setExamMeta(meta);
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return;
      }
      setRefsError(true);
    } finally {
      setRefsLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCategory(cat: RefItem) {
    setPickerCategory(cat);
    // Reopening the current stream's category pre-selects its exam; otherwise start fresh.
    if (current?.category_code === cat.code) {
      setExamCode(current.catalog_exam_code);
      setCountryCode(current.target_country_code ?? "");
    } else {
      setExamCode("");
      setCountryCode("");
    }
    setError(null);
  }

  function closePicker() {
    if (submitting) return;
    setPickerCategory(null);
    setError(null);
  }

  function pickExam(exam: CatalogExam) {
    setExamCode(exam.code);
    setCountryCode(exam.requires_country ? exam.default_country_code ?? "" : "");
    setError(null);
  }

  async function confirm() {
    if (!canContinue) {
      setError(
        !examCode ? "Choose your target exam to continue." : "Select a target country for this exam."
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const next = await switchStream({
        catalog_exam_code: examCode,
        variant_code: null,
        target_country_code: requiresCountry ? countryCode : null,
      });
      onSwitched(next);
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (refsError) {
    return (
      <div className="rounded-[20px] border border-hairline bg-surface-card p-10 text-center">
        <h2 className="text-[18px] font-semibold text-ink">Couldn&apos;t load your options</h2>
        <p className="mx-auto mt-2 max-w-[42ch] text-[14px] text-ink-secondary">
          We couldn&apos;t reach the server. Please try again.
        </p>
        <div className="mx-auto mt-5 max-w-[220px]">
          <Button type="button" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-step-in pb-28 md:pb-10">
      {/* Optional cancel (only when switching an existing stream). */}
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-card px-3 py-1.5 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
          Cancel
        </button>
      ) : null}

      {/* Header */}
      <div className="max-w-[760px]">
        <p className="text-[15px] font-medium text-ink-secondary">
          Welcome, {firstName} <span className="inline-block">👋</span>
        </p>
        <h1 className="mt-2 text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink md:text-[38px]">
          Choose Your Target Exam
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-secondary">
          Pick a category, then choose your exam.
        </p>
      </div>

      {/* Main: category grid + inline exam section, full width. */}
      <div className="mt-8">
        <div>
          {refsLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-skeleton h-[196px] rounded-[16px] border border-hairline bg-surface-card"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {featuredCategory ? (
                <CategoryCard
                  cat={featuredCategory}
                  exams={examsByCategory[featuredCategory.code] ?? []}
                  selected={pickerCategory?.code === featuredCategory.code}
                  onPick={() => openCategory(featuredCategory)}
                  index={0}
                  featured
                  badge={featuredBadge}
                />
              ) : null}
              {categories
                .filter((c) => c.code !== featuredCategory?.code)
                .map((cat, i) => (
                  <CategoryCard
                    key={cat.code}
                    cat={cat}
                    exams={examsByCategory[cat.code] ?? []}
                    selected={pickerCategory?.code === cat.code}
                    onPick={() => openCategory(cat)}
                    index={featuredCategory ? i + 1 : i}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Exam picker — opens as a dialog for the chosen category. */}
      <Modal
        open={Boolean(pickerCategory)}
        onClose={closePicker}
        title={pickerCategory ? `${pickerCategory.name} — choose your exam` : undefined}
        size="lg"
      >
        <div className="px-6 pb-6 pt-3">
          {modalExams.length === 0 ? (
            <p className="py-4 text-[14px] text-ink-secondary">
              No exams are available for this category yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {modalExams.map((exam, i) => {
                const meta = examMeta[exam.code];
                const duration =
                  meta?.total_duration_seconds != null
                    ? formatDuration(meta.total_duration_seconds)
                    : null;
                return (
                  <SelectCard
                    key={exam.code}
                    selected={examCode === exam.code}
                    onClick={() => pickExam(exam)}
                    index={i}
                    variant="row"
                  >
                    <h3 className="pr-8 text-[16px] font-semibold tracking-[-0.01em] text-ink">
                      {exam.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-secondary">
                      {meta?.description?.trim() || "Full-length mock exam"}
                    </p>
                    {duration ? (
                      <div className="mt-3">
                        <StatChip>Duration · {duration}</StatChip>
                      </div>
                    ) : null}
                  </SelectCard>
                );
              })}
            </div>
          )}

          {/* Country — required for some exams (e.g. study abroad). Chips, not a dropdown. */}
          {requiresCountry ? (
            <div className="animate-step-in mt-5">
              <p className="mb-2 text-[13px] font-medium text-ink-secondary">
                Target country for this exam
              </p>
              <div className="flex flex-wrap gap-2">
                {countries.map((c) => {
                  const active = countryCode === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setCountryCode(c.code);
                        setError(null);
                      }}
                      className={[
                        "rounded-full border px-4 py-2 text-[14px] font-medium transition-colors duration-200",
                        active
                          ? "border-brand bg-brand-fill/[0.08] text-brand"
                          : "border-hairline bg-surface-card text-ink hover:border-hairline-strong",
                      ].join(" ")}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 flex items-start gap-1.5 text-[13px] text-error">
              <span aria-hidden="true" className="mt-px font-semibold leading-none">
                !
              </span>
              <span>{error}</span>
            </p>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={closePicker}
              disabled={submitting}
              className="h-[52px] flex-1 rounded-[12px] border border-hairline bg-surface-field text-[16px] font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <div className="flex-[1.4]">
              <Button
                type="button"
                onClick={() => void confirm()}
                disabled={!canContinue}
                loading={submitting}
                loadingLabel="Setting up…"
              >
                <span className="flex items-center justify-center gap-2">
                  Continue
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-field px-2.5 py-1 text-[12px] font-medium text-ink-secondary">
      {children}
    </span>
  );
}

/**
 * A category as a selectable card. The icon + accent colour come from the
 * category's real exams (so no two look alike); `featured` renders the larger
 * hero treatment with a colour wash, a recommended badge and a Continue CTA.
 */
function CategoryCard({
  cat,
  exams,
  selected,
  onPick,
  index,
  featured,
  badge,
}: {
  cat: RefItem;
  exams: CatalogExam[];
  selected: boolean;
  onPick: () => void;
  index: number;
  featured?: boolean;
  badge?: string;
}) {
  const { icon: Icon, color } = categoryTheme(cat, exams.map((e) => e.name));
  const examCount = exams.length;
  const limit = featured ? 6 : 4;

  const tile = (box: string, glyph: string) => (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-[14px]`}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      <Icon className={glyph} strokeWidth={1.9} />
    </span>
  );

  const pills = (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {exams.slice(0, limit).map((e) => (
        <span
          key={e.code}
          className="rounded-[7px] bg-surface-field px-2 py-0.5 text-[12px] font-medium text-ink-secondary"
        >
          {e.name}
        </span>
      ))}
      {exams.length > limit ? (
        <span className="px-1 py-0.5 text-[12px] font-medium text-ink-secondary">
          +{exams.length - limit}
        </span>
      ) : null}
    </div>
  );

  const count = (
    <StatChip>
      {examCount} {examCount === 1 ? "exam" : "exams"}
    </StatChip>
  );

  if (featured) {
    return (
      <SelectCard selected={selected} onClick={onPick} index={index} className="overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-[70px]"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
        />
        <div className="relative flex flex-col gap-5 pr-6 sm:flex-row sm:items-center">
          {tile("h-14 w-14", "h-7 w-7")}
          <div className="min-w-0 flex-1">
            {badge ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
              >
                <Star className="size-3" strokeWidth={2.5} aria-hidden="true" />
                {badge}
              </span>
            ) : null}
            <h3 className="mt-1.5 text-[20px] font-semibold tracking-[-0.01em] text-ink">
              {cat.name}
            </h3>
            {pills}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {count}
            <span className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-brand-fill px-3 text-[13px] font-medium text-brand-on transition-colors duration-200 group-hover:bg-brand-fill-hover">
              Continue
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
            </span>
          </div>
        </div>
      </SelectCard>
    );
  }

  return (
    <SelectCard selected={selected} onClick={onPick} index={index}>
      <div className="flex w-full items-center gap-4 pr-6">
        {tile("h-12 w-12", "h-6 w-6")}
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{cat.name}</h3>
          {pills}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {count}
          <ArrowRight
            className="hidden h-5 w-5 text-ink-secondary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand sm:block"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
      </div>
    </SelectCard>
  );
}
