"use client";

import { createContext, useContext } from "react";

/**
 * Shell-level actions any descendant can call without prop-drilling. The
 * coming-soon gate lives here so every mock CTA — however deep — routes through
 * the same single handler and cannot accidentally navigate into a test.
 */
export type AppActions = {
  /** Open the "mock tests are on the way" modal — the response for non-playable mocks. */
  openComingSoon: () => void;
  /** Open the Switch Exam Stream picker. */
  openStreamPicker: () => void;
  /** Launch the full-screen test player for a playable mock's examination. */
  openExam: (examinationId: string) => void;
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
