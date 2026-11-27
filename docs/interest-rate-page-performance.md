# `/pakistan-interest-rate`: page weight and load performance

Stage 2 remediation C, 27 Nov 2026.

**Measurement only.** No chart, table or data was removed or changed.

## How this was measured

All figures here are **lab** measurements, not field data (Core Web Vitals from real visitors). Treat them as relative, not absolute.

- **Build:** the isolated production build (`next build` and `next start`, `e2e/guest-auth/isolatedRun.mts`) on a Windows desktop, served from `localhost`. There is no CDN and no Vercel edge.
- **Browser:** headless Chrome, cold cache, median of 3 runs. Third-party requests were aborted.
- **Profiles:**
  - "desktop": 1440 × 900, no throttling.
  - "mobile-4g": 390 × 844, Lighthouse-style slow 4G (1.6 Mbps down, 150 ms RTT) with 4× CPU slow-down.
- **TBT~** is the sum of long-task time over 50 ms until about 3–6 s after load. It is a rough proxy for main-thread blocking, mostly React hydration here.
- **Script:** `ir_perf.mjs` (scratchpad).

| Page | HTML raw / gzip | Inline RSC data | JS transferred | DOM elements | Desktop LCP / TBT~ | Mobile-4G LCP / load / TBT~ |
|---|---|---|---|---|---|---|
| **/pakistan-interest-rate** | **1,417 KB / 149 KB** | **1,168 KB (82 % of HTML)** | 622 KB | **4,310** | 528 ms / **1,462 ms** | 6.4 s / 7.6 s / ~15.6 s |
| /pakistan-kibor-rates | 337 KB / 38 KB | 273 KB (81 %) | 768 KB | 849 | 352 ms / 403 ms | 3.7 s / 6.0 s / ~14.6 s |
| /pakistan-exports (template page, for reference) | 85 KB / 14 KB | 38 KB (45 %) | 559 KB | 615 | 292 ms / 137 ms | 4.4 s / 6.2 s / ~8.0 s |

CLS was 0.000 on all three pages, and TTFB was under 170 ms on all of them.

### Reading the results
- **Desktop.** The Interest Rate page paints fast. LCP is 0.5 s, because the server HTML already contains the content. However, it blocks the main thread about 10× longer than a simple page: TBT~ is 1.46 s against 0.14 s.
- **Mobile.** On a throttled mobile profile, every page is slow to become interactive. The shared JavaScript (about 500 KB transferred on every page) dominates, and the Interest Rate page adds the largest LCP.
- **Compressed size.** Gzip squeezes the HTML from 1.4 MB to 149 KB, so transfer is not the main cost.
- **The main cost** is the browser **parsing and hydrating** 1.17 MB of inline RSC data and 4,310 DOM elements. Most of those elements are SVG chart nodes.

## What makes it large

The inline RSC payload is the serialised props of the client chart components. Below is the serialised size of each view-model section, measured earlier this session on the same data (`buildDashboard()` and `loadPolicyRatePageData()`):

| Section (component) | Approx. size | What it is |
|---|---|---|
| `dashboard.auctions` (`AuctionYieldCurve`, `AuctionSpreads`) | ~248 KB | Every T-bill and PIB auction record since the series start, all tenors |
| `dashboard.kibor` (`KiborTenorChart`, `PolicyKiborSpread`) | ~234 KB | Daily KIBOR for every tenor, bid and offer |
| `dashboard.bank` (`BankRatesChart`) | ~159 KB | Monthly weighted-average lending and deposit rates, several series |
| `dashboard.overview` (`RateOverview`) | ~129 KB | Overview tiles, sparklines and the instrument switcher's series |
| `model` (policy-rate ledger: History, Decisions, Cycles, Inflation, International sections) | remainder | Every policy-rate change and meeting, inflation comparisons, international table |

Most of these series are **daily** or **per auction**, while the charts display them at a much coarser grain or over a selected window. The same objects are passed to two components; React's RSC serialiser sends each object once.

## Recommendations

These are ordered by benefit for effort. None of them removes a chart or a data point a reader can see.

1. **Downsample what the charts draw** (largest win, roughly 40–60 % of the RSC payload).
   - Send KIBOR as month-end values (or weekly) for the long-history view. Load daily values only for the window the reader zooms into.
   - Pre-aggregate auction cut-offs per month and tenor for the spreads chart.
   - The full-resolution data stays downloadable as CSV.
2. **Round numbers at serialisation.**
   - The page HTML contains 7,690 numbers with 4 or more decimals, including floating-point artifacts such as `212.79999999999998` and `195.17336715588183`. Rates are displayed to 2 dp.
   - Rounding to 2–3 dp in `buildDashboard()` and the page-data loader removes that excess, with no visible change.
   - Separately, the payload repeats a `"date"` key 10,709 times. Columnar arrays (one array of dates, one per series) would shrink it further.
3. **Defer below-the-fold charts.**
   - Render the sections after "Overview" as server HTML first.
   - Hydrate each chart when it scrolls into view, using a small client island with `IntersectionObserver`, or `next/dynamic` with a server-rendered placeholder of the same height so CLS stays at 0.
   - This cuts the hydration work behind TBT~ without changing what a crawler or a reader sees.
4. **Fetch the heaviest histories on demand.**
   - Serve the full auction history and daily KIBOR from a cached static JSON route, e.g. a `/data/interest-rates/*.json` file generated at build time.
   - Request it only when the reader opens the auction curve explorer or changes the KIBOR range.
   - Note: those routes must be public in `accessPolicy` if the page is.
5. **Reduce SVG node count.** Avoid drawing per-point dots on long daily series; draw them only on hover. Recharts' `dot={false}` with `activeDot` is the usual fix.
6. **Shared JavaScript (all pages).**
   - About 500–620 KB of JS is transferred even on a template page. That is the app shell, search, navigation and Recharts.
   - Check with `next build --experimental-debug` or a bundle analyser whether Recharts and GlobalSearch load on pages that don't need them at first paint.
   - This is the main mobile cost site-wide and is not specific to this page.

### Suggested target
Reach the KIBOR page's numbers on the Interest Rate page: under 400 KB HTML and under 1,500 DOM elements at first render, with TBT~ under 500 ms on desktop. Then confirm with field data (Vercel Speed Insights or Search Console Core Web Vitals) after release.

## Verifying after a change
- Run `ir_perf.mjs` (or Lighthouse in Chrome DevTools, mobile preset) against an isolated build before and after the change, and compare medians.
- After release, watch Core Web Vitals (LCP, INP, CLS) for `/pakistan-interest-rate` in Search Console or Speed Insights. That is the real-user data these lab numbers stand in for.
