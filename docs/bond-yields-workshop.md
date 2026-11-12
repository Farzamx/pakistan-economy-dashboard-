# Bond Yields workshop: data, architecture, methodology and limits

> **Access (G.14):** this page is currently closed to the public: only the Overview is open, and every other route redirects to `/overview` (see [access-policy.md](access-policy.md)). The implementation, data, tests and this document are unchanged and kept for a possible reopening.

Route: `/pakistan-bond-yields` (the original route, upgraded in place: same URL and canonical, no second bond route).
Built on the pattern of the Interest Rate page ([interest-rate-page.md](interest-rate-page.md)) and the shared chart toolkit in `src/components/analytics/`.

Figures below are "as of 12 November 2026", the day the archives were read. The page computes every such figure from the data it receives and never types one in.

## 1. What the page shows

| Section (anchor) | What it shows |
|---|---|
| Latest auctions (`#latest`) | One tile per headline tenor: the yield at that tenor's most recent auction, the previous one, the change, its auction date. A cut-off / weighted-average switch drives every figure and chart on the page. A tenor whose newest auction produced no yield shows its last accepted yield, dated, with a warning. A stale-data warning appears once the archive is more than 21 days old. |
| Yield curve explorer (`#curve`) | **Signature visualization.** Yield by maturity for one auction, on a square-root maturity axis. Views: T-bills, PIBs, or both. Compare with: the previous auction, 6 or 12 months earlier, the highest- or lowest-yield auction, or nothing. Date slider, previous/next, jump to a year, optional playback. Panels: the curve's shape (upward / flat / inverted, with the slope in bp), and a per-tenor change table in bp. Tooltips give maturity, yield, date and source; a tenor with no yield is marked, never drawn at zero. |
| Yield history (`#history`) | Every auction since 2014, by tenor, beside the policy rate and the spread to it. |
| Curve shape over time (`#term`) | The slope (T-bills 12M minus 3M, PIBs 10Y minus 3Y) as a series, and a strip of when the curve was inverted, flat or upward. |
| Auction demand (`#auctions`) | Bids offered, accepted and the target, per tenor (the Auction Flow Explorer). |
| What the auctions show (`#findings`) | Rule-built findings, each with its figures and caveat behind a disclosure. |
| Sources and method (`#sources`) | Three always-visible lines (source, what the yields are, coverage) and three labelled disclosures (definitions, data limits, source files and checks). |
| Questions (`#faq`) | Five questions as an accordion; also emitted as JSON-LD from the same array. |

Every chart has a title, a one-line "how to read it", units, a source line and its numbers as a table.

## 2. Architecture

```
SBP public workbooks ──(scripts/buildGovSecAuctions.ts, run by hand)──> src/data/govSecAuctions.ts   (generated, committed)
                                                                              │
src/lib/bonds/dataset.ts   decode tuples -> AuctionRecord[]  (outcome codes, nulls; never zeros)
src/lib/bonds/analytics.ts curves, slope, shape, regimes, comparisons, flow rows, pairing (pure)
src/lib/bonds/snapshot.ts  latest-auction tiles, findings, freshness, method facts (pure)
src/lib/bonds/curveExplorerModel.ts / curveGeometry.ts   explorer state and SVG geometry (pure)
src/lib/bonds/rowsDigest.ts   integrity digest of the stored rows
                                                                              │
src/app/pakistan-bond-yields/page.tsx   server component; policy rate read through the existing ledger path
src/components/bonds/*                  client components get the data as props; none imports @/data
```

* **No database write, migration, RPC, scheduler or ingestion script is involved.** The page reads a static generated module. The policy rate for the comparison comes from the existing `getSbpIndicatorHistory("policyRate")` (ledger-first; a static fallback snapshot counts as unavailable and the comparison is simply omitted).
* **No new dependency.** `xlsx` and `unpdf` were already declared; the generator uses `xlsx`.
* Revalidation: `revalidate = 3600`.
* The page keeps working with the policy rate unavailable.

## 3. Data inventory and verified coverage

| Instrument | Source file | Sheet read | Auctions | Coverage |
|---|---|---|---|---|
| T-bills (1, 3, 6, 12 months) | `https://www.sbp.org.pk/assets/document/tb.xlsx` | "New Detailed Format" | 324 | 9 Jul 2014 to 11 Nov 2026 |
| Fixed-coupon PIBs (2, 3, 5, 10, 15 years) | `https://www.sbp.org.pk/assets/document/Pakinvestbonds.xlsx` | "New Format" | 29 | 9 Jul 2024 to 4 Nov 2026 |

Per tenor and auction the archive carries: cut-off yield, weighted-average yield, competitive bids offered, competitive and non-competitive bids accepted (PIBs: short sales), the government's target and an outcome code. Yields are percent per annum to four decimals as SBP prints them; amounts are PKR million face value.

Coverage facts the page states (computed, not typed):

* Tenors without a yield (failed auctions), by tenor. T-bills: 12M 80, 6M 40, 3M 3, 1M 1. PIBs: 15Y 12, 10Y 4, 2Y 3, 3Y 2, 5Y 1. These are gaps in every chart and never zeros; lines are not joined across them.
* 243 of 324 T-bill auctions have a slope, because both the 3-month and 12-month tenors need a yield.
* PIB detail (cut-off yield, offered and accepted amounts) starts 9 Jul 2024, where SBP's detailed archive begins. The 1-month bill exists from March 2025.
* The per-tenor target exists from September 2019; before that SBP published only a combined target.
* 9 accepted tenors have no non-competitive figure in SBP's file, so their accepted total covers competitive bids only.
* One row was left out of the T-bill series because it is off the standard tenor grid: the 22-day bill of 18 Jun 2025. It is listed on the page.

### Source register

| File | sha256 | Last-Modified (SBP header) | Retrieved |
|---|---|---|---|
| tb.xlsx | `b86f5e26629441d91148d35512b0ead3e74952312fa0ec051423b4ba7cefba51` | Thu, 12 Nov 2026 10:39:55 GMT | 12 Nov 2026 |
| Pakinvestbonds.xlsx | `1af701dda7a2724f067ebb184ab7796f56efd9d77e5b34ab221787d2ceba0216` | Tue, 10 Nov 2026 11:07:57 GMT | 12 Nov 2026 |

The same register is in the header of `src/data/govSecAuctions.ts` and on the page. The stored rows carry their own digest (`rowsSha256` in the data file's provenance); a test recomputes it, so editing a value by hand fails the build until the file is regenerated.

### Why the archives, and not EasyData

The ledger holds two bond series (3-month T-bill and 3-year PIB weighted-average yield, from SBP EasyData). They cannot draw a yield curve: only two maturities, no cut-off yield, no amounts. SBP's own auction archives carry every tenor and are more complete and more precise. Checked against EasyData's 3-month series (`TS_GP_BAM_SIRTBIL_AH.TB0040`):

* EasyData rounds to two decimals; the archive has four.
* EasyData lacks some auctions and dates a few values a day or more after the auction date.
* EasyData is behind Cloudflare: plain Node `fetch` is refused (HTTP 403); a browser-style client is not. This is why the generator reads files you download rather than calling a host.

The latest T-bill and PIB auctions were also checked line by line against SBP's published auction-result PDFs (`https://www.sbp.org.pk/assets/document/auction-tbills.pdf` and `https://www.sbp.org.pk/assets/document/Auction-Investment.pdf`). The workbooks' older sheets (weighted-average yield only; PIB rows dated by settlement day, with mixed layouts) are deliberately **not** read: merging them would put a different yield definition and a different date convention into one series.

## 4. Definitions and calculations

* **Cut-off yield**: the highest yield SBP accepted at an auction (its headline figure). **Weighted-average yield**: the average over accepted bids, weighted by amount. They are never mixed in one line; one switch sets both the figures and the charts.
* **Auction date** is the day bids are taken (charts use it); **settlement date** is when the securities are issued (T-bills 0 to 8 days later, PIBs 1 to 4).
* **A curve is the tenors of ONE auction.** T-bills and PIBs are auctioned on different days, so the combined view pairs each T-bill auction with the nearest PIB auction **within 14 days** and states the gap. It is not a simultaneous curve; nothing is interpolated; the line breaks at a tenor with no yield.
* **Slope**: T-bills 12-month minus 3-month; PIBs 10-year minus 3-year. **Inverted**: at least 10 bp below zero. **Flat**: within 10 bp. **Upward**: at least 10 bp above. A change of at least 10 bp in the slope between two curves is steepening or flattening.
* **Offered** is competitive bids received. **Accepted** is competitive plus non-competitive (plus short sales for PIBs), at face value.
* The maturity axis is square-root scaled so the 1-month bill and the 15-year bond share one axis legibly; the axis is labelled with the true maturities.
* Playback steps through auctions in date order, never auto-plays, is switched off under `prefers-reduced-motion`, and holds the y-axis fixed while playing so no value is exaggerated by rescaling.

### Verification record (12 Nov 2026)

* **Provenance.** Both workbooks were downloaded again from `sbp.org.pk`; their SHA-256 and Last-Modified headers equal the register above. Re-parsing the fresh files reproduces the stored `rowsSha256` exactly (`269d7edf…1420`), so the stored data is what the official files contain.
* **Counts.** 324 T-bill auctions (SBP's older sheet lists 325 in the same period: the extra one is the excluded 22-day bill) and 29 PIB auctions (137 dated tenor rows in the new sheet, 137 stored tenor results).
* **Second record inside the T-bill workbook.** The "Old Format" sheet records weighted-average yields for the same auctions. Of 883 weighted-average yields compared, 881 equal ours to four decimals. The two differences are SBP's own: a digit transposition on 4 Jan 2017 (old sheet 5.9643, detailed sheet and EasyData 5.9463) and a last-digit rounding on 3 Jul 2019 (12.7422 against 12.7421).
* **Date conventions differ between SBP's sheets.** For auctions 495 (30 Aug 2017) and 608 (29 Dec 2021) the old sheet gives the issue date, the detailed sheet the auction date; this page uses the auction date. For auction 546 the detailed sheet says 15 Aug 2019 (a Thursday, consistent with the biweekly Wednesday cycle moving for 14 August and with the bill's 7 Nov 2019 maturity), while the old sheet and EasyData say 7 Aug 2019. This page follows the detailed sheet; the disagreement is SBP's.
* **Failed auctions.** 1,007 tenor results accepted, 74 bids rejected, 68 no bids received, 4 none accepted. None carries a yield; none is zero. The only zero values in any source are EasyData's (it records a failed auction as 0 on 18 Sep 2024).
* **EasyData cross-check (3-month, 326 rows).** 303 equal the archive exactly or after rounding to two decimals; 12 are dated a few days away from the auction; 7 differ by more than rounding (EasyData repeats a neighbouring auction's value, for example 15 Apr 2026: EasyData 11.72, the old sheet and the detailed sheet 11.4295); 2 are EasyData zeros. This is why the page does not use EasyData for these series.
* **Latest auctions against SBP's published PDFs.** All 8 T-bill values (11 Nov 2026) and all 8 PIB values (4 Nov 2026) appear in the PDFs; the 15-year bond is shown as rejected in both.

## 5. Not shown, and why

* **Real (inflation-adjusted) yields**: they need an inflation figure dated to the same auction; none is held at that granularity.
* **Secondary-market yields and the PKRV curve**: different series, not held.
* **A simultaneous government yield curve**: the two instruments are auctioned on different days.
* **PIB history before July 2024** at cut-off precision: SBP's detailed archive begins then.
* **Floating-rate PIBs and other government securities** (for example Ijara sukuk): not read. Only fixed-coupon PIBs are included, from the sheet named above.

## 6. Updating the data

The archive is refreshed by hand after SBP publishes new auctions (T-bills fortnightly). The page warns once the archive is more than 21 days old.

```
# 1. download the two public files (no key needed)
curl -o tb.xlsx   https://www.sbp.org.pk/assets/document/tb.xlsx
curl -o Pakinvestbonds.xlsx https://www.sbp.org.pk/assets/document/Pakinvestbonds.xlsx
# 2. regenerate (local and read-only; writes one TypeScript file; add --check to write nothing)
npx tsx scripts/buildGovSecAuctions.ts --tb tb.xlsx --pib Pakinvestbonds.xlsx --retrieved YYYY-MM-DD \
  --tb-modified "<Last-Modified header>" --pib-modified "<Last-Modified header>"
# 3. read the report it prints (counts, excluded rows, warnings, data-quality findings), then run the tests
npx vitest run src/lib/bonds src/components/bonds scripts/buildGovSecAuctions.test.ts
```

Some tests pin the newest auctions' figures (for example the latest 3-month cut-off) and will need updating when a new auction arrives; that is intended. The integrity test needs nothing: regenerating records a fresh digest.

## 7. Proposed ledger-ingestion extension (NOT executed)

Documented for a separate, explicitly authorised decision. **Nothing below has been run, written or merged. No migration, RPC, scheduler or production write was made.**

Goal: let the ledger (`raw_observations`, `canonical_observations`) carry every tenor, so the page can read the ledger like the Inflation and Interest Rate pages do, and the static file can be retired.

* Add provider series for each tenor and yield definition (for example `sbp:tbillYield1m`, `sbp:tbillYield6m`, `sbp:tbillYield12m`, `sbp:pibYield2y`, `sbp:pibYield5y`, `sbp:pibYield10y`, `sbp:pibYield15y`, plus cut-off variants and the amounts), registered through the existing provider registry and ingestion architecture, not a parallel one.
* The source would be the SBP workbooks (EasyData's rounding, gaps and date shifts make it the wrong source for these series). That needs an ingestion path that can reach `sbp.org.pk` from the scheduled runner; the Cloudflare behaviour documented in [sbp-host-connectivity-test.md](sbp-host-connectivity-test.md) applies and must be tested read-only first.
* Failed tenors must be stored as an outcome, not as a value; the ledger's null semantics already allow this.
* Open decisions for the owner: series keys and naming; whether the 3-month and 3-year series already in the ledger are re-pointed or kept (they are used by the Interest Rate page, so any change must keep their values identical); backfill policy (a one-off, separately authorised); the scheduler cadence (fortnightly after SBP's auction calendar); the freshness registry entries and alert thresholds.
* Until then the static generated file is the single source for this page, with provenance and an integrity digest.

## 8. Tests

* `src/lib/bonds/*.test.ts`: workbook parsers (real sheet shapes), dataset decoding, analytics (curves, slope, shape, regimes, comparison, pairing, flow), explorer model and geometry, snapshot and findings.
* `src/components/bonds/bonds.test.ts`: server-rendered components and page: sections, definition switch, stale-data warning and its threshold, missing-value wording, disclosures keep their text in the markup, no component imports the data file, nothing writes data.
* `scripts/buildGovSecAuctions.test.ts`: generator helpers, the round trip of every committed row, the integrity digest, and that the generator is local and read-only.
* Mutation checks were run against the page's key behaviours (corrupt a yield, read a failed tenor as zero, join a line across a gap, change the stale threshold, remove the stale warning, loosen the inversion threshold, widen the pairing window, swap the yield definitions, write in `--check` mode, import the data file from a component, empty the FAQ); every one was caught, and each edited file was restored byte-identical (sha256 verified).

## 9. Platform changes made alongside this page

* **Navigation**: the Fed Funds Rate (covered by the Interest Rate workshop's US comparison) and the two budget explainers (covered by the Budget Tracker) no longer have menu entries. Routes, SEO entries and content are unchanged; search aliases lead to the workshops; the Interest Rate page links to the Fed Funds page from its US-comparison section. Fiscal Deficit stays (it is the actual balance; the Budget Tracker shows the budgeted one). The registry is `src/lib/appNav.ts` (`CONSOLIDATED_INTO_*`).
* **Content**: long explanations moved behind labelled disclosures on the Inflation, Interest Rate, Budget, GDP, Download Datasets and Macro Intelligence pages, using shared `Disclosure`, `FaqAccordion` and `LeadMore` (in `src/components/shell/Disclosure.tsx`) and a first-sentence-first `howToRead` in `ChartFrame`. Units, definitions, source attribution, coverage, freshness, missing-data notes, methodology and limitations are kept; their text is in the page's HTML.
