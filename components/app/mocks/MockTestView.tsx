"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/app/Skeleton";
import { StreamDiscovery } from "@/components/app/StreamDiscovery";
import { MockHub } from "@/components/app/mocks/MockHub";
import { ApiError, getAttempts, getDashboardSummary, getInsight, getMockTests } from "@/lib/api";
import type {
  AttemptListItem,
  DashboardInsight,
  DashboardSummary,
  MockTestGroups,
  StreamOut,
  User,
} from "@/lib/types";

function LoadingState() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading your hub" className="flex flex-col gap-8">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-[240px] lg:col-span-3" />
        <Skeleton className="h-[240px] lg:col-span-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[168px]" />
        ))}
      </div>
      <span className="sr-only">Loading your hub…</span>
    </div>
  );
}

/**
 * The Mock Test section. When a stream is set it renders the MockHub command
 * centre (catalogue + real analytics); with no stream, or when switching, it
 * hands off to the inline StreamDiscovery experience. Re-fetches whenever
 * `streamVersion` changes.
 */
export function MockTestView({
  user,
  currentStream,
  reselecting,
  streamVersion,
  onOpenPicker,
  onCancelReselect,
  onStreamSwitched,
  onGoToDashboard,
  onUnauthorized,
}: {
  user: User;
  currentStream: StreamOut | null;
  reselecting: boolean;
  streamVersion: number;
  onOpenPicker: () => void;
  onCancelReselect: () => void;
  onStreamSwitched: (next: StreamOut) => void;
  onGoToDashboard: () => void;
  onUnauthorized: () => void;
}) {
  const [groups, setGroups] = useState<MockTestGroups | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [insight, setInsight] = useState<DashboardInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noStream, setNoStream] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoStream(false);
    try {
      const g = await getMockTests();
      setGroups(g);
      // Analytics are best-effort: a failure here still leaves a usable catalogue.
      const [s, a, ins] = await Promise.allSettled([
        getDashboardSummary(),
        getAttempts(),
        getInsight(),
      ]);
      setSummary(s.status === "fulfilled" ? s.value : null);
      setAttempts(a.status === "fulfilled" ? a.value : []);
      setInsight(ins.status === "fulfilled" ? ins.value : null);
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return;
      }
      // 409 no_stream is a real, expected state — prompt the user to pick one.
      if (err instanceof ApiError && err.status === 409 && err.code === "no_stream") {
        setNoStream(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't load your hub. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void load();
  }, [load, streamVersion]);

  // Switching an existing stream: take over inline (seeded + cancellable),
  // without waiting on the catalogue we're about to replace anyway.
  if (reselecting) {
    return (
      <StreamDiscovery
        user={user}
        current={currentStream}
        onSwitched={onStreamSwitched}
        onCancel={onCancelReselect}
        onUnauthorized={onUnauthorized}
      />
    );
  }

  if (loading) return <LoadingState />;

  // No stream yet → the rich discovery experience instead of a lone button.
  if (noStream) {
    return (
      <StreamDiscovery user={user} onSwitched={onStreamSwitched} onUnauthorized={onUnauthorized} />
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

  return (
    <MockHub
      examName={groups.catalog_exam_name}
      groups={groups}
      summary={summary}
      attempts={attempts}
      insight={insight}
      onChangeStream={onOpenPicker}
      onGoToDashboard={onGoToDashboard}
    />
  );
}
