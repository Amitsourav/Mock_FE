"use client";

import { createContext, useContext } from "react";

/**
 * Shell-level actions any descendant can call without prop-drilling. The
 * coming-soon gate lives here so every mock CTA — however deep — routes through
 * the same single handler and cannot accidentally navigate into a test.
 */
/**
 * What the analytics layer needs to describe a mock, carried from the card that
 * launched it. The test player only ever receives an `examination_id`, and the
 * mock's title/duration live on `MockTest` — so without this the `mock_start`
 * and `mock_complete` events could not name what was started.
 */
export type MockLaunchMeta = {
  mock_id: string;
  mock_name: string;
  access: "free" | "premium";
  /** The paper's full allowance, for computing elapsed time across a resume. */
  duration_seconds: number;
};

export type AppActions = {
  /** Open the "mock tests are on the way" modal — the response for non-playable mocks. */
  openComingSoon: () => void;
  /** Open the Switch Exam Stream picker. */
  openStreamPicker: () => void;
  /** Launch the full-screen test player for a playable mock's examination. */
  openExam: (examinationId: string, meta?: MockLaunchMeta) => void;
};

const AppActionsContext = createContext<AppActions | null>(null);

export function AppActionsProvider({
  value,
  children,
}: {
  value: AppActions;
  children: React.ReactNode;
}) {
  return <AppActionsContext.Provider value={value}>{children}</AppActionsContext.Provider>;
}

export function useAppActions(): AppActions {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error("useAppActions must be used within AppActionsProvider");
  return ctx;
}
