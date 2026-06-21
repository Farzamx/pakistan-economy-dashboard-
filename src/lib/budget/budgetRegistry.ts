// Single source of truth for the Budget Workshop's per-category metadata —
// mirrors src/lib/comparisons/comparisonRegistry.ts's role for Comparisons.
// Every category here maps to a field on BudgetYearRecord (see
// src/data/budgetHistorical.ts) and, for the 8 listed below, a dedicated
// /budget/[slug] SEO page.

import type { BudgetYearRecord } from "@/data/budgetHistorical";

export type BudgetCategoryId =
  | "defence"
  | "debtServicing"
  | "federalPsdp"
  | "subsidies"
  | "fiscalDeficit"
  | "provincialTransfer"
  | "federalEducation"
  | "federalHealth";

export interface BudgetCategoryDef {
  id: BudgetCategoryId;
  slug: string;
  title: string;
  shortTitle: string;
  unit: "Rs billion" | "% of GDP";
  /** Reads the BE figure for this category off a year record (billions of Rs unless noted). */
  getValue: (year: BudgetYearRecord) => number | null;
  description: string;
  whyItMatters: string;
  faq: { question: string; answer: string }[];
  /** Shown as a tooltip/footnote wherever this category appears — only set for federal-only categories that could be mistaken for total national spending. */
  disclaimer?: string;
  color: string;
}

const NEON_BLUE = "#38bdf8";
const NEON_PURPLE = "#a855f7";
const AMBER = "#f59e0b";
const EMERALD = "#34d399";
const ROSE = "#fb7185";
const VIOLET = "#818cf8";

export const FEDERAL_PROVINCIAL_DISCLAIMER =
  "Education and health are primarily provincial responsibilities after the 18th Amendment (2010). These figures represent federal current expenditure only — not total national spending on this sector.";

export const BUDGET_CATEGORIES: BudgetCategoryDef[] = [
  {
    id: "debtServicing",
    slug: "debt-servicing",
    title: "Pakistan's Debt Servicing (Interest Payments)",
    shortTitle: "Debt Servicing",
    unit: "Rs billion",
    getValue: (y) => y.debtServicing,
    color: ROSE,
    description: "Interest payments on Pakistan's domestic and external public debt — the single largest line item in the federal budget.",
    whyItMatters: "Debt servicing now consumes a larger share of the federal budget than defence — money spent servicing past borrowing is money unavailable for development, education, or health, regardless of which government is in office.",
    faq: [
      { question: "Is debt servicing the same as total public debt?", answer: "No. Total public debt is the stock of money owed (tens of trillions of Rupees); debt servicing is the interest paid on that debt in a single fiscal year. This dataset tracks the annual interest payment, not the outstanding debt stock." },
      { question: "Why has debt servicing grown so much?", answer: "A growing debt stock, persistently high domestic interest rates, and Rupee depreciation (which raises the local-currency cost of servicing foreign debt) have all pushed this figure up sharply since the late 2010s." },
      { question: "Who does Pakistan owe this interest to?", answer: "A mix of lenders: domestic banks and savers (through Treasury Bills, Pakistan Investment Bonds, and National Savings Schemes), and foreign lenders (multilateral institutions like the IMF and World Bank, other governments, and commercial/Eurobond holders)." },
      { question: "Does debt servicing include loan repayments too?", answer: "No — debt servicing here means interest payments only. Repaying the original loan amount (the principal) is tracked separately and is usually refinanced by taking on new debt rather than paid down outright." },
      { question: "Can Pakistan reduce debt servicing quickly?", answer: "Not easily. Most of it is locked in by existing loan contracts. The main ways to bring it down over time are running smaller deficits, securing cheaper interest rates, or restructuring existing debt with lenders." },
      { question: "Is rising debt servicing unique to Pakistan?", answer: "No — many developing countries with large debt stocks and weaker currencies face similar pressure. Pakistan's case is more severe than most regional peers because of its mix of high domestic interest rates and a history of large deficits." },
      { question: "What happens if the government can't pay debt servicing?", answer: "A government that can't make interest payments is in default — a serious event that damages its ability to borrow again and usually triggers a wider economic crisis. Pakistan has avoided default partly through repeated IMF programmes." },
      { question: "Does debt servicing affect ordinary citizens directly?", answer: "Yes, indirectly. Money spent on interest payments can't be spent on public services, and a government under heavy debt pressure often raises taxes or cuts subsidies to free up cash — both of which affect household budgets." },
    ],
  },
  {
    id: "defence",
    slug: "defence-spending",
    title: "Pakistan Defence Budget",
    shortTitle: "Defence",
    unit: "Rs billion",
    getValue: (y) => y.defence,
    color: NEON_BLUE,
    description: "The Defence Affairs and Services allocation — Pakistan's military spending as published in the federal Budget in Brief.",
    whyItMatters: "Defence has historically been one of Pakistan's largest current expenditure items, though debt servicing has now overtaken it in absolute terms — a structural shift worth tracking over time.",
    faq: [
      { question: "Does this include all military-related spending?", answer: "This is the Defence Affairs and Services allocation from Budget in Brief's Table 1 — the headline figure typically cited as \"the defence budget.\" It does not separately break out classified or off-budget items, which Budget in Brief does not itemize publicly." },
      { question: "Has Pakistan's defence budget ever been cut?", answer: "In nominal Rupee terms, defence spending has grown almost every year in this dataset. Cuts, when they happen, are usually relative — defence growing slower than the rest of the budget, or shrinking as a share of GDP, rather than an actual Rupee reduction." },
      { question: "How does Pakistan's defence spending compare to its neighbours?", answer: "Pakistan's defence budget is smaller in absolute dollar terms than India's, but defence spending as a share of GDP has historically been higher in Pakistan, reflecting its smaller economy and ongoing security concerns." },
      { question: "Is defence spending the same as total military cost?", answer: "Not necessarily — this figure is the Defence Affairs and Services allocation published in Budget in Brief. Some military-related costs, like pensions for retired personnel, may be classified elsewhere in the budget." },
      { question: "Why isn't defence spending broken down by equipment or operation?", answer: "Detailed breakdowns are not published for national security reasons, which is standard practice in most countries. Only the aggregate allocation is made public." },
      { question: "Does PSDP include any defence-related infrastructure?", answer: "PSDP covers general federal development projects. Defence-specific infrastructure and procurement are funded through the defence budget itself, not PSDP." },
      { question: "How much of the budget does defence take up?", answer: "This varies by year — check the KPI card on the Budget Workshop and the allocation chart for the current fiscal year's exact share." },
      { question: "Is Pakistan's defence spending growing faster than the economy?", answer: "Use the % of GDP toggle in the Historical Budget Explorer to see this directly — defence spending as a share of GDP has generally trended down even as the Rupee amount has grown, because the overall budget has grown faster." },
    ],
  },
  {
    id: "federalPsdp",
    slug: "psdp",
    title: "Public Sector Development Programme (PSDP)",
    shortTitle: "PSDP",
    unit: "Rs billion",
    getValue: (y) => y.federalPsdp,
    color: EMERALD,
    description: "The Federal Public Sector Development Programme — the federal government's development/infrastructure spending budget.",
    whyItMatters: "PSDP is the main lever for federally-funded infrastructure, energy, and development projects. Provinces run their own, separate development programmes (Annual Development Programmes) outside this figure.",
    faq: [
      { question: "Is PSDP the same as total development spending in Pakistan?", answer: "No — this is the federal PSDP only. Each province runs its own Annual Development Programme (ADP), funded from its own budget, which is not included in this federal figure." },
      { question: "What kind of projects does PSDP fund?", answer: "Mainly physical infrastructure: roads, highways, dams, power generation and transmission, irrigation, and federal buildings, along with some social-sector projects run by federal agencies." },
      { question: "Why is PSDP often called the most flexible part of the budget?", answer: "Because it funds new, not-yet-started projects, it's easier for the government to delay or cut than ongoing costs like salaries or debt servicing — which is why PSDP allocations swing more from year to year." },
      { question: "Does PSDP money always get fully spent?", answer: "Not always — PSDP allocations are frequently revised down during the year if the government needs to cut spending to meet fiscal targets, often agreed with the IMF." },
      { question: "How is PSDP different from CPEC projects?", answer: "CPEC (China-Pakistan Economic Corridor) projects are often financed separately, through Chinese loans or joint ventures, rather than fully through PSDP — though some CPEC-related federal projects do appear within PSDP allocations." },
      { question: "Who decides which projects go into PSDP?", answer: "The Ministry of Planning, Development & Special Initiatives compiles PSDP each year, with projects proposed by federal ministries and approved through the Annual Plan Coordination Committee and National Economic Council." },
      { question: "Is PSDP spending the same as government investment?", answer: "Broadly yes — PSDP is the closest equivalent in the federal budget to what economists call public investment, as opposed to current or recurring spending." },
      { question: "Why does PSDP matter for long-term growth?", answer: "Infrastructure like roads, power, and irrigation underpins private-sector productivity for decades — cutting PSDP saves money short-term but can slow growth later, which is why economists watch PSDP allocations closely." },
    ],
  },
  {
    id: "subsidies",
    slug: "subsidies",
    title: "Pakistan's Federal Subsidies",
    shortTitle: "Subsidies",
    unit: "Rs billion",
    getValue: (y) => y.subsidies,
    color: AMBER,
    description: "Federal government subsidies — mainly electricity tariff differentials, with smaller allocations for wheat, fertilizer, and other commodities.",
    whyItMatters: "Power-sector tariff subsidies are the dominant component in most years — a recurring fiscal pressure point in Pakistan's IMF programme discussions.",
    faq: [
      { question: "What's the biggest subsidy category?", answer: "Electricity tariff differential subsidies (including K-Electric and inter-DISCO tariff equalization) have been the largest component in most years covered by this dataset." },
      { question: "Why does Pakistan subsidize electricity so heavily?", answer: "Partly to keep bills affordable for lower-income households, and partly because of long-standing inefficiencies and losses in the power sector — often called the \"circular debt\" problem — which raise the true cost of electricity beyond what's billed to consumers." },
      { question: "What is circular debt and how does it relate to subsidies?", answer: "Circular debt is the buildup of unpaid bills and losses across the power sector's supply chain. The government often pays subsidies to cover this gap, which is why power-sector subsidies are so large and persistent." },
      { question: "Are subsidies the same as tax breaks?", answer: "No — a subsidy is a direct payment to lower a price, while a tax break reduces how much tax someone owes. Both reduce government resources, but they're tracked separately in the budget." },
      { question: "Why does the IMF want fewer subsidies?", answer: "The IMF generally argues that broad subsidies are expensive and poorly targeted — wealthier households often consume more electricity or fuel and so capture a larger share of the subsidy than the poorer households it's meant to help." },
      { question: "Do all Pakistanis benefit equally from subsidies?", answer: "No — subsidy benefits often depend on consumption. Someone using more electricity or buying more subsidized wheat receives a larger benefit in Rupee terms, even if the subsidy was intended to help lower-income households most." },
      { question: "Could removing subsidies reduce the fiscal deficit?", answer: "It would help — subsidies are a real cost in the budget — but removing them also raises prices for consumers, a politically difficult trade-off every government has had to manage." },
      { question: "Are agricultural subsidies different from electricity subsidies?", answer: "Yes — agricultural subsidies (like the wheat support price or fertilizer subsidies) aim to support farmers' incomes and food security, while electricity subsidies mainly aim to keep utility bills affordable for consumers." },
    ],
  },
  {
    id: "fiscalDeficit",
    slug: "fiscal-deficit",
    title: "Pakistan's Budgeted Fiscal Deficit",
    shortTitle: "Fiscal Deficit",
    unit: "Rs billion",
    getValue: (y) => y.fiscalDeficitRs,
    color: VIOLET,
    description: "The Overall Fiscal Deficit (federal and provincial governments consolidated) as budgeted at the start of each fiscal year — the gap between total revenue and total spending.",
    whyItMatters: "This is the Budget Estimate target set at the start of the year, not the final actual outcome (which is typically reported later and often differs). Tracking the BE trend shows how ambitious or conservative each year's fiscal target was.",
    disclaimer: "This is the Budget Estimate (BE) deficit target announced at the start of the fiscal year — not the final, actual outturn, which is reported later and can differ materially.",
    faq: [
      { question: "Is this the actual fiscal deficit or the target?", answer: "This is the Budget Estimate (BE) — the target set when the budget was announced. Pakistan also publishes Revised Estimates and eventual actuals, which this dataset deliberately excludes to keep every year on a consistent, comparable basis." },
      { question: "How is this financed?", answer: "Through a mix of domestic borrowing (T-Bills, Pakistan Investment Bonds, National Savings Schemes) and external borrowing (multilateral lenders, bilateral loans, commercial/Eurobonds)." },
      { question: "What's a primary deficit, and how is it different?", answer: "The primary deficit excludes interest payments from the calculation — it shows whether the government's day-to-day spending, excluding past debt costs, is in surplus or deficit, a cleaner measure of current fiscal discipline." },
      { question: "Why can't Pakistan just stop running a deficit?", answer: "Doing so quickly would mean sudden, sharp cuts to spending or tax hikes, which can hurt growth and public services. Most fiscal adjustment happens gradually, often under IMF-supported programmes with specific deficit-reduction targets." },
      { question: "Does a fiscal deficit always mean economic trouble?", answer: "Not necessarily — many countries run deficits to invest in growth. The concern is the size and trend: a small, stable deficit financed sustainably is very different from a large, growing one." },
      { question: "How does the fiscal deficit relate to inflation?", answer: "When deficits are financed by the central bank printing money or excessive domestic borrowing, it can add to inflationary pressure — one reason the IMF and SBP watch this number closely alongside the inflation rate." },
      { question: "What's the difference between the fiscal deficit and total public debt?", answer: "The fiscal deficit is the annual gap between spending and revenue; public debt is the total accumulated amount owed, built up from years of deficits added together." },
      { question: "Has Pakistan's fiscal deficit ever turned into a surplus?", answer: "Pakistan has briefly recorded a primary surplus in some recent years (spending excluding interest payments below revenue), but the overall fiscal deficit — once interest payments are included — has remained negative for decades." },
    ],
  },
  {
    id: "provincialTransfer",
    slug: "provincial-transfers",
    title: "Provincial Transfers (NFC Award)",
    shortTitle: "Provincial Transfers",
    unit: "Rs billion",
    getValue: (y) => y.provincialTransfer,
    color: NEON_PURPLE,
    description: "The provinces' share of federally-collected divisible-pool taxes under the National Finance Commission (NFC) Award.",
    whyItMatters: "This is constitutionally the largest deduction from gross federal revenue before the federal government even starts spending — it directly shapes how much fiscal room the federal government has left.",
    faq: [
      { question: "What is the NFC Award?", answer: "The National Finance Commission Award is the constitutional mechanism (Article 160) that sets how federally-collected divisible-pool taxes are split between the federal government and the four provinces. The current 7th NFC Award gives provinces 57.5% of the divisible pool." },
      { question: "Does this include all federal-to-provincial payments?", answer: "This figure is the divisible-pool/NFC share specifically. Supplementary grants and straight transfers to provinces are tracked separately in this dataset as \"Grants and Transfers to Provinces & Others.\"" },
      { question: "Why was the NFC Award created?", answer: "To give Pakistan's provinces a guaranteed, formula-based share of national tax revenue, instead of relying on the federal government's discretion each year — intended to make provincial funding more predictable and fair." },
      { question: "How often is the NFC Award renegotiated?", answer: "The constitution requires a new award at least every five years, though in practice awards have sometimes stayed in place well beyond that when provinces and the federal government couldn't agree on a new formula." },
      { question: "Which province gets the largest share under the NFC Award?", answer: "Punjab receives the largest share, simply because the formula is heavily weighted by population, and Punjab is Pakistan's most populous province." },
      { question: "Does the NFC Award only consider population?", answer: "Mostly, yes, though the current 7th NFC Award also factors in poverty, revenue collection, and inverse population density to a smaller degree, partly to address smaller provinces' concerns." },
      { question: "Why is the NFC Award politically sensitive?", answer: "Because it directly determines how much money each province gets to run schools, hospitals, and police — any change in the formula creates clear winners and losers among the provinces." },
      { question: "Do provinces have other sources of revenue besides NFC transfers?", answer: "Yes — provinces also collect some of their own taxes, like agricultural income tax and provincial sales tax on services, but NFC transfers remain by far the largest source of provincial revenue for most provinces." },
    ],
  },
  {
    id: "federalEducation",
    slug: "education-budget",
    title: "Pakistan's Federal Education Budget",
    shortTitle: "Federal Education",
    unit: "Rs billion",
    getValue: (y) => y.federalEducation,
    color: EMERALD,
    description: "Federal current expenditure on Education Affairs and Services — HEC, federal universities, and federal education institutions.",
    whyItMatters: "Education was devolved to the provinces under the 18th Amendment (2010); the bulk of Pakistan's actual education spending happens in provincial budgets, not here.",
    disclaimer: FEDERAL_PROVINCIAL_DISCLAIMER,
    faq: [
      { question: "Is this Pakistan's total education budget?", answer: "No. This is the federal government's current expenditure on education only — mainly the Higher Education Commission and federal institutions. Education is a provincial subject since the 18th Amendment, and provincial education budgets (Punjab, Sindh, KP, Balochistan) are several times larger than this federal figure, but are tracked in separate provincial budget documents not covered by this dataset." },
      { question: "Does this include PSDP development spending on education?", answer: "No — this is current expenditure only, from Budget in Brief's Function-Wise Expenditure table. Education-tagged PSDP development projects are booked under PSDP, a different classification, and are not added in here to avoid double-counting across two different expenditure classifications." },
      { question: "Why was education handed to the provinces?", answer: "The 18th Constitutional Amendment in 2010 was a broader move to decentralize government functions in Pakistan, on the idea that provinces are closer to local needs and can manage schools and curricula more effectively than a distant federal government." },
      { question: "What does the federal government still fund in education?", answer: "Mainly higher education through the Higher Education Commission (HEC), federal universities, and a small number of federal schools and colleges, often serving specific groups like the children of federal government employees." },
      { question: "How does Pakistan's education spending compare internationally?", answer: "Pakistan has historically spent a smaller share of its GDP on education than many comparable countries, a gap frequently cited as a long-term constraint on growth and human development." },
      { question: "Where can I find provincial education budget figures?", answer: "Each province publishes its own Budget in Brief or White Paper through its provincial Finance Department — Punjab, Sindh, Khyber Pakhtunkhwa, and Balochistan each maintain separate, publicly available budget documents." },
      { question: "Why does low education spending matter for the economy?", answer: "A less-educated workforce tends to be less productive and earns lower wages over time, which can slow overall economic growth and reduce the kinds of higher-value jobs the economy can support." },
      { question: "Has federal education spending grown over time?", answer: "Use the Historical Budget Explorer on the Budget Workshop to check — select Federal Education and view its trend in nominal Rupees or as a share of GDP across all 17 fiscal years in this dataset." },
    ],
  },
  {
    id: "federalHealth",
    slug: "health-budget",
    title: "Pakistan's Federal Health Budget",
    shortTitle: "Federal Health",
    unit: "Rs billion",
    getValue: (y) => y.federalHealth,
    color: ROSE,
    description: "Federal current expenditure on Health Affairs and Services — federal hospitals, health institutions, and federal health programmes.",
    whyItMatters: "Health was devolved to the provinces under the 18th Amendment (2010); the bulk of Pakistan's actual public health spending happens in provincial budgets, not here.",
    disclaimer: FEDERAL_PROVINCIAL_DISCLAIMER,
    faq: [
      { question: "Is this Pakistan's total health budget?", answer: "No. This is the federal government's current expenditure on health only. Health is a provincial subject since the 18th Amendment, and provincial health budgets are several times larger than this federal figure, but are tracked in separate provincial budget documents not covered by this dataset." },
      { question: "Does this include PSDP development spending on health?", answer: "No — this is current expenditure only. Health-tagged PSDP development projects are booked under PSDP, a different classification, and are not added in here to avoid double-counting." },
      { question: "Why was health handed to the provinces?", answer: "Like education, health was decentralized under the 18th Constitutional Amendment of 2010, based on the idea that provincial governments are better placed to manage hospitals and clinics close to the people who use them." },
      { question: "What does the federal government still fund in health?", answer: "Mainly federal hospitals and institutions, plus national programmes like the Expanded Programme on Immunization (EPI), which the federal government still coordinates because disease control benefits from a single national strategy." },
      { question: "How does Pakistan's health spending compare internationally?", answer: "Pakistan has historically spent a smaller share of GDP on health than most regional peers, a gap often linked to weaker health outcomes like higher infant mortality and lower life expectancy compared to similar-income countries." },
      { question: "Did COVID-19 change federal health spending?", answer: "Yes — federal health allocations rose noticeably during the pandemic years to fund emergency response, vaccines, and related programmes, before settling back toward more typical levels in later years." },
      { question: "Where can I find provincial health budget figures?", answer: "Each province publishes its own Budget in Brief through its provincial Finance Department, where the much larger provincial health allocations are listed in detail." },
      { question: "Why is low health spending a concern for ordinary Pakistanis?", answer: "Limited public health spending means longer wait times, fewer resources at public hospitals, and a heavier reliance on costly private healthcare for families who can't always afford it." },
    ],
  },
];

/** Label + color for every trendable field on BudgetYearRecord, including the 5 that have no dedicated /budget/[slug] page (totalOutlay, fbrTaxRevenue, nonTaxRevenue, grantsAndTransfersOther) — used by the category multi-select and trend chart. */
export const BUDGET_FIELD_META: Record<string, { label: string; color: string }> = {
  totalOutlay: { label: "Total Outlay", color: "#e2e8f0" },
  fbrTaxRevenue: { label: "FBR Tax Revenue", color: NEON_BLUE },
  nonTaxRevenue: { label: "Non-Tax Revenue", color: "#22d3ee" },
  provincialTransfer: { label: "Provincial Transfers", color: NEON_PURPLE },
  grantsAndTransfersOther: { label: "Grants & Transfers (Other)", color: "#c084fc" },
  federalPsdp: { label: "PSDP", color: EMERALD },
  defence: { label: "Defence", color: NEON_BLUE },
  debtServicing: { label: "Debt Servicing", color: ROSE },
  pension: { label: "Pension", color: VIOLET },
  subsidies: { label: "Subsidies", color: AMBER },
  federalEducation: { label: "Federal Education", color: EMERALD },
  federalHealth: { label: "Federal Health", color: "#f472b6" },
  fiscalDeficitRs: { label: "Fiscal Deficit", color: "#fb923c" },
};

export function getBudgetCategoryBySlug(slug: string): BudgetCategoryDef | undefined {
  return BUDGET_CATEGORIES.find((c) => c.slug === slug);
}

export function getAllBudgetCategorySlugs(): string[] {
  return BUDGET_CATEGORIES.map((c) => c.slug);
}

/** Extra SEO pages that aren't single-category pages (comparisons, pillar pages) — listed here so sitemap.ts has one place to read every /budget/* URL from. */
export const BUDGET_EXTRA_SEO_SLUGS = ["debt-servicing-vs-defence", "where-does-tax-money-go"];
