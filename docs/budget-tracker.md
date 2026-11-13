# Budget Tracker Workshop (`/budget`)

> **Access (G.20):** this page is in the members' area: it appears in the navigation for everyone, but a visitor who is not signed in is sent to the login page (`/login?redirect=…`) and returns here after signing in. Only the Overview, the landing page and the sign-in pages are open to guests (see [access-policy.md](access-policy.md)). The implementation, data and tests are unchanged.

The federal Budget Tracker: 17 fiscal years (FY2010-11 to FY2026-27) of Pakistan's **Budget Estimates**, transcribed by hand from each year's official *Budget in Brief* (Finance Division, finance.gov.pk). This file is the architecture note, data inventory, source register, methodology, limitations, category definitions and update procedure.

The route is login-gated (`src/lib/protectedSections.ts`), like Comparisons and the Provincial Budget workshop.

## 1. Architecture

| Layer | File | Role |
|---|---|---|
| Canonical dataset | `src/data/budgetHistorical.ts` | One `BudgetYearRecord` per year: 13 fields, all `estimateType: "BE"`, per-year citation (document URL and table names), optional notes. **The only copy of the budget figures.** Unchanged by this work. |
| Stated nominal GDP | `src/data/budgetNominalGdp.ts` | Nominal GDP exactly as Budget in Brief prints it for the budget year, FY2019-20 onward, each with document and table. Used for "% of GDP". |
| Calculations | `src/lib/budget/budgetData.ts` | Pure functions: allocation breakdown, Rs100 view, YoY, CAGR, trend series (nominal / % of total outlay / % of GDP), category summary, rule-based insights with evidence, consistency checks. |
| Registry | `src/lib/budget/budgetRegistry.ts` | The 8 category pages: slug, copy, FAQ, disclaimer, colour, field labels. |
| UI | `src/components/budget/*` | `BudgetRibbon` (slim navy-and-gold header), `BudgetWorkspace` (KPIs, allocation views, trend explorer, insights), `BudgetAllocationBars` / `BudgetAllocationChart` (donut) / `BudgetAllocationTreemap`, `BudgetRs100Card`, `BudgetControls`, `BudgetTrendChart`, `BudgetInsightsPanel`, `BudgetDetailView`, `BudgetMethodology` (+ `BudgetSourceRegister`). |
| Routes | `src/app/budget/page.tsx`, `[slug]/page.tsx`, `where-does-tax-money-go`, `debt-servicing-vs-defence` | Workshop, category pages, two explainer pages. |

There is no live fetch: Budget in Brief is a PDF published once a year, so everything is static data transformed by pure functions and rendered with the final figures in the server HTML. Charts are client components (Recharts) that draw on scroll into view and respect reduced motion; the allocation bars animate with CSS only.

The earlier plan named a `budgetHistorical.ts` with 13 cited categories, 12 from Budget in Brief and deficit-to-GDP from Fiscal Policy Statements. That file already existed and was verified (section 2), so it was kept rather than duplicated. Deficit-to-GDP is taken from each Budget in Brief's own fiscal-deficit table; every printed value reconciles with the printed GDP (section 4), so no separate Fiscal Policy Statement source was needed.

### Percentage bases (never mixed)

- **% of total outlay**: Budget in Brief's Total Expenditure. Used for outlay components (PSDP, defence, debt servicing, subsidies, pension, federal education, federal health, grants).
- **% of the budget envelope**: total outlay + provincial transfers. Used by the allocation views, because the provinces' NFC share is deducted on the revenue side and is not inside total outlay.
- **% of GDP**: nominal GDP printed in Budget in Brief (FY2019-20 onward), otherwise *implied* GDP = deficit in Rs ÷ (deficit % ÷ 100), labelled implied everywhere it is used.

## 2. Historical data inventory and reliability

Each of the 17 official PDFs was downloaded and text-extracted, and every numeric field of the dataset was matched against its own year's document.

- **235 of 235** non-null values were found in the document of their own year.
- **Budget-vs-Revised check.** A Revised Estimate for year Y first appears in the document of year Y+1. 141 of the checkable values also appear in the Y+1 document (where Y's Budget Estimate is repeated as the prior-year comparator), confirming they are Budget Estimates. For the rest (single-occurrence rows, restated or differently-labelled rows, and the last year, which has no successor), the column was decoded by hand for the key tables: deficits, education/health, GDP.
- **Known text-layer problems.** `pdftotext` scrambles some tables (ligature gaps such as "Def ence", negative deficits, misaligned rows; the FY2026-27 Table 3 text layer is out of order). Verification used spaceless label matching, ×1000 scaling for Rs-million tables, absolute values for deficits, and manual decoding where needed.
- **Missing values.** FY2010-11 does not itemise Interest Payments, Pension or Grants & Transfers (they are inside General Public Service). Those three fields are `null` for that year only; nothing is estimated or zero-filled.
- **Reconciliation.** In every year except FY2010-11 the itemised slices (debt servicing, defence, PSDP, subsidies, provincial transfers, pension) are no larger than the budget envelope. FY2026-27 was cross-checked exactly: the remainder, 4,457bn, equals Table 1's Grants & Transfers 2,680 + Running of Civil Government 1,071 + Net Lending 276 + Provision for Emergency 430. No non-reconciling total was found; if one appears, the UI reports it instead of forcing it (`getAllocationDetail().discrepancies`).
- **Not covered by this dataset**: Revised Estimates and actuals (deliberately excluded), provincial budgets (separate section), monthly or quarterly execution.

Automated guards (`src/lib/budget/budgetData.test.ts`): 17 consecutive years, all BE; official finance.gov.pk citation on every year; nulls only for the three fields and only in FY2010-11; every component ≤ total outlay; every complete-year residual ≥ 0; deficit ÷ stated GDP within 0.1 pp of the printed % in all 8 years with a stated GDP; implied GDP within 1.5% of stated.

## 3. Source register

Primary source for every figure: *Budget in Brief* for the year, Finance Division, Government of Pakistan. The same register is rendered on the page (`BudgetSourceRegister`) from the dataset's own citations.

| Fiscal year | URL | Tables used |
|---|---|---|
| FY2010-11 | https://www.finance.gov.pk/budget/Budget_in_Brief_2010_11.pdf | Budget at a Glance; Table 15: Current Expenditure (Summary); Subsidies; Overall Fiscal Deficit 2010-11 |
| FY2011-12 | https://www.finance.gov.pk/budget/BudgetinBrief_2011_12.pdf | Budget at a Glance; Function-Wise Expenditure (Summary); Working of Fiscal Deficit and Financing |
| FY2012-13 | https://www.finance.gov.pk/budget/Budget_in_Brief_2012_13.pdf | same as FY2011-12 |
| FY2013-14 | https://www.finance.gov.pk/budget/Budget_in_Brief_2013_14.pdf | same as FY2011-12 |
| FY2014-15 | https://www.finance.gov.pk/budget/Budget_in_Brief_2014_15.pdf | same as FY2011-12 |
| FY2015-16 | https://www.finance.gov.pk/budget/Budget_in_Brief_2015_16.pdf | same as FY2011-12 |
| FY2016-17 | https://www.finance.gov.pk/budget/Budget_in_Brief_2016_17.pdf | same as FY2011-12 |
| FY2017-18 | https://www.finance.gov.pk/budget/Budget%20in%20Brief%202017-18.pdf | same as FY2011-12 |
| FY2018-19 | https://www.finance.gov.pk/budget/Budget_in_Brief_2018_19.pdf | same as FY2011-12 |
| FY2019-20 | https://www.finance.gov.pk/budget/Budget_in_Brief_2019_20.pdf | same as FY2011-12 |
| FY2020-21 | https://www.finance.gov.pk/budget/Budget_in_Brief_2020_21_English.pdf | Table 1: Budget at a Glance; Table 2/3: Fiscal Deficit & Financing / Budget Estimates; Function-Wise Expenditure (Summary) |
| FY2021-22 | https://www.finance.gov.pk/budget/Budget_2021_22/6_Budget_in_Brief_English_2021_22.pdf | same as FY2020-21 |
| FY2022-23 | https://www.finance.gov.pk/budget/Budget_2022_23/Budget_in_Brief_English.pdf | Table 1; Table 2/3: Fiscal Deficit & Financing / BE & RE Comparison; Function-Wise Expenditure (Summary) |
| FY2023-24 | https://www.finance.gov.pk/budget/Budget_2023_24/Budget_in_Brief.pdf | same as FY2022-23 |
| FY2024-25 | https://www.finance.gov.pk/budget/Budget_2024_25/Budget_in_Brief.pdf | Table 1; Table 2/3; (7) Health Affairs and Services / (9) Education Affairs and Services |
| FY2025-26 | https://www.finance.gov.pk/budget/budget_2025_26/budget_in_brief_10062025.pdf | Table 1; Table 2/3; Table 11: Function-Wise Expenditure |
| FY2026-27 | https://www.finance.gov.pk/budget/budget_2026_27/Budget_in_Brief.pdf | Table 1; Table 2/3; Table 11: Function-Wise Expenditure |

All 17 URLs were reachable when checked (2026-11-11).

### Nominal GDP register (`budgetNominalGdp.ts`)

Read from the same documents; the budget-year ("Budget") column, never a later revision and not the Pakistan Bureau of Statistics' national-accounts GDP.

| Fiscal year | GDP, Rs bn | Where printed |
|---|---|---|
| FY2019-20 | 44,003 | Budget in Brief 2019-20, macro-economic framework table, "GDP at market prices (Billions)"; repeated as "Memo: GDP" in the 2020-21 document |
| FY2020-21 | 45,567 | Budget in Brief 2020-21, Table 3 (Budget 2020-21 column, "Memo: GDP"); also quoted in the 2021-22 text |
| FY2021-22 | 53,867 | Budget in Brief 2021-22, Table 3 "Nominal GDP" |
| FY2022-23 | 78,197 | Budget in Brief 2022-23, Table 3 "Nominal GDP" |
| FY2023-24 | 105,817 | Budget in Brief 2023-24, Table 3 "Nominal GDP" |
| FY2024-25 | 124,150 | Budget in Brief 2024-25, Table 3 "Nominal GDP" |
| FY2025-26 | 129,567 | Budget in Brief 2025-26, Table 3 "Nominal GDP" |
| FY2026-27 | 143,604 | Budget in Brief 2026-27, Table 3 "Nominal GDP" (the text layer scrambles this column; 5,226 ÷ 143,604 = 3.64%, matching the printed 3.6%) |

For FY2010-11 to FY2018-19 no explicit budget-year GDP figure could be read, so implied GDP is used and labelled implied.

## 4. Calculation methodology

- **Envelope** = total outlay + provincial transfer. **Allocation breakdown**: debt servicing, defence, PSDP, subsidies, provincial transfers, pension as itemised slices; the remainder is "Other" (grants and transfers, running of civil government, net lending, contingency). Education and health are excluded (different, functional classification). If interest or pension is null (FY2010-11) they are **not** shown as zero: the year is "partial" and one bundled slice, "Not itemised (interest, pension, grants, other)", carries the rest. A negative remainder is reported as a discrepancy and never clamped.
- **Rs100 view**: slice shares of the envelope rounded to whole rupees; rounding residue goes into the remainder/bundled slice.
- **YoY**: (current − previous) ÷ |previous|, nominal; `null` if either value is missing or the base is zero.
- **CAGR**: (end ÷ start)^(1/steps) − 1 between the first and last year with a figure; `null` if either end is missing or non-positive.
- **Share of total outlay**: only for outlay components; revenue lines, the deficit and provincial transfers have no share of outlay (`null`, and the UI greys those chips in that mode).
- **% of GDP**: field ÷ nominal GDP (stated where printed, else implied).
- **Insights** (`generateBudgetInsights`): eight deterministic rules, each returning text, the exact evidence figures, and a caveat. Comparisons start at the first year where every compared figure exists. The "debt servicing exceeded defence in every budget from FY… through FY…" sentence is generated only after checking that every budget in that run satisfies it. No causal wording ("because", "due to"); a test enforces it. Nothing is AI-generated.
- **Consistency checks** (`checkDatasetConsistency`): components within outlay, residual non-negative, deficit ÷ stated GDP vs printed %, implied vs stated GDP. They report; they never adjust.

## 5. Category definitions

| Dataset field | Meaning | Share base |
|---|---|---|
| `totalOutlay` | Budget in Brief's Total Expenditure: current + development, federal. Excludes the provinces' NFC share. | n/a |
| `fbrTaxRevenue` / `nonTaxRevenue` | FBR tax revenue and non-tax revenue as printed. | none (not outlay) |
| `provincialTransfer` | Provinces' share of the divisible pool under the NFC award, as printed. | budget envelope |
| `grantsAndTransfersOther` | Grants & transfers to provinces and others, distinct from the NFC share. Null in FY2010-11. | total outlay |
| `federalPsdp` | Federal Public Sector Development Programme. | total outlay |
| `defence` | Defence line as printed. | total outlay |
| `debtServicing` | Interest Payments line (cost of borrowing, not principal repayment). Null in FY2010-11. | total outlay |
| `pension` | Pension line. Null in FY2010-11. | total outlay |
| `subsidies` | Subsidies line as printed. | total outlay |
| `federalEducation` / `federalHealth` | Federal **current** expenditure on Education / Health Affairs and Services only (printed in Rs million, stored in Rs billion). Mostly provincial subjects since the 18th Amendment (2010); PSDP spending tagged to these sectors is excluded. Not national totals. | total outlay |
| `fiscalDeficitRs` / `fiscalDeficitPctGdp` | Overall budgeted deficit as printed (consolidated federal + provincial), Rs and % of GDP. A target, not an outcome. | none |

## 6. Known limitations

1. Budget Estimates are plans; actual spending can differ materially.
2. Nominal rupees only. Growth includes inflation; nothing is described as real growth.
3. FY2010-11 lacks interest, pension and grants (missing, not zero); lines start at FY2011-12.
4. Federal figures, with one disclosed exception: the fiscal deficit is consolidated federal + provincial as Budget in Brief prints it.
5. Federal education and health are federal current expenditure only. They are not national spending.
6. Definitions can shift between documents; the dataset does not restate across such changes.
7. Implied GDP (FY2010-11 to FY2018-19) carries up to about ±1.4% uncertainty from the rounded printed percentage.
8. Hand-entered from PDFs once a year; not a live feed.
9. New explanatory copy (methodology, notes, insights) is English only. The workshop's older strings keep their English / Roman Urdu / Urdu dictionary entries.
10. FY2026-27's PDF has a scrambled text layer for Table 3; its values were decoded and cross-checked (section 2).
11. The three allocation views show the same data. The treemap hides labels inside rectangles too small for them; a legend lists every slice.

## 7. Update procedure (once per budget cycle, early June)

1. Download the new *Budget in Brief* PDF from finance.gov.pk. Do not use revised or actual columns.
2. Append one record to `BUDGET_HISTORICAL.years` in `src/data/budgetHistorical.ts`: `estimateType: "BE"`, all fields from the new document's **Budget** column (education/health from the Function-Wise table in Rs million ÷ 1000), the PDF URL and table names. Years must stay consecutive.
3. Append the printed nominal GDP (Table 3) to `BUDGET_NOMINAL_GDP` with document and table.
4. Decode any scrambled table by hand and confirm deficit ÷ GDP ≈ printed % (the test enforces ≤ 0.1 pp).
5. Check the values against the next year's comparator column once that document exists.
6. Update the year count in `src/app/budget/page.tsx` copy and FAQ ("17 fiscal years"), the metadata, and `budgetData.test.ts` (year count and final year).
7. Run `npx tsc --noEmit`, `npx eslint src/components/budget src/lib/budget src/app/budget`, `npx vitest run src/lib/budget src/components/budget`, and `npm run build`.

## 8. Verification and tests

- `src/lib/budget/budgetData.test.ts`: dataset invariants, GDP basis, envelope and allocation (hand-worked synthetic year plus all real years), Rs100 rounding, YoY / CAGR, year ranges, share bases, null handling, trend modes, category summary, insights (determinism, evidence, truth of the debt-vs-defence claim, no causal or real-growth wording), and "can fail" checks proving the consistency checks flag corrupted data.
- `src/components/budget/budgetComponents.test.ts`: server-rendered ribbon, bars (amounts and percentages in the first HTML, reduced-motion CSS, bundled-slice rendering without a zero row), insights panel, source register (17 rows, 17 official URLs) and methodology statements.
- Browser verification (Playwright, Chrome) at 1440×900, 820×1180 and 390×844 in light and dark: no horizontal overflow, no page errors, working view toggle, fiscal-year selector, basis modes, range selector, disabled chips, table view, insights evidence, category pages.

- `src/lib/budget/budgetSankey.test.ts` (62 tests): dataset sanity, reconciliation to printed totals (hand-worked FY2026-27 values; the FY2025-26 Table 10 gap), agreement with the canonical dataset, revenue/borrowing separation, parent-child totals, every validation rule with a can-fail case (duplicate/unknown/self/backward link, negative/NaN/zero value, wrong unit or estimate type, orphan, imbalance, borrowing-as-revenue, detail parent, missing value), layout proportionality, bounds, ordering and determinism, expansion, selection, details and tables.
- `src/components/budget/budgetSankeyComponents.test.ts` (38 tests): server-rendered diagram (title, year, source, labelled buttons, legend, tables, reconciliation, phone layout, reduced motion), the data-transparency panel (coverage, basis, currency, estimates-versus-actuals marking, derived and grouped blocks), the visible reconciliation summary and the FY2025-26 source-gap callout, exact ribbon stroke widths, hatching, selection dimming, no-data and failed-year states, section titles, formatting, and a source scan that the drawing and interaction components import no data and hold no budget figures.
- `src/lib/budget/budgetSankeyTransparency.test.ts` (11 tests): reconciliation difference notes (each names its figures; a Rs-million table is never blamed on whole-billion rounding), the reconciliation summary and the source-gap flag, and the derived/grouped block summary.

## 9. Budget flow (Sankey) diagram: "Where Does Pakistan's Budget Money Go?"

An interactive Sankey inside the existing `/budget` page (after the key figures; wired through `BudgetWorkspace`'s `flowSlot`, no new route). It follows one fiscal year's Budget Estimate from revenue and borrowing into one pool of total resources and out to the provinces' share and each federal expenditure line, with detail where Budget in Brief prints it.

### Coverage

FY2025-26 and FY2026-27, Budget Estimates, Rs billion, each read from its **own** Budget in Brief. Earlier years are not drawn: their documents use older table layouts and were not read at this grain, and the diagram only draws what it can reconcile. Revised Estimates and actuals are deliberately **not** offered. RE exists in the documents only as a comparator column, there are no actuals in the dataset, and the workshop's rule is never to mix estimate types. The page says so next to the controls.

**What the page tells the reader before they touch it.** A "what you are looking at" panel sits above the diagram: the two years with detailed flows against the historical charts' FY2010-11 to FY2026-27 range; the basis (Budget Estimates, with a separate amber "Estimates, not actual spending" statement and a "Plans, not actual spending" badge beside the year: the plan approved at the start of the year, not what was spent, and actuals are not shown anywhere in the workshop); the currency (PKR billion, nominal); that revenue and borrowing are separate; which blocks are derived remainders (`*`); which blocks combine separately printed items (other direct taxes, pension fund and increases, AJK and Gilgit-Baltistan, which are combined so small items stay readable, with each part listed in the block's details); and what the source does not provide (the provincial share by province).

### Structure (five stages)

| Stage | Nodes |
|---|---|
| Sources | Income tax; other direct taxes (capital value tax, Workers Welfare Fund, Workers Profit Participation Fund); sales tax; customs duties; federal excise; petroleum levy; State Bank profit; other non-tax receipts (remainder); bank borrowing; non-bank borrowing |
| Revenue and financing | Gross federal revenue; domestic borrowing; external borrowing (net); privatisation proceeds. Revenue and borrowing are separate blocks, and borrowing is hatched as well as coloured |
| Total resources | One pool: revenue plus financing |
| Allocation | Provincial share (NFC); interest payments; defence; pensions; grants and transfers; subsidies; running of government; emergency provision; development (PSDP); net lending |
| Detail | Interest: domestic and foreign debt. Defence: employee-related, operating, physical assets, civil works. Pensions: military, civil, pension fund and increases. Grants: provinces, BISP, AJK and Gilgit-Baltistan, contingent liabilities, other grants to others (remainder). Subsidies: power, petroleum (FY2025-26 only), food, industries, other |

**Why a pool.** Money is fungible. Linking a source straight to a use (borrowing to interest, income tax to defence) would invent a pairing the budget does not state. Everything flows into the pool and out of it, which is how Table 1 is built (total resources = total expenditure). The pool equals the budget envelope used elsewhere in the workshop (total outlay + provincial share).

### Sources (all Budget in Brief, Finance Division)

Table 1 (budget at a glance: resources, financing items II to V, expenditure, provincial share), Table 2 (fiscal deficit and financing), Table 4 (FBR taxes), Table 5 (non-tax revenue), Table 9 (external resources, net), Table 10 (current expenditure), Table 12 (subsidies), Table 13 (grants and transfers) and the defence function table. URLs come from the canonical dataset's citations (section 3), not a second copy.

### Method

- **Reading the PDFs.** The text layer scrambles these tables, so each was rebuilt from the position of every word (pdf.js text items grouped by row), not text order. 118 figures were then checked against the PDFs: none missing, 101 matched on a row whose label fits, 17 hand-decoded (Table 1 and 2 lines whose label spans several rows, and three Table 12 category headings printed one row above their value). FY2025-26 values also appear in the FY2026-27 comparator column wherever that table repeats them.
- **Net figures.** Borrowing and external loans are drawn net of repayments, as Table 1 reports them. External financing is drawn as the printed net amount because a component can be negative (FY2025-26: commercial and Euro bond financing was a net Rs 355bn repayment). Gross receipts, repayments and the multilateral/commercial split are shown in the node's details as context, not as extra flows.
- **Remainders.** Only two amounts are derived, each flagged with `*`, labelled "remainder", and equal to a printed total minus the printed items drawn beside it: other non-tax receipts (Table 5 total minus State Bank profit minus petroleum levy) and other grants to others (Table 13 total minus BISP, AJK, Gilgit-Baltistan and contingent liabilities). A zero line (the FY2026-27 petroleum subsidy, printed as a dash) has no node and no flow. A remainder that would be negative creates no node and fails a reconciliation check.
- **Widths.** One scale (pixels per Rs billion) for every flow; each ribbon is exactly value times scale. A node's drawn height is never below 2px so a tiny node stays visible; ribbons are never inflated, so very small flows are hairlines (hover them or use the table).

### Reconciliation results

32 checks per year (Table 4 sums, gross and net revenue, financing, external net against Table 9, resources = expenditure, current expenditure, every group against its printed parent, the pool's inflow against its outflow, and ten comparisons with the canonical dataset). **All 32 pass for both years.** Tolerances are derived, not chosen: 0.5 for each whole-billion figure in an identity (Tables 1 and 2 print whole billions), 0.01 for Rs-million tables, 0.5 for the Table 10 total, 4 for the pool (seven whole-billion figures plus that rounding). The page prints the differences, not just the verdict. If a year fails, it is withheld with the failing checks listed.

**Presentation.** Above the collapsed tables the page always shows a summary (checks passing, how many show a non-zero difference, the largest one) and, where the source itself does not foot, an amber "A gap inside the source document" callout. In the reconciliation table every non-zero difference carries a plain-language note naming the figures involved (whole-billion rounding in Tables 1 and 2, Rs-million rounding, the canonical dataset's whole billions, or a gap inside the source), and a check flagged `sourceGap` is labelled "gap in the source". The tolerance policy is unchanged and no source figure was altered.

Review of all 32 checks (both years): all pass. FY2026-27: 24 checks are exact and 8 show a difference (largest Rs 1.000bn on net revenue, a whole-billion rounding). FY2025-26: 20 checks are exact and 12 show a difference; the two closest to their allowance are the external-financing comparison with Table 9 (Rs 0.477bn against 0.5, the natural maximum for a whole-billion figure) and the Table 10 gap (Rs 0.457bn against 0.5, a gap inside the source).

Differences worth knowing (all inside tolerance and shown on the page):
- FY2026-27: gross revenue 20,599.598 against a printed 20,600; pool inflow 27,619.598 against outflow 27,619.417.
- FY2025-26: Table 10's own rows add to Rs 16,285.588bn against its printed total of Rs 16,286.045bn (Rs 0.457bn). Several rows are round numbers (971,000; 389,000; 1,055,000), so the source appears to print rounded rows under an exact total. Financing parts add to 6,502 against a printed 6,501. The pool differs by Rs 1.5bn (0.006%).

### Interactions

Hover a block or ribbon for its amount and shares; click or press Enter/Space on a block to select it (unrelated ribbons dim to 8%, connected ones stay prominent; Escape clears); the detail panel shows amount, share of the parent, of total resources and of total expenditure, where it comes from and goes to, its composition and the source table; "Show/Hide breakdown" per line and "Show all breakdowns" / "Overview only"; a year selector for the years that reconcile; a table alternative (every flow with its shares, plus the reconciliation) in the page. On phones the diagram is replaced by a stage-by-stage list built from the same data (amounts, shares, bars on one scale per stage, rows linked to the selection marked "linked"), with the full diagram available in its own horizontal scroller. Under 960px of available width the diagram scrolls sideways rather than shrinking its labels. Ribbons draw in with a CSS reveal that is switched off under reduced motion; the final figures are in the server-rendered HTML.

### Why not Recharts' Sankey

Evaluated, not adopted. It assigns columns by longest path and justifies sinks to the last column, which would put leaf lines such as "Running of government" in the detail stage; it has no explicit stage columns, no keyboard-selectable nodes and no phone layout. The layout is a small pure function (`layoutSankey`) with no new dependency, tested for exact proportionality, bounds, ordering and determinism.

### Files

| File | Role |
|---|---|
| `src/data/budgetFlows.ts` | Verified detail for FY2025-26 and FY2026-27 (printed totals kept apart from their parts) |
| `src/lib/budget/budgetSankey.ts` | Graph builder, structural validation, reconciliation, layout, selection, details, tables |
| `src/lib/budget/sankeyFormat.ts` | Amount and share formatting |
| `src/components/budget/BudgetSankeySection.tsx` | Server component: prepares and reconciles every year |
| `src/components/budget/BudgetSankeyDiagram.tsx` | Client: year, expansion, selection, tooltip, detail panel, tables, no-data state |
| `src/components/budget/BudgetSankeySvg.tsx`, `BudgetSankeyStageList.tsx` | Desktop/tablet SVG and phone list |
| `src/app/budget/loading.tsx` | Loading skeleton gains a flow-diagram placeholder |

### Updating (each budget cycle)

1. Add the new year's record to `BUDGET_FLOWS` from the Budget **column** of Tables 1, 2, 4, 5, 9, 10, 12, 13 and the defence function table (rebuild each table by row position, not text order).
2. Keep printed totals in the `printed` fields and parts beside them. Do not balance anything to force a total.
3. Run `npx vitest run src/lib/budget src/components/budget`. A year whose figures do not reconcile (or disagree with `budgetHistorical.ts`) is withheld by the page and fails the data tests, which is the intended signal to re-check the transcription.

### Known limitations of the flow diagram

1. Two fiscal years only.
2. Budget Estimates only (no revised estimates or actuals).
3. Revenue detail is partial by design: five FBR taxes and two named non-tax items; the rest of non-tax revenue is one remainder.
4. Borrowing and external loans are net; gross external borrowing is context in the node's details.
5. Pension fund and pension increase are merged into one node, and AJK with Gilgit-Baltistan into another (both parts are listed in the node's details).
6. Defence detail covers the defence services line (Table 10's figure); the function table's separate defence administration line (Rs 10.9bn in FY2026-27) is not part of Table 1's defence figure and is not drawn.
7. The provincial share is not split by province (amounts per province are not printed in the Budget in Brief).
8. New explanatory copy is English only.
9. The Sankey section's title is "Where Does Pakistan's Budget Money Go?". The allocation chart (bars, donut, treemap) that follows it was renamed "Budget Allocation by Category" so the two sections are no longer similarly named; its description and controls are unchanged. The provincial workshop keeps its own, separate heading.
