# Interest Rates & Monetary Policy Dashboard — Stage 1 audit and coverage report

Status: **Stage 1 (audit and research) complete; awaiting owner approval before Stage 2 (data integration).**
Branch: `feat/interest-rates-dashboard` (from `main` 2bee856). Nothing in this stage writes to any database, runs ingestion, or changes access rules.
Research date: 26 Nov 2026. Every coverage figure below was read from the source itself on that date.

## 1. What the current `/pakistan-interest-rate` page holds

| Series | Where it comes from | Notes |
|---|---|---|
| SBP policy (target) rate | ledger `sbp:policyRate` ← EasyData `TS_GP_IR_SIRPR_AH.SBPOL0030` | ledger holds 23 May 2016 – 26 Oct 2026 (38 obs); EasyData itself now starts 25 May 2015 (40 obs) |
| 3M T-bill | ledger ← EasyData `TS_GP_BAM_SIRTBIL_AH.TB0040` | **weighted-average** yield (see conflict C5) |
| 3Y PIB | ledger ← EasyData `TS_GP_BAM_SIRPIBS_AH.PIB0080` | weighted-average yield |
| CPI YoY | ledger ← EasyData `TS_GP_PT_CPI_M.P00011516` | used for the real rate |
| Every T-bill/PIB auction | static `src/data/govSecAuctions.ts` (SBP `tb.xlsx`, `Pakinvestbonds.xlsx`, sha256 digest) | Bond Yields workshop; 324 T-bill auctions 2014–2026, 29 PIB auctions 2024–2026 |

Not held anywhere: KIBOR, the corridor (ceiling/floor), overnight repo rate, OMO results, lending/deposit rates.

## 2. Coverage matrix (official sources only)

"EasyData" = SBP EasyData API (`easydata.sbp.org.pk/api/v1/series/{key}/data`). "SBP file" = files published at `sbp.org.pk/assets/document/…` (the newer copies; the `archive.sbp.org.pk/ecodata/` mirror lags by months).

### A. SBP monetary policy

| Indicator | Source / code | Freq. | Coverage | Obs | Observed / derived |
|---|---|---|---|---|---|
| Reverse repo (ceiling) rate — the policy rate until 24 May 2015 (3-day repo facility before 17 Aug 2009) | EasyData `TS_GP_IR_SIRPR_AH.SBPOL0010` | on change | 10 Oct 1991 – 26 Oct 2026 | 90 | observed |
| Repo (floor) rate | EasyData `SBPOL0020` | on change | 17 Aug 2009 – | 57 | observed |
| Policy (target) rate | EasyData `SBPOL0030` | on change | 25 May 2015 – | 40 | observed |
| Corridor width | derived: ceiling − floor | on change | 17 Aug 2009 – | — | derived |
| Weighted-average overnight repo rate | EasyData `TS_GP_IR_REPOMR_D.ORR` | daily | 25 May 2015 – 24 Nov 2026 | 2,797 | observed |
| OMO injections (reverse repo): date, tenor, offered, accepted, quote range, cut-off | SBP file `OMO-Inject-Hist.xlsx` | per operation | May 2008 – 20 Nov 2026 | ~1,700 rows | observed |
| OMO mop-ups (repo) | SBP file `OMO-MopUp-Hist.xlsx` | per operation | May 2008 – 22 Apr 2026 | ~600 rows | observed |
| Standing-facility usage (ceiling/floor amounts, institutions) | SBP file `IR-Corridor-Hist.xls` | daily, on use | Aug 2009 – 26 Nov 2026 | ~2,300 | observed (volumes, **not** rates) |

### B. KIBOR (offer side = official KIBOR; bid side = KIBID)

| Tenor | EasyData code (`TS_GP_BAM_SIRKIBOR_D.`) | Coverage | Obs |
|---|---|---|---|
| 1W / 2W | `1KIBOR1W` / `2KIBOR2W` | 9 Jun 2005 – 25 Nov 2026 | ~5,575 each |
| 1M / 3M / 6M | `KIBOR0010` / `KIBOR0020` / `KIBOR0030` | same | same |
| 9M / 1Y | `6KIBOR9M` / `7KIBOR12M` | same | same |
| 2Y / 3Y | `8KIBOR2Y` / `9KIBOR3Y` | ends 4 Feb 2020 (discontinued) | — |
| KIBID 1W…3Y | `10KIBID1W` … `18KIBID3Y` | same span | — |

KIBOR is the average of quotes submitted by contributing banks, administered under SBP's KIBOR framework. It is **not** a rate set by SBP, and the page will say so.

### C. Government securities

| Indicator | Source / code | Freq. | Coverage | Normal obs |
|---|---|---|---|---|
| T-bill cut-off 3M / 6M / 12M | EasyData `TS_GP_BAM_SIRTBIL_AH.TB0010` / `TB0020` / `TB0030` | per auction | 24 Jun 2004 – 14 Oct 2026 | 586 auction rows; 41–132 missing per tenor (tenor not offered) |
| T-bill weighted average 3M / 6M / 12M | `TB0040` / `TB0050` / `TB0060` | per auction | same | same |
| T-bill auctions (all tenors, amounts) | SBP file `tb.xlsx` (already in repo) | per auction | 2014 – 11 Nov 2026 | 324 |
| PIB cut-off 3/5/7/10/15/20/30Y | EasyData `TS_GP_BAM_SIRPIBS_AH.PIB0010`–`PIB0070` | per auction | 14 Dec 2000 – 7 Oct 2026 | 3Y 183, 5Y 193, 7Y 9, 10Y 173, 15Y 36, 20Y 41, 30Y 18 |
| PIB weighted average 3…30Y | `PIB0080`–`PIB0140` | per auction | same | 30Y entirely missing |
| PIB 2Y cut-off / weighted average | `PIB0150` / `PIB0160` | per auction | 18 Oct 2024 – | 5 of 24 normal (see C3) |
| PIB auctions (all tenors) | SBP file `Pakinvestbonds.xlsx` (already in repo) | per auction | Jul 2024 – 4 Nov 2026 | 29 |
| **Secondary-market yields (PKRV)** | MUFAP (not SBP) | daily | — | **not available from an official SBP source** |

### D. Banking rates

| Indicator | Source | Freq. | Coverage |
|---|---|---|---|
| Weighted-average lending rate (WALR): gross disbursements (new) and outstanding loans; incl./excl. zero mark-up; incl./excl. inter-FI; by bank group | SBP file `Lendingdepositrates_Arch.xls` (sheets 2004–10, 2011–Jun 22, Jul 22 →) + monthly `Lendingdepositrates.pdf` | monthly | Jan 2004 – Oct 2026 (Oct 2026 provisional); half-yearly Jun 1997 – Dec 2003 |
| Weighted-average deposit rate (WADR): fresh and outstanding; same splits | same | monthly | same (deposit side starts Jun 1999 in the half-yearly sheet) |
| Lending − deposit spread | derived | monthly | as above |

Methodology breaks inside this series (each must be shown, never smoothed over):
1. Jun 1997 – Dec 2003: half-yearly, five bank groups, a single lending and deposit rate.
2. Jan 2004 – Dec 2010: monthly, "All Banks", no inter-bank split.
3. Jan 2011 – Jun 2022: inter-bank included/excluded split added.
4. Jul 2022 →: universe widened from banks to all financial institutions (scheduled banks + DFIs + MFBs); "All Financial Institutions" replaces "All Banks". Headline series = **Scheduled Banks** for continuity, with the all-FI line shown separately from Jul 2022.

### E. Derived indicators (computed by PEIC, stored separately, formula shown on page)

| Indicator | Formula | Frequency rule |
|---|---|---|
| Real policy rate (ex post) | policy rate in force at month end − CPI YoY of that month | monthly |
| Real 6M KIBOR | month-average 6M KIBOR − CPI YoY | monthly |
| Policy − 3M T-bill | policy rate in force on auction date − 3M cut-off at that auction | per auction (date-exact) |
| Policy − 6M KIBOR | policy rate in force on the day − 6M KIBOR that day | daily |
| Lending − deposit spread | WALR − WADR, same basis (new–fresh or outstanding–outstanding) | monthly |
| Term spreads | 10Y PIB cut-off − 3M T-bill cut-off, only when both auctioned within the same 7-day window | per pair |
| Corridor width | ceiling − floor | on change |

No derived value uses interpolation; if one side is missing the derived value is missing.

## 3. Conflicts and quality issues found

| # | Issue | Handling |
|---|---|---|
| C1 | EasyData T-bill data ends 14 Oct 2026; SBP `sir.pdf` and `tb.xlsx` already show 28 Oct and 11 Nov 2026 auctions | prefer SBP auction file for 2014 →, EasyData for 2004–2014; show both "as of" dates |
| C2 | Reverse-repo history: SBP PDF starts 26 Feb 1991, EasyData starts 10 Oct 1991 | use EasyData; note the gap in Methodology |
| C3 | EasyData 2Y PIB has 5 normal values of 24 although SBP `sir.pdf` lists 2Y results at most auctions since 19 Sep 2024 | use SBP `Pakinvestbonds.xlsx` for 2Y |
| C4 | Ledger policy rate starts May 2016 while EasyData starts May 2015; two 2020 dates differ from SBP's own table (noted earlier) | dashboard reads the full EasyData series; dates checked against SBP's corridor table |
| C5 | `src/lib/economicCalendar/seriesPublicationConfig.ts` calls `TB0040` / `PIB0080` "cut-off yield"; EasyData defines them as **weighted-average** yields (cut-offs are `TB0010` / `PIB0010`) | label fix only (no data change), proposed for Stage 2 |
| C6 | OMO files store cut-off as a fraction (0.1201) while quote ranges are in percent (12.09) | convert cut-off ×100 at build time; recorded in the dataset notes |
| C7 | Old OMO rows contain text such as "Bids Rejected" | kept as a status, never as a number |
| C8 | `archive.sbp.org.pk` mirror is stale (lending file ends May 2026); the new-site "current" `.xls` link returns an HTML page | build from `assets/document/Lendingdepositrates_Arch.xls` (saved 18 Nov 2026) |
| C9 | KIBOR 2Y/3Y discontinued Feb 2020; LIBOR discontinued after Sep 2024 | 2Y/3Y not shown in the default view; LIBOR not used |
| C10 | `sir.pdf` "Overall" lending/deposit rates = scheduled banks incl. zero-rate and inter-FI; values should equal the matching column of the archive file | cross-check is a Stage 4 validation test |

Not available from an official source: **secondary-market PIB/T-bill yields (PKRV)**; there is therefore no daily yield curve. The yield curve is built from auction cut-offs and labelled as such.

## 4. Proposed architecture

**Recommendation: static, digest-checked datasets built by scripts (the Bond Yields workshop pattern).** No new ledger keys, no migrations, no ingestion runs and no production DB writes.

- `scripts/buildInterestRates.ts` reads the SBP files and the EasyData API (key read locally, never logged), and writes `src/data/interestRates/*.json`. Each file carries source URL, retrieval date, row count and a sha256 digest.
- A test re-hashes the rows, so any hand edit fails the build.
- Daily KIBOR (~39k points) is stored compactly and read only on the server.
  - The charts receive month-average series, labelled "monthly average of daily KIBOR".
  - The last 24 months are also kept at daily resolution.
- The existing ledger series stay untouched. The current page's policy-rate and CPI wiring keeps working as it does today.
- **Why static:** Preview deployments read a Supabase project with no canonical data, so a ledger-based design would show fallbacks on Preview. A static dataset previews exactly as it would run in Production.
- **Cost:** refreshing means re-running the script and committing.
  - Automated ingestion into the ledger is a separate, later proposal.
  - That proposal would need explicit approval, because it involves production writes.

Page structure (one route, `/pakistan-interest-rate`, with section tabs and anchors): Overview · SBP Monetary Policy · KIBOR · Government Securities · Banking Rates · Real Interest Rates · Data coverage & methodology.

The seven requested charts map onto those sections. They reuse `src/components/analytics/*` and the Bond Yields `YieldCurveExplorer`, and support light/dark themes, mobile layouts, CSV download per chart and a table view.

The analytics module (`src/lib/interestRates/`) will provide:
- spreads, with latest / average / min / max;
- period comparisons;
- pp and bp changes;
- Pearson correlation with n shown;
- lag analysis at 1/3/6/12 months, run on monthly series only.

Every function ships with unit tests on fixtures taken from the real data.

## 5. Decisions needed from the owner

1. Approve the **static-dataset architecture** above (no DB writes or migrations).
2. Approve the **source precedence**:
   - SBP auction files over EasyData for T-bills from 2014 and for the 2Y PIB;
   - Scheduled Banks as the headline lending/deposit series.
3. Approve the **C5 label fix** in the economic-calendar config. This is wording only, with no change to calendar behaviour.
4. Confirm that the PKRV secondary-market yields stay out, because they are not official SBP data.
