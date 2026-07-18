"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { MockCard } from "@/components/app/mocks/MockCard";
import { Skeleton } from "@/components/app/Skeleton";
import { ApiError, getMockTests } from "@/lib/api";
import type { MockTest, MockTestGroups, SubjectGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

function MockGrid({ mocks }: { mocks: MockTest[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {mocks.map((mock) => (
        <MockCard key={mock.id} mock={mock} />
      ))}
    </div>
  );
}

function GroupHeading({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{children}</h3>
      <span className="text-[13px] text-ink-secondary">{count}</span>
    </div>
  );
}

/** A collapsible subject with its subject-level and chapter-level mocks. */
function SubjectSection({ subject, defaultOpen }: { subject: SubjectGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const total = subject.subject_mocks.length + subject.chapter_mocks.length;

  return (
    <div className="rounded-[14px] border border-hairline bg-surface-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-ink">{subject.subject_name}</span>
          <span className="text-[13px] text-ink-secondary">{total} mocks</span>
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-ink-secondary transition-transform duration-200",
            open && "rotate-180"
          )}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="flex flex-col gap-5 border-t border-hairline p-5">
          {subject.subject_mocks.length > 0 ? (
            <div>
              <p className="mb-3 text-[13px] font-medium text-ink-secondary">Subject mocks</p>
              <MockGrid mocks={subject.subject_mocks} />
            </div>
          ) : null}
          {subject.chapter_mocks.length > 0 ? (
            <div>
              <p className="mb-3 text-[13px] font-medium text-ink-secondary">Chapter mocks</p>
              <MockGrid mocks={subject.chapter_mocks} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading mocks" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[168px]" />
        ))}
      </div>
      <span className="sr-only">Loading mocks…</span>
    </div>
  );
}

/**
 * The Mock Test section. Header shows the current stream with a "change"
 * affordance (opens the same picker as Profile → Switch Exam Stream). Re-fetches
 * whenever `streamVersion` changes (i.e. after a switch).
 */
export function MockTestView({
  streamVersion,
  onOpenPicker,
  onUnauthorized,
}: {
  streamVersion: number;
  onOpenPicker: () => void;
  onUnauthorized: () => void;
}) {
  const [groups, setGroups] = useState<MockTestGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noStream, setNoStream] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoStream(false);
    try {
      setGroups(await getMockTests());
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return;
      }
      // 409 no_stream is a real, expected state — prompt the user to pick one.
      if (err instanceof ApiError && err.status === 409 && err.code === "no_stream") {
        setNoStream(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't load mocks. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void load();
  }, [load, streamVersion]);

  if (loading) return <LoadingState />;

  if (noStream) {
    return (
      <div className="rounded-[16px] border border-hairline bg-surface-card p-10 text-center">
        <h2 className="text-[18px] font-semibold text-ink">Pick an exam stream first</h2>
        <p className="mx-auto mt-2 max-w-[42ch] text-[14px] text-ink-secondary">
          Choose what you&apos;re preparing for and we&apos;ll show the mocks for it.
        </p>
        <button
          type="button"
          onClick={onOpenPicker}
          className="mt-5 inline-flex h-[44px] items-center rounded-[12px] bg-brand-fill px-5 text-[15px] font-medium text-brand-on transition-colors hover:bg-brand-fill-hover"
        >
          Choose exam stream
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[16px] border border-hairline bg-surface-card p-10 text-center">
        <p role="alert" className="text-[15px] text-ink-secondary">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex h-[44px] items-center rounded-[12px] bg-brand-fill px-5 text-[15px] font-medium text-brand-on transition-colors hover:bg-brand-fill-hover"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!groups) return null;

  const hasSubjects = groups.subjects.some(
    (s) => s.subject_mocks.length + s.chapter_mocks.length > 0
  );
  const isEmpty =
    groups.full_mocks.length === 0 && groups.sectional_mocks.length === 0 && !hasSubjects;

  return (
    <div className="flex flex-col gap-8">
      {/* Stream header with a change affordance. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-ink-secondary">Showing mocks for</p>
          <p className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
            {groups.catalog_exam_name}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPicker}
          className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-card px-3.5 py-2 text-[13px] font-medium text-brand transition-colors hover:bg-surface-field"
        >
          <Pencil className="size-3.5" strokeWidth={2} aria-hidden="true" />
          Change
        </button>
      </div>

      {isEmpty ? (
        <div className="rounded-[16px] border border-hairline bg-surface-card p-10 text-center">
          <p className="text-[15px] text-ink-secondary">
            No mocks are available for this stream yet.
          </p>
        </div>
      ) : null}

      {groups.full_mocks.length > 0 ? (
        <section>
          <GroupHeading count={groups.full_mocks.length}>Full mocks</GroupHeading>
          <MockGrid mocks={groups.full_mocks} />
        </section>
      ) : null}

      {groups.sectional_mocks.length > 0 ? (
        <section>
          <GroupHeading count={groups.sectional_mocks.length}>Sectional mocks</GroupHeading>
          <MockGrid mocks={groups.sectional_mocks} />
        </section>
      ) : null}

      {hasSubjects ? (
        <section>
          <h3 className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-ink">By subject</h3>
          <div className="flex flex-col gap-3">
            {groups.subjects
              .filter((s) => s.subject_mocks.length + s.chapter_mocks.length > 0)
              .map((subject, index) => (
                <SubjectSection
                  key={subject.subject_code}
                  subject={subject}
                  defaultOpen={index === 0}
                />
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
