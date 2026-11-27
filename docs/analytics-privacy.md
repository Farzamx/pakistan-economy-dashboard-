# Google Analytics: URL privacy fix and verification

Stage 2 remediation A, 27 Nov 2026, branch `feat/seo-growth-engine`.

## The problem

GA4 records the full page URL (`page_location`, wire parameter `dl`) and the full referrer (`page_referrer`, `dr`). Some PEIC URLs carry secrets:

| URL | What it carries |
|---|---|
| `/subscriptions/manage?token=…` | the e-mail unsubscribe token (link in every alert e-mail) |
| `/login?redirect=%2Fsubscriptions%2Fmanage%3Ftoken%3D…` | the same token, after a guest follows the link and is sent to sign in |
| `/auth/callback?code=…`, `/reset-password` flows | sign-in and recovery codes or messages |
| any page with `?utm_…` | campaign tags (not secret, but removed too, see below) |

Before the fix, `@next/third-parties`' `GoogleAnalytics` ran a plain `gtag('config', id)`, which sends an automatic page view with the full URL. GA loads on every route except `/`, `/home`, `/about`, `/contact` and `/methodology`, including `/login` and `/subscriptions/manage`.

## The fix

GA may learn the **origin and path** of a page, nothing else. There are three layers, all in `src/lib/analytics/pageLocation.ts` and `src/components/PrivacyGoogleAnalytics.tsx`:

1. **Our own page views.** The inline bootstrap runs before gtag.js and does the following:
   - It sets `page_location = location.origin + location.pathname`.
   - It sets `page_referrer` to the referrer's origin + path.
   - It sends `gtag('config', id, { send_page_view: false, … })`, so GA's automatic full-URL page view is off.
   - It sends the first page view itself.
   - On client-side navigation, `PrivacyGoogleAnalytics` sends the next page view with the same sanitised fields.
   - The code never reads `location.href`, `location.search` or `location.hash` for GA, and never uses `useSearchParams`.
2. **Custom events** (`src/lib/analytics/events.ts`):
   - Parameters are allow-listed per event.
   - Every `*_path` parameter is cut at its first `?` or `#`.
3. **The wire-level guard** (`GA_TRANSPORT_FILTER`, the first thing the bootstrap runs).
   - **Why it is needed.** Layer 1 is not enough on its own. The Production GA property has enhanced measurement's **"Page changes based on browser history events"** switched on. On every `pushState`/`replaceState`, gtag.js then sends its own page view, reading the full URL and the previous full URL itself.
     - **Seen in a browser** against the Production container, with every hit aborted: `dl=/overview?token=…`, `dr=/overview?utm_source=…&token=…`.
     - **Documented by Google:** these history page views are sent regardless of `send_page_view`. Only the property setting turns them off.
   - **How it works.** The guard wraps the four transports gtag.js uses (`sendBeacon`, `fetch`, `XMLHttpRequest`, image `src`). For Google collection requests only (host google-analytics.com, analytics.google.com, google.com or doubleclick.net, with a path ending in `/collect`), it cuts `dl`, `dr` and any value that is a URL on this site at its first `?` or `#`. This applies to the URL and to batched POST bodies.
   - **What it leaves alone.** Every other request passes through untouched.
   - **Failure behaviour.** A collection request whose body can't be read synchronously is dropped, not sent unchecked. Any error inside the guard leaves the page working.

Campaign `utm_*` parameters are removed as well. An allow-list of "safe" parameters would be one edit away from leaking a secret one. Organic-search attribution uses the referrer's origin, which is kept.

### Owner action (recommended)

In **GA4 Admin → Data streams → (web stream) → Enhanced measurement → Page views → Show advanced settings**, turn **off** "Page changes based on browser history events".
- **Why:** PEIC already sends a page view on every in-app navigation. With the setting on, a navigation that changes only the query string or hash is counted twice (the duplicate is now sanitised, but still a duplicate).
- **What it adds:** the setting is a second, independent layer of protection.

Leave **"Site search"** as it is: no PEIC URL uses its default query parameters (`q`, `s`, `search`, `query`, `keyword`) for anything sensitive.

## Tests

| Test | What it proves |
|---|---|
| `src/lib/analytics/pageLocation.test.ts` (unit) | URL helpers; the bootstrap rejects non-GA4 IDs; the bootstrap never reads the full URL; run in a sandbox with a token in the URL and referrer, GA's queue holds no token, `?` or `#`; `*_path` event parameters are cut; the guard cleans `dl`/`dr`/own-site URLs on all four transports (URL and batched body), covers all four Google hosts, drops unreadable bodies and leaves every other request byte-identical; only `PrivacyGoogleAnalytics.tsx` loads GA |
| `scratchpad ga_privacy.mjs` (browser, isolated build, fake ID `G-PEICE2ETEST`, all hits aborted): 14 checks | guest opening the unsubscribe link (redirected to `/login?redirect=…token…`); landing with `?utm_source&token#frag`, then client navigation; `pushState` adding `?token=`; signed-in member opening `/subscriptions/manage?token=…`. The dataLayer and every captured hit (`dl`, `dr`, batched bodies) contain no token, query or fragment. Page views still flow, with sanitised referrers |
| `scratchpad ga_realcontainer.mjs` (browser, the **Production property's public container**, every hit aborted) | `pushState` with a token, `replaceState` with a query, a link click, a hash change. **Before the guard: LEAK.** After: **no token, query or fragment in any request**, and 6 page-view requests still sent (and aborted) |

All of these pass. Aborted means the request was recorded and then stopped in the browser, so nothing was sent to any GA property.

## How to check it yourself in GA4 DebugView (after a release)

1. In Chrome, install Google's **Tag Assistant** extension, or open the page with `?debug_mode=true`. The page ignores that parameter, but Tag Assistant can also enable debug mode for you.
2. In GA4, open **Admin → DebugView**, and select the device that appears.
3. Open `https://www.pakeconintel.com/subscriptions/manage?token=TEST123#x` in that browser. A guest is sent to `/login?redirect=…`.
4. In DebugView, click the `page_view` event and check its parameters:
   - `page_location` must be `https://www.pakeconintel.com/login`;
   - `page_referrer` must be empty or origin + path;
   - no value should contain `TEST123`, `token` or `redirect`.
5. Click any in-app link: the next `page_view` should show the new path, and the previous path as the referrer.
6. Optional, for the network itself: open DevTools → Network, filter `collect`, and check the `dl` and `dr` parameters of each request, including the POST payload. They must be origin + path only.

Because GA processes hits asynchronously, DebugView can take a few seconds to show them, and gtag batches hits sent within about 5 seconds of each other.

## Limits

- The guard filters **this site's own URLs** and the `dl`/`dr` fields. A third-party URL put into an event value is not cut. That is deliberate, so outbound-click `link_url` stays useful, and PEIC sends no third-party URLs carrying secrets.
- The guard relies on gtag.js using one of the four wrapped transports. The browser test confirms that today's gtag.js does. If Google introduces a new transport, the unit tests won't notice, but the browser check (`e2e/guest-auth/gaPrivacy.mjs` with `PEIC_E2E_GA_CONTAINER_ID`) would. **Re-run it after any major gtag change** and keep the admin setting off.
- GA still learns that a session visited `/subscriptions/manage` or `/login`, and the page title. Neither identifies the subscriber.
