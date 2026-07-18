"use client";

import { useCallback, useEffect, useState } from "react";
import { AppActionsProvider } from "@/components/app/app-context";
import { ComingSoonModal } from "@/components/app/ComingSoonModal";
import { MobileNav, Sidebar } from "@/components/app/Sidebar";
import type { AppView } from "@/components/app/Sidebar";
import { ProfileMenu } from "@/components/app/ProfileMenu";
import { StreamPicker } from "@/components/app/StreamPicker";
import { DashboardView } from "@/components/app/dashboard/DashboardView";
import { MockTestView } from "@/components/app/mocks/MockTestView";
import { ApiError, getStream } from "@/lib/api";
import type { StreamOut, User } from "@/lib/types";

const VIEW_TITLE: Record<AppView, string> = {
  dashboard: "Dashboard",
  mocks: "Mock Test",
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
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
  const openStreamPicker = useCallback(() => setPickerOpen(true), []);

  return (
    <AppActionsProvider value={{ openComingSoon, openStreamPicker }}>
      <div className="flex min-h-dvh bg-surface">
        <Sidebar view={view} onNavigate={setView} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar: current section + profile menu. Sticky so the menu is always reachable. */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-hairline bg-surface/85 px-5 backdrop-blur-md sm:px-8">
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

          <main className="flex-1 px-5 pb-24 pt-6 sm:px-8 md:pb-10">
            <div className="mx-auto w-full max-w-[1120px]">
              {view === "dashboard" ? (
                <DashboardView onUnauthorized={onUnauthorized} />
              ) : (
                <MockTestView
                  streamVersion={streamVersion}
                  onOpenPicker={openStreamPicker}
                  onUnauthorized={onUnauthorized}
                />
              )}
            </div>
          </main>
        </div>

        <MobileNav view={view} onNavigate={setView} />
      </div>

      <ComingSoonModal open={comingSoonOpen} onClose={() => setComingSoonOpen(false)} />

      <StreamPicker
        open={pickerOpen}
        current={stream}
        onClose={() => setPickerOpen(false)}
        onSwitched={(next) => {
          setStream(next);
          setStreamVersion((v) => v + 1); // triggers Mock Test re-fetch
          setPickerOpen(false);
          setView("mocks"); // show the switch took effect
        }}
        onUnauthorized={onUnauthorized}
      />
    </AppActionsProvider>
  );
}
