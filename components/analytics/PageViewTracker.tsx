"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

/**
 * Sends page_view for REAL navigations — the first load and the `/share/[token]`
 * route. In-app screens (Dashboard, Mock Test, …) never change the URL, so they
 * are reported separately by AppShell.
 *
 * `absolute: true` sends the browser's actual URL rather than a reconstructed
 * one, so the utm_* parameters a student arrives with from www.admitverse.com
 * reach GA4 intact. Losing them would break channel attribution, which is the
 * whole point of sharing the property.
 *
 * Reads the query string from `window.location` rather than `useSearchParams`
 * on purpose: that hook forces every consumer into a Suspense boundary during
 * static rendering, and here it would buy nothing.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;
    trackPageView(pathname, undefined, true);
  }, [pathname]);

  return null;
}
