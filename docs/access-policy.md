# Access policy: the Overview is the only public page

Decided by the owner (G.14): **only the main PEIC Overview page (`/overview`) is publicly accessible.** Every other route, workshop, indicator, detail page, dataset and tool is closed to visitors. There is **no login, signup, registration, account, payment or subscription** flow, and a closed route never redirects to one.

Nothing was deleted. Every closed page, component, chart, calculation, dataset, test and document is still in the repository, and the full navigation, search index and sitemap are kept whole. Only what a visitor can reach changed.

## 1. How it is enforced (one place)

`src/lib/accessPolicy.ts` is the single source of truth. `src/proxy.ts` (Next.js 16's proxy) applies it to **every** request and does nothing else: no Supabase call, no session, no login.

**Default deny.** A request is allowed only if a rule says so; anything new (a page, an API route) is closed until someone adds it on purpose.

| Request | Result |
|---|---|
| `/overview` (a trailing or doubled slash is normalised) | allowed |
| A closed **page** (including `/`, `/home`, `/login`, `/signup`, every workshop and indicator) | `307` redirect to `/overview`. Never to a login page. |
| A closed **API route, file or callback** (`/api/datasets/*`, `/api/comparisons/*`, `/api/subscribers/*`, `/auth/*`, `*.ics`, any file extension) | `404`, body `Not found`, no content |
| Next.js internals and metadata (`/_next/*`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, the icons) | allowed |
| Server-to-server routes (`/api/cron/*`, `/api/admin/*`, `/api/webhooks/*`, `/api/revalidate-fx`) | allowed: each checks its **own secret** (`Bearer CRON_SECRET`, the webhook signature) and answers 401 without it. They must stay reachable or the Vercel crons and GitHub workflows stop. |
| The Overview's own assistant (`/api/assistant`, `/api/assistant/translate`) | allowed: components embedded in the Overview call them from the browser. **Guarded** (section 6): same-origin only, size caps, rate limits, a kill switch. |

Closed responses carry `Cache-Control: no-store`. Malformed or hostile paths (bad encoding, NUL, backslash) are closed. Case is not folded (`/Overview` is not the public page; it redirects to `/overview`). The matcher runs the proxy on all requests except `_next/static`, `_next/image`, the favicon and image-extension files; **API routes are not excluded** (they used to be).

Hiding a link is never the enforcement; the proxy is. Navigation, search, the sitemap and the Overview's links are *filtered views of the same policy* (`isPublicPagePath`, `publicHref`, `isPublicUrl`), so they cannot advertise what the proxy closes.

## 2. What a visitor sees

* **Navigation** (`PUBLIC_APP_NAV` in `src/lib/appNav.ts`, used by the header and the mobile drawer): the Overview, with its "On this page" sections. The complete registry (`APP_NAV`, `INDICATOR_GROUPS`, ...) is unchanged.
* **Search** (`PUBLIC_SEARCH_INDEX` in `GlobalSearch.tsx`): the Overview's own sections only (Markets, Pakistan snapshot, Headlines, Upcoming releases, Macro intelligence, Pakistan indicators), found by the topics they carry. The complete `SEARCH_INDEX` is unchanged. The placeholder text no longer suggests Budget or GDP.
* **Sitemap**: `/sitemap.xml` lists only `https://www.pakeconintel.com/overview`. The complete list is kept as `fullSitemap()` in `src/app/sitemap.ts`. `robots.txt` is unchanged (it does not block crawlers, so they can see the redirects and drop old URLs).
* **The Overview page**: all data (markets, news, snapshot, headlines, releases, macro brief, indicators table) is unchanged. Links to closed pages are removed on the server (a closed page's address is not even sent to the browser); the navigation-only sections (Explore, Provincial budgets, Popular insights) and the "All indicators", "Calendar" and "Full analysis" links are not rendered. The components remain in the repository.
* **No account UI**: `ACCOUNT_UI_ENABLED = false` hides the Log in button, the account menu, the drawer's Log in / Sign up and the mobile "Create Free Account" prompt. The account code is kept.
* **Skip link**: the header's "Skip to main content" focuses `<main>` (it always did, via script). Its `#main-content` fragment target now also exists on the Overview (the no-script fallback).

## 3. Route inventory (generated from `src/app`)

129 routes: **107 pages** and **22 route handlers**.

**Public page (1):** `/overview`.

**Closed pages (106), all redirect to `/overview`:** `/` and `/home` (the marketing landing page), `/about`, `/contact`, `/methodology`, `/site-map`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/settings/preferences`, `/subscriptions`, `/admin` (2 pages); the indicators (`/pakistan-bond-yields`, `/pakistan-interest-rate`, `/inflation-rate-pakistan`, `/pakistan-core-inflation`, `/pakistan-food-inflation`, `/pakistan-wholesale-inflation`, `/weekly-inflation-pakistan`, `/spi-index-pakistan`, `/pakistan-fiscal-deficit`, `/gdp-growth-pakistan`, `/usd-pkr-exchange-rate`, `/eur-to-pkr-exchange-rate`, `/gbp-to-pkr-exchange-rate`, `/sar-to-pkr-exchange-rate`, `/pakistan-real-effective-exchange-rate`, `/foreign-exchange-reserves-pakistan`, `/pakistan-bank-reserves`, `/current-account-deficit-pakistan`, `/pakistan-trade-deficit`, `/pakistan-exports`, `/pakistan-imports`, `/pakistan-remittances`, `/fdi-in-pakistan`, `/pakistan-external-debt`, `/pakistan-money-supply`, `/pakistan-private-credit-growth`, `/pakistan-lsm-growth`, `/pakistan-stock-market`, `/gold-price-pakistan`, `/silver-price-pakistan`, `/brent-crude-oil-price`, `/wti-crude-oil-price`, `/natural-gas-price`, `/us-dollar-index`, `/us-10-year-treasury-yield`, `/fed-funds-rate`, `/pakistan-economic-indicators`, `/pakistan-economic-dashboard`); the workshops and tools (`/gdp-breakdown-workshop`, `/macro-intelligence`, `/download-datasets`); `/budget` and its 3 further pages (category pages, the two explainers), `/provincial-budget` (+ 2 more family pages), `/comparisons` (+ 2), `/economic-calendar` (+ 3), `/academy` (6), `/workshop` (3), `/decision-support-lab` (28).

**Route handlers (22):**

* Open (14), each secret-protected or Overview-embedded: `/api/cron/{global-markets-freshness, macro-intelligence-snapshot, process-notification-jobs, sbp-ingestion-watchdog, sync-economic-calendar, weekly-intelligence}`, `/api/admin/{diagnostics, global-markets-freshness, health, sbp-freshness}`, `/api/revalidate-fx`, `/api/webhooks/resend`, `/api/assistant`, `/api/assistant/translate`.
* Closed (8) with a 404: `/api/datasets/[id]`, `/api/comparisons/series`, `/api/subscribers/{subscribe, unsubscribe, verify}`, `/auth/callback`, `/economic-calendar/feed.ics`, `/economic-calendar/event/[slug]/ics`.

`src/lib/accessPolicy.test.ts` re-derives this inventory from the filesystem on every run and asserts it, so a new route fails the tests until it is classified.

## 4. Reopening a section later

1. Add the path(s) to `PUBLIC_PAGE_PATHS` in `accessPolicy.ts` (the public navigation, search, sitemap and Overview links then follow automatically through the filters).
2. If the section needs sign-in again, restore the old behaviour in `src/proxy.ts` (it delegated to `src/lib/supabase/proxy.ts`, which is kept unchanged, and `src/lib/protectedSections.ts`), and set `ACCOUNT_UI_ENABLED = true`.
3. Re-add the Overview's navigation-only sections by making `offersMoreThanOverview()` true (it is true as soon as more than one path is public); review their link lists first, since they still name every destination.
4. Each closed page's own `#main-content` target is missing, as it was before; add it when reopening if wanted.

## 5. The root route

`/` is **not** a public page. It redirects (307) to `/overview` like every other closed page; the marketing landing page is not restored as a second public page (owner decision, G.15).

## 6. The assistant endpoints (G.15)

The Overview embeds an AI assistant and a Roman Urdu translator. Both are anonymous (there is no login), call a paid model chain (OpenRouter free models, a billed Groq backstop) and a Tavily search, so they are the only open endpoints that spend money for a visitor. Before G.15 they had no size limit, no rate limit, no origin check, and trusted the client-sent dashboard context and chat history verbatim (roles included) inside the system prompt. The safeguards live in `src/lib/assistantGuard.ts` and are applied in both route handlers:

| Safeguard | Behaviour |
|---|---|
| Same-origin only | `Sec-Fetch-Site: same-origin`, or an `Origin` equal to the request host. Anything else: 403. Stops other websites and cross-site browser use; a script that forges headers is stopped by the limits below, not by this. |
| Kill switch | `ASSISTANT_DISABLED=1` turns both paid endpoints off (503) without touching the rest of the Overview. Read on every request. |
| Validation and size | Body at most 24 KB (413), valid JSON (400), message 1 to 600 characters, translate text at most 3,000 characters, history at most 6 turns of 1,000 characters, **user and assistant roles only** (a forged `system` turn is dropped). |
| Context sanitising | The dashboard snapshot is rebuilt field by field: unknown keys dropped, numbers clamped, every string one capped line (no line breaks that could imitate a prompt section). A missing or malformed context no longer crashes the route. |
| Rate limits | Per client address (first `x-forwarded-for` hop): assistant 12 per 10 minutes and 60 per day; translate 24 per 10 minutes and 120 per day. 429 with `Retry-After`. |
| In-flight cap and hourly budget | At most 4 paid calls in flight per endpoint (503 `busy`), and 240 paid calls per hour per server instance across both endpoints (503). |
| Free paths stay free | A knowledge-base answer and a cached translation cost nothing and are never counted. |
| Bounded memory | At most 5,000 tracked client addresses; at most 300 remembered translations (the shared cache itself is unbounded). |
| Safe errors | Any unexpected error returns a generic 500 with no internals; the detail goes only to the server log. Every refusal keeps the response shape the chat and the tooltips already read, so the UI shows a sentence, never "undefined". |

**What this is not.** The counters live in the server process. Vercel can run several instances, so the real ceiling is the per-instance budget times the number of instances. It raises the cost of abuse and bounds a single instance; **it is not a hard global spending cap.** A hard cap must be set at the providers (OpenRouter, Groq and Tavily key limits) and, optionally, as a platform rate-limit rule. If a hard guarantee is required before release, set `ASSISTANT_DISABLED=1`.

## 7. Known limits

* Verified against the production build served locally (`next start`, under an isolated dead-credential environment, see below), not on Vercel. On Vercel the proxy runs in front of the CDN cache, so a prerendered page is still redirected, but that has not been observed there.
* A visitor who already holds an old session cookie is treated like anyone else: the proxy no longer reads cookies.
* The assistant endpoints are open because the Overview calls them, and stay anonymous (no login). They are now guarded (section 6), but the limits are per server instance, not a hard global spending cap; set provider-side limits, or `ASSISTANT_DISABLED=1`.
* Static JavaScript chunks under `/_next/static/` are served to anyone who knows an exact (hashed, not enumerable) file name, including chunks of closed pages. They contain code, not page data, and cannot be closed without breaking the Overview's own scripts.
* Subscription links already sent by email (`/api/subscribers/verify|unsubscribe`) now return 404.
* The pages are still built (360 static pages) and still cost build time; closing them does not remove them from the build.
* Search engines that indexed the closed URLs will see a temporary redirect, and may keep the old URLs for a while.
* The About, Contact and Methodology pages are closed with everything else (there are no separate privacy or terms pages).

## 8. Running the app locally: a database caution

Rendering pages calls one write path of the app's own: `src/lib/marketFallbackSnapshot.ts` upserts a rolling "last known good" quote per market symbol (the `market_fallback_snapshots` table, one row per symbol) through the `upsert_market_fallback_snapshot` RPC whenever a live quote is fetched. That happens in `next build`, `next start` and `next dev`, with whatever Supabase the environment points at. This project has a single Supabase instance and no staging, so a local run with the real `.env.local` writes to production. To verify locally without touching it, run under an isolated environment: `isolatedChildEnv()` in `src/lib/testUtils/productionIsolation.ts` builds one (dead credentials, a loopback database URL) and fails closed. Everything then renders from static fallbacks.
