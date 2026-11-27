# Stage 2: final independent release-readiness audit

Audit date: 27 Nov 2026. A strictly read-only audit of branch `feat/seo-growth-engine`. This report is the only file the audit creates; it is not staged or committed.

Classification used throughout:

| Label | Meaning |
|---|---|
| **VERIFIED** | Checked directly in this audit, from source code, committed files or tests run now |
| **REPORTED** | Supported only by an earlier report or run in this session, not repeated now |
| **INFERRED** | Reasoned from verified facts, not observed directly |
| **UNVERIFIED** | Not checked by anyone |
| **BLOCKER** | Must be resolved before release |

## 1. Executive verdict: **CONDITIONAL GO**

No blocker was found in the Stage 2 changes:
- the access-policy change is narrow, exact-path and server-enforced;
- the sitemap, canonicals and redirects behave as intended;
- the government-debt data recomputes exactly from the committed sources;
- the one failing test is a Windows line-ending artifact in an unchanged file.

The conditions in section 14 (the owner checks the real Preview, and accepts or addresses a pre-existing database-write side effect that Stage 2 makes reachable more often) should be met before Production. Separately, a pre-existing analytics privacy issue (an unsubscribe token reaching Google Analytics) should be fixed soon, whether or not Stage 2 ships.

## 2. Release baseline

| Item | Value | Status |
|---|---|---|
| Current branch | `feat/seo-growth-engine` | VERIFIED |
| HEAD | `83233aa3bf49dab78e0a30d541ab042998bf6514` | VERIFIED |
| `origin/feat/seo-growth-engine` | `83233aa…` (same as HEAD) | VERIFIED |
| `main` = `origin/main` | `83b5d5038ffc95e3f8942cd93482e0ce267a69e5` | VERIFIED |
| Merge base | `83b5d50` (the branch contains the latest `main`; a fast-forward is possible) | VERIFIED |
| Commits on the branch | `bda4a06` (Stage 1 audit doc), `83233aa` (Stage 2) | VERIFIED |
| Diff vs `main` | 64 files, +5,175 / −428 | VERIFIED |
| Working tree before the audit | clean: no staged, unstaged or untracked files | VERIFIED |
| Stashes | `stash@{0}` 736eb74, `stash@{1}` 67b56fe, `stash@{2}` f681845 | VERIFIED |
| Vercel Preview | GitHub deployment 8110370727, environment "Preview", **sha `83233aa3…`**, created 2026-11-27 12:58:46Z, status success, URL `pakistan-economy-dashboard-3tqsz5cra-farzam-arif-s-projects.vercel.app` | REPORTED (deployment record saved during the earlier poll; no new request made in this audit) |
| Preview commit = HEAD | The deployment record names `83233aa…`. The push reflog shows the branch updated at 12:56:28Z, two minutes before the deployment was created. | VERIFIED (record vs reflog) |

**Unrelated work.** Every changed file belongs to Stage 2 (SEO, access list, debt data, analytics, related tests and docs).
- No changes to `package.json`, the lockfile, `supabase/`, `.github/`, `vercel.json`, `src/proxy.ts`, `src/lib/supabase/*`, `public/research-datasets/` or the interest-rate datasets.
- Two Decision Lab buttons gained only `data-track` attributes.

VERIFIED.

## 3. Scope

In scope:
- the access policy;
- SEO surfaces;
- the government-debt dataset;
- database side effects;
- analytics and privacy;
- deployment and performance evidence;
- tests.

Out of scope (restricted):
- running against any real database;
- external requests;
- building again (a build fetches live data from external providers);
- checking the real Preview, which is behind Vercel SSO.

## 4. What was directly verified (this audit)

- **Route classification** (section 7), computed from `decideAccess()` over every `page.tsx` and route handler.
- **Sitemap and robots** generated from source (section 8).
- **Government-debt recomputation** (section 9), done independently in Python with pymupdf and a CSV reader, using none of the repository's parsers.
- **Root cause of the `migrationGrants` failure** (section 13).
- **Static safety of the diff:**
  - no new runtime `process.env` reads (the only one is the offline fetch script's EasyData key);
  - the new pages import no database or provider module;
  - no dependency, schema, workflow or Vercel configuration changes.
- **Database write paths** in code (section 11).
- **Analytics code paths** (section 10).
- **Tests:** the full suite was run now (3,465 of 3,466 pass), plus the relevant files individually (section 13).
- **Source of the earlier isolated build vs HEAD** (section 12).

## 5. Supported only by earlier reports (REPORTED)

From the isolated build run in this session before the final commit:

- **573 HTTP checks, 0 failed.** For each of the 41 sitemap URLs:
  - 200 for a guest and for a Googlebot user agent;
  - the same title, canonical and H1 for both;
  - text length within 200 characters;
  - canonical equals the URL;
  - exactly one H1;
  - indexable;
  - title and description present and unique;
  - `og:url` present;
  - JSON-LD parses, with no rating or review markup;
  - no secret-looking strings.

  Also covered:
  - 14 members-only paths answered both agents with 307 to `/login?redirect=`;
  - two download paths answered 401;
  - four redirect cases answered a single 301 to the right destination, query kept;
  - `/login` and `/signup` carry `noindex`;
  - `robots.txt` content.
- **Browser pass:**
  - 9 pages × (desktop light, desktop dark, mobile dark): 200, no page errors, no horizontal overflow;
  - the debt CSV downloaded with its source header;
  - screenshots reviewed.
- **Production build** compiled; the three new pages were prerendered (`○`); 230 of 230 static pages generated.
- **Lint at the `main` baseline:** 5 errors and 20 warnings, all in untouched files.

**Limits of that evidence:**
- **Not the final source.** The isolated build was made from source that differs from HEAD only in display text on the three new pages (section 12).
- **A mock, not real Supabase.** It ran with dead credentials and a loopback mock database, so pages showed their fallbacks.
- **Googlebot equivalence was approximate.** It was measured by title, canonical and H1 equality plus text length, not byte-for-byte.
- **Not the real Preview.** No check ran against the Vercel Preview itself.

## 6. Not verified by anyone (UNVERIFIED)

- **Not tested against the real Preview:**
  - Vercel's runtime behaviour: middleware or proxy in Vercel's runtime, redirects, headers and caching;
  - the Preview's environment variables, including which Supabase project it uses.
- **Signed-in member behaviour** on the new and newly public pages in a real browser. The unit-level proxy tests with mocked Supabase do cover it.
- **Analytics events at runtime.** GA was disabled in the isolated build (`NEXT_PUBLIC_GA_MEASUREMENT_ID=""`), so `AnalyticsListener` never ran in any browser test.
- **Performance:** Lighthouse, Core Web Vitals and real-device performance were not measured.
- **The Ministry of Finance's actual GDP denominator.** The review does not publish it; see section 9.
- Search Console status and indexing.

## 7. Public route and authentication results

| Check | Result | Status |
|---|---|---|
| Pages: total / public / sign-in / members-only | 107 / **42** / 4 / **61** | VERIFIED |
| Public = `PUBLIC_PAGE_PATHS` (3: `/`, `/home`, `/overview`) + `PUBLIC_CONTENT_PATHS` (39) | yes | VERIFIED |
| Every allow-list entry is an existing page | yes, none dangling | VERIFIED |
| Allow-list matches the approved scope | yes: indicator, market-data, government-debt and site-map pages. Comparisons, budget explainers, About and Methodology were left members-only (documented). | VERIFIED |
| No dynamic route is public | yes | VERIFIED |
| Exact paths only | `/pakistan-kibor-rates/x` → members; `/pakistan-kibor-rates.json` → members (api); `/Overview` → members | VERIFIED |
| Future pages default to members-only | `/a-future-page` → members | VERIFIED |
| Normalisation | `//pakistan-kibor-rates` and `/%70akistan-kibor-rates` → public (they normalise to the same page, so nothing extra opens) | VERIFIED |
| Downloads | `/api/datasets/*` and `/research-datasets/*` → members, answered 401. The proxy matcher includes `.csv`, `.pdf` and `.xlsx`; only images and Next static assets bypass it. | VERIFIED (code); 401 at runtime REPORTED |
| Route handlers open without a session | 17, identical rule set to `main`: crons, admin health with its own secret, assistant, e-mail links, auth callback, webhook. Stage 2 changed only the page list (diff inspected). | VERIFIED |
| Enforcement is server-side | `src/proxy.ts` calls `decideAccess()` on every request before rendering. Unchanged by Stage 2. | VERIFIED |
| No crawler or user-agent rule | none in the policy or proxy; a test enforces this | VERIFIED |
| `robots.txt` as a boundary | It is **not** a security boundary. `/api/` is protected by the proxy, not by robots. | VERIFIED |
| Member behaviour | Proxy unit tests with mocked Supabase pass (members open protected pages and data routes; session refreshed on open pages) | VERIFIED (unit level); real browser UNVERIFIED |

**About the 573 checks:** these come from `seo_http.mjs`, a scratchpad script (not in the repo), run against `next start` of the isolated build. The test count shows coverage breadth, not Vercel behaviour.

## 8. SEO results

| Check | Result | Status |
|---|---|---|
| Sitemap inventory | 41 URLs: `/`, `/overview` and the 39 allow-list paths. No `lastModified` on any entry. | VERIFIED (generated from source) |
| `/home` vs `/` | `/home` is public, its canonical is `https://www.pakeconintel.com`, and it is excluded from the sitemap | VERIFIED |
| Redirect sources in the sitemap | 0 | VERIFIED |
| Redirects | `/pakistan-economic-indicators` → `/overview`, `/pakistan-economic-dashboard` → `/overview`, `/spi-index-pakistan` → `/weekly-inflation-pakistan`. All are `statusCode: 301`, destinations never redirect, destinations are public, and the old page files are deleted. | VERIFIED (config and tests); single hop at runtime REPORTED |
| Canonicals | The root layout sets none. Every public page sets an absolute canonical on `https://www.pakeconintel.com` (source pattern checked by test). | VERIFIED |
| Titles, descriptions, H1 | Titles unique (test) | VERIFIED |
| | Descriptions unique; one H1 per page | REPORTED |
| `robots.txt` | `Allow: /`, `Disallow: /api/ /auth/`, sitemap URL. Sign-in pages are deliberately not disallowed, so their `noindex` is seen. | VERIFIED |
| Structured data | `FAQPage` and `BreadcrumbList` (both visible on the page); `Dataset` on the three new pages; no ratings, reviews or dates | VERIFIED (code); parse REPORTED |
| Internal links | No related link targets a redirected URL (test). Links to members-only pages carry `rel="nofollow"` and a "members" label (code). | VERIFIED |
| Navigation | Indicator menu items are public, except two budget explainer links that stay members-only and use the sign-in dialog | VERIFIED (test) |
| Content depth | 26 of the newly public pages are still on the generic template, now with a data panel and table. They were not individually upgraded and are about 300–500 words. | INFERRED (thin-content risk, not a blocker) |

## 9. Government debt recomputation (independent, local files only)

| Check | Result | Status |
|---|---|---|
| Fingerprints | 3 of 3 match the manifest (EasyData CSV, SBP `Summary.pdf`, MoF review) | VERIFIED |
| Series | 27 in the extract; 0 observations whose value disagrees with its status | VERIFIED |
| Coverage | 67 quarter-ends, 30 Jun 2009 – 30 Sep 2026. Every stock series covers the same dates. | VERIFIED |
| Missing observations | 30 Sep 2009, 31 Dec 2009 and 31 Mar 2010 are absent in SBP's dataset; not filled. The page and the validation report disclose them. | VERIFIED |
| Gross public debt = domestic + external + IMF | 67 of 67 quarters. Max abs difference **0.10 bn**; 17 quarters above 0.05; none above 0.15 (build tolerance 0.151). Cause: one-decimal storage in older quarters. | VERIFIED |
| FRDLA debt = gross − government deposits | 67 of 67. Max **0.10 bn**; 18 above 0.05; none above 0.15 (build tolerance 0.101). | VERIFIED |
| Published ratios (5 ratios × 18 June ends = 90) | All reproduced from stock ÷ GDP. Max abs difference **0.0497 pp** (domestic % of GDP, FY09); tolerance 0.06. Ratios exist only at June ends. | VERIFIED |
| SBP `Summary.pdf` vs EasyData | 40 values (6 rows × 5 quarters, deposits × 5, 5 FY26 ratios): **0 mismatches** at the PDF's precision. Flags R R R R P (Sep 2026 provisional). | VERIFIED |
| MoF FY26 | Total 86,715 bn; domestic 59,441; external (incl. IMF) 27,274; ratio 68.3%; FRDLA 77,168 bn (60.8%) | VERIFIED (parsed independently) |
| FY26 SBP vs MoF ratio | SBP 68.59%; MoF 68.3% | VERIFIED |
| Why they differ | MoF stock ÷ SBP GDP = **68.63%**, about SBP's figure, so the stock gap (47.6 bn, 0.05%) explains under 0.05 pp. The MoF's implied GDP is 86,715 ÷ 0.683 ≈ **126,962 bn**, between 126,776 and 127,148 allowing for the ratio's rounding, against SBP's 126,360 bn. So the gap comes from the **GDP denominator**. | INFERRED (the MoF does not publish its denominator in the review) |
| Page explanation | The page and FAQ say the gap "comes from the two using different estimates of nominal GDP". This is consistent with the computation above. The validation report states the stock difference and that June 2026 is marked revised by SBP, and does not claim more. | VERIFIED |

## 10. Analytics and consent

### Stage 2 events (`src/lib/analytics/events.ts`, `src/components/AnalyticsListener.tsx`)

**Code status (VERIFIED):**

| Event | Parameters | Path source |
|---|---|---|
| `csv_download` | `file`, `page_path` | |
| `dataset_download` | `dataset`, `page_path` | |
| `chart_interaction` | `chart`, `control`, `option`, `page_path` | |
| `calculator_use` | `calculator` | |
| `calculator_complete` | `calculator`, `action` | |
| `internal_nav` | `block`, `from_path`, `to_path` | |

- Every path parameter uses `location.pathname` or `URL.pathname`, so **no query string or fragment** goes into these events.
- An input's value is read only for radio, checkbox or select controls inside a chart (fixed options). Typed fields, amounts, profile values and results are never sent (test enforces this).
- No `user_id` or other identifier is set.

**Protected account activity:** `calculator_use` and `calculator_complete` fire on members-only Decision Lab pages. `calculator_complete` fires on "Save to snapshot", an account action. They carry only the tool slug and an action label, but GA does learn that a session used the tool. INFERRED.

**Doc accuracy:** the comment on `sanitize()` says it "drops anything that looks like a number a visitor could have typed". In fact it keeps allowed keys as strings and drops all other keys. The protection comes from the key allow-list, not numeric detection. VERIFIED (minor; the comment overstates).

**Runtime behaviour:** UNVERIFIED. GA was disabled in every browser test.

### Pre-existing privacy issue (not introduced by Stage 2)

- GA loads on every route except `/`, `/home`, `/about`, `/contact` and `/methodology` (`ConditionalAppChrome.tsx`). This includes `/login` and `/subscriptions/manage`. VERIFIED.
- The unsubscribe link is `/subscriptions/manage?token=<unsubscribe_token>` (`api/subscribers/verify/route.ts`), and that page is members-only. VERIFIED.
- A guest is therefore redirected to `/login?redirect=%2Fsubscriptions%2Fmanage%3Ftoken%3D…`. A member lands on the page with `?token=` in the URL. VERIFIED.
- GA4's automatic page view reports the full page URL, including the query string. So the **unsubscribe token is very likely sent to Google Analytics**. INFERRED (standard GA4 behaviour; not observed at runtime).
- This was the case on `main` before Stage 2.

### Consent

- No consent banner, no Consent Mode defaults and no privacy-policy page exist in the code base. GA loads unconditionally when the measurement ID is set. VERIFIED.
- **Recommendations (not implemented):**
  1. Strip query strings from GA page views (set `page_location` without the query) or exclude token-bearing routes. **High priority, independent of Stage 2.**
  2. Publish a privacy notice covering GA, cookies and retention.
  3. If visitors from the EEA, UK or Switzerland are expected, add a consent banner with Google Consent Mode v2: default `denied` for `analytics_storage`, `ad_storage`, `ad_user_data` and `ad_personalization` in those regions, updated on consent. Other regions can default to granted, subject to the owner's legal advice. Applicable law for Pakistan-based visitors was not assessed.

## 11. Database side-effect assessment

### Reads, writes and schema

| Kind | Finding |
|---|---|
| Schema changes | **None.** `supabase/` is unchanged. VERIFIED |
| New database reads | **None** from the three new pages or their modules (static, version-controlled data). The upgraded template pages and `/overview` keep their existing reads. VERIFIED |
| Database writes in code | `src/lib/marketFallbackSnapshot.ts` → RPC `upsert_market_fallback_snapshot`, called by `savePersistedSnapshot()`. VERIFIED |

### Where the write is triggered
- **Callers:** `resolveWithPersistedFallback()` on every successful live fetch, used by `metals.ts`, `fred.ts` and `yfinance.ts` (gold, silver, DXY, WTI, Brent, natural gas and related), and `fxRates.ts` directly (USD, EUR, GBP and SAR to PKR).
- **Rows:** upserts one row per symbol, so the table does not grow.
- **Who can call it:** the RPC is granted to `anon` (migration 0018). This was the G.19 finding.

VERIFIED.

### When it runs
- **Build:** during static generation. Evidence: the isolated build log has **26** `[MarketFallback] upsert failed … mock: not found` lines (brent, dxy, gold, natural-gas, silver, wti, and the 4 FX pairs), i.e. the build **attempted** writes, which the loopback mock refused. VERIFIED (log).
- **Runtime:** on ISR revalidation of pages that call these providers: `/overview` (5 min) and the FX and commodity pages (15 min to 1 day). VERIFIED (build route table).

### Could a build or Preview write to a real database?
- **Isolated builds:** no. Dead credentials and a loopback mock were used; the log shows refused attempts. VERIFIED.
- **Vercel Preview and Production builds:** yes, to whatever Supabase project the environment's `NEXT_PUBLIC_SUPABASE_URL` points at, whenever a live fetch succeeds during the build. Which project the Preview uses is UNVERIFIED. An earlier note says the Preview showed fallbacks for ledger data, which suggests a different project. **This happens on every Vercel build, before and after Stage 2.** INFERRED.

### Effect of Stage 2
- Stage 2 does not add a write path.
- Stage 2 makes the FX and commodity pages (and the rest of the allow-list) reachable by anonymous visitors and crawlers. Before, only members, and `/overview`, could trigger their revalidation.
- **Production revalidation, and therefore these upserts, can happen more often:** up to about once per page per revalidate window, e.g. every 15 minutes for the EUR, GBP and SAR pages.

INFERRED.

### Direct evidence of past writes
None found. Earlier notes (G.15, G.19) say success is silent and no audit trail was inspected.
- Earlier production smoke tests in this session loaded `/overview` as a guest.
- Like any visitor's request, these could have triggered a revalidation, and so a snapshot upsert, in Production.

INFERRED; not observable from here.

**This audit:** made no network requests and no database access. All probes were local; vitest uses scrubbed credentials.

## 12. Deployment and performance limitations

### Isolated build vs HEAD

The isolated build's source copy was diffed against HEAD (CR-insensitive):

| File | Difference |
|---|---|
| `pakistan-kibor-rates/page.tsx`, `pakistan-t-bill-rates/page.tsx` | the "0.00 pp" formatter fix |
| `pakistan-government-debt/page.tsx` | coverage wording and the "lowest reading" sentence |
| `scripts/buildGovernmentDebt.ts` and its report | coverage disclosure wording |
| `next.config.ts` | the harness's own `turbopack.root` line (copy only) |

Data files are identical. **The final text fixes were therefore checked by type-check and unit tests, not in a rebuilt browser run.** VERIFIED.

### Isolated build vs the real Preview
- **Environment:** a mock database and no GA in the isolated build, against the Preview's real environment (unknown).
- **Runtime:** `next start` locally, against Vercel's runtime.
- **Access:** the Preview is behind Vercel SSO, so it was not exercised.

### Server rendering

| Pages | Mode | Status |
|---|---|---|
| Three new pages | Prerendered (`○`) | REPORTED |
| KIBOR and T-bill | Revalidate hourly | VERIFIED (code) |
| Debt page | Static | VERIFIED (code) |

### Page weight (prerendered HTML from the isolated build)

| Page | HTML | Gzipped HTML | RSC payload |
|---|---|---|---|
| Overview | 199 KB | 29 KB | 95 KB |
| KIBOR | 337 KB | 37 KB | 243 KB |
| T-bills | 350 KB | 46 KB | 253 KB |
| Debt | 143 KB | 25 KB | 69 KB |
| **Interest Rate** | **1,417 KB** | **149 KB** | **1,030 KB** |

VERIFIED (file sizes). **The Interest Rate page is heavy, and Stage 2 makes it public and indexable.** It was released on 27 Nov and is not a Stage 2 change.

### Other checks
- **Web performance:** no Lighthouse or Core Web Vitals numbers exist (UNVERIFIED).
- **Secrets, auth, dependencies and environment:** no secret exposure in code (VERIFIED); no API authentication, dependency, schema, environment or Production changes (VERIFIED).

## 13. Test results

**Full suite (run now): 3,465 passed, 1 failed (`migrationGrants`).** VERIFIED.

| Area | File | Result |
|---|---|---|
| Public, protected and download rules; proxy with mocked auth | `src/lib/accessPolicy.test.ts` | 77/77 |
| Navigation, search and sitemap surfaces | `src/lib/accessSurfaces.test.ts` | 23/23 |
| Canonicals, sitemap, redirects, links, nav, analytics allow-list | `src/lib/seoTechnical.test.ts` | 12/12 |
| Navigation registry | `src/lib/appNav.test.ts` | 51/51 |
| Search | `src/components/GlobalSearch.test.ts` | 40/40 |
| Debt pipeline (fingerprints, rebuild = committed, digest, pinned findings, script safety) | `scripts/buildGovernmentDebt.test.ts` | 11/11 |
| Debt parsers | `src/lib/governmentDebt/sources.test.ts` | 12/12 |
| Analysis sentences | `src/lib/seoAnalysis.test.ts` | 4/4 |
| Interest-rate pipeline | `scripts/buildInterestRates.test.ts` | 26/26 |
| Credential-script entry policy | `src/lib/testUtils/isolationPolicy.test.ts` | 10/10 |
| Interest Rate page contract and page data | `pageContract.test.ts`, `policyRatePageData.test.ts` | 28/28, 18/18 |

**Gaps:**
- **Googlebot equivalence and browser/responsive behaviour:** not covered by the repository's tests. REPORTED only, from the isolated run.
- **Analytics:** no runtime test.

### `migrationGrants` failure: root cause established (VERIFIED)

- **The failing case:** the mutation test "the known-table existence check moved after the row-level-security check". Its regex requires a literal `\n` after `end if;` in `supabase/migrations/0054_explicit_privileges.sql`.
- **The file's bytes:** the committed blob is **pure LF (219 LF, 0 CRLF)**. This Windows checkout (`core.autocrlf=true`) converts it to **pure CRLF (219 CRLF)**, so the pattern does not match, the mutant leaves the file unchanged, and the "pattern is stale" assertion fails.
- **Replay on the committed LF content:** the mutant applies, the analyzer detects it, and the control has 0 gaps. The test would pass on an LF checkout such as Linux CI or Vercel.
- **Not from Stage 2:** both the test file and the migration are byte-identical between `main` and HEAD. This agrees with the earlier observation that the same test failed on a clean `main` (`2bee856`) checkout on this machine, which is REPORTED.

## 14. Prioritised blockers and recommendations

**Blockers:** none found.

**Conditions before approving Production:**
1. **The owner checks the real Preview** in a private window, signed out:
   - one new page loads, e.g. `/pakistan-government-debt`;
   - a members page, e.g. `/decision-support-lab`, redirects to login;
   - `/api/datasets/sbp-policy-rate` refuses the request;
   - one redirect, e.g. `/spi-index-pakistan`, lands on the weekly page.

   Then, signed in, open one public page and one members page.
2. **The owner accepts or addresses the market-snapshot write side effect** (section 11). It is pre-existing; Stage 2 lets anonymous traffic trigger it more often in Production. Options:
   - accept it (upserts, bounded by revalidate windows);
   - or move the persistence to a scheduled job;
   - or restrict the RPC (G.19 already flagged anon execute).

**High priority, independent of Stage 2:**

3. **Stop query strings from reaching GA** (the unsubscribe token, section 10).

**Recommended:**

4. **Verify Stage 2 analytics events in GA4 DebugView** on the Preview or after release.
5. **Decide consent:** a privacy notice, and Consent Mode v2 for EEA/UK visitors if relevant.
6. **Reduce the Interest Rate page payload** (1.4 MB HTML / 1 MB RSC) now that it is public.
7. **Strengthen or noindex the 26 thin template pages**, in priority order.
8. **Fix the CRLF fragility** in the `migrationGrants` mutant regex (`\r?\n`), or add `.gitattributes` `eol=lf` for `supabase/migrations/*`. Deferred: no test or source changes were allowed in this audit.
9. **Correct the overstated comment** on `sanitize()`.
10. **After release:** submit the sitemap in Search Console and run Lighthouse on the new pages.

## 15. Final recommendation

**CONDITIONAL GO.**
- The owner can approve merging `feat/seo-growth-engine` (fast-forward to `83233aa`) and deploying to Production once conditions 1 and 2 above are met.
- Recommendation 3 should follow promptly whatever is decided about Stage 2.

The audit itself performed no merge, commit, push or deployment.
