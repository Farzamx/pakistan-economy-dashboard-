# Inflation page: architecture, data, methodology and operations

Route: `/inflation-rate-pakistan` (the original route, upgraded in place; no second Inflation route exists, and a test pins that).
Status: **finished.** See [inflation-completion.md](inflation-completion.md) for the closure summary and the open operational item.

This document describes the page as built. Where a number below can change with the data (coverage spans, the latest month), it is
stated "as of November 2026"; the page itself computes every such figure from the data it receives and never types one in.

## 1. What the page is

A research workspace for Pakistan's consumer price inflation: 16 sections under one URL, a section navigator at the top, and under
every chart a title, a one-line "how to read it", units, the period, a source line and the same numbers as a table.

| # | Section (anchor) | What it answers | Charts and panels |
|---|---|---|---|
| 1 | Inflation overview (`#overview`) | the latest readings and how fresh each is | five KPI tiles: headline, core, food (YoY), month-on-month, CPI index level |
| 2 | Historical performance (`#history`) | how the rate moved; speeding up or slowing down | monthly bars (YoY or MoM toggle), long-run lines for headline/core/food, acceleration bars; 12-month / 24-month / 5-year / all |
| 3 | Headline vs core vs food (`#measures`) | three views of the same prices | clustered bars, latest-month dot plot, change-since-last-month dumbbell |
| 4 | Food and the rest (`#food-rest`) | what drives the headline, without inventing a "non-food" series | clustered bars, long-run lines, dumbbell |
| 5 | Urban vs rural (`#urban-rural`) | **not available**: states why and what would unlock it | limitation panel only (no chart is drawn) |
| 6 | CPI expenditure groups (`#groups`) | which of PBS's 12 groups are rising and which drive the headline | dot plot, contribution lollipop, dumbbell, grouped bars, treemap, component table |
| 7 | Groups over time (`#groups-time`) | how every group moved | heatmap, stacked contributions, waterfall between two months, small multiples |
| 8 | Month-by-year heatmap (`#patterns`) | which months and years stand out | heatmap (YoY or MoM) |
| 9 | Compare any two months (`#compare`) | how each measure moved between two dates | dot plot, dumbbell |
| 10 | Distribution (`#distribution`) | how often inflation has been this high; which groups swing most | histogram, box plots |
| 11 | International (`#international`) | Pakistan against India, Bangladesh, Sri Lanka | lines, clustered bars, dot plot, dumbbell, country-by-year heatmap |
| 12 | Policy rate (`#policy`) | inflation and the SBP policy rate on one axis, **shown together, not linked** | lines with a step series, scatter, year-end table |
| 13 | Findings (`#findings`) | facts from the figures above, each with period and source | list |
| 14 | What this means (`#meaning`) | plain-language interpretation | text |
| 15 | Methodology and data (`#methodology`) | definitions, formulas, coverage, **where the group data came from and how fresh it is**, checks, limitations, downloads | tables and lists |
| 16 | FAQ (`#faq`) | the four original questions (also emitted as JSON-LD) | text |

## 2. Architecture

```
 sbpServer (headline, core, food, policy)  ─┐   canonical ledger + PBS override: unchanged by this milestone
 cpi_monthly_index (CPI index level)       ─┤
 cpi_category_breakdown (PDF snapshot)     ─┤
 World Bank FP.CPI.TOTL.ZG (4 countries)   ─┤──► loadInflationPageData()  ──► buildInflationViewModel()  ──► page (server) ──► client chart components
 CPI GROUP PANEL  ← resolveCpiGroupPanel() ─┤        (one Promise.all)            (pure; every derived         (select/toggle/draw only)
     ledger first, PBS file as fallback     │                                       number computed here)
 cron_run_log (ingestion run history)      ─┘
```

* **`src/lib/data/inflationPageData.ts`** loads everything in one `Promise.all`, isolates each optional source (a failure is `null`, and the
  sections that need it show a labelled "unavailable" state), then applies the failure policy (section 6).
* **`src/lib/data/cpiGroupPanelSource.ts`** is wiring only: it gives the validated selection logic its two real sources.
* **`src/lib/inflation/panelSource.ts`** holds every selection rule; **`ledgerPanel.ts`** validates the ledger; **`pbsGroups.ts`** parses
  and validates PBS's file; **`analytics.ts`** / **`viewModel.ts`** compute everything derived. None of these knows which source a panel came from.
* **`src/lib/inflation/groupSource.ts`** turns the selection decision into the six freshness facts the page displays.
* **Rendering:** ISR, `revalidate = 3600`. The page is regenerated at most once an hour; between regenerations nothing is fetched per request.

## 3. Data sources and historical coverage (as of November 2026)

| Series | Source | Frequency | Coverage | Unit |
|---|---|---|---|---|
| Headline CPI inflation (national) | SBP EasyData; PBS release overrides when newer | monthly | Jul 2016 – Oct 2026 (124 months) | % year on year |
| Core inflation, NFNE (**urban**) | SBP EasyData; PBS release overrides when newer | monthly | Jul 2016 – Oct 2026 (124) | % year on year |
| Food inflation (**urban**) | SBP EasyData | monthly | Jul 2016 – Oct 2026 (124) | % year on year |
| National CPI index | PBS (SDMX file) via `cpi_monthly_index` | monthly | Jul 2022 – Oct 2026 (52) | index, 2015-16 = 100 |
| Month-on-month change | **derived** from the index | monthly | Aug 2022 – Oct 2026 (51) | % month on month |
| 12 CPI group indices and 12 weights | **PEIC observation ledger** (PBS SDMX file, ingested); PBS file read directly as fallback | monthly | Jul 2022 – Oct 2026 (52) | index; % of basket |
| Group YoY | **derived** from the group indices | monthly | Jul 2023 – Oct 2026 (40) | % year on year |
| SBP policy rate | SBP EasyData | on decision | 38 decisions, 2016-05-23 – 2026-10-26 | % |
| Annual CPI inflation, 4 countries | World Bank FP.CPI.TOTL.ZG | annual | 2005 – 2025 | % (annual average) |

Group data begins in July 2022 because PBS's machine-readable file begins there; the ledger holds exactly what that file held (26 series ×
52 months = 1,352 observations) and cannot hold more.

## 4. The CPI-group source: ledger first, PBS as fallback

The 26 series the page's group analysis needs (1 national index, 12 group indices, 12 weights, 1 total weight) are read as **one panel from
one source**. The decision, in order:

1. Read and validate the ledger (`get_canonical_observation_provenance` ×26, concurrency 6, 8 s per call, 12 s overall deadline).
2. **Valid and current** (its latest month is the previous calendar month or later) → use it. **PBS is not fetched.**
3. **Valid but behind the calendar** → ask PBS once. PBS valid **and strictly newer** → use PBS for the whole panel; otherwise keep the ledger.
4. **Unavailable or invalid** → PBS's file (labelled as a fallback).
5. **Neither usable** → no panel. At production runtime the page **refuses to regenerate**, so Next keeps the last good page; during `next build`
   and local development it renders the labelled "unavailable" state instead.

Invariants (each pinned by tests): the panel is by identity exactly one source's panel; ledger and PBS data are never merged, patched, truncated
to a common window or interpolated; a partly ingested month (for example 25 of 26 series) rejects the whole ledger; a rebased or mixed base
period, a missing month, a broken precision check or a broken Laspeyres identity rejects it; using the PBS fallback is **not** a failure.

What was reconciled before the page was switched (read-only, `npx tsx scripts/reconcileInflationLedger.ts`, last run on the day of the switch):
26 series, 52 months, 1,352 canonical observations, every row's stored number equal to the exact text PBS published, and the ledger-backed model
versus the PBS-parsed model **identical across 3,211 derived values (maximum difference 0)**: months, headline index, weights, 12 × 52 group indices,
YoY, MoM, contributions to headline YoY and MoM, other-groups series and the 14-value waterfall.

## 5. Freshness: six different questions, never one badge

The page reports these separately (methodology section, "Where the group data comes from, and how fresh it is"), and a one-line source strip
sits above each of the three group-derived sections. Each fact has its own source and none is derived from another:

| Fact | Answers | Comes from |
|---|---|---|
| Latest observation period | which month the newest figure describes | the panel actually used |
| Last ingestion run | when PEIC's ingestion job last ran and how it ended | `cron_run_log` (the only place an *unchanged* run is visible) |
| Last data change | when PEIC last wrote a figure to its stored copy | max `fetched_at` of the 26 ledger series |
| Last source fetch | when PEIC last heard from PBS | an ingestion run that obtained PBS's file, or this page's own read of PBS when it used or checked PBS |
| Last page generation | how old the page is | stamped at render (refreshed at most hourly) |
| Current source | which path supplied the data, and whether it is a fallback | the selection decision |

They legitimately differ: a run that finds nothing new writes nothing, so a recent run can sit beside an old data change. The page never states
whether scheduled ingestion exists or is active. It shows only what the data shows (the last run on record, if any). If there is none, or the run
history cannot be read (the existing reader reports both as an empty list), it says exactly that.

One greppable log line is written per page generation (`[InflationPage] CPI group source: source=… reason=… fallback=… ledgerLatest=… pbsLatest=… expected=… pbsChecked=…`),
at warning level when `fallback=true`. A log alert on `fallback=true` is the monitor for "the ledger is not being kept current".

## 6. Failure and recovery

| Situation | What happens |
|---|---|
| Ledger healthy and current | ledger used; PBS never contacted (a PBS outage is invisible) |
| Ledger unreadable, invalid or partly ingested | PBS's file, whole; fallback strip shown; one warning log line |
| Ledger behind the calendar, PBS has nothing newer | ledger kept; PBS asked once; "no newer month is published yet" |
| Ledger behind the calendar, PBS newer | PBS used, labelled "it holds a newer month than the PEIC ledger" |
| Ledger and PBS both unusable | production runtime: regeneration refused (`ProviderUnavailableError`), the last good page keeps being served. Build or dev: the labelled "unavailable" state |
| World Bank unavailable | same policy as above (it is the other required external input) |
| Any optional source (core, food, policy, index, snapshot, run history) | that section degrades to a labelled limitation; the page still regenerates |
| Recovery | the next regeneration re-evaluates everything from scratch; there is no sticky state |

## 7. Methodology and definitions

* **CPI index versus inflation rate.** The index is a price level (2015-16 = 100); an index of 307 is not 307% inflation. The two are never plotted on one axis.
* **Year on year** = (index now ÷ index twelve months earlier − 1) × 100. **Month on month** = (index now ÷ index last month − 1) × 100; it is volatile, is not an annual rate and is labelled *derived*.
* **Weights are sizes, not rates.** PBS fixes each of 12 groups' share of the basket (2015-16 survey); the 12 weights total 100.0034, and the ledger also stores a total-weight series that is 100 in every month.
* **Contribution (percentage points)** = (group weight ÷ total weight) × (group index now − group index then) ÷ headline index then × 100. The twelve contributions sum to the headline's change; the page checks this on every load (worst gap 0.0037 pp across 40 months in the production ledger).
* **Headline reconstruction.** Σ(weight × group index) ÷ Σ weight reproduces the national index in every month (worst gap 0.0077 index points; limit 0.05).
* **"All other groups"** is a fixed-weight sub-aggregate of groups 2–12. It is **not** PBS's non-food measure (PBS publishes none, and its food definition is wider than group 1), and the page never calls it that.
* **Urban versus rural.** PEIC holds urban core and urban food only, no rural series and no urban headline, so no urban/rural comparison is drawn; the section says so.
* **PBS monthly versus World Bank annual.** The international section uses annual averages only and says so; it is never overlaid on monthly data.
* **Missing values** are gaps, never zero, interpolated or estimated; a chart that the data cannot support is replaced by a stated limitation.
* **Correlation is not causation.** The policy-rate section shows two series together and states that it does not link them.

## 8. Known limitations

* Group history starts July 2022 (PBS's file), so group YoY starts July 2023 and group MoM spans about 4.3 years; patterns across so few years are suggestive, not conclusive.
* Weights are from the 2015-16 survey and describe the basket PBS prices, not today's spending.
* No rural, national core/food, non-food, perishable/non-perishable or monthly peer-country series.
* The ledger decays after each PBS release until the next ingestion (section 9); the cross-check against PBS keeps the page as fresh as the live file in that window.
* Accessibility: every page-owned element passes the automated WCAG 2.1 A/AA checks. Two shared-shell elements do not, and are unchanged by this work: the freshness text under the KPI tiles (`DataQualityBadge`) and the "Developed by" corner badge, on every page of the site.

## 9. Operational dependency: scheduled ingestion is not active

The page works today **without** scheduled ingestion, because the ledger already holds the current release and the PBS cross-check covers the gap
after each release. Four different facts are kept apart and must not be conflated:

| State | Status |
|---|---|
| **Implemented** | yes: adapter, validated dry run, locked and logged run, monitor, read-only status command |
| **Configured** | yes in the repository: Task Scheduler template, watchdog entry, freshness-registry entries |
| **Activated** | **no**: the task is not registered, `WRITE_MODE_AUTHORIZED` is `false`, and `--write` is refused |
| **First intended, successful ingestion** | **no**: the only run on record is the unintended one of 2026-11-06 (see [incident-f2b-r-production-write.md](incident-f2b-r-production-write.md)); its 1,352 rows were preserved and reconciled |

Activation is a separate, reviewed operational step ([pbs-cpi-ingestion-operations.md](pbs-cpi-ingestion-operations.md)); it does not block the page. Until it happens,
the existing watchdog will report the PBS CPI job as stale 216 hours after its last recorded run, and the page will show the PBS fallback for part of each month.

## 10. Verifying it

Read-only, any time, no database writes:

* `npx tsx scripts/reconcileInflationLedger.ts --runs 3`: independent audit of the production ledger plus ledger-versus-PBS reconciliation. Must end `ALL CHECKS PASSED`.
* `npm run check:cpistatus`: the six dimensions, from real evidence.
* The platform log line in section 5.
