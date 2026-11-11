# Interest Rate page: data, architecture, methodology and limits

Route: `/pakistan-interest-rate` (the original route, upgraded in place; no second interest-rate route exists, and a test pins that).
Phase G.1. Built on the pattern of the completed Inflation page ([inflation-page.md](inflation-page.md)).

Figures below are "as of 11 November 2026". The page computes every such figure from the data it receives and never types one in.

## 1. Data inventory

All series are read through existing modules from the PEIC canonical ledger (SBP EasyData unless stated). No new provider, table, RPC or migration.

| Series | Ledger key | Unit | Frequency | Coverage | Notes |
|---|---|---|---|---|---|
| SBP policy (target) rate | `sbp:policyRate` (SBP series `TS_GP_IR_SIRPR_AH.SBPOL0030`) | percent | one row per **date the rate took a value** | 23 May 2016 – 26 Oct 2026, 38 observations | quality `official`; `release_date` and `source_updated_at` not populated; one stored version per observation (no revision history); two rows repeat the previous value (17 Apr 2020, 18 May 2020) |
| Headline CPI inflation | `sbp:cpiInflation` | % year on year | monthly | Jul 2016 – Oct 2026, 124 months | PBS release overrides when newer (existing behaviour) |
| Core inflation (urban NFNE) | `sbp:coreInflation` | % year on year | monthly | Jul 2016 – Oct 2026, 124 months | urban only |
| 3-month T-bill yield | `sbp:tbillYield3m` | percent | each auction | Jan 2016 – Oct 2026, 285 auctions | a **market** yield, not the policy rate |
| 3-year PIB yield | `sbp:pibYield3y` | percent | each auction | Jan 2016 – Oct 2026, 104 auctions | a **market** yield |
| US effective federal funds rate | `fred:fedFunds` (via the existing FRED loader) | percent | monthly, end of period | from Jan 2016 used here (history to 1954) | the one comparable international policy rate held |

**Not held, so not shown:** meetings at which the rate was held and any vote record; KIBOR; bank deposit, lending and mortgage rates; policy rates of any country but the US; inflation expectations or forecasts.

**The economic calendar was inspected and deliberately not used.** It holds 11 MPC records for 2026–27, two meetings already in the past (27 Jul and 14 Sep 2026) are still marked "scheduled", and its 27 Apr 2026 meeting date sits a day before the policy-rate series' 28 Apr 2026. Building a decision history on it would import those inconsistencies.

## 2. What the policy-rate series is, and is not

It has one row per date the rate took a value. It is **not a list of Monetary Policy Committee meetings**: a meeting that held the rate leaves no row. So everything on the page speaks of rate **changes**; holds cannot be counted, and a repeated value is never counted as a change. Dates are the ones the series records and can fall a day after a meeting.

## 3. Page sections (12)

| # | Section (anchor) | What it shows |
|---|---|---|
| 1 | Policy rate overview (`#overview`) | four KPI tiles: the existing canonical policy-rate KPI (with its freshness verdict), the latest change in pp, the real policy rate (ex-post), the 3-month T-bill yield (labelled a market yield) |
| 2 | Historical trend (`#history`) | summary figures (current rate, net change, largest increase and cut); the policy rate as a step line with the highest and lowest marked (12 months / 24 months / 5 years / all); one bar per rate change |
| 3 | Rate-change history (`#changes`) | every change, newest first: date, change, from, to, inflation known at the time, real rate after; a callout that holds are not in the data |
| 4 | Cycles (`#cycles`) | summary figures; the **regime timeline** (tightening, easing, holding, with turning points); a dumbbell of each cycle's start and end rate; **cumulative increases and cuts**; **how long the rate stayed at each level**; a cycle table |
| 5 | Real policy rate (`#real`) | summary figures; **nominal policy rate, inflation and the real rate on one axis** (real rate shaded teal above zero, orange below), headline or core, with the formula and a worked example |
| 6 | Policy rate and inflation (`#inflation`) | policy rate, headline and core on one axis; what inflation was at three dates around each cycle |
| 7 | Market yields (`#market`) | latest yields and spreads; the policy rate and the T-bill and PIB **on their own auction dates**; **yield minus the policy rate in effect on the day**; the **term spread** between the two maturities held (and a statement that no yield curve can be drawn) |
| 8 | Pakistan and the US (`#international`) | summary figures (latest gap, highest, lowest, months above); policy rate against the US federal funds rate; the gap in pp |
| 9 | Findings (`#findings`) | facts computed from the figures, each with period and source |
| 10 | Meaning (`#meaning`) | the original explanatory copy |
| 11 | Methodology (`#methodology`) | definitions, formulas, coverage, "where the data comes from", checks, limitations, downloads |
| 12 | FAQ (`#faq`) | the original four questions plus "What is the real policy rate?", with every number computed from the data; also emitted as JSON-LD |

Every chart has a title, a one-line "how to read it", units, a source line and its numbers as a keyboard-reachable table. Where the data cannot support a chart, the section says so instead.

## 4. Calculations

* **Change** = new rate − previous rate, in percentage points; the first row is a starting level; a repeated value is not a change. On the real history: **35 changes (22 increases, 13 cuts)** that add up to the whole move from 5.75% to 12% (+6.25 pp).
* **Cycle** = a maximal run of consecutive same-direction changes. It ends only when the next change goes the other way. Real history: five cycles: tightening +7.50 pp (Jan 2018 – Jul 2019), easing −6.25 (Mar – Jun 2020), tightening +15.00 (Sep 2021 – Jun 2023), easing −11.50 (Jun 2024 – Dec 2025), tightening +1.50 (Apr – Oct 2026, latest). A cycle's span says nothing about pauses inside it.
* **Policy rate in a month** = the latest observation dated in or before the month (a step; never interpolated). This is the Inflation page's own `policyRateAt`, imported, not copied.
* **Real policy rate** = ((1 + policy rate) ÷ (1 + inflation) − 1) × 100, year-on-year inflation for the month. It is **ex-post and backward-looking**: not a market real rate, not an expected one (no forecast exists here), not what savers or borrowers earn. The simple difference is only an approximation and is poor at high inflation (22% against 38% inflation: −16 points by subtraction, −11.6% exact). October 2026: (1.12 ÷ 1.096) − 1 = 2.19%.
* **Inflation known at a change** = the CPI of the month before the decision month (PBS publishes at the start of the following month). Only that exact month is used; if it is missing the cell says so.
* **Time-weighted average** = Σ (rate × days in effect) ÷ total days, first observation to the generation date. Checked against an independent day-by-day average.
* **Auction yields and spread (G.9)**: each auction is plotted on its own date, never averaged into months; a line is broken where there was no auction for more than 75 days. **Spread** = the yield − the policy rate in effect **on that date** (an observation takes effect on its own date). This replaced the earlier "last auction of the month against the month-end rate", which compared the 14 Oct 2026 bill (11.89%) with the 12.00% rate that only began on 26 Oct and so reported −0.11 pp; against the 11.50% in effect that day it is **+0.39 pp**. The older month-end figures remain in the view model for compatibility but are not shown.
* **Term spread (G.9)** = at each 3-year PIB auction, the PIB yield − the latest 3-month T-bill yield dated on or before it, provided that bill auction is at most 21 days earlier (otherwise the PIB auction is left out). It is the slope between two maturities, **not a yield curve**.
* **Regimes, holds and levels (G.9)**: the time from the first observation to the generation date is cut into non-overlapping spans: each cycle (first change to last) is tightening or easing, and every other span (before the first change, between cycles, since the latest) is a **hold: no change recorded and no run under way**. A pause inside a cycle belongs to the cycle. A **level** is one stretch at one rate, in days; a repeated value does not start a level; the first level's length is a lower bound because the series begins in it. The longest hold with a known start is 452 days (7.00%, 26 Jun 2020 to 21 Sep 2021).
* **Cumulative increases and cuts (G.9)**: running totals, in pp, of every increase and of every cut; the net is their sum and equals the current rate minus the first. On the real history: **+24.00 pp of increases, −17.75 pp of cuts, net +6.25 pp** (worked out independently of the code and pinned in the tests).
* **Gap to the US** = policy rate in effect − US effective federal funds rate, in pp, for months present in both.

No section says why the committee acted, what inflation or the rate will do, or that one series caused another; the findings builder is tested to contain no causal, predictive or advisory language.

## 5. Architecture

```
 getSbpIndicator("policyRate")                 (existing canonical KPI)       ─┐
 getSbpIndicatorHistory(policyRate | cpiInflation | coreInflation |           ─┤
                        tbillYield3m | pibYield3y)   (existing canonical store)  ├─► loadPolicyRatePageData() ─► buildPolicyRateViewModel() ─► page ─► components
 getFedFundsHistory                            (existing FRED loader)          ─┘     (one Promise.all)           (pure)                       (server)   (client charts)
```

* `src/lib/policyRate/analytics.ts`: all calculations (pure, tested against the real 38 observations and hand-worked values).
* `src/lib/policyRate/viewModel.ts`: assembles every series and runs the data checks (pure).
* `src/lib/policyRate/findings.ts`, `format.ts`: facts and deterministic formatters.
* `src/lib/data/policyRatePageData.ts`: the one loader. Optional sources are isolated (a failure is absent data and that section says so).
* `src/components/policyRate/*`: sections, built on the shared toolkit (`ChartFrame`, `MultiLine`, `SignedBars`, `DumbbellPlot`, `KpiTile`, `Segmented`).
* Rendering: ISR, `revalidate = 3600`.

Shared changes (both backward compatible; the Inflation page's behaviour and log text are unchanged and a test pins that): `ProviderFailure.provider` (a type) gains `"SBP policy-rate ledger"`, and `ProviderUnavailableError` / `enforceProviderPolicy` accept an optional page name that defaults to "Inflation page".

## 6. Failure and recovery

| Situation | What happens |
|---|---|
| Ledger healthy | analysed as above; the data-status panel says "The PEIC observation ledger" and shows the series id, newest observation and when PEIC stored it |
| Ledger returns no rows (the loader falls back to a short static snapshot) | the snapshot is **never analysed** (it is monthly points, not change dates). At production runtime the page **refuses to regenerate**, so the last good page keeps being served. During build or development it renders a labelled "unavailable" state |
| History loader throws or returns nothing | same as above |
| Inflation, T-bill, PIB or US data missing | that section shows a labelled limitation; everything built on the policy rate still renders |
| Headline KPI disagrees with the newest observation | reported in the checks list |
| Recovery | the next regeneration re-evaluates from scratch; there is no sticky state |

## 7. Known limitations

* Changes, not meetings (section 2). The series begins in May 2016, so there are only five cycles; patterns across them are suggestive.
* The real rate is backward-looking and uses headline or urban core inflation; inflation before 2019 reflects the current 2015-16 base and can differ from figures first published.
* PEIC holds exactly two government-security maturities (3-month T-bill, 3-year PIB; the ledger holds no 6- or 12-month bills and no 5- or 10-year bonds), so **no yield curve is drawn**; the term spread is the only maturity comparison. Auctions are irregular (the bond has silences of up to 294 days, drawn as breaks). KIBOR and bank rates are not held.
* A "hold" on the regime timeline is a stretch with no recorded change; it is not a count of meetings.
* Only the US is compared; gaps between policy rates do not account for different inflation, mandates or exchange-rate regimes.
* Accessibility: every page-owned element passes the automated WCAG 2.1 A/AA checks. The two shared-shell elements that do not (the freshness text under the KPI tile and the corner badge) are the pre-existing ones recorded in [inflation-completion.md](inflation-completion.md).
* Recharts logs one sizing warning per chart on first render (a warning, not an error), as on the other chart pages.

## 8. Chart inventory (G.9)

| # | Section | Visualization | Data | Status |
|---|---|---|---|---|
| 1 | History | Policy rate, step line, highest/lowest marked | `sbp:policyRate`, month-end rule | kept (G.1), marks and draw animation added |
| 2 | History | One bar per rate change | derived from the policy rate | kept, bar-growth animation added |
| 3 | Changes | Rate-change table | derived + CPI | kept, unchanged |
| 4 | Cycles | **Regime timeline**: rate line, tightening/easing shading, holding strip, turning points | policy rate, derived cycles | **new** |
| 5 | Cycles | Dumbbell of each cycle's start and end | derived cycles | kept, unchanged |
| 6 | Cycles | **Cumulative increases, cuts and net** (stepped, date axis) | derived changes | **new** |
| 7 | Cycles | **How long the rate stayed at each level** (bars, with the longest known hold outlined) | derived levels | **new** |
| 8 | Cycles | Cycle table | derived cycles | kept |
| 9 | Real rate | **Nominal rate, inflation and real rate** (area split at zero), headline or core | policy rate, `sbp:cpiInflation` / `sbp:coreInflation` | **replaces** the single real-rate line |
| 10 | Inflation | Policy rate with headline and core inflation | as above | kept, draw animation added |
| 11 | Inflation | Inflation around each cycle (table) | derived | kept |
| 12 | Market | **Policy rate and auction yields on their own dates** (date axis, broken across long gaps) | `sbp:tbillYield3m`, `sbp:pibYield3y` | **replaces** the month-binned lines |
| 13 | Market | **Yield minus the policy rate in effect that day** | derived at each auction | **new** (the spread was text only) |
| 14 | Market | **Term spread, 3-year PIB minus 3-month T-bill** | derived at each PIB auction | **new**; stated limit: two maturities, no yield curve |
| 15 | International | SBP policy rate against the US federal funds rate | `sbp:policyRate`, `fred:fedFunds` | kept, draw animation added |
| 16 | International | Gap between the two (bars) | derived | kept, key and bar-growth animation added |
| 17 | Every section above | Summary figures that count up once on first view (finished text on the server, under reduced motion and without JavaScript) | derived | **new** |

Not built, deliberately: a yield curve (the ledger holds two maturities), any chart of KIBOR or bank rates (not held), a market-implied or expected real rate (no forecast data), and country comparisons beyond the US (no data).

## 9. Verifying it

* `npx vitest run src/lib/policyRate src/lib/data/policyRatePageData.test.ts src/components/policyRate`: calculations, date-axis series builder, view model, findings, page contract (including the animation rules), the chart components rendered with the real history, and the page end to end including every failure mode.
* Animation: opt-in per chart (`animate`), under a second and a half, and off under `prefers-reduced-motion`; the finished chart or figure is what the server renders.
* Read-only data check: the public read RPCs `get_canonical_observation_history` / `get_canonical_observation_provenance` for `sbp:policyRate`.
