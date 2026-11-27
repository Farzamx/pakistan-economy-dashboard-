# PEIC SEO growth engine — Stage 1: audit, keyword map and proposed architecture

Status: **Stage 1 complete; implementation blocked on one owner decision (section 1).** Branch `feat/seo-growth-engine` (from `main` 83b5d50).
Audit date: 27 Nov 2026. Production checked read-only at https://www.pakeconintel.com.

## 1. The finding that decides everything: almost nothing can be indexed

Under the access policy (G.20, `src/lib/accessPolicy.ts`), a signed-out visitor can open only `/`, `/overview` and the sign-in pages. Googlebot is a signed-out visitor.

What Production serves today:

| Check | Result |
|---|---|
| `robots.txt` | `Allow: /` plus the sitemap link. Correct as far as it goes. |
| `sitemap.xml` | **2 URLs**: `/overview` and `/`. The full list (indicators, comparisons, budget and provincial explainers) is built in `fullSitemap()` but deliberately never served. |
| `/pakistan-interest-rate`, `/inflation-rate-pakistan`, `/gdp-growth-pakistan`, … fetched as Googlebot | **307 → `/login?redirect=…`** |
| `site:pakeconintel.com` (web search tool) | No PEIC pages surfaced. The tool's index may be incomplete; Search Console is the authority. |

**Consequence.** These pages are already built and cannot rank because crawlers are sent to the login page:
- 45 indicator pages;
- 16 comparison pages;
- the budget and provincial-budget explainers;
- 26 calculators;
- the new Interest Rates dashboard.

Any new page would be gated too: the policy's default is "login required". Writing 10 more pages without changing this would add no search value.

The brief says not to change authentication, so this needs your decision. The options:

| Option | What changes | SEO effect | Trade-off |
|---|---|---|---|
| **A. Public "learn and latest data" tier (recommended)** | Open an explicit allow-list: indicator pages, educational guides, history pages and a few simple calculators. Workshops, dataset downloads, the Decision Support Lab, the AI assistant, comparisons tools and account features stay members-only. | Everything in this plan becomes indexable. | Guests can read indicator pages. Membership value moves to tools, downloads and analysis. |
| B. Keep everything gated | Nothing | SEO limited to `/` and `/overview`, plus off-site work | No organic growth from content |
| C. "Paywalled content" markup (Googlebot sees content, users see a login wall) | Gating would have to move into the page, with the content hidden client-side, instead of the 307 redirect | Google permits it only with `isAccessibleForFree` markup and identical content | The content is in every page's HTML anyway, so it is effectively public, with more complexity and cloaking risk. **Not recommended.** |

Option A is a change to `accessPolicy.ts`: one explicit list, plus its tests. It's the same mechanism that already opens `/overview`. Nothing about how sign-in works would change.

## 2. Technical audit (what exists)

| Area | Finding |
|---|---|
| Metadata | 57 of 58 top-level pages define their own metadata. Titles checked are unique (no duplicates found). |
| Canonicals | 52 pages set their own canonical. The root layout sets a **default canonical of the home page**, so pages without one inherit it:<br>- `/academy` and `/workshop` would tell Google they duplicate `/`; fix before opening.<br>- Auth pages also inherit it, which is harmless because they are `noindex`. |
| `noindex` | Login, sign-up, password pages, admin, settings, subscriptions and snapshot pages are correctly `noindex`. |
| Structured data | `WebSite` (root); `FAQPage` + `BreadcrumbList` on 16 indicator pages; one each of `Article`, `Dataset`, `DefinedTermSet`. FAQ rich results are now shown by Google mainly for government and health sites, so FAQ markup brings little visual benefit but is harmless when the FAQ is visible. No `Dataset` markup yet on data-rich pages that would qualify. |
| Public pages | `/` and `/overview` each have one H1, a unique title and description, a self canonical and `index, follow`. |
| Sitemap generator | Already built to grow: `sitemap.ts` filters `fullSitemap()` through `isPublicUrl()`. Opening a page in the access policy automatically lists it. |
| Analytics | GA4 loads via `@next/third-parties` when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set (it is in Production). **No custom events** are sent (0 calls): calculator use, downloads and chart interactions are not measured. |
| Search Console | No `google-site-verification` meta tag in code. It may be verified by DNS; the owner must confirm. No performance data is available to me. |

### Content depth and overlap
- **Template pages** (`SeoPageLayout`, 38 pages) carry about 300–500 words of literal copy around one KPI, a chart and an FAQ. That's thin by current standards for competitive queries, and they read alike.
- **Rich pages** are far deeper: Inflation, the Interest Rates dashboard and Bond Yields.
- **Likely overlap (cannibalisation):**
  - `/overview`, `/pakistan-economic-indicators` and `/pakistan-economic-dashboard` are three near-identical "dashboard" pages.
  - `/weekly-inflation-pakistan` and `/spi-index-pakistan` both cover the weekly SPI.
  - Recommendation: one primary URL per intent, the others merged or canonicalised.
- **URL naming is inconsistent**: `inflation-rate-pakistan` vs `pakistan-interest-rate`, `gdp-growth-pakistan` vs `pakistan-money-supply`. Existing URLs should **not** be renamed, since rename churn costs more than it gains. New URLs should follow `pakistan-<topic>`.

## 3. Keyword research (qualitative; no SEO-tool data)

**No search-volume or difficulty figures below are measured.**
- No SEO tool (Search Console, Keyword Planner, Ahrefs/Semrush) was available.
- "Demand" and "competition" are qualitative judgements from what currently ranks (web search, 27 Nov 2026) and from the topic.
- Once Search Console is connected, impressions per query should replace these estimates.

**What ranks today:**
- **Data queries:** official primary documents (SBP and PBS PDFs and old `ecodata` archive pages), Trading Economics, news (Dawn, Profit, Express Tribune, ProPakistani, Business Recorder), bank explainers (Allied Bank for KIBOR), Wikipedia.
- **Calculator queries:** thin third-party sites (`*.pages.dev`, `*.netlify.app`).

**The gap:** the search tool itself could not find current KIBOR, T-bill or reserves figures. The official data is in PDFs and the news is dated. An up-to-date, sourced, well-structured data page is exactly what is missing.

| Priority | Topic / query family | Intent | Demand (qual.) | Competition (qual.) | PEIC fit and data | Existing PEIC page | Recommended URL | Format |
|---|---|---|---|---|---|---|---|---|
| 1 | SBP policy rate, interest rate Pakistan, policy rate history | latest value + history | High | High (SBP, news, TE) | **Strong**: full history 1991–, corridor | `/pakistan-interest-rate` | keep | Rich dashboard (exists) |
| 1 | KIBOR rates today / KIBOR history | latest value + history | High (loan pricing) | Medium (SBP archive pages, banks) | **Strong**: daily 2005–, 7 tenors | none (section of the dashboard) | `/pakistan-kibor-rates` | Data page + explainer |
| 1 | T-bill rates / latest T-bill auction | latest auction | Medium–High | Medium (SBP PDF, news) | **Strong**: every auction 2004–, 1M–12M | `/pakistan-bond-yields` (mixed) | `/pakistan-t-bill-rates` | Data page |
| 1 | Pakistan inflation rate / CPI | latest + history | High | High (PBS, TE, news) | **Strong** | `/inflation-rate-pakistan` | keep | Rich (exists) |
| 1 | Inflation calculator Pakistan / rupee value then vs now | tool | Medium | **Low** (thin sites) | **Strong**: official CPI | gated calculators | `/pakistan-inflation-calculator` | Calculator + method |
| 2 | PIB yields / bond yields Pakistan | latest + curve | Medium | Low–Medium | Strong: auctions | `/pakistan-bond-yields` | keep | Workshop (exists) |
| 2 | USD to PKR / exchange rate | live rate | Very high | **Very high** (banks, Google's own box, forex sites) | Medium: daily | `/usd-pkr-exchange-rate` | keep | Data page; history is the winnable angle |
| 2 | Pakistan foreign exchange reserves | latest weekly | High | Medium (news) | Strong: weekly SBP | `/foreign-exchange-reserves-pakistan` | keep | Data page |
| 2 | Pakistan GDP growth | latest + history | Medium | High (TE, World Bank, PBS) | **Weak**: annual World Bank; no quarterly PBS series | `/gdp-growth-pakistan` | keep | Needs better data first |
| 2 | Pakistan money supply M2 | data | Low–Medium | Low | Strong: SBP weekly/monthly | `/pakistan-money-supply` | keep | Data page |
| 2 | Pakistan fiscal deficit | data | Medium | Medium | Medium: SBP fiscal balance | `/pakistan-fiscal-deficit` | keep | Data page |
| 2 | Pakistan government / public debt, debt-to-GDP | data + definitions | Medium–High | Medium; **sources disagree by definition** | **Not held**: only external debt | `/pakistan-external-debt` (different topic) | `/pakistan-public-debt` | Needs a new official source (MoF Annual Debt Review / SBP debt summary): **approval needed** |
| 3 | What is KIBOR / how T-bill auctions work / what is a PIB / real interest rate | informational | Medium | Medium (Wikipedia, banks, blogs) | Strong: can show live data inside | none | `/learn/<topic>` | Guide with live charts |
| 3 | Loan installment / savings / return calculators | tool | High | High (banks, generic calculators) | Medium: generic maths | gated Decision Lab | open 2–3 that use Pakistani data | Calculator |
| 3 | Interest rate history / inflation history | history | Medium | Medium | Strong | sections of existing pages | anchors first, separate pages only if the query proves distinct | — |

## 4. Proposed architecture and URL map (after Option A)

- **Indicators (public):** keep the existing URLs. Upgrade the thin template pages in priority order, using the Interest Rates and Inflation pages as the model.
- **Markets (public):**
  - `/pakistan-interest-rate` (hub);
  - **new** `/pakistan-kibor-rates` and `/pakistan-t-bill-rates`, each with a focused intent and reusing the validated interest-rate dataset with no new copy of the data;
  - `/pakistan-bond-yields`.
- **Learn (public, new):** `/learn/what-is-kibor`, `/learn/how-t-bill-auctions-work`, `/learn/real-interest-rate`, `/learn/how-sbp-controls-inflation`. Each is written once, with live PEIC charts embedded. Only topics where PEIC can add data go here.
- **Calculators (public subset):** `/pakistan-inflation-calculator`, built from the official CPI series and stating its base and coverage. The others stay in the Decision Lab for members.
- **Members-only (unchanged):** workshops, downloads, Decision Lab, AI assistant, comparisons tools, budget workspaces, calendar.
- **Hubs:**
  - one dashboard URL (`/overview`);
  - `/pakistan-economic-indicators` to become the indicator index, with distinct content, or be canonicalised to `/overview`;
  - `/site-map` (an HTML sitemap) made public.

## 5. First 10 pages, given the data PEIC actually has

| # | Page | URL | Status | Data |
|---|---|---|---|---|
| 1 | Pakistan Inflation Rate | `/inflation-rate-pakistan` | exists (rich) | PBS/SBP CPI |
| 2 | Pakistan Interest Rate | `/pakistan-interest-rate` | exists (rich, released 27 Nov) | SBP fixed datasets |
| 3 | KIBOR Rates in Pakistan | `/pakistan-kibor-rates` | **new** | interest-rate dataset (daily, 2005–) |
| 4 | Pakistan T-Bill Rates | `/pakistan-t-bill-rates` | **new** | SBP auction files (2004–) |
| 5 | Pakistan GDP Growth Rate | `/gdp-growth-pakistan` | exists (thin) | annual World Bank only. **Data gap**: PBS quarterly/annual national accounts would be needed for a strong page |
| 6 | Foreign Exchange Reserves | `/foreign-exchange-reserves-pakistan` | exists (thin) → upgrade | SBP weekly |
| 7 | Exchange Rate | `/usd-pkr-exchange-rate` | exists (thin) → upgrade | SBP/interbank daily |
| 8 | Money Supply M2 | `/pakistan-money-supply` | exists (thin) → upgrade | SBP |
| 9 | Government Debt | `/pakistan-public-debt` | **new, blocked** | **not held**. Needs a new official source and approval for a new dataset |
| 10 | Fiscal Deficit | `/pakistan-fiscal-deficit` | exists (thin) → upgrade | SBP/MoF fiscal operations |

Suggested substitutes if debt data isn't approved: the inflation calculator (#5 priority), or "Pakistan Interest Rate History" as a section anchor rather than a page.

## 6. Reusable template (proposal)

Extend the existing `SeoPageLayout` rather than replacing it. The sections:
1. H1 and lead.
2. Latest value with its observation date and a "provisional / stale" flag.
3. Interactive chart and table.
4. What it is.
5. How it is calculated.
6. Why it matters.
7. Historical context, written from the data with dates.
8. Related indicators, tools and guides.
9. FAQ.
10. Sources, coverage, methodology and limitations.

Pages would get a `Dataset` schema only when they expose a real downloadable or tabular dataset with its source and coverage. The template supplies structure; each page supplies its own analysis, so pages don't read as keyword-generated.

## 7. Measurement plan (needs the owner)

1. **Search Console:** confirm the domain property is verified (DNS or meta) and add the service account or user who will read it. Submit `sitemap.xml` after Option A.
2. **GA4:** add custom events through the existing GoogleAnalytics component, with no new dependency:
   - `calculator_use`;
   - `dataset_download`;
   - `csv_download`;
   - `chart_interaction`;
   - `internal_nav` (from related-links blocks);
   - a `page_category` parameter (indicator / market / learn / calculator).
3. **Reporting:** a Looker Studio board combining GSC (clicks, impressions, CTR, position by page and query) and GA4 (engagement by category). Or an admin page reading the GSC API, which would need a credential, so it needs approval.

## 8. Decisions needed

1. **Option A, B or C** (section 1). Only A makes Stages 2–10 worthwhile.
2. If A: confirm the **public allow-list** (proposed in section 4) and that membership value stays in tools, downloads and analysis.
3. **Government debt data:** approve a new official dataset (MoF Annual Debt Review / SBP debt summary) with the same fixed-file, fingerprinted approach, or drop page #9 for now.
4. **Duplicate hubs:** merge or canonicalise `/pakistan-economic-indicators`, `/pakistan-economic-dashboard` and `/spi-index-pakistan`.
5. **Search Console access:** whether you can share read access, or will run the reporting yourself.
