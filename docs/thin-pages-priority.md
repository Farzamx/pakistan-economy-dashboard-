# Thin public pages: priority list

Stage 2 remediation D, 27 Nov 2026.

**Recommendations only: no page was deleted, hidden, noindexed or changed.**

## Scope and method

The release audit flagged **26** newly public pages that are still on the generic `SeoPageLayout` template. This list measures **all 32** public pages that use that template, so none is missed.

Every figure was measured on the isolated production build. It is the server HTML a crawler receives, read with `thin_pages.mjs` and `dup.mjs` in the scratchpad.

| Measure | How it was taken |
|---|---|
| **Words** | Visible words from the H1 to the "Related pages" heading: the page's own content, excluding navigation, sidebar and related links. For comparison, the purpose-built pages have: KIBOR 1,032 · T-bills 941 · Government debt 1,453 · Bond yields 3,017 · Inflation 5,411 · Interest rate 6,249. |
| **Table rows** | Rows in the page's data table. The isolated build has no real database and no FRED key, so pages whose history comes from those show **0 here but have data in Production**. Those are marked "Prod". |
| **Overlap** | The largest share of 5-word phrases the page shares with any other template page (Jaccard). It is low across the board: 29 % at most (gold vs silver), most pages under 10 %. So duplication risk is moderate at worst, and the main issue is **depth**, not copying. |

**Search intent** is a qualitative judgement. No search-volume figures were available or invented.

## Recommendation summary

| Group | Pages | Recommendation |
|---|---|---|
| **A. Improve first** | 10 | Strong Pakistan-specific intent, real history available, currently 390–680 words |
| **B. Improve next** | 12 | Analyst intent, data available, distinct angle possible |
| **C. Keep indexed, improve later** | 6 | Global indicators with a Pakistan angle; crowded results |
| **D. Exclude from indexing until improved** | 4 | One live number, no history, and a near-duplicate or misleading-risk title |

To exclude a page from indexing, keep it live and linked, add `robots: { index: false, follow: true }`, and drop it from the sitemap. It can be reversed at any time.

## A. Improve first (high intent, data exists, thin)

| Page | Words | Rows | Overlap | Why | What to add |
|---|---|---|---|---|---|
| `/current-account-deficit-pakistan` | **391** (thinnest) | 25 | 7 % | Core balance-of-payments query; monthly SBP data | 12-month rolling sum, FY-to-date vs last FY, components (trade, services, primary and secondary income), link to remittances and the IMF programme |
| `/pakistan-remittances` | 426 | 25 | 8 % | Very common Pakistan query; monthly SBP data | Fiscal-year totals, top source countries (SBP publishes them), Ramadan and Eid seasonality, link to SAR→PKR |
| `/pakistan-exports` | 416 | 25 | 16 % (imports) | Trade-performance intent | FY totals, the textile share, a chart of the monthly YoY change; differentiate from imports |
| `/pakistan-imports` | 437 | 25 | 16 % (exports) | As above | Petroleum share, import bill vs oil price (link to Brent) |
| `/pakistan-trade-deficit` | 467 | 25 | 7 % | As above | Make it the hub for exports and imports: one table, both series, FY comparison |
| `/fdi-in-pakistan` | 421 | 25 | 7 % | Investment intent | FY totals, the China/CPEC share, sector split if sourced |
| `/usd-pkr-exchange-rate` | 677 | 25 | 4 % | The highest-intent FX query | Interbank vs open market (if sourced), FY depreciation table, link to reserves and REER |
| `/gold-price-pakistan` | 653 | 104 | 29 % (silver) | Very high consumer intent | Per-tola and per-10-gram PKR prices with the conversion stated; reduce the shared text with silver |
| `/pakistan-food-inflation` | 422 | Prod | 1 % | Household intent | Urban vs rural, link to SPI weekly and headline CPI |
| `/pakistan-core-inflation` | 536 | 25 | 8 % (WPI) | SBP policy intent | Core vs headline chart, link to the Interest Rate page's real-rate section |

## B. Improve next (analyst intent, distinctive angle)

| Page | Words | Rows | Note |
|---|---|---|---|
| `/pakistan-bank-reserves` | 427 | 4 | Only 4 table rows. Check the series length in Production; the explanation of SBP vs bank reserves could be expanded. |
| `/pakistan-private-credit-growth` | 463 | 25 | Link to policy-rate transmission (Interest Rate page) |
| `/pakistan-lsm-growth` | 496 | 26 | Sector breakdown if sourced |
| `/pakistan-external-debt` | 502 | 28 | Cross-link to the new government-debt page; avoid duplicating its numbers |
| `/pakistan-wholesale-inflation` | 504 | 25 | WPI vs CPI pass-through |
| `/pakistan-real-effective-exchange-rate` | 521 | 25 | Explain the index base and what over- or under-valuation means |
| `/pakistan-money-supply` | 642 | 25 | Link the M2 research dataset |
| `/pakistan-fiscal-deficit` | 645 | 11 | Cross-link the budget explainers (members) and the debt page |
| `/weekly-inflation-pakistan` | 644 | 11 | Already the SPI consolidation target; add the item-level table if sourced |
| `/gdp-growth-pakistan` | 670 | 41 | Quarterly vs annual, provisional vs final revisions |
| `/foreign-exchange-reserves-pakistan` | 804 | 25 | The longest template page; add an import-cover chart |
| `/sar-to-pkr-exchange-rate` | 488 | 0 (no history) | Improve **only together with** remittances (Saudi Arabia is typically among the largest sources; confirm from SBP's country table). Otherwise treat it like group D. |

## C. Keep indexed, improve later (global indicators, Pakistan context)

| Page | Words | Rows | Note |
|---|---|---|---|
| `/brent-crude-oil-price` | 554 | 104 | 19 % overlap with WTI. Make Brent the Pakistan-relevant one (import bill, petrol prices). |
| `/wti-crude-oil-price` | 578 | 104 | Consider pointing WTI at Brent for Pakistan context, and differentiate the text |
| `/silver-price-pakistan` | 615 | 104 | 29 % overlap with gold; differentiate (per-tola PKR, industrial demand) |
| `/us-dollar-index` | 653 | 122 | Link DXY to PKR and to reserves |
| `/fed-funds-rate` | 491 | Prod | Link to the SBP–Fed differential on the Interest Rate page |
| `/us-10-year-treasury-yield` | 423 | Prod | Weak Pakistan intent and crowded results. Borderline D: improve with Eurobond spreads or move to D. |

## D. Exclude from indexing until improved (recommendation; not applied)

| Page | Words | Rows | Reason |
|---|---|---|---|
| `/pakistan-stock-market` | 442 | none, by design (`chartData={null}`) | The title promises "PSX, KSE-100", but the page shows a US-listed ETF proxy (NYSE: PAK) and says live KSE-100 data needs a PSX licence. This creates a search-intent mismatch and a quality risk. Index it again when licensed KSE-100 data or a sourced end-of-day series exists. |
| `/eur-to-pkr-exchange-rate` | 416 | none, by design | One intraday number plus generic text; 21 % overlap with GBP |
| `/gbp-to-pkr-exchange-rate` | 418 | none, by design | Same as EUR |
| `/natural-gas-price` | 464 | Prod | Henry Hub is a US benchmark. Pakistan's long-term LNG contracts are largely oil-indexed (Brent-linked), so the Pakistan angle is thin. Alternatively, rewrite it around LNG. |

**An alternative to noindexing the three currency-pair pages** is a single public `/pkr-exchange-rates` hub: one table of all pairs plus history once it is stored. The pair pages would then 301 to anchors on the hub, using the same redirect mechanism as the Stage 2 consolidations.

## Suggested order of work

1. Group A, starting with current account, remittances and trade: these are the thinnest, with the most Pakistan-specific intent.
2. Decide on group D. Either noindex the 4 pages (a one-line change each plus the sitemap), or build the PKR hub.
3. Groups B and C as data allows.

Re-measure each improved page with `thin_pages.mjs` and `dup.mjs`. A reasonable bar is about 900 or more words of page-specific text, a real data table, and under 15 % phrase overlap with any sibling. Purpose-built pages such as KIBOR (1,032 words) already meet it.
