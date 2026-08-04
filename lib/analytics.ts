/**
 * GA4 — the single interface to the tag.
 *
 * This app shares one GA4 property with the marketing site (www.admitverse.com)
 * so a mock start can be attributed back to the channel that produced it. Both
 * hosts are subdomains of one registrable domain, so GA4 shares `client_id` and
 * the session automatically — PROVIDED the `_ga` cookie is written at
 * `.admitverse.com`. That happens on its own with `cookie_domain` left at its
 * default ('auto'), which is why nothing here ever sets it. Do not add a
 * `cookie_domain`, `cookie_prefix` or a second measurement ID: pinning the
 * cookie to `mock.admitverse.com` splits one student into two users and is
 * exactly the failure this module exists to avoid.
 *
 * No link decoration or `_gl` handling is needed — that is for cross-DOMAIN
 * tracking, not cross-subdomain.
 */

export {};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * The marketing site's property. Overridable only to point a preview build at a
 * test property — the default is the real one, and there must never be a second
 * property for this app.
 */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-FTE8M9L51R";

/** Every event name this app sends. Adding one here is the only way to send one. */
type EventName = "page_view" | "mock_start" | "mock_complete" | "mock_signup";

type EventParams = Record<string, string | number | boolean | undefined>;

/**
 * The one call site for gtag. No-ops when the tag hasn't loaded (blocked by an
 * ad blocker, offline, or during SSR) — analytics must never break the app.
 */
function send(name: EventName, params: EventParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  // Undefined params are dropped rather than sent as "undefined" strings.
  const clean: EventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) clean[k] = v;
  }
  window.gtag("event", name, clean);
}

/**
 * A manual page_view. The automatic one is disabled in the tag config, so this
 * is the only source — see GoogleAnalytics.tsx for why.
 *
 * `path` may be a virtual path (e.g. "/app/dashboard"): the post-login screens
 * are React state, not routes, so without virtual paths the whole app would
 * report as a single page view per session.
 *
 * Pass `absolute: true` for a REAL navigation, which sends the browser's actual
 * URL — query string included. That is load-bearing: GA4 reads utm_* campaign
 * parameters off `page_location` on the session's first page_view, so stripping
 * the query string would destroy the very attribution this is being added for.
 */
export function trackPageView(path: string, title?: string, absolute = false) {
  if (typeof window === "undefined") return;
  send("page_view", {
    page_location: absolute ? window.location.href : `${window.location.origin}${path}`,
    page_path: path,
    page_title: title ?? document.title,
  });
}

/** free | premium. */
export type MockAccess = "free" | "premium";

/**
 * Entitlement is not modelled anywhere in the API — `MockTest` carries no
 * pricing or access field and every mock is currently free. This is the single
 * place to change when a paid tier exists, so the event contract stays honest
 * in the meantime rather than guessing per call site.
 */
export function mockAccess(): MockAccess {
  return "free";
}

/** Fired when the paper goes live and the student's clock starts — not when the CTA is clicked. */
export function trackMockStart(params: {
  mock_id: string;
  mock_name: string;
  access: MockAccess;
}) {
  send("mock_start", params);
}

/**
 * Fired on a successful submit.
 *
 * `score` is optional because `POST /attempts/{id}/submit` does not return one —
 * scoring is asynchronous. It is passed through if the backend ever adds it.
 * `completion_rate` is a PERCENTAGE (0–100, one decimal), matching how the app
 * reports accuracy elsewhere.
 */
export function trackMockComplete(params: {
  mock_id: string;
  duration_sec: number;
  completion_rate: number;
  score?: number;
}) {
  send("mock_complete", params);
}

/** Fired once, when a student completes registration (profile creation). */
export function trackMockSignup() {
  send("mock_signup");
}
