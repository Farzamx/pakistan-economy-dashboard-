# SEO Stage 2: implementation report

Branch `feat/seo-growth-engine` (from `main` 83b5d50).

Scope (owner-approved, 27 Nov 2026):
- Option A, a public allow-list;
- consolidation of the duplicate pages;
- technical SEO fixes;
- a government debt dataset and page;
- the first-release pages.

Not merged, not deployed to Production. The Stage 1 audit is in [seo-stage1-audit.md](seo-stage1-audit.md).

## 1. Access policy

Enforcement stays central (`src/lib/accessPolicy.ts` → `src/proxy.ts`). `PUBLIC_CONTENT_PATHS` is a new explicit list of exact paths: no prefixes, no wildcards, nothing crawler-specific. Every other route keeps the default: login required.

The route inventory below is generated from `decideAccess()` over every `page.tsx`.

### Public pages (42)

| Group | Pages |
|---|---|
| Already public | `/`, `/home` (same page as `/`; canonical `/`), `/overview` |
| HTML site map | `/site-map` |
| Markets and interest rates | `/pakistan-interest-rate`, **`/pakistan-kibor-rates` (new)**, **`/pakistan-t-bill-rates` (new)**, `/pakistan-bond-yields` |
| Public finance | **`/pakistan-government-debt` (new)**, `/pakistan-fiscal-deficit`, `/pakistan-external-debt` |
| Prices | `/inflation-rate-pakistan`, `/pakistan-core-inflation`, `/pakistan-food-inflation`, `/pakistan-wholesale-inflation`, `/weekly-inflation-pakistan` |
| Growth, money, credit | `/gdp-growth-pakistan`, `/pakistan-lsm-growth`, `/pakistan-money-supply`, `/pakistan-private-credit-growth`, `/pakistan-bank-reserves` |
| External sector | `/foreign-exchange-reserves-pakistan`, `/current-account-deficit-pakistan`, `/pakistan-trade-deficit`, `/pakistan-exports`, `/pakistan-imports`, `/pakistan-remittances`, `/fdi-in-pakistan` |
| Exchange rates | `/usd-pkr-exchange-rate`, `/eur-to-pkr-exchange-rate`, `/gbp-to-pkr-exchange-rate`, `/sar-to-pkr-exchange-rate`, `/pakistan-real-effective-exchange-rate` |
| Markets and commodities | `/pakistan-stock-market`, `/gold-price-pakistan`, `/silver-price-pakistan`, `/wti-crude-oil-price`, `/brent-crude-oil-price`, `/natural-gas-price` |
| Global benchmarks | `/us-dollar-index`, `/us-10-year-treasury-yield`, `/fed-funds-rate` |

Sign-in pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`) are open as before and `noindex`.

**What the public pages expose.** Each renders only public economic data and explanations. They were checked for imports from auth, profile, session, assistant and AI modules, and none were found.
- The AI assistant UI renders only on `/overview`, which was already public. Its API stays guarded by `assistantGuard.ts`.
- Download links on public pages lead to `/api/datasets/*`, which still answers a guest with 401.
- CSV buttons on the interest-rate, KIBOR, T-bill and debt pages generate files in the browser from data already on the page. No endpoint is opened.

### Members-only pages (61, unchanged)

| Group | Pages |
|---|---|
| Information pages | `/about`, `/contact`, `/methodology` |
| Academy and workshop | `/academy` (and categories, lessons, glossary, paths), `/workshop/*` |
| Admin | `/admin/*` |
| Budget | `/budget` and its explainers, `/provincial-budget/*` |
| Comparisons | `/comparisons/*` |
| Decision Support Lab | `/decision-support-lab` and all 26 tools, plus the snapshot page |
| Data and research | `/download-datasets`, `/macro-intelligence`, `/gdp-breakdown-workshop` |
| Calendar | `/economic-calendar/*` |
| Account | `/settings/preferences`, `/subscriptions/manage` |

Not opened, deliberately: the audit's section 4 did not list them.
- **Comparison detail pages and budget explainers:** candidates for a next wave after a content review, since several are thin.
- **`/about` and `/methodology`:** low-risk candidates, but they need the owner's say.
- **"Learn" guides and a public inflation calculator:** proposed in the audit but **not built in this release**. No such routes exist; they are a next step.

### Access-policy tests (`src/lib/accessPolicy.test.ts`)

| Test | Checks |
|---|---|
| exactly the documented pages are open | The open set equals the typed-out list. A new public path must be added to the test on purpose. |
| every other page is members-only | Includes every page added in future (default-deny). |
| allow-list guards | Every listed path is a real page; exact paths only; none in a members-only family; `/pakistan-interest-rate/x` stays protected. |
| data and file routes | `/api/datasets/*` and `/research-datasets/*` still answer 401 for guests. |
| no crawler rule | Neither the policy nor the proxy reads the user agent. |

## 2. Technical SEO

### Canonicals
- The root layout no longer sets a default canonical. It used to make every page without its own canonical declare itself a duplicate of `/`.
- Every public page sets an absolute canonical on `https://www.pakeconintel.com`. `src/lib/seoTechnical.test.ts` checks each one.
- `/academy` and `/academy/paths` now set their own. `/workshop` is a permanent redirect to `/academy`.

### Sitemap (`/sitemap.xml`)
- Lists exactly the public pages, nothing members-only and no redirected URL.
- No `lastModified`: the build time is not when a page changed.
- Generated through `isPublicUrl()`, so it follows the access policy automatically. Tested.

### `robots.txt`
- Allows all pages and disallows `/api/` and `/auth/`.
- Sign-in pages are not disallowed, so crawlers can see their `noindex`.

### Redirects (301, single hop, in `next.config.ts` from `src/lib/seoRedirects.ts`)

| From | To | Why | Content preserved |
|---|---|---|---|
| `/pakistan-economic-indicators` | `/overview` | Three near-identical dashboards; `/overview` is the richest and already indexed | The two hubs' FAQ (key indicators and how they interact, sources, update frequency, cost) is now an "About this dashboard" section on `/overview`, with FAQ structured data. Outdated claims ("no signup required", fixed update intervals) were not carried over. |
| `/pakistan-economic-dashboard` | `/overview` | as above | as above |
| `/spi-index-pakistan` | `/weekly-inflation-pakistan` | Both showed the weekly SPI | The index level and the base-year (2015-16 = 100) explanation are now in the weekly page's text and FAQ. |

Before redirecting:
- Internal links, navigation, the mobile nav, search keywords, the related-links graph and the sitemap were updated. A test asserts no related link targets a redirect.
- The old page files were removed.
- Redirects run before the proxy, so guests and members get the same single hop.

### Template upgrade (`SeoPageLayout`, all template pages)
- Visible breadcrumb, matching the BreadcrumbList structured data.
- **About the data** panel: source, frequency and latest observation, taken from the same record as the freshness badge; a fallback snapshot is labelled as such.
- Optional page-specific notes, methodology and limitations.
- A **"View the numbers as a table"** table under every chart.
- An optional **What the data shows** section.
- Related links to members-only pages carry `rel="nofollow"` and a "members" label. The same applies on the new data pages and the HTML site map.

### Structured data
Only what is on the page:
- `FAQPage` for the visible FAQ.
- `BreadcrumbList`.
- `Dataset` on the three new data pages, each with source, coverage and variables. No distribution URL is given, because downloads are generated in the browser.

There are no ratings, reviews or invented dates.

## 3. First-release pages

| Page | Status | Data |
|---|---|---|
| Pakistan Inflation Rate `/inflation-rate-pakistan` | Existing rich page, now public | Ledger CPI |
| Pakistan Interest Rate `/pakistan-interest-rate` | Existing dashboard (released 27 Nov), now public | Fixed SBP datasets |
| KIBOR Rates `/pakistan-kibor-rates` | **New** | Interest-rate dataset: daily KIBOR 2005–, all 7 tenors, changes, range, spread |
| T-Bill Rates `/pakistan-t-bill-rates` | **New** | SBP `tb.xlsx` from 2014, EasyData before. Cut-off and weighted average kept separate; history chart; spreads |
| GDP Growth `/gdp-growth-pakistan` | Upgraded | Annual World Bank figure plus SBP quarterly real GVA. The limitation is stated explicitly. |
| Foreign Exchange Reserves | Upgraded | SBP weekly |
| Exchange Rate `/usd-pkr-exchange-rate` | Upgraded | Intraday quote plus SBP monthly average interbank rate, never mixed |
| Money Supply M2 | Upgraded | SBP weekly |
| Government Debt `/pakistan-government-debt` | **New** | New government-debt dataset (section 4) |
| Fiscal Deficit | Upgraded | SBP annual consolidated balance |

The "upgraded" pages gain:
- unit and basis notes;
- methodology and limitations specific to the series;
- a computed "What the data shows" analysis (`src/lib/seoAnalysis.ts`), built from the same series the page charts, with every statement naming its period.

## 4. Government debt dataset

| | |
|---|---|
| Sources | 1. SBP EasyData `TS_GP_BAM_PKDLP_Q` ("Pakistan's Debt and Liabilities Summary"), all 27 series, verbatim.<br>2. SBP `Summary.pdf`, used as an independent check, plus its P/R flags and definitions.<br>3. Ministry of Finance, Annual Debt Review FY-26. |
| Preservation | `data/sources/government-debt/` with a SHA-256 manifest (retrieved 27 Nov 2026), stored byte for byte. |
| Pipeline | `scripts/fetchGovernmentDebtSources.ts` (read-only, guarded entry) → `scripts/buildGovernmentDebt.ts` (local, deterministic) → `src/data/governmentDebt.ts` plus `docs/government-debt-validation-report.md` |
| Coverage | Quarterly stocks Jun 2009 – Sep 2026 (67 quarters; Sep 2026 provisional, Sep 2025 – Jun 2026 revised). Debt-to-GDP at fiscal-year ends FY09–FY26 (18). MoF figures FY24–FY26 (3). |

### Series (billion PKR)

| Series | Definition |
|---|---|
| Gross government domestic debt | Federal and provincial |
| Government external debt | Excluding IMF |
| Debt from the IMF | |
| **Gross public debt** | The sum of the three above |
| **FRDLA total debt of the government** | Gross public debt less government deposits with banks |
| Government deposits | Federal and provincial deposits with the banking system |
| Total external debt and liabilities | The country's debt abroad; **not government debt** |
| Total debt and liabilities | The economy's total; **not government debt** |

Ratios are SBP's published figures as a percentage of nominal GDP, with GDP itself.

### Validation (all must hold or the build stops)
- Gross public debt = domestic + external + IMF in 67 of 67 quarters, within 0.15 bn of rounding.
- FRDLA = gross − deposits in 67 of 67 quarters.
- All 90 published ratios are reproduced from stock ÷ GDP, within 0.06 pp.
- All 40 values in SBP's `Summary.pdf` agree with EasyData.
- MoF figures parse with internal checks: domestic + external = total; the narrative sentence matches the chart.

### Ministry of Finance against SBP
Reported, not reconciled:
- **Stocks** agree within about 0.1%. The MoF counts IMF debt inside external debt.
- **FY26 ratio:** 68.3% (MoF) against 68.59% (SBP). The MoF uses a different nominal-GDP estimate.
- **Presentation:** both are shown, labelled, as separate series.

### Not included
- Debt servicing and interest payments.
- Monthly domestic-debt composition (`TS_GP_BAM_GOVTDDL_M`): a next candidate.
- Data before June 2009.

PSE debt sits only within "total debt and liabilities" and is never presented as government debt.

## 5. Analytics (GA4)

`src/lib/analytics/events.ts` holds an allow-list of events and parameters. `src/components/AnalyticsListener.tsx` is one delegated listener, mounted only when GA is configured. No dependency was added.

| Event | When | Parameters |
|---|---|---|
| `csv_download` | A chart's CSV button | `file`, `page_path` |
| `dataset_download` | A link to `/api/datasets/*` or `/research-datasets/*` | `dataset`, `page_path` |
| `chart_interaction` | A range, tenor, basis or series toggle inside a chart | `chart` (its title), `control`, `option` (a fixed choice), `page_path` |
| `calculator_use` | The first input change on a Decision Lab tool, once per page view | `calculator` (slug) |
| `calculator_complete` | "Download report" or "Save to snapshot" on a tool | `calculator`, `action` |
| `internal_nav` | A related-pages link | `block`, `from_path`, `to_path` |

**Never sent:** typed values, amounts, profile fields or results. A test enforces the allow-list, and that an input's value is read only for fixed chart options.

Organic landing-page engagement comes from GA4's standard session and engagement metrics, segmented by traffic source and landing page. Page categories can be derived from the path in GA explorations.

There is no consent banner in the code base today. Whether one is required is the owner's decision; these events add no personal data.

## 6. Search Console readiness

The **owner** needs to:
1. **Confirm the domain property.** It may be verified by DNS; there is no meta-tag verification in the code.
2. **Submit the sitemap** after release: `https://www.pakeconintel.com/sitemap.xml`.
3. **Grant read-only access**, if wanted, to the account that will produce reports.

Until that access exists:
- keyword priorities remain qualitative (Stage 1 audit);
- no search volumes or rankings are claimed.

Recommended once access exists: a Looker Studio report joining Search Console (queries, clicks, impressions, CTR, position by page) with the GA4 events above.

## 7. Performance and security

- **Rendering:**
  - The new pages are server-rendered from version-controlled datasets, with no database read.
  - KIBOR and T-bill pages revalidate hourly; the debt page is static.
  - Chart components are the existing client components.
- **Security:**
  - No server secret is read on any public page.
  - No API route was opened.
  - Authentication architecture, Supabase schema and research datasets are unchanged.
- **Page weight:** the KIBOR page sends its chart data (monthly averages for 7 tenors plus 24 months of daily spreads) to the browser. The T-bill page sends only the series it charts.
