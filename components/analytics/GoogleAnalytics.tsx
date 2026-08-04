import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

/**
 * The GA4 tag. Two deliberate choices:
 *
 * 1. `cookie_domain` is NOT set. Its default ('auto') writes `_ga` at the
 *    highest registrable domain — `.admitverse.com` — so www and mock share one
 *    client_id and one session. Setting it to the current host would split one
 *    student into two users across the marketing site and this app.
 *
 * 2. `send_page_view: false`. This is a client-routed app whose post-login
 *    screens are React state rather than routes, so views are sent manually
 *    (PageViewTracker for real navigations, AppShell for in-app screens).
 *    Leaving the automatic page_view on would double-count every landing.
 *
 * `debug_mode` switches itself on off-production hostnames so DebugView works
 * locally without the browser extension. Note that debug traffic still lands in
 * the property — exclude it with a GA4 internal-traffic filter if that matters.
 *
 * There is no consent mechanism in this app today. If one is added, this
 * component must move behind it (or adopt Consent Mode v2 defaults) so the tag
 * never runs before consent.
 */
export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: false,
            debug_mode: location.hostname === 'localhost' ||
                        location.hostname === '127.0.0.1' ||
                        location.hostname.endsWith('.local')
          });
        `}
      </Script>
    </>
  );
}
