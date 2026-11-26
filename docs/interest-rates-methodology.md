# Interest Rates & Monetary Policy: data, methodology and updates

This document describes how the data behind `/pakistan-interest-rate` is produced: the indicators, where each comes from, the rules applied to it and the formula for every derived value. It also explains how to refresh the data.

Two companion documents carry the detail:
- [docs/interest-rates-validation-report.md](interest-rates-validation-report.md) — the generated validation report: every check, count and finding.
- [docs/interest-rates-dashboard-audit.md](interest-rates-dashboard-audit.md) — the Stage 1 audit and the approved decisions.

## 1. Architecture

```
SBP website + SBP EasyData API
        │  scripts/fetchInterestRateSources.ts   (network, read-only; the only step that needs the EasyData key)
        ▼
data/sources/interest-rates/                      original files, byte for byte, plus verbatim EasyData extracts
        ├── sbp/*.xls, *.xlsx, *.pdf
        ├── easydata/<dataset>.csv
        └── manifest.json                         institution, URL, retrieval date, SHA-256, size, rows
        │  scripts/buildInterestRates.ts         (local, no network, no database, deterministic)
        ▼
src/data/interestRates/*.ts                       observed data only, each with source references and a rows digest
docs/interest-rates-validation-report.md          generated validation report
        │  src/lib/interestRates/dataset.ts       decoding + approved source hierarchy
        │  src/lib/interestRates/derived.ts       derived indicators (computed at read time, never stored with observations)
        │  src/lib/interestRates/analytics.ts     summaries, period comparisons, changes, correlations
        ▼
/pakistan-interest-rate
```

The datasets are version-controlled files. The page reads no database for them, so a Vercel Preview shows exactly what Production would show.

Nothing in this pipeline writes to Supabase, runs ingestion or changes a scheduler. The existing ledger-based policy-rate sections of the page are unchanged.

### Integrity
Four checks protect the data:
1. **Source fingerprints.** The build hashes every source file and stops if one differs from `manifest.json`.
2. **Row digests.** Every generated file records a SHA-256 of its rows (`rowsSha256`), and a test recomputes it.
3. **Rebuild test.** `scripts/buildInterestRates.test.ts` rebuilds every output from the committed sources and requires byte-identical results (after line-ending normalisation).
4. **Line endings.** `.gitattributes` marks `data/sources/**` as `-text`, so Git never changes the bytes.

As a result, any manual change to a source file, the manifest, a data file or the validation report fails the test suite until the pipeline is re-run.

## 2. Indicators

All rates are percent per annum. A missing observation is absent or `null`, never zero, and nothing is interpolated or extrapolated.

### A. SBP monetary policy (administered rates)

| Indicator | Definition | Frequency | Coverage | Source |
|---|---|---|---|---|
| **Reverse repo rate (ceiling)** | The rate at which SBP lends overnight against collateral: the corridor's ceiling. | Each date the rate took a value | 10 Oct 1991 – | EasyData `TS_GP_IR_SIRPR_AH.SBPOL0010` |
| **Repo rate (floor)** | The rate SBP pays on overnight deposits: the corridor's floor. | as above | 17 Aug 2009 – | `SBPOL0020` |
| **Policy (target) rate** | The rate set by SBP's Monetary Policy Committee for the overnight money market. | as above | 25 May 2015 – | `SBPOL0030` |

Notes on the reverse repo rate:
- Before 17 Aug 2009 it was the 3-day repo facility rate.
- From 17 Aug 2009 it is the overnight reverse repo.
- It served as SBP's policy rate until 24 May 2015.
- The policy (target) rate replaced it in that role on 25 May 2015 (DMMD Circular 9 of 2015).

The "policy rate" therefore means two different instruments over time:
- **Until 24 May 2015:** the reverse repo rate (ceiling).
- **From 25 May 2015:** the target rate, inside a corridor (currently ±100 bp).

The dashboard never presents them as one instrument. Each record carries its instrument, and charts mark the change on 25 May 2015.

Each record is a date the rate took a value, not a list of MPC meetings: meetings that held the rate are not in SBP's series. SBP's records on 17 Apr and 18 May 2020 repeat the previous value and are kept as recorded.

**Corridor width** = ceiling − floor (see derived indicators).

### Market rates

| Indicator | Definition | Frequency | Coverage | Source |
|---|---|---|---|---|
| **Weighted-average overnight repo rate** | The volume-weighted rate on overnight interbank repo trades: a market rate, not an administered one. | Business days | 25 May 2015 – | EasyData `TS_GP_IR_REPOMR_D.ORR` |
| **KIBOR (offer)** 1W, 2W, 1M, 3M, 6M, 9M, 1Y | Karachi Interbank Offered Rate: the average of quotes from contributing banks at which they would lend to each other. KIBOR is benchmarked under SBP's framework, but it is **not set by SBP**. | Business days | 9 Jun 2005 – | EasyData `TS_GP_BAM_SIRKIBOR_D` |
| KIBOR 2Y, 3Y | As above, discontinued. | Business days | 9 Jun 2005 – 4 Feb 2020 | as above |

### B. OMO

| Indicator | Definition | Frequency | Coverage | Source |
|---|---|---|---|---|
| **OMO injections** | Reverse repo auctions in which SBP lends liquidity to banks: date, tenor (days), amounts offered and accepted, bid quote range and cut-off rate. | Per operation | May 2008 – | SBP `OMO-Inject-Hist.xlsx` |
| **OMO mop-ups** | Repo auctions in which SBP absorbs liquidity. | Per operation | May 2008 – | SBP `OMO-MopUp-Hist.xlsx` |

OMO cut-off units:
- SBP stores the cut-off as a **fraction** (0.1201) but prints the bid quotes in **percent** (12.09).
- The build multiplies the cut-off by 100, rounded to remove binary noise.
- It stops if any cut-off is ≥ 1, i.e. already a percent.
- It also stops unless every converted cut-off with a printed quote range lies inside that range. On 26 Nov 2026 that held for 707 of 707 operations.

### C. Government securities (primary-market auction yields)

| Indicator | Definition | Source and approved hierarchy |
|---|---|---|
| **T-bill cut-off yield**, 1M (from Mar 2025), 3M, 6M, 12M | The highest yield SBP accepted at the auction. | SBP `tb.xlsx` from 9 Jul 2014; EasyData `TB0010/20/30` before. |
| **T-bill weighted-average yield** | The average of the accepted yields, weighted by amount. | SBP `tb.xlsx` from 9 Jul 2014; EasyData `TB0040/50/60` before. |
| **PIB cut-off and weighted-average yields**, 2Y, 3Y, 5Y, 10Y, 15Y | As above, for fixed-coupon Pakistan Investment Bonds. | SBP `Pakinvestbonds.xlsx` from 9 Jul 2024. Before that, EasyData `PIB0010-0160`. The 2-year PIB comes from the SBP file only, because EasyData has 5 of 24 values. |
| PIB 7Y, 20Y, 30Y | As above. | EasyData only. The series are sparse, and the 30-year weighted average is entirely missing. |

Rules for these series:
- Cut-off and weighted-average yields are **separate series and are never combined**.
- Auction yields are **not** secondary-market yields. The dashboard's curve is titled "Government Securities Auction Yield Curve", and it combines the latest auction of each tenor, which can be days or weeks apart.
- PKRV (MUFAP's secondary-market revaluation curve) is **excluded by decision**.

### D. Banking rates

Source: SBP `Lendingdepositrates_Arch.xls` (the full history), cross-checked against `Lendingdepositrates.pdf` and `sir.pdf`.

| Indicator | Definition |
|---|---|
| **WALR, new** | Weighted-average lending rate on **gross disbursements** during the month: fresh loans plus loans repriced, renewed or rolled over. |
| **WALR, outstanding** | Weighted-average lending rate on **loans outstanding** at month-end. |
| **WADR, new** | Weighted-average deposit rate on **fresh deposits** collected during the month, including repriced and rolled-over deposits. |
| **WADR, outstanding** | Weighted-average deposit rate on deposits held at month-end. |

Each measure is published four ways: including or excluding zero mark-up (non-remunerative loans and deposits), and including or excluding inter-bank (inter-FI) placements.

The **headline analytical series** is scheduled banks, zero mark-up included, inter-FI included. This is the same basis as SBP's "Overall Weighted Average Rates" in `sir.pdf`.

**Methodological regimes.** They are stored with every row and **never spliced**:

| Regime | Period | What it covers |
|---|---|---|
| 1 | Jun 1997 – Dec 2003 | Half-yearly to Dec 2001, then monthly. "All Groups" only. Lending rate on a flow basis; deposit rate on a stock basis, from Jun 1999. Shown separately. |
| 2 | Jan 2004 – Dec 2010 | Monthly, "All Banks". Four measures, incl/excl zero mark-up. Inter-bank placements are included and there is no split. |
| 3 | Jan 2011 – Jun 2022 | As regime 2, plus the incl/excl inter-bank split. |
| 4 | Jul 2022 – | The reporting universe is widened to financial institutions. "Scheduled Banks" equals the former "All Banks"; DFIs, MFBs and an all-FI total are added. Inter-FI split. Definitions revised: non-resident lending included, foreign bills excluded. From Jul 2024, "FIs" means all financial institutions (SBP note 12). |

Two further rules:
- The all-FI total exists only from Jul 2022 and is shown as a separate line, never joined to scheduled banks.
- SBP's flags are kept: **P** = provisional (Oct 2026), **R** = revised (Aug 2026).

### E. Inflation (input to real rates only)

National CPI, year on year, 2015-16 base: EasyData `TS_GP_PT_CPI_M.P00011516`, monthly from Jul 2016. The older-base index is not on EasyData and is not spliced on, so **real rates start in Jul 2016**.

## 3. Derived indicators

Derived indicators are computed in `src/lib/interestRates/derived.ts` and stored separately from the observations. Each value exists only where every input exists for the same date or month. The policy rate enters as the value **in force** on the observation date, which is a property of an administered step series and not an interpolation.

| Indicator | Formula | Frequency |
|---|---|---|
| Real policy rate (ex post) | ((1 + policy rate in force on the last day of month m) ÷ (1 + CPI YoY for m) − 1) × 100 — the exact (Fisher) relation used throughout the page; the simple difference is only an approximation and is poor when inflation is high | monthly, Jul 2016 – |
| Real KIBOR | ((1 + mean of the daily KIBOR fixings published in month m) ÷ (1 + CPI YoY for m) − 1) × 100 (the number of fixings is shown) | monthly |
| Policy − KIBOR | policy rate in force on day d − KIBOR fixing on d | daily |
| Policy − 3M T-bill | policy rate in force on the auction date − that auction's 3M cut-off yield | per auction |
| Lending − deposit spread | WALR − WADR on the same basis (new vs new, outstanding vs outstanding), entity, zero-mark-up and inter-bank treatment, same month | monthly |
| Term spread | 10Y PIB cut-off − 3M T-bill cut-off, using the nearest T-bill auction on or before the PIB auction and no more than 7 days earlier | per PIB auction |
| Corridor width | reverse repo (ceiling) − repo (floor), both in force | on change, 17 Aug 2009 – |
| Overnight repo position | overnight repo rate − policy rate in force | daily |

**Frequency transformations.** The only one used is the monthly mean of a daily series. It averages only the days actually published and always reports the day count. It reproduces SBP's own published KIBOR monthly averages exactly wherever EasyData has the same fixing days (validation report §7).

**Analytics** (`analytics.ts`):
- Summaries report latest, mean, minimum and maximum, with dates and n.
- Changes are given in percentage points and basis points.
- Correlations use Pearson r with n.
- Lag analysis covers 1, 3, 6 and 12 months, on monthly series only (the function refuses any other key format).

A correlation describes co-movement in this sample. It does not show that one rate causes another.

## 4. The dashboard (`/pakistan-interest-rate`)

The page is grouped into parts. Sections marked *ledger* are the earlier policy-rate sections; they still read the PEIC data ledger and are unchanged. All other sections read the fixed datasets described above.

| Part | Section | Content |
|---|---|---|
| Overview | `#overview` | The existing headline KPIs (*ledger*), plus new tiles: corridor, overnight repo rate, 6M KIBOR, 3M T-bill cut-off, lending rate on new loans, deposit rate on fresh deposits. Each tile shows its own date. |
| | `#rates-overview` | **Chart 1**: policy rate, 3M and 6M KIBOR, and 3M T-bill cut-off. Has series toggles and range controls. The 2-year view shows daily fixings; longer views show monthly averages. |
| SBP monetary policy | `#history`, `#changes`, `#cycles` | *Ledger*, unchanged. |
| | `#corridor` | Ceiling, target and floor, plus the overnight repo rate. |
| | `#omo` | OMO cut-offs against the corridor (last 3 years), the 25 latest operations, and operations per year. |
| KIBOR | `#kibor` | **Chart 2**: tenor comparison, either across tenors on chosen dates or chosen tenors over time. |
| | `#kibor-spread` | **Chart 3**: policy − KIBOR, 6M and 3M. |
| Government securities | `#auction-curve` | **Chart 4**: the "Government Securities Auction Yield Curve". It reuses the Bond Yields curve explorer, which offers date-versus-date comparison and a cut-off or weighted-average switch. It is fed from this dataset's SBP auction files, which run to 25 Nov 2026. |
| | `#auction-spreads` | Policy − 3M T-bill, and 10Y − 3M. |
| Banking rates | `#banking` | **Chart 6**: WALR, WADR and the spread. Options: new or outstanding business, zero mark-up included or excluded, and an optional all-FI line. Regime breaks are marked. The 1997–2003 table is kept separate. |
| Real interest rates | `#real` | **Chart 5**: policy rate, inflation and the real policy rate, plus real policy rate against real 6M KIBOR. |
| | `#inflation` | *Ledger*, unchanged. |
| Analysis | `#transmission` | **Chart 7**: monthly policy rate, 6M KIBOR, WALR new and WADR new. Includes a lag-correlation table (lags 0, 1, 3, 6 and 12 months, with n) and a statement that correlation is not causation. |
| | `#analytics` | Spread statistics (latest, mean, min and max with dates, and n); changes in pp and bp over 1 and 3 years; and period comparisons over defined calendar windows. |
| | `#international`, `#findings` | *Ledger*, unchanged. |
| Data | `#coverage` | Coverage matrix (observed and derived), plus limitations. |
| | `#methodology`, `#faq` | Existing sections, with their wording corrected where it would now be false. |

Every chart has a "Download CSV" button. The file begins with comment lines giving the source, retrieval date and definitions. The page reads no database for these datasets, so a Vercel Preview shows the same figures Production would. The *ledger* sections behave as before: on a Preview connected to an empty database, they show their existing fallbacks.

Two earlier sections are no longer on the page; their components are kept in the repository:
- **"Policy rate and market yields"** (two ledger maturities) is superseded by the Government Securities part.
- **"Nominal and real policy rate"** is superseded by `#real`, which uses the same Fisher formula.

## 5. Updating the data

1. `npx tsx scripts/fetchInterestRateSources.ts --retrieved <today>`
   - This downloads the SBP files and the EasyData series and rewrites `manifest.json`.
   - It needs `SBP_EASYDATA_API_KEY` in `.env.local`. Only that variable is read, and it is never printed.
   - It stops, instead of substituting anything, when a file is not the expected type or a request fails.
2. `npx tsx scripts/buildInterestRates.ts`
   - This verifies the fingerprints, parses, validates and writes `src/data/interestRates/*.ts` and the validation report.
   - Read the report, and especially the sections on exclusions, source transitions and independent checks.
3. `npx vitest run scripts/buildInterestRates.test.ts src/lib/interestRates`
   - The pinned validation counts will fail where the new data changed them.
   - Review each change, then update the pinned values in `scripts/buildInterestRates.test.ts` and the hand-checked values in `src/lib/interestRates/derived.test.ts`.
4. Commit the sources, the manifest, the generated files and the report together.

The existing Bond Yields workshop (`src/data/govSecAuctions.ts`) has its own generator and hand-checked tests. Refreshing it is a separate decision.

## 6. Known limitations and unavailable indicators

- **Secondary-market yields (PKRV):** not used, by decision. No daily market yield curve exists from an official SBP source.
- **CPI before Jul 2016** (2015-16 base): not available, so real rates start in Jul 2016.
- **KIBOR gaps:** EasyData lacks some fixing days that SBP's PDF prints (13 and 20 Oct 2026 are confirmed). They are left missing, not filled from the PDF, and monthly averages show their day count.
- **KIBID** (bid side) is not included in this release. KIBOR 2Y and 3Y end in Feb 2020.
- **Bank-group detail** of lending/deposit rates (public, private, foreign, specialized, DFIs, MFBs) is in the source workbook but not stored in this release.
- **EasyData quality issues** (validation report §5–6):
  - 109 observations are marked "Missing value" despite a printed value.
  - One implausible value: the 6M T-bill weighted average on 5 Dec 2007.
  - Some auctions are dated by settlement day.
  - Some values differ from SBP's own auction files.
- **Policy-rate date:** EasyData dates the latest change 26 Oct 2026, while SBP's `sir.pdf` says w.e.f. 27 Oct 2026. EasyData's date is shown and the difference is noted.
- **`sir.pdf` T-bill weighted averages** for Feb–Aug 2025 are printed one row late. SBP's `tb.xlsx` is used.
- **Standing-facility usage** (amounts taken at the ceiling and floor, from `IR-Corridor-Hist.xls`) is available from SBP but not included.
