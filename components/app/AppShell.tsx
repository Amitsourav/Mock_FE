"use client";

import { useCallback, useEffect, useState } from "react";
import { AppActionsProvider } from "@/components/app/app-context";
import { ComingSoonModal } from "@/components/app/ComingSoonModal";
import { MobileNav, Sidebar } from "@/components/app/Sidebar";
import type { AppView } from "@/components/app/Sidebar";
import { ProfileMenu } from "@/components/app/ProfileMenu";
import { AuroraField } from "@/components/app/dashboard/AuroraField";
import { DashboardView } from "@/components/app/dashboard/DashboardView";
import { MockTestView } from "@/components/app/mocks/MockTestView";
import { ExamPlayer } from "@/components/app/exam/ExamPlayer";
import { ApiError, getStream } from "@/lib/api";
import type { StreamOut, User } from "@/lib/types";

const VIEW_TITLE: Record<AppView, string> = {
  dashboard: "Dashboard",
  mocks: "Mock Test",
  exam: "Exam", // never shown — the exam view is a full-screen takeover
};

/**
 * The post-login application: sidebar nav, top-right profile menu, and the two
 * sections. Owns the shared coming-soon gate and the stream state so switching a
 * stream re-fetches the mock catalog everywhere.
 */
export function AppShell({
  user,
  onLogout,
  onUnauthorized,
}: {
  user: User;
  onLogout: () => void;
  onUnauthorized: () => void;
}) {
  const [view, setView] = useState<AppView>("dashboard");
  const [examId, setExamId] = useState<string | null>(null);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  // Drives the inline exam-stream discovery takeover when switching an existing
  // stream (a fresh, stream-less user gets it automatically via MockTestView).
  const [reselecting, setReselecting] = useState(false);

  const [stream, setStream] = useState<StreamOut | null>(null);
  const [streamLoading, setStreamLoading] = useState(true);
  // Bumped on a stream switch so the Mock Test catalog re-fetches.
  const [streamVersion, setStreamVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getStream()
      .then((s) => {
        if (active) setStream(s);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.unauthorized) onUnauthorized();
        // A missing stream is a valid state (null); other failures leave it null too.
      })
      .finally(() => {
        if (active) setStreamLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onUnauthorized]);

  const openComingSoon = useCallback(() => setComingSoonOpen(true), []);
  const openExam = useCallback((examinationId: string) => {
    setExamId(examinationId);
    setView("exam");
  }, []);
  const exitExam = useCallback(() => {
    setExamId(null);
    setView("mocks");
  }, []);
  // "Switch exam stream" / "Change" now open the inline discovery on the Mock
  // Test view rather than a modal.
  const openStreamPicker = useCallback(() => {
    setReselecting(true);
    setView("mocks");
  }, []);

  // A stream was chosen/switched from the discovery page: adopt it, re-fetch the
  // mock catalogue, and make sure the change is visible.
  const handleStreamSwitched = useCallback((next: StreamOut) => {
    setStream(next);
    setStreamVersion((v) => v + 1);
    setReselecting(false);
    setView("mocks");
  }, []);

  // The test player takes the whole viewport — no sidebar, header or nav.
  if (view === "exam" && examId) {
    return <ExamPlayer examinationId={examId} onExit={exitExam} onUnauthorized={onUnauthorized} />;
  }

  return (
    <AppActionsProvider value={{ openComingSoon, openStreamPicker, openExam }}>
      <div className="flex min-h-dvh bg-surface">
        <Sidebar view={view} onNavigate={setView} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar: current section + profile menu. Sticky so the menu is always reachable. */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-hairline bg-surface/85 px-5 backdrop-blur-md sm:px-8 print:hidden">
            <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
              {VIEW_TITLE[view]}
            </h1>
            <ProfileMenu
              user={user}
              stream={stream}
              streamLoading={streamLoading}
              onSwitchStream={openStreamPicker}
              onLogout={onLogout}
            />
          </header>

          {/* The dashboard sits on the soft field frame with the aurora glowing
              behind its glass tiles; other views keep the plain surface. */}
          <main
            className={
              view === "dashboard"
                ? "relative flex-1 bg-surface-field px-5 pb-24 pt-6 sm:px-8 md:pb-10 print:bg-white"
                : "flex-1 px-5 pb-24 pt-6 sm:px-8 md:pb-10"
            }
          >
            {view === "dashboard" ? <AuroraField /> : null}
            <div
              className={
                view === "dashboard"
                  ? "relative mx-auto w-full max-w-[1200px]"
                  : "mx-auto w-full max-w-[1120px]"
              }
            >
              {view === "dashboard" ? (
                <DashboardView user={user} onUnauthorized={onUnauthorized} />
              ) : (
                <MockTestView
                  user={user}
                  currentStream={stream}
                  reselecting={reselecting}
                  streamVersion={streamVersion}
                  onOpenPicker={openStreamPicker}
                  onCancelReselect={() => setReselecting(false)}
                  onStreamSwitched={handleStreamSwitched}
                  onGoToDashboard={() => setView("dashboard")}
                  onUnauthorized={onUnauthorized}
                />
              )}
            </div>
          </main>
        </div>

        <MobileNav view={view} onNavigate={setView} />
      </div>

      <ComingSoonModal open={comingSoonOpen} onClose={() => setComingSoonOpen(false)} />
    </AppActionsProvider>
  );
}
