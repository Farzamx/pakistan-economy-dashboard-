# Inflation: completion record and handoff

Final milestone of the Inflation track (F.3). Architecture and methodology: [inflation-page.md](inflation-page.md).
Design record for the ledger move: [inflation-ledger-migration-assessment.md](inflation-ledger-migration-assessment.md).

## What is finished

* **One route, upgraded in place:** `/inflation-rate-pakistan`, same URL, title, description, canonical, Open Graph, Twitter metadata, FAQ and JSON-LD as before.
* **Sixteen sections** with a section navigator: overview, history, headline/core/food, food versus the rest, urban versus rural (an explicit limitation, no chart),
  the 12 CPI expenditure groups (rates, weights, contributions), groups over time, month-by-year heatmap, compare-any-two-months, distribution, international peers,
  policy rate, findings, interpretation, methodology, FAQ. Chart types used: bars (signed, clustered, stacked), lines (including step), dot plots, dumbbells, lollipops,
  waterfall, heatmaps, treemap, small multiples, histogram, box plots, scatter, and component tables.
* **Every chart** carries a title, a one-line "how to read it", units and period, a source line, and the same numbers as a keyboard-reachable table.
  Missing observations stay gaps. Rates, index levels, weights and contributions are kept apart. Nothing is hardcoded: every displayed value comes from a data source or a verified calculation.
* **The ledger is the page's CPI-group source.** The validated reader supplies the panel; PBS's file is the fallback; both unusable keeps the last good page.
  The page says which source it used, why, and keeps six separate freshness facts apart (latest period, last ingestion run, last data change, last source fetch, last page generation, current source).
* **Accessibility and responsiveness:** verified in a real browser at 1440, 768 and 390 px in both themes: no horizontal overflow, no empty chart, working navigation, no console errors, zero page-owned
  WCAG 2.1 A/AA violations (shared-shell findings below).

## What is deliberately not done

* **Scheduled ingestion is not active.** The task is not registered, `WRITE_MODE_AUTHORIZED` is `false`, and `--write` is refused. The page does not need it (see inflation-page.md section 9).
  It is an **operational follow-up, not a page blocker**: [pbs-cpi-ingestion-operations.md](pbs-cpi-ingestion-operations.md) holds the reviewed activation checklist.
  Until it is done: the page shows the PBS fallback for part of each month after a release, and the existing watchdog will report the PBS CPI job stale 216 hours after its last recorded run.
* **No batch RPC and no migration.** The ledger read costs 26 RPCs per regeneration (at most hourly, concurrency 6, bounded by a 12 s deadline); a batch RPC is documented in the assessment as an optimisation that needs separate approval.
* **No urban/rural comparison:** PEIC holds no rural series. Unlocking it is a data-pipeline decision, described on the page.

## Known limitations of the finished page

* Group history begins July 2022 (PBS's file).
* Pre-existing, shared, and not changed by this work: the freshness text under the KPI tiles (`DataQualityBadge`: 2.63:1 in light, 3.8:1 in dark) and the "Developed by" corner badge fail WCAG AA colour contrast.
  They appear on every page of the site and were on the previous Inflation page. A site-wide fix belongs in its own change.
* Recharts logs one "width(-1)" sizing **warning** per chart on first render, in development and in production (14 on this page; the GDP Workshop, the quality benchmark, does the same per chart).
  It is a warning, not an error: no chart is empty and there are no console errors. Silencing it by giving `ResponsiveContainer` an initial size would render charts at a fixed width before hydration, so it was left as is.

## Handoff for the next indicator

**Reusable building blocks (all in the repository, all tested):**

| Need | Use |
|---|---|
| Chart frame with title, how-to-read, source, accessible table | `src/components/analytics/ChartFrame.tsx` (+ `Callout` for limitations) |
| Time and category charts | `TimeCharts.tsx` (signed bars, lines incl. step, clustered/stacked bars, scatter, histogram), `RowCharts.tsx` (dot, dumbbell, lollipop, waterfall, box) |
| Heatmap, treemap, small multiples, KPI tile, controls, tooltip | `Heatmap.tsx`, `Treemap.tsx`, `SmallMultiples.tsx`, `KpiTile.tsx`, `controls.tsx`, `tooltip.tsx` |
| Scales, colour maths, palette, treemap layout | `src/lib/analytics/*` (`--pe-viz-*` tokens re-theme for light and dark) |
| Pure view-model + one loader + client renderers | `inflation/viewModel.ts`, `data/inflationPageData.ts` |
| "Last good page" on provider failure | `data/providerFailurePolicy.ts` + `inflation/providerHealth.ts` |
| Ledger-first, fallback-second source with a logged decision | `inflation/panelSource.ts` + `data/cpiGroupPanelSource.ts` |
| Source strip and the six freshness facts | `inflation/groupSource.ts` + `components/inflation/DataSourceStatus.tsx` |
| Contract tests that pin route, SEO, ISR, boundaries and honest limits | `inflation/pageContract.test.ts` |

**Recommended next indicator: Pakistan Interest Rate (`/pakistan-interest-rate`).** Its data (the SBP policy-rate history) is already in the canonical ledger and already used by the Inflation policy section,
so it needs no new provider, table or migration. It is the natural pair to inflation: a real policy rate (policy rate minus inflation) can be derived from series PEIC already holds,
and the step-line, dumbbell, heatmap and scatter components were built for exactly this. USD/PKR is the next candidate.
