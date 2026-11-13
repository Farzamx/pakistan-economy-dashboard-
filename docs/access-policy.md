# Access policy: complete navigation for everyone, a sign-in for everything except the Overview

Decided by the owner (G.20), replacing the G.14 "Overview-only" policy:

* **Everyone sees the complete PEIC navigation**, signed in or not: every menu, submenu, dashboard, indicator, workshop (Bond Yields, Budget Tracker, ...), Decision Lab, Datasets, Macro Intelligence and Comparisons link. Nothing is hidden because a visitor is signed out.
* **Open to guests:** the **Overview** (`/overview`), the **marketing landing page** (`/` and its identical alias `/home`) and the **sign-in pages** (`/login`, `/signup`, `/forgot-password`, `/reset-password`).
* **Everything else needs a signed-in account.** A guest who asks for a protected page, by clicking or by typing the address, gets the sign-in experience and, after signing in, lands on the page they asked for.
* **Being signed in is the only entitlement the product has.** There is no paid tier, plan, subscription or role in the code or the database (the two admin pages additionally require a confirmed e-mail and the server-side `ADMIN_USER_ID`, see [authentication.md](authentication.md)). Registering unlocks the members' pages; it does not grant anything beyond what "signed in" meant at commit `04acfd4`.

Nothing was deleted. Every page, component, chart, dataset, test and document is still in the repository.

## 1. How it is enforced (one place)

`src/lib/accessPolicy.ts` is the single source of truth. `src/proxy.ts` (Next.js 16's proxy) applies it to **every** request, before any page renders and before any cache is read, then `src/lib/supabase/proxy.ts` (the original `04acfd4` session code) asks Supabase who the visitor is, **only** for requests that need it.

**Default: login required.** A request is open only if an explicit rule says so; a page or API route added later needs a session until someone opens it on purpose. `accessPolicy.test.ts` enumerates every route under `src/app` and fails on an unclassified one.

| Request | No session (guest) | Valid session (member) |
|---|---|---|
| `/overview`, `/`, `/home` | opens | opens (session cookie refreshed) |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | opens | opens (a signed-in visitor is sent on by the page itself) |
| Any other **page** (every indicator, workshop, tool, `/about`, `/methodology`, `/settings`, `/admin`, ...) | `307` to `/login?redirect=<page and query>`; `no-store`; the body is only the redirect target, **no page content** | opens |
| **Data and file routes** that are not machine routes (`/api/datasets/*`, `/api/comparisons/*`, `/api/subscribers/subscribe`, `/economic-calendar/feed.ics`, `*/ics`, anything with a file extension) | `401` JSON `{"error":"login_required"}`; `no-store` | passes to the route |
| Server-to-server routes (`/api/cron/*`, `/api/admin/*`, `/api/webhooks/*`, `/api/revalidate-fx`) | pass through: each checks **its own secret** (`Bearer CRON_SECRET`, the webhook signature) and answers 401 without it. Vercel crons and GitHub workflows call them, so they must stay reachable | same |
| The Overview's assistant (`/api/assistant`, `/api/assistant/translate`) | pass through: **guarded** (section 6): same-origin only, size caps, rate limits, a kill switch | same |
| Links in e-mails already sent (`/api/subscribers/verify`, `/api/subscribers/unsubscribe`) | pass through: opened by people who may have no account; each needs its own one-time token and answers 400 without it | same |
| `/auth/callback` (the link Supabase e-mails for sign-up confirmation and password reset) | passes through (it creates the session) | same |
| Next.js internals and metadata (`/_next/*`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, the icons) | open | open |
| Malformed or hostile paths (bad encoding, NUL, backslash) | `404` | `404` |

How the session check works: `auth.getUser()` asks the Supabase Auth server to validate the token, so a forged, expired or revoked cookie is a guest, and **if Supabase cannot be reached the gate fails closed** (a protected page stays closed). A request that carries no `sb-…-auth-token` cookie cannot have a session, so it is refused **without calling Supabase**: anonymous traffic cannot be used to hammer the auth server.

Why this keeps protected data out of the response: the proxy runs on the page URL itself, so the HTML, the client-navigation (RSC) payload and a data request are all refused before any of them is produced, and the redirect response contains nothing but its own target. Framework headers (`rsc`, `next-router-prefetch`, `x-nextjs-data`, `x-middleware-subrequest`, ...) and credentials (`Authorization`, API keys, the cron secret) grant a guest nothing; `accessPolicy.test.ts` covers each. The page components are statically generated/ISR (as before), so the check is in the proxy, not in a per-page `cookies()` call that would make every page dynamic.

## 2. What a visitor sees

* **Navigation, search, Overview links:** complete for guests and members. The registry (`src/lib/appNav.ts`) has no access filter and no "consolidation" list: every dashboard, indicator, workshop, explainer and tool has its own entry on desktop and in the mobile drawer, including Core Inflation, Food Inflation, the Fed Funds Rate, Where Does the Tax Money Go? and Debt Servicing vs Defence (restored in G.21). The Overview's tiles, indicator rows, Explore, Provincial budgets and Popular insights link to their pages.
* **Search (`GlobalSearch`)** offers every destination to everyone, built from the navigation registry, `SEO_PAGES` and `src/lib/searchDestinations.ts` (Decision Lab tools, budget categories, comparisons, provincial pages and information pages: labels and addresses only, derived from the registries, kept in step by a test). A guest can find a protected feature; choosing it opens the sign-in dialog, not the page, and a result carries no page data. Results are ranked (exact or leading label first) and the best 8 are shown.
* **A guest clicks a protected item** (header menu, mobile drawer, search result): the existing `GuestAccessModal` opens instead of navigating (`useGuestGate` in `shellHooks.tsx`, which asks `isProtectedPath` → `accessPolicy.ts`). It says plainly that this section is for registered members, **names the section asked for**, and offers **Log in** and **Sign up**, both carrying `?redirect=<destination>`.
* **A guest follows a link inside a page, or types an address:** the proxy sends them to `/login?redirect=<page and query>`, whose notice ("Log in to continue … You asked for: Bond Yields") explains why. `/login` and `/signup` link to each other keeping the destination.
* **After signing in:** the member lands on the page they asked for (query string included). With no destination they land on the Overview.
* **Sign-up with e-mail confirmation:** the destination is remembered in a short-lived httpOnly cookie (`peic_after_auth`, 1 hour) and used by `/auth/callback` once the e-mail link is opened. The e-mail link itself is unchanged (Supabase checks it against its allowed redirect URLs).
* **Account UI** (Log in, Sign up, account menu, "Create Free Account" prompt) is shown as it was at `04acfd4`.
* **Sitemap:** `/sitemap.xml` lists only the open pages (`/` and `/overview`); a crawler can only reach the sign-in page from the others. The complete list is `fullSitemap()` in `src/app/sitemap.ts`. `robots.txt` is unchanged.
* **No navigation entry is removed for any reason** (owner rule, G.21). The earlier G.13 consolidation of the Fed Funds Rate and the budget explainers, and the earlier Core/Food Inflation consolidation, were reversed; their routes, content and SEO entries were never changed.

## 3. The destination is validated (open-redirect guard)

Every place that reads a `redirect` / `next` value that came from a URL or a form passes it through `safeRedirectPath()` (`accessPolicy.ts`): `/login`, `/signup`, the `signIn` / `signUp` server actions and `/auth/callback`. It accepts only a path **on this site** (one leading `/`, no `//host`, no backslash, no control character, no scheme, at most 2,048 characters) and never a sign-in page (that would loop); anything else becomes `/overview`. The single exception is the password-reset e-mail's `next=/reset-password`. This also fixes a weakness that existed at `04acfd4`, where the form value was passed to `redirect()` unchecked.

## 4. Route inventory (generated from `src/app`)

129 routes: **107 pages** and **22 route handlers**.

**Open pages (7):** `/overview`, `/`, `/home`, `/login`, `/signup`, `/forgot-password`, `/reset-password`. **The other 100 pages need a session.**

**Route handlers (22):**
* No session needed (17), each self-authenticating or guarded: `/api/cron/{global-markets-freshness, macro-intelligence-snapshot, process-notification-jobs, sbp-ingestion-watchdog, sync-economic-calendar, weekly-intelligence}`, `/api/admin/{diagnostics, global-markets-freshness, health, sbp-freshness}`, `/api/revalidate-fx`, `/api/webhooks/resend`, `/api/assistant`, `/api/assistant/translate`, `/api/subscribers/{verify, unsubscribe}`, `/auth/callback`.
* Need a session (5), `401` without one: `/api/datasets/[id]`, `/api/comparisons/series`, `/api/subscribers/subscribe`, `/economic-calendar/feed.ics`, `/economic-calendar/event/[slug]/ics`.

## 5. Changing the policy

* **Open another page to everyone:** add its exact path to `PUBLIC_PAGE_PATHS` in `accessPolicy.ts` (it then also appears in the sitemap and stops triggering the sign-in dialog). Nothing else changes.
* **Require a sign-in for an open page:** remove it from that list.
* A new route needs no action to be protected; to leave it open on purpose add it to the matching list in `accessPolicy.ts` and to the expected sets in `accessPolicy.test.ts`.
* **Paid or role-based entitlements do not exist.** If the owner introduces one, it needs a new, separate check; this policy only distinguishes "signed in" from "not".

## 6. The Overview's assistant

`/api/assistant` and `/api/assistant/translate` are open to guests because the Overview and landing page embed them, and they spend money per call (a Tavily search and an AI model chain ending in a billed Groq backstop). They are guarded by `src/lib/assistantGuard.ts` (G.15): same-origin only, body and field caps, user/assistant roles only, sanitised context, per-client and per-instance rate limits, an in-flight cap, a kill switch (`ASSISTANT_DISABLED=1`) and safe errors. **These limits are per server instance, not a global spending cap**; hard limits belong at the providers (see the G.19 report).

## 7. History

* `04acfd4`: a short protected list (Economic Calendar, the Comparisons / Budget / Provincial Budget hubs, the Decision Lab calculators, Settings); everything else public; session refresh in `src/proxy.ts` → `src/lib/supabase/proxy.ts`.
* G.14 (`bece1f2`): only the Overview public, no login anywhere, closed pages redirect to `/overview`, closed APIs answer 404. The account code was kept but switched off.
* **G.20 (this document):** the original session mechanism is back; the list is inverted (login required for everything except the open pages); the navigation is complete for everyone.
