// Local knowledge base for the Economic Intelligence Assistant.
// Answers common economics/finance/Pakistan-economy questions without an AI
// call. Checked first in the assistant flow (see knowledgeBaseSearch.ts) —
// only falls through to Tavily/OpenRouter on a miss.

export interface KnowledgeEntry {
  id: string;
  aliases: string[];
  category: string;
  answer: string;
}

// ── Alias generation ─────────────────────────────────────────────────────────
//
// Rather than hand-typing 10-30 phrasing variants per entry, every entry's
// alias list is the union of a small number of hand-curated, entry-specific
// phrases (covering anything a template can't predict — synonyms, related
// terms, Pakistan-specific phrasing) plus a large, mechanically generated set
// of standard question/definition templates applied to the entry's core
// term(s). This is what lets the knowledge base scale to thousands of
// entries with tens of thousands of aliases without writing each one by hand
// — and it guarantees consistency (every topic gets the same phrasing
// coverage) rather than uneven, ad-hoc lists.

const DEFINITION_TEMPLATES: ((t: string) => string)[] = [
  (t) => `what is ${t}`,
  (t) => `what are ${t}`,
  (t) => `define ${t}`,
  (t) => `explain ${t}`,
  (t) => `${t} meaning`,
  (t) => `${t} definition`,
  (t) => `tell me about ${t}`,
  (t) => `what does ${t} mean`,
  (t) => `can you explain ${t}`,
  (t) => `what is the meaning of ${t}`,
  (t) => `${t} explained`,
  (t) => `${t} explained simply`,
  (t) => `${t} in simple words`,
  (t) => `${t} in simple terms`,
  (t) => `how do you define ${t}`,
  (t) => `how do economists define ${t}`,
  (t) => `give me a simple explanation of ${t}`,
  (t) => `what's ${t}`,
  (t) => `${t} basics`,
  (t) => `understanding ${t}`,
  (t) => `${t} for beginners`,
  (t) => `can you tell me what ${t} is`,
  (t) => `i want to know about ${t}`,
  (t) => `${t} for dummies`,
  (t) => `quick explanation of ${t}`,
];

/** Generates the full template-based alias set for one or more core terms (e.g. ["gdp", "gross domestic product"]), plus any hand-curated extras. */
function buildAliases(coreTerms: string[], extra: string[] = []): string[] {
  const generated = coreTerms.flatMap((t) => DEFINITION_TEMPLATES.map((tmpl) => tmpl(t)));
  return Array.from(new Set([...extra, ...generated]));
}

function normalizeForDedup(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Detects entries phrased as a plain definitional question ("what is X",
 * "define X", "X meaning", ...) and extracts X, so existing hand-authored
 * entries can be auto-expanded with the full template set. Entries phrased
 * as comparisons ("X vs Y"), "why"/"how" questions, or anything else that
 * doesn't match cleanly are left untouched rather than guessing — a missed
 * expansion is harmless, a wrong one could create a misleading alias.
 */
function extractCoreTerm(aliases: string[]): string | null {
  for (const a of aliases) {
    const lower = a.toLowerCase().trim();
    let m = lower.match(/^(?:what is|what are|define|explain)\s+(.+)$/);
    if (m) return m[1].replace(/\?$/, "").trim();
    m = lower.match(/^what does\s+(.+?)\s+mean\??$/);
    if (m) return m[1].trim();
    m = lower.match(/^(.+?)\s+(?:meaning|definition)$/);
    if (m) return m[1].trim();
  }
  return null;
}

const HAND_AUTHORED: KnowledgeEntry[] = [
  // ── GDP ──────────────────────────────────────────────────────────────────
  {
    id: "gdp-what-is",
    aliases: ["what is gdp", "define gdp", "explain gdp", "what does gdp mean", "gross domestic product"],
    category: "GDP",
    answer: "GDP (Gross Domestic Product) is the total value of all goods and services produced within a country in a given period, usually a year or quarter. It's the standard measure of the size of an economy.",
  },
  {
    id: "gdp-real-vs-nominal",
    aliases: ["real gdp vs nominal gdp", "difference between real and nominal gdp", "what is real gdp", "what is nominal gdp"],
    category: "GDP",
    answer: "Nominal GDP is measured at current prices, so it includes inflation. Real GDP is adjusted for inflation, so it reflects actual changes in output. Economists use real GDP to compare growth across years fairly.",
  },
  {
    id: "gdp-per-capita",
    aliases: ["what is gdp per capita", "gdp per capita meaning", "gdp per capita pakistan"],
    category: "GDP",
    answer: "GDP per capita is a country's GDP divided by its population — a rough measure of average income or living standard. It doesn't capture inequality, since a high average can hide large gaps between rich and poor.",
  },
  {
    id: "gdp-growth-rate",
    aliases: ["what is gdp growth rate", "how is gdp growth calculated", "gdp growth meaning"],
    category: "GDP",
    answer: "GDP growth rate is the percentage change in real GDP from one period to another, usually year-over-year. It's the headline number used to judge whether an economy is expanding, stagnant, or shrinking.",
  },
  {
    id: "gdp-components",
    aliases: ["components of gdp", "what makes up gdp", "gdp formula", "gdp = c+i+g+nx"],
    category: "GDP",
    answer: "GDP is commonly broken down as C + I + G + NX: Consumption (household spending), Investment (business spending on capital), Government spending, and Net Exports (exports minus imports).",
  },
  {
    id: "gdp-deflator",
    aliases: ["what is gdp deflator", "gdp deflator meaning", "gdp deflator vs cpi"],
    category: "GDP",
    answer: "The GDP deflator is a price index that measures the overall price level of everything produced in an economy, used to convert nominal GDP into real GDP. Unlike CPI, it covers all domestic output, not just a household basket of goods.",
  },
  {
    id: "gdp-vs-gnp",
    aliases: ["gdp vs gnp", "difference between gdp and gnp", "gdp compared to gnp", "is gdp the same as gnp"],
    category: "GDP",
    answer: "GDP measures output produced within a country's borders, regardless of who produces it. GNP (Gross National Product) measures output produced by a country's citizens and companies, regardless of where in the world it happens.",
  },
  {
    id: "gdp-potential",
    aliases: ["what is potential gdp", "potential output meaning", "output gap"],
    category: "GDP",
    answer: "Potential GDP is the maximum sustainable output an economy can produce without overheating (causing inflation). The gap between actual and potential GDP is called the output gap — negative means slack, positive means overheating.",
  },
  {
    id: "gdp-constant-prices",
    aliases: ["gdp at constant prices", "what does constant prices mean", "base year gdp"],
    category: "GDP",
    answer: "GDP at constant prices values output using prices from a fixed base year, removing the effect of inflation so growth between years reflects actual quantity changes, not price changes.",
  },
  {
    id: "gdp-sectoral-shares",
    aliases: ["sectoral gdp shares pakistan", "agriculture industry services gdp share", "pakistan gdp by sector"],
    category: "GDP",
    answer: "Pakistan's GDP is roughly split across three sectors: services (~60%, the largest), agriculture (~23%), and industry (~19%). This mix has shifted slowly toward services over the past few decades.",
  },
  {
    id: "gdp-employment",
    aliases: ["gdp and employment relationship", "does gdp growth create jobs", "gdp and unemployment"],
    category: "GDP",
    answer: "GDP growth usually creates jobs because producing more goods and services requires more workers, but the relationship isn't perfect — 'jobless growth' can happen when growth comes from capital-intensive sectors rather than labor-intensive ones.",
  },
  {
    id: "gdp-why-matters",
    aliases: ["why does gdp matter", "why is gdp important", "why do we track gdp"],
    category: "GDP",
    answer: "GDP matters because it's the most widely used proxy for a country's economic health, living standards, and capacity to create jobs and tax revenue. Governments, investors, and international lenders all watch it closely.",
  },
  {
    id: "gdp-who-calculates-pakistan",
    aliases: ["who calculates pakistan gdp", "pbs gdp", "pakistan bureau of statistics gdp"],
    category: "GDP",
    answer: "Pakistan's GDP is calculated and published by the Pakistan Bureau of Statistics (PBS), which compiles national accounts data covering agriculture, industry, and services output.",
  },
  {
    id: "gdp-rebasing",
    aliases: ["what is gdp rebasing", "gdp base year change", "why rebase gdp"],
    category: "GDP",
    answer: "GDP rebasing updates the base year used to calculate real GDP, reflecting changes in the economy's structure (new industries, changed spending patterns). Pakistan has periodically rebased its GDP series, most recently moving the base year forward.",
  },
  {
    id: "gdp-informal-economy",
    aliases: ["informal economy and gdp", "does gdp include informal economy", "undocumented economy pakistan"],
    category: "GDP",
    answer: "Official GDP estimates typically undercount informal economic activity (cash transactions, unregistered businesses), which is large in Pakistan — some estimates suggest the informal economy could be 30%+ of measured GDP.",
  },
  {
    id: "gdp-pakistan-history",
    aliases: ["pakistan gdp growth history", "pakistan economic growth over time", "how has pakistan gdp grown"],
    category: "GDP",
    answer: "Pakistan's GDP growth has been volatile, swinging between periods of 5-6% growth and sharp slowdowns tied to balance-of-payments crises, political instability, and global shocks like the 2022 floods and energy price spikes.",
  },
  {
    id: "gdp-forecast",
    aliases: ["pakistan gdp forecast", "gdp growth projection pakistan", "future gdp growth pakistan"],
    category: "GDP",
    answer: "GDP forecasts for Pakistan are published by the IMF, World Bank, ADB, and SBP, typically projecting moderate growth (3-5%) contingent on macroeconomic stability, IMF program compliance, and avoiding external shocks.",
  },
  {
    id: "gdp-nominal-pakistan",
    aliases: ["pakistan nominal gdp size", "how big is pakistan economy", "pakistan gdp in dollars"],
    category: "GDP",
    answer: "Pakistan's nominal GDP is in the range of $340-380 billion (varying with exchange rate movements), making it one of the larger economies in South Asia by size, though GDP per capita remains low due to its large population.",
  },

  // ── Quarterly GDP ────────────────────────────────────────────────────────
  {
    id: "qgdp-what-is",
    aliases: ["what is quarterly gdp", "quarterly gdp meaning", "quarterly gdp growth pakistan"],
    category: "Quarterly GDP",
    answer: "Quarterly GDP measures economic output over a three-month period instead of a full year, giving a faster read on the economy's momentum between annual GDP releases.",
  },
  {
    id: "qgdp-why-matters",
    aliases: ["why quarterly gdp matters", "why track quarterly gdp", "benefit of quarterly gdp data"],
    category: "Quarterly GDP",
    answer: "Quarterly GDP reveals turning points in the economy much faster than annual data — useful for policymakers and investors trying to catch a slowdown or recovery as it happens rather than months later.",
  },
  {
    id: "qgdp-yoy-vs-qoq",
    aliases: ["yoy vs qoq gdp", "year over year vs quarter over quarter", "what does yoy mean in gdp"],
    category: "Quarterly GDP",
    answer: "YoY (year-over-year) compares a quarter to the same quarter last year, removing seasonal effects. QoQ (quarter-over-quarter) compares it to the immediately preceding quarter and usually needs seasonal adjustment to be meaningful.",
  },
  {
    id: "qgdp-seasonal-adjustment",
    aliases: ["what is seasonal adjustment gdp", "why seasonally adjust gdp data"],
    category: "Quarterly GDP",
    answer: "Seasonal adjustment removes predictable patterns (like holiday spending spikes or harvest cycles) from quarterly data so that the underlying trend, not the calendar, drives the reported number.",
  },
  {
    id: "qgdp-who-publishes-pakistan",
    aliases: ["who publishes pakistan quarterly gdp", "pbs quarterly gdp release"],
    category: "Quarterly GDP",
    answer: "Pakistan's quarterly GDP (QGDP) is published by the Pakistan Bureau of Statistics, typically with a lag of about six weeks after the quarter ends, covering real GVA (Gross Value Added) growth by sector.",
  },
  {
    id: "qgdp-real-gva",
    aliases: ["what is real gva", "gva vs gdp", "gross value added meaning"],
    category: "Quarterly GDP",
    answer: "GVA (Gross Value Added) measures the value generated by each sector of production. Real GVA growth is the core measure reported in Pakistan's quarterly GDP releases, broken down by agriculture, industry, and services.",
  },
  {
    id: "qgdp-provisional-vs-final",
    aliases: ["provisional gdp estimate", "final gdp estimate", "gdp revisions"],
    category: "Quarterly GDP",
    answer: "Quarterly GDP is usually first released as a provisional estimate based on incomplete data, then revised as more complete information becomes available — so early quarterly figures can change meaningfully later.",
  },
  {
    id: "qgdp-volatility",
    aliases: ["why is quarterly gdp volatile", "quarterly gdp swings"],
    category: "Quarterly GDP",
    answer: "Quarterly GDP tends to be more volatile than annual GDP because short-term events — a single bad harvest, a strike, a temporary import restriction — can swing one quarter sharply without changing the annual trend.",
  },
  {
    id: "qgdp-lag",
    aliases: ["how late is quarterly gdp data", "gdp release lag pakistan"],
    category: "Quarterly GDP",
    answer: "Pakistan's quarterly GDP data is typically released about six weeks after the quarter ends, reflecting the time needed to collect and compile data across agriculture, industry, and services.",
  },
  {
    id: "qgdp-vs-annual",
    aliases: ["quarterly gdp vs annual gdp", "how do quarterly figures relate to annual gdp"],
    category: "Quarterly GDP",
    answer: "Annual GDP growth is roughly the average of the four quarterly growth rates within that fiscal year, though sector weights and seasonal patterns mean it's not a simple arithmetic average.",
  },

  // ── Inflation ────────────────────────────────────────────────────────────
  {
    id: "inflation-what-is",
    aliases: ["what is inflation", "define inflation", "explain inflation", "inflation meaning"],
    category: "Inflation",
    answer: "Inflation is the rate at which the general price level of goods and services rises over time, reducing the purchasing power of money — the same amount of cash buys less than it used to.",
  },
  {
    id: "inflation-causes",
    aliases: ["what causes inflation", "causes of inflation", "why does inflation happen"],
    category: "Inflation",
    answer: "Inflation can be caused by demand outpacing supply (demand-pull), rising production costs like wages or energy (cost-push), excessive money supply growth, or imported price increases via a weaker currency.",
  },
  {
    id: "inflation-demand-pull",
    aliases: ["what is demand-pull inflation", "demand pull inflation meaning"],
    category: "Inflation",
    answer: "Demand-pull inflation happens when total demand in the economy grows faster than the economy's capacity to produce, pushing prices up as buyers compete for limited goods.",
  },
  {
    id: "inflation-cost-push",
    aliases: ["what is cost-push inflation", "cost push inflation meaning"],
    category: "Inflation",
    answer: "Cost-push inflation happens when production costs rise — like oil, wages, or import prices — forcing businesses to raise prices to maintain margins, independent of demand.",
  },
  {
    id: "inflation-hyperinflation",
    aliases: ["what is hyperinflation", "hyperinflation meaning", "hyperinflation examples"],
    category: "Inflation",
    answer: "Hyperinflation is extremely rapid, out-of-control inflation, often exceeding 50% per month, usually caused by a government printing money to fund spending. Historical examples include Zimbabwe and Venezuela.",
  },
  {
    id: "inflation-deflation",
    aliases: ["what is deflation", "deflation meaning", "deflation vs inflation"],
    category: "Inflation",
    answer: "Deflation is a sustained fall in the general price level — the opposite of inflation. While it sounds good for consumers, it can signal weak demand and often leads to delayed spending and falling wages.",
  },
  {
    id: "inflation-disinflation",
    aliases: ["what is disinflation", "disinflation vs deflation"],
    category: "Inflation",
    answer: "Disinflation is a slowdown in the rate of inflation — prices are still rising, just more slowly than before. It's different from deflation, where prices actually fall.",
  },
  {
    id: "inflation-stagflation",
    aliases: ["what is stagflation", "stagflation meaning"],
    category: "Inflation",
    answer: "Stagflation is the painful combination of high inflation and stagnant (or shrinking) economic growth, often with rising unemployment — a difficult scenario for central banks since fighting inflation can worsen growth.",
  },
  {
    id: "inflation-targeting",
    aliases: ["what is inflation targeting", "inflation targeting framework", "sbp inflation target"],
    category: "Inflation",
    answer: "Inflation targeting is a monetary policy framework where a central bank sets an explicit inflation goal (e.g., 5-7% for SBP) and adjusts interest rates to keep actual inflation near that target.",
  },
  {
    id: "inflation-headline-vs-core",
    aliases: ["headline inflation vs core inflation", "difference between headline and core inflation"],
    category: "Inflation",
    answer: "Headline inflation is the full CPI figure including all items. Core inflation strips out volatile food and energy prices to show the underlying, more persistent price trend that policymakers care most about.",
  },
  {
    id: "inflation-expectations",
    aliases: ["what are inflation expectations", "why do inflation expectations matter"],
    category: "Inflation",
    answer: "Inflation expectations are what businesses and households believe future inflation will be. They matter because expecting higher inflation makes people demand higher wages and raise prices preemptively, which can become self-fulfilling.",
  },
  {
    id: "inflation-how-measured",
    aliases: ["how is inflation measured", "how is inflation calculated"],
    category: "Inflation",
    answer: "Inflation is typically measured using a price index like the CPI, which tracks the cost of a fixed basket of goods and services over time and calculates the percentage change.",
  },
  {
    id: "inflation-wages",
    aliases: ["inflation and wages", "wage-price spiral"],
    category: "Inflation",
    answer: "When inflation rises, workers often demand higher wages to maintain their purchasing power. If businesses pass these higher wage costs onto prices, it can create a self-reinforcing 'wage-price spiral.'",
  },
  {
    id: "inflation-savings",
    aliases: ["inflation and savings", "how inflation affects savings"],
    category: "Inflation",
    answer: "Inflation erodes the real value of cash savings over time — if inflation exceeds the interest rate earned on savings, the saver's purchasing power actually falls despite earning interest.",
  },
  {
    id: "inflation-imported",
    aliases: ["what is imported inflation", "imported inflation pakistan"],
    category: "Inflation",
    answer: "Imported inflation occurs when rising global prices (like oil) or a weakening currency make imported goods more expensive, pushing up domestic inflation regardless of local demand conditions.",
  },
  {
    id: "inflation-food-pakistan",
    aliases: ["food inflation pakistan", "why is food expensive in pakistan"],
    category: "Inflation",
    answer: "Food inflation is typically the largest single driver of Pakistan's CPI, reflecting its heavy weight in the average household's spending basket and its sensitivity to weather, supply chains, and fuel costs.",
  },
  {
    id: "inflation-energy-pakistan",
    aliases: ["energy inflation pakistan", "electricity price inflation pakistan"],
    category: "Inflation",
    answer: "Energy inflation in Pakistan is driven by global oil/LNG prices, currency depreciation (since energy is imported), and periodic administrative price adjustments to electricity and gas tariffs.",
  },
  {
    id: "inflation-history-pakistan",
    aliases: ["pakistan inflation history", "highest inflation in pakistan history"],
    category: "Inflation",
    answer: "Pakistan's inflation has spiked repeatedly during balance-of-payments crises, most notably reaching nearly 38% in May 2023 amid currency depreciation, energy price adjustments, and import restrictions.",
  },
  {
    id: "inflation-exchange-rate",
    aliases: ["inflation and exchange rate relationship", "how exchange rate affects inflation"],
    category: "Inflation",
    answer: "A weaker currency makes imports more expensive, directly feeding into inflation — this is especially significant for Pakistan, which imports a large share of its energy and raw materials in US dollars.",
  },
  {
    id: "inflation-who-controls-pakistan",
    aliases: ["who controls inflation in pakistan", "sbp role in inflation"],
    category: "Inflation",
    answer: "The State Bank of Pakistan (SBP) is primarily responsible for controlling inflation through monetary policy — mainly by adjusting its policy interest rate — though fiscal and supply-side factors also play a major role.",
  },

  // ── CPI ──────────────────────────────────────────────────────────────────
  {
    id: "cpi-what-is",
    aliases: ["what is cpi", "define cpi", "consumer price index meaning"],
    category: "CPI",
    answer: "CPI (Consumer Price Index) measures the average change in prices paid by consumers for a fixed basket of goods and services over time — it's the most common way inflation is reported.",
  },
  {
    id: "cpi-basket",
    aliases: ["what is the cpi basket", "cpi basket of goods pakistan"],
    category: "CPI",
    answer: "The CPI basket is a representative set of goods and services (food, housing, transport, healthcare, etc.) weighted by how much an average household spends on each, used to track overall price changes.",
  },
  {
    id: "cpi-base-year",
    aliases: ["what is cpi base year", "cpi base year pakistan"],
    category: "CPI",
    answer: "The CPI base year is the reference year (set to 100) against which current prices are compared. Pakistan has periodically updated its CPI base year to keep the basket representative of current spending habits.",
  },
  {
    id: "cpi-vs-wpi",
    aliases: ["cpi vs wpi", "difference between cpi and wpi"],
    category: "CPI",
    answer: "CPI measures retail prices paid by consumers, while WPI (Wholesale Price Index) measures prices at the factory or wholesale level before goods reach the consumer — WPI often moves ahead of CPI as a leading signal.",
  },
  {
    id: "cpi-weights",
    aliases: ["cpi weights pakistan", "how are cpi weights determined"],
    category: "CPI",
    answer: "CPI weights reflect the share of total household spending each category represents — food typically carries the largest weight in Pakistan's CPI basket, which is why food price swings move the headline number significantly.",
  },
  {
    id: "cpi-urban-vs-rural",
    aliases: ["urban vs rural cpi pakistan", "rural cpi pakistan", "urban cpi vs rural cpi pakistan", "does cpi differ between urban and rural pakistan"],
    category: "CPI",
    answer: "Pakistan publishes separate urban and rural CPI indices alongside the combined national CPI, since spending patterns and price exposure differ between cities and rural areas.",
  },
  {
    id: "cpi-who-calculates-pakistan",
    aliases: ["who calculates pakistan cpi", "pbs cpi release"],
    category: "CPI",
    answer: "Pakistan's CPI is calculated and published monthly by the Pakistan Bureau of Statistics (PBS), based on price surveys collected across major cities and rural areas.",
  },
  {
    id: "cpi-yoy-vs-mom",
    aliases: ["cpi yoy vs mom", "year on year vs month on month cpi"],
    category: "CPI",
    answer: "CPI YoY compares prices to the same month last year, showing the headline inflation rate. CPI MoM compares to the previous month, useful for spotting short-term momentum but more volatile.",
  },
  {
    id: "cpi-policy-rate",
    aliases: ["cpi and policy rate relationship", "how cpi affects sbp decisions"],
    category: "CPI",
    answer: "SBP's Monetary Policy Committee watches CPI closely — rising CPI typically pushes SBP toward raising the policy rate, while falling CPI opens room for rate cuts.",
  },
  {
    id: "cpi-revisions",
    aliases: ["cpi data revisions", "why does cpi get revised"],
    category: "CPI",
    answer: "CPI figures can be revised as more complete price data becomes available or when the base year/basket composition is updated, though revisions are generally smaller than for GDP.",
  },
  {
    id: "cpi-core-exclusions",
    aliases: ["what is excluded from core cpi", "core cpi exclusions"],
    category: "CPI",
    answer: "Core CPI excludes volatile food and energy items, which are heavily influenced by weather and global commodity prices, to isolate the more persistent, demand-driven inflation trend.",
  },
  {
    id: "cpi-spi",
    aliases: ["what is sensitive price indicator", "spi pakistan"],
    category: "CPI",
    answer: "The Sensitive Price Indicator (SPI) is a weekly price index tracking essential daily-use items in Pakistan, providing a faster (though narrower) read on price pressure than the monthly CPI.",
  },

  // ── Core Inflation ───────────────────────────────────────────────────────
  {
    id: "core-inflation-what-is",
    aliases: ["what is core inflation", "core inflation meaning", "define core inflation"],
    category: "Core Inflation",
    answer: "Core inflation is CPI inflation with volatile food and energy prices stripped out, showing the more persistent, underlying price trend that central banks use to guide policy.",
  },
  {
    id: "core-inflation-why-strip-food-energy",
    aliases: ["why exclude food and energy from inflation", "why does core inflation exclude food"],
    category: "Core Inflation",
    answer: "Food and energy prices are excluded from core inflation because they're driven by weather, harvests, and global commodity swings rather than domestic demand — including them can obscure the underlying trend.",
  },
  {
    id: "core-inflation-nfne",
    aliases: ["what is nfne inflation", "non-food non-energy inflation"],
    category: "Core Inflation",
    answer: "NFNE (Non-Food Non-Energy) inflation is Pakistan's specific term for core inflation — it's SBP's primary gauge of underlying, demand-driven price pressure separate from food and fuel shocks.",
  },
  {
    id: "core-inflation-vs-headline",
    aliases: ["core inflation vs headline inflation gap", "why is core different from headline"],
    category: "Core Inflation",
    answer: "When core inflation runs below headline inflation, it usually means a temporary food or energy shock is driving up prices. When core runs at or above headline, inflation is more broad-based and harder to bring down quickly.",
  },
  {
    id: "core-inflation-policy-signal",
    aliases: ["core inflation and rate cuts", "why does sbp watch core inflation"],
    category: "Core Inflation",
    answer: "A sustained decline in core inflation is typically the key condition SBP looks for before cutting its policy rate, since it signals underlying price pressure (not just a temporary shock) is genuinely easing.",
  },
  {
    id: "core-inflation-urban-focus",
    aliases: ["urban core inflation pakistan", "why urban nfne specifically"],
    category: "Core Inflation",
    answer: "Pakistan's core inflation measure focuses on urban areas (Urban NFNE) because urban consumption patterns are considered more representative of discretionary, demand-driven spending.",
  },
  {
    id: "core-inflation-sticky",
    aliases: ["why is core inflation sticky", "sticky prices meaning"],
    category: "Core Inflation",
    answer: "Core inflation tends to be 'stickier' than headline inflation — it changes more slowly because it reflects wages, rents, and services prices that don't adjust as quickly as volatile food or fuel costs.",
  },
  {
    id: "core-inflation-international",
    aliases: ["how do other countries measure core inflation", "core cpi vs core pce"],
    category: "Core Inflation",
    answer: "Most central banks use some version of core inflation excluding food and energy; the US Federal Reserve, for example, focuses on 'core PCE,' while SBP uses Core NFNE CPI.",
  },

  // ── Interest Rates ───────────────────────────────────────────────────────
  {
    id: "interest-rate-what-is",
    aliases: ["what is an interest rate", "define interest rate", "interest rate meaning"],
    category: "Interest Rates",
    answer: "An interest rate is the cost of borrowing money, or the reward for saving it, usually expressed as an annual percentage. It affects everything from mortgage payments to government borrowing costs.",
  },
  {
    id: "interest-rate-nominal-vs-real",
    aliases: ["nominal vs real interest rate", "real interest rate meaning"],
    category: "Interest Rates",
    answer: "The nominal interest rate is the stated rate before adjusting for inflation. The real interest rate subtracts inflation from the nominal rate, showing the actual increase in purchasing power a saver or lender earns.",
  },
  {
    id: "interest-rate-how-sbp-sets",
    aliases: ["how does sbp set interest rates", "how sbp decides policy rate"],
    category: "Interest Rates",
    answer: "SBP's Monetary Policy Committee sets the policy rate roughly every two months, weighing inflation trends, the current account, exchange rate pressure, and growth conditions to decide whether to hike, cut, or hold.",
  },
  {
    id: "interest-rate-and-inflation",
    aliases: ["interest rate and inflation relationship", "how interest rates control inflation"],
    category: "Interest Rates",
    answer: "Raising interest rates makes borrowing more expensive and saving more attractive, which cools spending and demand — this is the main tool central banks use to bring down inflation.",
  },
  {
    id: "interest-rate-and-investment",
    aliases: ["interest rate and investment relationship", "how interest rates affect business investment"],
    category: "Interest Rates",
    answer: "Lower interest rates make it cheaper for businesses to borrow and invest in expansion, while higher rates discourage borrowing and investment — a key channel through which monetary policy affects growth.",
  },
  {
    id: "interest-rate-and-exchange-rate",
    aliases: ["interest rate and exchange rate relationship", "how interest rates affect currency"],
    category: "Interest Rates",
    answer: "Higher interest rates can attract foreign capital seeking better returns, supporting the currency. Pakistan often raises rates partly to defend the Rupee during periods of external pressure.",
  },
  {
    id: "interest-rate-transmission",
    aliases: ["monetary policy transmission mechanism", "how does policy rate affect the economy"],
    category: "Interest Rates",
    answer: "Monetary policy transmission is the chain of effects from a policy rate change to the real economy — through bank lending rates, bond yields, the exchange rate, and ultimately spending and inflation.",
  },
  {
    id: "interest-rate-mpc",
    aliases: ["what is monetary policy committee", "mpc sbp meaning"],
    category: "Interest Rates",
    answer: "The Monetary Policy Committee (MPC) is the SBP body responsible for setting the policy interest rate, made up of SBP officials and external economists who meet on a scheduled calendar.",
  },
  {
    id: "interest-rate-hike-effect",
    aliases: ["what happens when interest rates rise", "effect of interest rate hike"],
    category: "Interest Rates",
    answer: "A rate hike raises borrowing costs across the economy, typically slowing consumer spending and business investment, cooling inflation, but also slowing GDP growth in the near term.",
  },
  {
    id: "interest-rate-cut-effect",
    aliases: ["what happens when interest rates fall", "effect of interest rate cut"],
    category: "Interest Rates",
    answer: "A rate cut lowers borrowing costs, encouraging spending and investment, which can boost growth — but if done too aggressively while inflation is still high, it risks reigniting price pressure.",
  },
  {
    id: "interest-rate-fixed-vs-floating",
    aliases: ["fixed vs floating interest rate", "variable rate loan meaning"],
    category: "Interest Rates",
    answer: "A fixed interest rate stays the same for the life of a loan or bond. A floating (variable) rate moves up or down with a benchmark like KIBOR, so payments change as market rates change.",
  },
  {
    id: "interest-rate-and-bonds",
    aliases: ["interest rate and bond prices relationship", "why do bond prices fall when rates rise"],
    category: "Interest Rates",
    answer: "Bond prices and interest rates move inversely: when rates rise, existing bonds with lower fixed coupons become less attractive, so their market price falls to compensate buyers.",
  },
  {
    id: "interest-rate-markup",
    aliases: ["what is mark-up rate pakistan", "islamic finance mark-up rate"],
    category: "Interest Rates",
    answer: "'Mark-up rate' is the Islamic finance term used in Pakistan for the profit rate charged on Shariah-compliant financing, functionally similar to an interest rate but structured to avoid conventional riba.",
  },
  {
    id: "interest-rate-kibor-lending",
    aliases: ["kibor based lending pakistan", "how banks price loans using kibor"],
    category: "Interest Rates",
    answer: "Most variable-rate bank loans in Pakistan are priced as KIBOR plus a spread (e.g., KIBOR + 2%), meaning loan costs move automatically whenever KIBOR moves.",
  },
  {
    id: "interest-rate-negative-real",
    aliases: ["negative real interest rate meaning", "what is a negative real rate"],
    category: "Interest Rates",
    answer: "A negative real interest rate occurs when inflation exceeds the nominal interest rate, meaning savers actually lose purchasing power even while earning interest — common during high-inflation periods.",
  },
  {
    id: "interest-rate-savings",
    aliases: ["interest rate and savings behavior", "how interest rates affect saving"],
    category: "Interest Rates",
    answer: "Higher interest rates reward saving over spending, encouraging households to put more money into bank deposits or bonds rather than consuming immediately.",
  },
  {
    id: "interest-rate-global-impact-pakistan",
    aliases: ["how do global interest rates affect pakistan", "fed rate impact on pakistan"],
    category: "Interest Rates",
    answer: "When major central banks like the US Federal Reserve raise rates, capital tends to flow out of emerging markets like Pakistan toward higher-yielding developed markets, pressuring the Rupee and raising Pakistan's own borrowing costs.",
  },
  {
    id: "interest-rate-history-pakistan",
    aliases: ["pakistan interest rate history", "highest sbp policy rate ever"],
    category: "Interest Rates",
    answer: "Pakistan's policy rate has swung dramatically, including a peak of 22% in 2023 during a severe inflation and balance-of-payments crisis, before being cut as inflation eased in subsequent years.",
  },

  // ── SBP ──────────────────────────────────────────────────────────────────
  {
    id: "sbp-what-is",
    aliases: ["what is sbp", "what does sbp stand for", "state bank of pakistan meaning"],
    category: "SBP",
    answer: "SBP (State Bank of Pakistan) is the country's central bank, responsible for monetary policy, currency issuance, banking regulation, and managing foreign exchange reserves.",
  },
  {
    id: "sbp-functions",
    aliases: ["what does sbp do", "functions of sbp", "sbp responsibilities"],
    category: "SBP",
    answer: "SBP's core functions include setting monetary policy (the policy rate), issuing currency, regulating and supervising banks, managing foreign reserves, and acting as banker to the government.",
  },
  {
    id: "sbp-governor",
    aliases: ["who is the sbp governor", "sbp governor role"],
    category: "SBP",
    answer: "The SBP Governor is the central bank's chief executive, appointed by the federal government, who chairs the Monetary Policy Committee and represents SBP in dealings with the IMF and other institutions.",
  },
  {
    id: "sbp-independence",
    aliases: ["is sbp independent", "sbp autonomy law"],
    category: "SBP",
    answer: "SBP was granted greater legal autonomy in 2022, restricting government influence over monetary policy decisions — a reform widely seen as supporting credibility with the IMF and financial markets.",
  },
  {
    id: "sbp-mpc",
    aliases: ["sbp monetary policy committee members", "what is sbp mpc"],
    category: "SBP",
    answer: "SBP's Monetary Policy Committee (MPC) includes SBP officials and external economists, and meets on a pre-announced schedule (roughly every two months) to decide the policy interest rate.",
  },
  {
    id: "sbp-exchange-rate-policy",
    aliases: ["sbp exchange rate policy", "does sbp control the dollar rate"],
    category: "SBP",
    answer: "SBP officially operates a market-determined (floating) exchange rate regime, though it intervenes periodically to smooth excessive volatility and has faced criticism for informal rate management at times.",
  },
  {
    id: "sbp-reserve-management",
    aliases: ["how does sbp manage reserves", "sbp foreign reserves management"],
    category: "SBP",
    answer: "SBP manages the country's foreign exchange reserves, using them to support import payments, service external debt, and intervene in currency markets when necessary.",
  },
  {
    id: "sbp-banking-supervision",
    aliases: ["sbp banking regulation", "does sbp regulate banks"],
    category: "SBP",
    answer: "SBP supervises and regulates all banks operating in Pakistan, setting capital requirements, conducting inspections, and enforcing prudential rules to maintain financial stability.",
  },
  {
    id: "sbp-digital-currency",
    aliases: ["sbp digital currency plans", "pakistan central bank digital currency"],
    category: "SBP",
    answer: "SBP has explored the concept of a central bank digital currency (CBDC) as part of broader efforts to modernize Pakistan's payment systems, alongside its existing Raast instant payment system.",
  },
  {
    id: "sbp-open-market-operations",
    aliases: buildAliases(["open market operations", "omo"], ["sbp omo meaning"]),
    category: "SBP",
    answer: "Open Market Operations (OMOs) are how SBP injects or withdraws liquidity from the banking system by buying or selling government securities, keeping short-term market rates aligned with the policy rate.",
  },
  {
    id: "sbp-standing-facilities",
    aliases: ["sbp standing facilities", "sbp ceiling and floor rate"],
    category: "SBP",
    answer: "SBP's standing facilities let banks borrow or deposit overnight funds at fixed ceiling/floor rates around the policy rate, keeping the interbank overnight rate close to the policy target.",
  },
  {
    id: "sbp-history",
    aliases: ["when was sbp established", "sbp history founding"],
    category: "SBP",
    answer: "The State Bank of Pakistan was established in 1948, shortly after independence, becoming one of the first central banks set up by a newly independent nation.",
  },
  {
    id: "sbp-imf-programs",
    aliases: ["sbp role in imf programs", "sbp and imf conditions"],
    category: "SBP",
    answer: "SBP implements many of the monetary and exchange-rate-related conditions attached to Pakistan's IMF programs, including reserve targets, rate decisions, and exchange rate flexibility commitments.",
  },
  {
    id: "sbp-annual-report",
    aliases: ["sbp annual report", "where to find sbp data"],
    category: "SBP",
    answer: "SBP publishes regular reports including the Monetary Policy Statement, Annual Report, and Quarterly Report, plus the SBP EasyData portal, which hosts most of its time-series economic data.",
  },
  {
    id: "sbp-easydata",
    aliases: ["what is sbp easydata", "sbp easydata portal"],
    category: "SBP",
    answer: "SBP EasyData is the State Bank's public time-series data portal, providing historical data on exchange rates, reserves, inflation, monetary aggregates, and other indicators used throughout this dashboard.",
  },

  // ── KIBOR ────────────────────────────────────────────────────────────────
  {
    id: "kibor-what-is",
    aliases: ["what is kibor", "kibor meaning", "what does kibor stand for"],
    category: "KIBOR",
    answer: "KIBOR (Karachi Interbank Offered Rate) is the benchmark interest rate at which banks in Pakistan lend to each other, used as the reference rate for most variable-rate loans.",
  },
  {
    id: "kibor-how-calculated",
    aliases: ["how is kibor calculated", "kibor calculation method"],
    category: "KIBOR",
    answer: "KIBOR is calculated daily from rate quotes submitted by a panel of banks, with outliers trimmed and the remaining quotes averaged for each maturity (tenor).",
  },
  {
    id: "kibor-vs-policy-rate",
    aliases: ["kibor vs policy rate", "difference between kibor and sbp rate"],
    category: "KIBOR",
    answer: "The SBP policy rate is the central bank's target rate; KIBOR is the market rate at which banks actually lend to each other, and normally trades very close to the policy rate.",
  },
  {
    id: "kibor-tenors",
    aliases: ["kibor tenors meaning", "1 month vs 6 month kibor"],
    category: "KIBOR",
    answer: "KIBOR is quoted across several tenors (1-month, 3-month, 6-month, 1-year), reflecting the interest rate for lending over those different time periods.",
  },
  {
    id: "kibor-and-loans",
    aliases: ["kibor and bank loans", "how does kibor affect my loan"],
    category: "KIBOR",
    answer: "Most floating-rate loans and mortgages in Pakistan are priced as 'KIBOR + spread,' so when KIBOR rises, the borrower's interest payments rise too, and vice versa when it falls.",
  },
  {
    id: "kibor-history",
    aliases: ["kibor historical rates", "kibor highest level"],
    category: "KIBOR",
    answer: "KIBOR has tracked Pakistan's policy rate cycle closely, including a spike above 23% during the 2023 inflation crisis, before easing as SBP began cutting rates.",
  },
  {
    id: "kibor-replacement-reforms",
    aliases: ["kibor reform pakistan", "kibor replaced by what"],
    category: "KIBOR",
    answer: "Following global benchmark reforms (like LIBOR's discontinuation), Pakistan has reviewed KIBOR's methodology to improve transparency and reduce reliance on submitted quotes versus actual transactions.",
  },
  {
    id: "kibor-vs-libor",
    aliases: ["kibor vs libor", "is kibor like libor"],
    category: "KIBOR",
    answer: "KIBOR plays the same role for Pakistan's banking system that LIBOR once played globally — a reference benchmark for pricing loans — though LIBOR has since been phased out internationally.",
  },

  // ── Exchange Rates ───────────────────────────────────────────────────────
  {
    id: "exchange-rate-what-is",
    aliases: ["what is an exchange rate", "exchange rate meaning", "define exchange rate"],
    category: "Exchange Rates",
    answer: "An exchange rate is the price of one currency in terms of another — for example, how many Pakistani Rupees it takes to buy one US Dollar.",
  },
  {
    id: "exchange-rate-fixed-vs-floating",
    aliases: ["fixed vs floating exchange rate", "what is a floating exchange rate"],
    category: "Exchange Rates",
    answer: "A fixed exchange rate is pegged to another currency at a set value (like the Saudi Riyal to the US Dollar). A floating exchange rate is determined by market supply and demand, like Pakistan's Rupee.",
  },
  {
    id: "exchange-rate-managed-float",
    aliases: ["what is a managed float", "managed float exchange rate meaning"],
    category: "Exchange Rates",
    answer: "A managed float is a hybrid system where the exchange rate is mostly market-determined, but the central bank intervenes occasionally to smooth excessive volatility — broadly describing Pakistan's current regime.",
  },
  {
    id: "exchange-rate-determination",
    aliases: ["how is exchange rate determined", "what determines currency value"],
    category: "Exchange Rates",
    answer: "Exchange rates are driven by the supply and demand for a currency, influenced by trade flows, interest rate differentials, inflation, capital flows, and market sentiment toward the country's economy.",
  },
  {
    id: "exchange-rate-and-trade",
    aliases: ["exchange rate and trade balance", "how currency affects exports and imports"],
    category: "Exchange Rates",
    answer: "A weaker currency makes a country's exports cheaper for foreign buyers (boosting exports) but makes imports more expensive — the textbook adjustment mechanism for trade imbalances.",
  },
  {
    id: "exchange-rate-depreciation",
    aliases: ["what is currency depreciation", "rupee depreciation meaning"],
    category: "Exchange Rates",
    answer: "Currency depreciation is a fall in a currency's value relative to others — for the Rupee, it means more PKR are needed to buy the same amount of foreign currency, raising import costs.",
  },
  {
    id: "exchange-rate-appreciation",
    aliases: ["what is currency appreciation", "rupee appreciation meaning"],
    category: "Exchange Rates",
    answer: "Currency appreciation is a rise in a currency's value relative to others — fewer PKR are needed to buy foreign currency, making imports cheaper but exports less competitive.",
  },
  {
    id: "exchange-rate-reer",
    aliases: ["what is real effective exchange rate", "reer meaning exchange rate"],
    category: "Exchange Rates",
    answer: "The Real Effective Exchange Rate (REER) adjusts the nominal exchange rate for inflation differences with trading partners, providing a truer measure of competitiveness than the nominal rate alone.",
  },
  {
    id: "exchange-rate-intervention",
    aliases: ["central bank currency intervention", "how does sbp defend the rupee"],
    category: "Exchange Rates",
    answer: "Currency intervention is when a central bank buys or sells its own currency in the market (using its reserves) to influence the exchange rate, typically to slow excessive depreciation.",
  },
  {
    id: "exchange-rate-black-market",
    aliases: ["black market dollar rate pakistan", "open market vs interbank rate"],
    category: "Exchange Rates",
    answer: "Pakistan has at times seen a gap between the official interbank exchange rate and informal/open-market rates, usually emerging during periods of capital controls or reserve scarcity, though this gap has narrowed with reforms.",
  },
  {
    id: "exchange-rate-history-pakistan",
    aliases: ["pakistan exchange rate history", "rupee depreciation history"],
    category: "Exchange Rates",
    answer: "The Rupee has depreciated substantially over decades, accelerating sharply during 2022-2023 amid a severe balance-of-payments crisis, before the IMF-backed stabilization program helped it find more stable footing.",
  },
  {
    id: "exchange-rate-and-remittances",
    aliases: ["exchange rate and remittances relationship", "how currency value affects remittances"],
    category: "Exchange Rates",
    answer: "A weaker Rupee means overseas Pakistani workers' foreign earnings convert into more Rupees, which can incentivize sending remittances through formal banking channels rather than informal ones.",
  },
  {
    id: "exchange-rate-and-imports",
    aliases: ["exchange rate and import costs", "how currency depreciation affects import prices"],
    category: "Exchange Rates",
    answer: "Since Pakistan imports oil, machinery, and many raw materials in US Dollars, Rupee depreciation directly raises the local-currency cost of these imports, feeding into inflation.",
  },
  {
    id: "exchange-rate-imf-flexibility",
    aliases: ["imf and exchange rate flexibility pakistan", "why does imf want market-based exchange rate"],
    category: "Exchange Rates",
    answer: "IMF programs typically require Pakistan to maintain a market-determined exchange rate rather than an artificially defended one, since an overvalued, defended rate tends to drain reserves and create future crises.",
  },
  {
    id: "exchange-rate-currency-crisis",
    aliases: ["what is a currency crisis", "currency crisis meaning"],
    category: "Exchange Rates",
    answer: "A currency crisis is a sudden, sharp loss of confidence in a currency, often triggered by depleting foreign reserves, leading to rapid depreciation, capital flight, and import/inflation shocks.",
  },
  {
    id: "exchange-rate-cross-rates",
    aliases: ["what is a cross exchange rate", "eur pkr cross rate meaning"],
    category: "Exchange Rates",
    answer: "A cross rate is the exchange rate between two currencies derived through a third currency (usually USD) — for example, EUR/PKR is typically calculated via EUR/USD and USD/PKR.",
  },

  // ── Foreign Reserves ─────────────────────────────────────────────────────
  {
    id: "reserves-what-are",
    aliases: ["what are foreign reserves", "foreign exchange reserves meaning"],
    category: "Foreign Reserves",
    answer: "Foreign reserves are the foreign currency (and gold) holdings a central bank keeps to pay for imports, service foreign debt, and stabilize the currency during periods of stress.",
  },
  {
    id: "reserves-composition",
    aliases: ["what are reserves made of", "reserves composition sbp"],
    category: "Foreign Reserves",
    answer: "Reserves typically consist of foreign currency deposits (mostly US Dollars), gold, IMF Special Drawing Rights (SDRs), and Pakistan's reserve position with the IMF.",
  },
  {
    id: "reserves-sbp-vs-total",
    aliases: ["sbp reserves vs total reserves", "what is total liquid reserves"],
    category: "Foreign Reserves",
    answer: "SBP reserves are foreign currency held by the central bank alone. Total liquid reserves add commercial bank foreign currency holdings, giving the full national FX buffer figure.",
  },
  {
    id: "reserves-import-cover",
    aliases: ["what is import cover", "import cover meaning reserves"],
    category: "Foreign Reserves",
    answer: "Import cover measures how many months of imports a country's reserves can pay for. The IMF generally considers 3 months the minimum adequate level — Pakistan has at times fallen below 1 month.",
  },
  {
    id: "reserves-why-important",
    aliases: ["why are foreign reserves important", "why do reserves matter"],
    category: "Foreign Reserves",
    answer: "Reserves are a country's financial safety net — they allow it to keep paying for essential imports and debt even during periods when normal foreign currency inflows (exports, remittances) fall short.",
  },
  {
    id: "reserves-crisis-level",
    aliases: ["what is a reserves crisis", "low foreign reserves pakistan 2023"],
    category: "Foreign Reserves",
    answer: "A reserves crisis occurs when reserves fall so low that a country struggles to pay for imports or debt — Pakistan came close to this in early 2023, with reserves briefly covering less than three weeks of imports.",
  },
  {
    id: "reserves-how-built",
    aliases: ["how are reserves built up", "how does a country accumulate reserves"],
    category: "Foreign Reserves",
    answer: "Reserves grow through trade surpluses, remittance inflows, foreign investment, loans/grants from other countries or institutions, and central bank purchases of foreign currency in the market.",
  },
  {
    id: "reserves-pakistan-sources",
    aliases: ["where does pakistan get its reserves from", "pakistan reserves sources"],
    category: "Foreign Reserves",
    answer: "Pakistan's reserves are supported mainly by IMF disbursements, bilateral deposits from allies like Saudi Arabia, China, and the UAE, multilateral loans, and net export/remittance inflows.",
  },
  {
    id: "reserves-and-rupee",
    aliases: ["reserves and exchange rate relationship", "how reserves affect the rupee"],
    category: "Foreign Reserves",
    answer: "Low reserves limit SBP's ability to intervene in the currency market, often leading to faster Rupee depreciation when reserves are thin, since there's less buffer to absorb demand shocks.",
  },
  {
    id: "reserves-vs-debt",
    aliases: ["reserves vs external debt pakistan", "reserves coverage of debt"],
    category: "Foreign Reserves",
    answer: "Pakistan's reserves are small relative to its total external debt stock, meaning reserves alone can't cover debt repayments — debt rollovers and new financing are needed alongside reserve usage.",
  },
  {
    id: "reserves-gold",
    aliases: ["pakistan gold reserves", "does sbp hold gold"],
    category: "Foreign Reserves",
    answer: "SBP holds a modest amount of gold as part of its reserves, though gold makes up a small share compared to foreign currency holdings.",
  },
  {
    id: "reserves-target-level",
    aliases: ["what reserves level is healthy", "ideal foreign reserves level pakistan"],
    category: "Foreign Reserves",
    answer: "Analysts generally view reserves above $12 billion (roughly 3+ months of import cover) as comfortable for Pakistan, with levels below $8 billion considered vulnerable.",
  },

  // ── Current Account ──────────────────────────────────────────────────────
  {
    id: "current-account-what-is",
    aliases: ["what is the current account", "current account meaning", "define current account"],
    category: "Current Account",
    answer: "The current account records a country's transactions with the rest of the world for goods, services, income, and transfers — essentially, all money flowing in and out except for investment/financial flows.",
  },
  {
    id: "current-account-deficit",
    aliases: ["what is current account deficit", "current account deficit meaning"],
    category: "Current Account",
    answer: "A current account deficit means a country is spending more on foreign goods, services, and obligations than it earns from abroad, requiring borrowing or investment inflows to cover the gap.",
  },
  {
    id: "current-account-surplus",
    aliases: ["what is current account surplus", "current account surplus meaning"],
    category: "Current Account",
    answer: "A current account surplus means a country earns more from abroad (exports, remittances, income) than it spends — it's effectively lending savings to the rest of the world.",
  },
  {
    id: "current-account-components",
    aliases: ["components of current account", "what makes up the current account"],
    category: "Current Account",
    answer: "The current account combines the trade balance (goods and services), primary income (like profits and interest), and secondary income (like remittances and grants).",
  },
  {
    id: "current-account-and-cad",
    aliases: ["cad meaning economics", "current account deficit acronym"],
    category: "Current Account",
    answer: "CAD (Current Account Deficit) is the common shorthand for a current account deficit, frequently cited in Pakistani financial media as a key vulnerability indicator.",
  },
  {
    id: "current-account-why-matters-pakistan",
    aliases: ["why does current account deficit matter for pakistan", "pakistan current account significance"],
    category: "Current Account",
    answer: "Pakistan's recurring current account deficits are the root cause of its repeated need for IMF programs and foreign borrowing, since the gap must be financed somehow — through debt, reserves, or investment.",
  },
  {
    id: "current-account-financing",
    aliases: ["how is current account deficit financed", "financing the cad"],
    category: "Current Account",
    answer: "A current account deficit is financed through the capital and financial account — foreign loans, foreign direct investment, portfolio inflows, or by drawing down reserves.",
  },
  {
    id: "current-account-sustainable-level",
    aliases: ["sustainable current account deficit level", "how big can cad be safely"],
    category: "Current Account",
    answer: "A current account deficit below roughly 1-2% of GDP is generally considered manageable; deficits above 4% of GDP are viewed as carrying significant crisis risk, especially for countries with thin reserves.",
  },
  {
    id: "current-account-pakistan-history",
    aliases: ["pakistan current account deficit history", "biggest current account deficit pakistan"],
    category: "Current Account",
    answer: "Pakistan's current account deficit has swung sharply, peaking near record highs in FY2018 (~$19 billion) before narrowing dramatically during import-compression and stabilization periods.",
  },
  {
    id: "current-account-vs-trade-balance",
    aliases: ["current account vs trade balance", "difference between trade balance and current account"],
    category: "Current Account",
    answer: "Trade balance only covers goods and services. The current account is broader, also including income flows (like profit repatriation) and transfers (like remittances and foreign grants).",
  },
  {
    id: "current-account-services",
    aliases: ["services trade balance pakistan", "it exports and current account"],
    category: "Current Account",
    answer: "Pakistan's services trade (including fast-growing IT exports) is a smaller but increasingly important component of the current account, partially offsetting the much larger goods trade deficit.",
  },
  {
    id: "current-account-primary-income",
    aliases: ["what is primary income current account", "profit repatriation pakistan"],
    category: "Current Account",
    answer: "Primary income in the current account includes profits foreign investors repatriate from Pakistan and interest payments on external debt — both represent outflows that widen the deficit.",
  },

  // ── Trade Balance ────────────────────────────────────────────────────────
  {
    id: "trade-balance-what-is",
    aliases: ["what is trade balance", "trade balance meaning", "define trade balance"],
    category: "Trade Balance",
    answer: "Trade balance is the difference between a country's exports and imports of goods (and sometimes services) — a positive number is a surplus, negative is a deficit.",
  },
  {
    id: "trade-deficit-meaning",
    aliases: ["what is a trade deficit", "trade deficit meaning"],
    category: "Trade Balance",
    answer: "A trade deficit occurs when a country imports more than it exports. Pakistan runs a persistent and large trade deficit, driven mainly by energy and machinery imports against a narrower export base.",
  },
  {
    id: "trade-surplus-meaning",
    aliases: ["what is a trade surplus", "trade surplus meaning"],
    category: "Trade Balance",
    answer: "A trade surplus occurs when a country exports more than it imports, generating net foreign currency inflows from goods trade alone.",
  },
  {
    id: "trade-balance-pakistan-drivers",
    aliases: ["why does pakistan have a trade deficit", "pakistan trade deficit causes"],
    category: "Trade Balance",
    answer: "Pakistan's trade deficit stems from a narrow export base (heavily reliant on textiles) combined with large recurring import needs for oil, machinery, edible oil, and chemicals.",
  },
  {
    id: "trade-balance-goods-vs-services",
    aliases: ["goods trade balance vs services trade balance", "merchandise trade balance"],
    category: "Trade Balance",
    answer: "The goods (merchandise) trade balance covers physical products. The services trade balance covers things like IT exports, freight, and travel — Pakistan's goods deficit is far larger than its services balance.",
  },
  {
    id: "trade-balance-narrowing-good-or-bad",
    aliases: ["is a narrowing trade deficit always good", "trade deficit narrowing from imports falling"],
    category: "Trade Balance",
    answer: "A narrowing trade deficit driven by export growth is a healthy sign, but one driven by import compression (forced cuts due to reserve scarcity) often reflects economic slowdown rather than genuine improvement.",
  },
  {
    id: "trade-balance-and-currency",
    aliases: ["trade balance and exchange rate feedback loop", "trade deficit and rupee depreciation"],
    category: "Trade Balance",
    answer: "A persistent trade deficit puts downward pressure on a currency since more Rupees need to be sold to buy foreign currency for imports than are bought back via export earnings.",
  },
  {
    id: "trade-balance-data-source-pakistan",
    aliases: ["who publishes pakistan trade data", "pbs vs sbp trade data difference"],
    category: "Trade Balance",
    answer: "Pakistan's trade data is published by both PBS (customs/clearance basis) and SBP (BOP/cash-settlement basis) — the two methodologies can show meaningfully different export figures due to timing and accounting differences.",
  },
  {
    id: "trade-balance-key-partners",
    aliases: ["pakistan top trading partners", "who does pakistan trade with most"],
    category: "Trade Balance",
    answer: "Pakistan's key trading partners include China (largest import source), the US and EU (major export destinations for textiles), and Gulf countries (oil imports and remittance corridors).",
  },
  {
    id: "trade-balance-diversification",
    aliases: ["why does pakistan need export diversification", "pakistan export diversification"],
    category: "Trade Balance",
    answer: "Pakistan's exports are heavily concentrated in textiles, making the trade balance vulnerable to demand shifts in that single sector — diversifying into IT, agriculture value-addition, and other industries is a long-standing policy goal.",
  },

  // ── Exports ──────────────────────────────────────────────────────────────
  {
    id: "exports-what-are",
    aliases: ["what are exports", "exports meaning", "define exports"],
    category: "Exports",
    answer: "Exports are goods and services a country sells to other countries, generating foreign currency inflows — Pakistan's main exports are textiles, leather goods, surgical instruments, and rice.",
  },
  {
    id: "exports-pakistan-composition",
    aliases: ["pakistan main exports", "what does pakistan export"],
    category: "Exports",
    answer: "Textiles and garments dominate Pakistan's export basket (around 60%), followed by food items like rice, leather goods, surgical instruments, and sports goods.",
  },
  {
    id: "exports-why-important",
    aliases: ["why are exports important for pakistan", "why do exports matter"],
    category: "Exports",
    answer: "Exports are the only sustainable, non-debt-creating source of foreign currency — unlike loans or remittances, they reflect a country's genuine productive competitiveness.",
  },
  {
    id: "exports-textile-dominance",
    aliases: ["why does pakistan rely on textiles", "textile sector exports pakistan"],
    category: "Exports",
    answer: "Pakistan's textile dominance stems from its large domestic cotton production and a long-established manufacturing base, but this concentration leaves exports vulnerable to global textile demand cycles.",
  },
  {
    id: "exports-it-services",
    aliases: ["pakistan it exports", "freelancing exports pakistan"],
    category: "Exports",
    answer: "IT and freelancing services have become one of Pakistan's fastest-growing export categories, providing a (still relatively small but rising) diversification away from goods exports.",
  },
  {
    id: "exports-target-growth",
    aliases: ["what export growth rate is good for pakistan", "ideal export level pakistan"],
    category: "Exports",
    answer: "Monthly exports above roughly $3 billion are generally viewed as strong for Pakistan, while sustained levels below $2 billion are considered weak relative to import needs.",
  },
  {
    id: "exports-and-exchange-rate",
    aliases: ["how exchange rate affects exports", "does rupee depreciation help exports"],
    category: "Exports",
    answer: "A weaker Rupee theoretically makes Pakistani exports cheaper and more competitive abroad, though the actual export response is often limited by supply-side constraints like energy costs and access to financing.",
  },
  {
    id: "exports-incentive-schemes",
    aliases: ["pakistan export incentives", "duty drawback scheme pakistan"],
    category: "Exports",
    answer: "Pakistan has used various export incentive schemes (like duty drawbacks, subsidized export financing, and tax exemptions) to boost competitiveness, particularly for the textile sector.",
  },
  {
    id: "exports-seasonal-patterns",
    aliases: ["are pakistan exports seasonal", "export seasonality pakistan"],
    category: "Exports",
    answer: "Pakistan's exports show some seasonality, particularly in agriculture-linked categories like rice, which peak after harvest seasons.",
  },
  {
    id: "exports-vs-imports-gap",
    aliases: ["export import gap pakistan", "why exports lag imports"],
    category: "Exports",
    answer: "Pakistan's exports have historically grown much more slowly than imports, widening the trade gap over time — a structural challenge tied to limited export diversification and competitiveness.",
  },
  {
    id: "exports-regional-comparison",
    aliases: ["pakistan exports vs bangladesh", "pakistan exports vs india"],
    category: "Exports",
    answer: "Pakistan's export base is significantly smaller than regional peers like Bangladesh (which has overtaken Pakistan in textile exports) and India, reflecting longer-standing competitiveness and policy challenges.",
  },
  {
    id: "exports-special-economic-zones",
    aliases: ["special economic zones pakistan exports", "sez cpec exports"],
    category: "Exports",
    answer: "Special Economic Zones (SEZs), including those linked to CPEC, aim to boost Pakistan's export capacity by offering tax incentives and infrastructure for export-oriented manufacturing.",
  },

  // ── Imports ──────────────────────────────────────────────────────────────
  {
    id: "imports-what-are",
    aliases: ["what are imports", "imports meaning", "define imports"],
    category: "Imports",
    answer: "Imports are goods and services a country buys from abroad — Pakistan's largest imports are petroleum products, machinery, chemicals, and edible oil.",
  },
  {
    id: "imports-pakistan-composition",
    aliases: ["pakistan main imports", "what does pakistan import"],
    category: "Imports",
    answer: "Pakistan's largest import categories are petroleum and energy products, machinery, chemicals and fertilizers, and food items like palm oil and pulses.",
  },
  {
    id: "imports-energy-dependence",
    aliases: ["pakistan energy import dependence", "why does pakistan import so much oil"],
    category: "Imports",
    answer: "Pakistan relies heavily on imported oil and LNG to meet its energy needs since domestic production falls well short of demand, making the trade balance highly sensitive to global energy prices.",
  },
  {
    id: "imports-capital-vs-consumer-goods",
    aliases: ["capital goods imports vs consumer goods imports", "good vs bad imports"],
    category: "Imports",
    answer: "Rising capital goods imports (machinery, equipment) often signal productive investment, generally seen positively, while rising consumer goods imports mainly reflect consumption demand without building future capacity.",
  },
  {
    id: "imports-restriction-measures",
    aliases: ["import restrictions pakistan 2022", "letter of credit restrictions pakistan"],
    category: "Imports",
    answer: "During the 2022-2023 reserves crisis, Pakistan restricted imports (including delaying Letters of Credit) to conserve scarce foreign currency, which hurt industrial output but slowed reserve depletion.",
  },
  {
    id: "imports-substitution",
    aliases: ["import substitution policy", "what is import substitution"],
    category: "Imports",
    answer: "Import substitution is a policy approach of producing domestically what was previously imported (e.g., local edible oil or fertilizer production) to reduce foreign currency outflows.",
  },
  {
    id: "imports-and-inflation",
    aliases: ["how imports affect inflation", "import prices and cpi"],
    category: "Imports",
    answer: "Rising import prices — whether from global commodity increases or currency depreciation — feed directly into domestic inflation, especially for imported energy and food staples.",
  },
  {
    id: "imports-duty-and-tariffs",
    aliases: ["import duty pakistan", "what is a tariff"],
    category: "Imports",
    answer: "Import duties (tariffs) are taxes levied on imported goods, used both to raise government revenue and to protect domestic industries from cheaper foreign competition.",
  },
  {
    id: "imports-target-level",
    aliases: ["normal import level pakistan", "monthly import bill pakistan"],
    category: "Imports",
    answer: "Pakistan's monthly import bill typically runs higher than its export earnings, with energy imports alone often accounting for a quarter or more of the total import bill in high oil-price periods.",
  },
  {
    id: "imports-machinery",
    aliases: ["machinery imports pakistan", "capital goods imports significance"],
    category: "Imports",
    answer: "Machinery imports support industrial expansion and infrastructure projects, but a sharp slowdown in machinery imports is often an early sign of weakening business investment.",
  },

  // ── Remittances ──────────────────────────────────────────────────────────
  {
    id: "remittances-what-are",
    aliases: ["what are remittances", "remittances meaning", "define remittances"],
    category: "Remittances",
    answer: "Remittances are money sent home by people working abroad to family or relatives in their home country — for Pakistan, mainly from workers in Saudi Arabia, the UAE, the UK, and the US.",
  },
  {
    id: "remittances-why-important-pakistan",
    aliases: ["why are remittances important for pakistan", "remittances significance pakistan"],
    category: "Remittances",
    answer: "Remittances are Pakistan's single largest source of foreign currency, consistently exceeding total goods exports, and provide crucial support for both household incomes and the external account.",
  },
  {
    id: "remittances-top-corridors",
    aliases: ["which countries send most remittances to pakistan", "top remittance sources pakistan"],
    category: "Remittances",
    answer: "Saudi Arabia and the UAE are Pakistan's largest remittance corridors, reflecting the large population of Pakistani workers in the Gulf, followed by the UK and the US.",
  },
  {
    id: "remittances-seasonal-patterns",
    aliases: ["why do remittances spike during ramadan", "remittances eid pattern", "why do remittances spike during eid", "remittances seasonal pattern pakistan"],
    category: "Remittances",
    answer: "Remittances typically spike around Ramadan and Eid as overseas workers send extra money home for religious holidays and family celebrations.",
  },
  {
    id: "remittances-formal-vs-informal",
    aliases: ["hundi hawala vs formal remittances", "informal remittance channels pakistan"],
    category: "Remittances",
    answer: "Remittances can flow through formal banking/exchange company channels or informal systems like hundi/hawala — exchange rate gaps between official and informal markets historically pushed flows toward informal channels.",
  },
  {
    id: "remittances-and-exchange-rate",
    aliases: ["remittances and exchange rate incentive", "why do remittances drop when rupee is overvalued"],
    category: "Remittances",
    answer: "When the official exchange rate is seen as overvalued or restrictive, remittances tend to shift toward informal channels offering better rates — a key reason Pakistan has pursued exchange rate reform.",
  },
  {
    id: "remittances-target-level",
    aliases: ["healthy remittance level pakistan", "what is a strong remittance month"],
    category: "Remittances",
    answer: "Monthly remittances above roughly $3 billion are considered strong for Pakistan, with levels below $2 billion viewed as a concerning slowdown.",
  },
  {
    id: "remittances-rdas",
    aliases: ["roshan digital account remittances", "what is rda pakistan"],
    category: "Remittances",
    answer: "Roshan Digital Accounts (RDAs) are SBP-backed accounts allowing overseas Pakistanis to invest and remit funds digitally into Pakistan, part of efforts to formalize and grow remittance/investment inflows.",
  },
  {
    id: "remittances-vs-fdi",
    aliases: ["remittances vs fdi pakistan", "remittances bigger than fdi", "which is bigger remittances or fdi pakistan"],
    category: "Remittances",
    answer: "Remittances to Pakistan are many times larger than foreign direct investment inflows, making household-level diaspora support a far bigger external financing source than corporate investment.",
  },
  {
    id: "remittances-diaspora-size",
    aliases: ["how many overseas pakistanis", "pakistani diaspora size"],
    category: "Remittances",
    answer: "Millions of Pakistanis live and work abroad, particularly in Gulf states, forming one of the largest overseas worker populations globally relative to home-country population.",
  },
  {
    id: "remittances-economic-cushion",
    aliases: ["remittances as economic stabilizer", "why are remittances resilient"],
    category: "Remittances",
    answer: "Remittances tend to be more stable than exports or investment flows during crises, since overseas workers often send more home to support struggling family members, acting as a partial economic cushion.",
  },
  {
    id: "remittances-tax-treatment",
    aliases: ["are remittances taxed in pakistan", "remittance tax policy"],
    category: "Remittances",
    answer: "Remittances sent through formal banking channels in Pakistan are generally not subject to income tax, an incentive designed to encourage flows through official rather than informal channels.",
  },

  // ── FDI ──────────────────────────────────────────────────────────────────
  {
    id: "fdi-what-is",
    aliases: ["what is fdi", "foreign direct investment meaning", "define fdi"],
    category: "FDI",
    answer: "FDI (Foreign Direct Investment) is investment by foreign entities directly into businesses or assets in another country — building factories, buying significant stakes in companies, or expanding operations.",
  },
  {
    id: "fdi-vs-portfolio-investment",
    aliases: ["fdi vs portfolio investment", "difference between fdi and fpi"],
    category: "FDI",
    answer: "FDI involves long-term, controlling investment in a business (like building a plant), while portfolio investment (FPI) is shorter-term investment in stocks or bonds without operational control — FPI is typically more volatile.",
  },
  {
    id: "fdi-why-important",
    aliases: ["why is fdi important", "benefits of fdi for pakistan"],
    category: "FDI",
    answer: "FDI brings capital, technology, and jobs without creating debt, unlike loans — making it a generally preferred (though harder to attract) source of external financing.",
  },
  {
    id: "fdi-pakistan-sources",
    aliases: ["where does pakistan fdi come from", "top fdi sources pakistan"],
    category: "FDI",
    answer: "China has been Pakistan's largest single source of FDI in recent years, largely through CPEC-related energy and infrastructure projects, followed by Gulf countries and other Asian investors.",
  },
  {
    id: "fdi-pakistan-low-level",
    aliases: ["why is pakistan fdi so low", "pakistan fdi compared to other countries"],
    category: "FDI",
    answer: "Pakistan's FDI inflows are chronically low compared to regional peers like Vietnam or Bangladesh, reflecting concerns over policy consistency, security, energy reliability, and ease of doing business.",
  },
  {
    id: "fdi-cpec",
    aliases: ["what is cpec", "china pakistan economic corridor meaning"],
    category: "FDI",
    answer: "CPEC (China-Pakistan Economic Corridor) is a major bilateral investment initiative covering energy, infrastructure, and industrial projects, financed largely through Chinese loans and investment.",
  },
  {
    id: "fdi-sectors-pakistan",
    aliases: ["which sectors get fdi in pakistan", "fdi by sector pakistan"],
    category: "FDI",
    answer: "Power/energy, telecommunications, financial services, and oil & gas exploration have historically attracted the largest shares of FDI into Pakistan.",
  },
  {
    id: "fdi-target-level",
    aliases: ["healthy fdi level pakistan", "what is strong fdi inflow"],
    category: "FDI",
    answer: "Monthly FDI inflows above roughly $200 million are considered healthy for Pakistan; levels below $100 million, or negative net flows, indicate weak investor confidence.",
  },
  {
    id: "fdi-and-ease-of-business",
    aliases: ["ease of doing business and fdi", "why investors avoid pakistan"],
    category: "FDI",
    answer: "Bureaucratic hurdles, inconsistent policies, energy shortages, and security concerns are frequently cited reasons why Pakistan attracts less FDI than its market size would suggest.",
  },
  {
    id: "fdi-divestment",
    aliases: ["what is fdi divestment", "negative fdi meaning"],
    category: "FDI",
    answer: "Negative net FDI (divestment) occurs when foreign companies withdraw more capital from Pakistan than new investors bring in, often reflecting reduced confidence in the investment climate.",
  },

  // ── Fiscal Deficit ───────────────────────────────────────────────────────
  {
    id: "fiscal-deficit-what-is",
    aliases: ["what is fiscal deficit", "fiscal deficit meaning", "define fiscal deficit"],
    category: "Fiscal Deficit",
    answer: "A fiscal deficit is the gap between government spending and government revenue in a given period — when a government spends more than it collects in taxes and other income.",
  },
  {
    id: "fiscal-deficit-vs-primary-deficit",
    aliases: ["fiscal deficit vs primary deficit", "what is primary balance"],
    category: "Fiscal Deficit",
    answer: "The fiscal deficit includes interest payments on existing debt. The primary deficit/balance excludes interest payments, showing whether current spending (excluding debt servicing) is covered by revenue.",
  },
  {
    id: "fiscal-deficit-causes-pakistan",
    aliases: ["why does pakistan have a fiscal deficit", "pakistan fiscal deficit causes"],
    category: "Fiscal Deficit",
    answer: "Pakistan's fiscal deficit stems from a narrow tax base, high debt servicing costs, energy sector subsidies/losses, and defense and development spending that outpaces revenue collection.",
  },
  {
    id: "fiscal-deficit-financing",
    aliases: ["how is fiscal deficit financed", "government deficit financing methods"],
    category: "Fiscal Deficit",
    answer: "Fiscal deficits are financed by borrowing — issuing government bonds and treasury bills domestically, or taking external loans from bilateral/multilateral lenders.",
  },
  {
    id: "fiscal-deficit-and-debt",
    aliases: ["fiscal deficit and government debt relationship", "how deficits add to debt"],
    category: "Fiscal Deficit",
    answer: "Each year's fiscal deficit adds to the stock of accumulated government debt, since the gap must be borrowed — persistent deficits are the main driver of rising debt-to-GDP ratios.",
  },
  {
    id: "fiscal-deficit-target-level",
    aliases: ["acceptable fiscal deficit level", "what fiscal deficit is sustainable"],
    category: "Fiscal Deficit",
    answer: "A fiscal deficit below roughly 3% of GDP is generally viewed as sustainable; Pakistan has historically run deficits in the 6-8% of GDP range, well above this benchmark.",
  },
  {
    id: "fiscal-deficit-and-inflation",
    aliases: ["fiscal deficit and inflation link", "how government spending causes inflation"],
    category: "Fiscal Deficit",
    answer: "Large fiscal deficits financed by money creation (central bank financing) or excessive domestic borrowing can fuel inflation by injecting demand into the economy without matching production.",
  },
  {
    id: "fiscal-deficit-imf-targets",
    aliases: ["imf fiscal deficit targets pakistan", "imf primary surplus requirement"],
    category: "Fiscal Deficit",
    answer: "IMF programs typically set fiscal deficit and primary balance targets for Pakistan, requiring tax revenue increases and spending discipline as conditions for continued financial support.",
  },
  {
    id: "fiscal-deficit-tax-revenue",
    aliases: ["pakistan tax revenue problem", "why pakistan tax collection is low"],
    category: "Fiscal Deficit",
    answer: "Pakistan's tax-to-GDP ratio is low by international standards (around 9-11%), reflecting a narrow tax base, widespread exemptions, and significant informal economic activity outside the tax net.",
  },
  {
    id: "fiscal-deficit-provincial",
    aliases: ["provincial fiscal deficit pakistan", "federal vs provincial budget pakistan"],
    category: "Fiscal Deficit",
    answer: "Pakistan's overall fiscal deficit combines the federal government's budget with provincial government balances, with provinces required to maintain surpluses under the National Finance Commission framework to help offset the federal deficit.",
  },
  {
    id: "fiscal-deficit-energy-subsidies",
    aliases: ["energy subsidies and fiscal deficit pakistan", "circular debt and budget deficit"],
    category: "Fiscal Deficit",
    answer: "Energy sector losses and subsidies (linked to Pakistan's 'circular debt' problem) are a recurring drag on the fiscal deficit, requiring periodic budget injections to keep power and gas utilities solvent.",
  },
  {
    id: "fiscal-deficit-defense-spending",
    aliases: ["defense spending pakistan budget", "military budget share pakistan"],
    category: "Fiscal Deficit",
    answer: "Defense spending is a significant and largely fixed share of Pakistan's federal budget, limiting fiscal flexibility alongside debt servicing, which together consume the majority of federal current expenditure.",
  },

  // ── Government Debt ──────────────────────────────────────────────────────
  {
    id: "gov-debt-what-is",
    aliases: ["what is government debt", "public debt meaning", "define government debt"],
    category: "Government Debt",
    answer: "Government debt is the total amount a government owes to creditors, accumulated from past fiscal deficits financed through borrowing, both domestic and foreign.",
  },
  {
    id: "gov-debt-domestic-vs-external",
    aliases: ["domestic vs external debt pakistan", "difference between domestic and external debt"],
    category: "Government Debt",
    answer: "Domestic debt is owed to lenders within Pakistan (banks buying government bonds/T-bills), denominated in Rupees. External debt is owed to foreign lenders, mostly in foreign currency, carrying exchange rate risk.",
  },
  {
    id: "gov-debt-to-gdp",
    aliases: ["debt to gdp ratio meaning", "pakistan debt to gdp ratio"],
    category: "Government Debt",
    answer: "Debt-to-GDP ratio compares total government debt to the size of the economy, used to judge debt sustainability. Pakistan's ratio has been above 70-75% in recent years, considered elevated for an emerging market.",
  },
  {
    id: "gov-debt-servicing",
    aliases: ["what is debt servicing", "debt servicing cost pakistan"],
    category: "Government Debt",
    answer: "Debt servicing is the cost of paying interest and principal on outstanding debt. It has become one of the largest single items in Pakistan's federal budget, often exceeding development spending.",
  },
  {
    id: "gov-debt-sustainability",
    aliases: buildAliases(["debt sustainability"], ["is pakistan debt sustainable"]),
    category: "Government Debt",
    answer: "Debt sustainability refers to whether a country can keep servicing its debt without needing repeated restructuring or default — judged by debt-to-GDP trends, growth rates, and interest costs relative to revenue.",
  },
  {
    id: "gov-debt-who-pakistan-owes",
    aliases: ["who does pakistan owe money to", "pakistan creditors list"],
    category: "Government Debt",
    answer: "Pakistan's external creditors include multilateral institutions (IMF, World Bank, ADB), bilateral lenders (China, Saudi Arabia, UAE), and commercial creditors via Eurobonds and bank loans.",
  },
  {
    id: "gov-debt-eurobonds",
    aliases: ["what are eurobonds pakistan", "pakistan eurobond meaning"],
    category: "Government Debt",
    answer: "Eurobonds are international bonds issued by Pakistan in foreign currency (often USD), sold to global investors — they're a commercial (market-based) form of external borrowing, distinct from bilateral or multilateral loans.",
  },
  {
    id: "gov-debt-restructuring",
    aliases: ["what is debt restructuring", "debt restructuring meaning"],
    category: "Government Debt",
    answer: "Debt restructuring is renegotiating the terms of existing debt — extending maturities, reducing interest, or rescheduling payments — to ease repayment pressure on a struggling borrower.",
  },
  {
    id: "gov-debt-trap",
    aliases: ["what is a debt trap", "debt trap meaning economics"],
    category: "Government Debt",
    answer: "A debt trap is a situation where a country must borrow more just to service existing debt, with debt growing faster than the economy's ability to repay — a risk frequently discussed regarding Pakistan's debt trajectory.",
  },
  {
    id: "gov-debt-circular-debt",
    aliases: ["what is circular debt pakistan", "energy circular debt meaning"],
    category: "Government Debt",
    answer: "Circular debt is the buildup of unpaid bills and subsidies within Pakistan's energy sector — power producers aren't fully paid, so they can't pay fuel suppliers, who can't pay producers, in a chain of arrears.",
  },
  {
    id: "gov-debt-and-inflation",
    aliases: ["government debt and inflation link", "monetizing debt meaning"],
    category: "Government Debt",
    answer: "When governments finance debt by having the central bank effectively print money (monetization), it can fuel inflation — a key reason SBP's lending to the government has been restricted by law.",
  },
  {
    id: "gov-debt-ceiling",
    aliases: ["what is a debt ceiling", "debt limitation act pakistan"],
    category: "Government Debt",
    answer: "A debt ceiling/limit is a legal cap on how much debt a government can accumulate; Pakistan's Fiscal Responsibility and Debt Limitation Act sets targets aiming to reduce debt-to-GDP over time.",
  },
  {
    id: "gov-debt-credit-rating",
    aliases: ["pakistan sovereign credit rating", "what is a credit rating agency"],
    category: "Government Debt",
    answer: "Credit rating agencies (Moody's, S&P, Fitch) assess a government's ability to repay debt. Pakistan's rating has fluctuated through speculative/junk territory during crisis periods, raising its borrowing costs in international markets.",
  },
  {
    id: "gov-debt-paris-club",
    aliases: ["what is paris club", "paris club pakistan debt"],
    category: "Government Debt",
    answer: "The Paris Club is a group of major creditor nations that coordinates debt rescheduling for struggling borrower countries — Pakistan has used Paris Club arrangements in past debt relief negotiations.",
  },

  // ── Bonds ────────────────────────────────────────────────────────────────
  {
    id: "bonds-what-is",
    aliases: ["what is a bond", "bond meaning finance", "define bond"],
    category: "Bonds",
    answer: "A bond is a loan investors make to a borrower (government or company), which pays back the principal at maturity and usually periodic interest (coupon) payments in between.",
  },
  {
    id: "bonds-yield",
    aliases: ["what is bond yield", "bond yield meaning"],
    category: "Bonds",
    answer: "Bond yield is the effective return an investor earns on a bond, accounting for its price, coupon rate, and time to maturity — it moves inversely with the bond's market price.",
  },
  {
    id: "bonds-price-vs-yield",
    aliases: ["bond price vs yield relationship", "why do bond prices and yields move opposite"],
    category: "Bonds",
    answer: "Bond prices and yields move in opposite directions: when a bond's price falls, its yield rises (since the fixed coupon represents a bigger percentage return), and vice versa.",
  },
  {
    id: "bonds-coupon-rate",
    aliases: ["what is coupon rate", "bond coupon meaning"],
    category: "Bonds",
    answer: "The coupon rate is the fixed annual interest rate a bond pays on its face value, typically distributed in periodic (often semi-annual) payments to the bondholder.",
  },
  {
    id: "bonds-maturity",
    aliases: ["what is bond maturity", "bond maturity date meaning"],
    category: "Bonds",
    answer: "Bond maturity is the date when the bond's principal (face value) is repaid in full to the holder, ending the loan — bonds can range from a few months to 30+ years in maturity.",
  },
  {
    id: "bonds-government-vs-corporate",
    aliases: ["government bonds vs corporate bonds", "difference between sovereign and corporate bonds"],
    category: "Bonds",
    answer: "Government bonds are issued by a sovereign state (generally lower risk, backed by taxing power). Corporate bonds are issued by companies and carry higher risk (and usually higher yield) tied to business performance.",
  },
  {
    id: "bonds-credit-rating",
    aliases: ["bond credit rating meaning", "investment grade vs junk bond"],
    category: "Bonds",
    answer: "Bond credit ratings assess default risk — 'investment grade' bonds are considered safer, while 'junk' (high-yield) bonds carry higher default risk and must offer higher yields to attract buyers.",
  },
  {
    id: "bonds-market-pakistan",
    aliases: ["pakistan bond market overview", "domestic bond market pakistan"],
    category: "Bonds",
    answer: "Pakistan's domestic bond market is dominated by government securities — Treasury Bills and Pakistan Investment Bonds (PIBs) — since the corporate bond market remains relatively underdeveloped.",
  },
  {
    id: "bonds-duration",
    aliases: ["what is bond duration", "duration risk meaning"],
    category: "Bonds",
    answer: "Duration measures a bond's sensitivity to interest rate changes — longer-duration bonds see bigger price swings when rates move, making them riskier in a changing rate environment.",
  },
  {
    id: "bonds-auction-process",
    aliases: ["how are government bonds auctioned", "bond auction process pakistan"],
    category: "Bonds",
    answer: "Pakistan's government securities are sold through periodic auctions where banks and institutions bid for T-Bills and PIBs, with the resulting yields reflecting current market interest rate expectations.",
  },

  // ── Treasury Bills ───────────────────────────────────────────────────────
  {
    id: "tbills-what-are",
    aliases: ["what are treasury bills", "t-bills meaning", "define treasury bills"],
    category: "Treasury Bills",
    answer: "Treasury Bills (T-Bills) are short-term government debt instruments, maturing in 3, 6, or 12 months, sold at a discount and redeemed at face value — the difference is the investor's return.",
  },
  {
    id: "tbills-vs-pibs",
    aliases: ["t-bills vs pibs", "difference between treasury bills and pibs"],
    category: "Treasury Bills",
    answer: "T-Bills are short-term (up to 12 months) government debt, while PIBs (Pakistan Investment Bonds) are longer-term (3-30 years) — together they make up most of Pakistan's domestic government debt.",
  },
  {
    id: "tbills-discount-pricing",
    aliases: ["how are t-bills priced", "t-bill discount mechanism"],
    category: "Treasury Bills",
    answer: "T-Bills are sold at a discount to face value (e.g., buy at 97, redeem at 100) rather than paying periodic coupons — the discount itself represents the investor's return.",
  },
  {
    id: "tbills-benchmark-rate",
    aliases: ["why is 3-month t-bill yield a benchmark", "t-bill yield significance"],
    category: "Treasury Bills",
    answer: "The 3-month T-Bill yield is Pakistan's key short-term benchmark rate, closely tracking the SBP policy rate and used as a reference for short-term lending and investment decisions.",
  },
  {
    id: "tbills-who-buys",
    aliases: ["who buys treasury bills pakistan", "t-bill investors pakistan"],
    category: "Treasury Bills",
    answer: "T-Bills are primarily bought by commercial banks, though individuals can also invest through the SBP's Savings Bonds or via banks acting as primary dealers.",
  },
  {
    id: "tbills-risk-free",
    aliases: ["are t-bills risk free", "is government debt risk free"],
    category: "Treasury Bills",
    answer: "T-Bills are often called 'risk-free' in the sense that default risk is very low (backed by government taxing power), though this isn't absolute — sovereign default risk does exist, especially during severe crises.",
  },
  {
    id: "tbills-and-bank-lending",
    aliases: ["t-bills and crowding out banks", "why do banks buy government debt instead of lending"],
    category: "Treasury Bills",
    answer: "Banks sometimes prefer buying low-risk, high-yielding T-Bills over lending to private businesses, a phenomenon called 'crowding out' that can starve the private sector of credit.",
  },
  {
    id: "tbills-rollover",
    aliases: ["what is debt rollover", "t-bill rollover meaning"],
    category: "Treasury Bills",
    answer: "Rollover means issuing new T-Bills to repay maturing ones rather than paying off the debt outright — since T-Bills are short-term, the government continuously rolls over a large share of its domestic debt.",
  },
  {
    id: "tbills-yield-curve-role",
    aliases: ["t-bills and yield curve", "short end of yield curve meaning"],
    category: "Treasury Bills",
    answer: "T-Bill yields form the short end of Pakistan's yield curve, while PIB yields form the longer end — comparing the two shows market expectations for future interest rate movements.",
  },
  {
    id: "tbills-savings-bonds",
    aliases: ["sbp savings bonds for individuals", "can individuals buy t-bills pakistan"],
    category: "Treasury Bills",
    answer: "Individuals in Pakistan can invest in government securities indirectly through National Savings Schemes or via Investor Portfolio Securities (IPS) accounts at banks for direct T-Bill/PIB exposure.",
  },

  // ── PIBs ─────────────────────────────────────────────────────────────────
  {
    id: "pibs-what-are",
    aliases: ["what are pibs", "pakistan investment bonds meaning", "what does pib stand for"],
    category: "PIBs",
    answer: "PIBs (Pakistan Investment Bonds) are medium- to long-term government bonds, typically with maturities of 3, 5, 10, 15, 20, or 30 years, paying periodic coupon interest.",
  },
  {
    id: "pibs-fixed-vs-floating",
    aliases: ["fixed rate pib vs floating rate pib", "pib coupon types"],
    category: "PIBs",
    answer: "PIBs come in fixed-rate (set coupon for the full term) and floating-rate (coupon resets periodically based on a benchmark like T-Bill yields) varieties.",
  },
  {
    id: "pibs-yield-signal",
    aliases: ["what does pib yield tell you", "3 year pib yield meaning"],
    category: "PIBs",
    answer: "PIB yields reflect what investors expect for interest rates and inflation over the bond's life — rising PIB yields often signal expectations of persistent inflation or rising government borrowing costs.",
  },
  {
    id: "pibs-vs-tbills-investor-choice",
    aliases: ["should I buy pib or t-bill", "pib vs t-bill investment choice"],
    category: "PIBs",
    answer: "Investors expecting rates to fall often prefer locking in current yields with longer-term PIBs, while those expecting rates to keep rising may prefer the flexibility of shorter-term T-Bills.",
  },
  {
    id: "pibs-islamic-version",
    aliases: ["islamic pib equivalent", "ijara sukuk vs pib"],
    category: "PIBs",
    answer: "Sukuk (specifically Ijara Sukuk) serve as the Shariah-compliant equivalent of conventional PIBs, structured around asset-backed lease arrangements instead of interest payments.",
  },
  {
    id: "pibs-auction-frequency",
    aliases: ["how often are pibs auctioned", "pib auction schedule pakistan"],
    category: "PIBs",
    answer: "PIBs are auctioned periodically by SBP on behalf of the government, with auction calendars published in advance and results closely watched as a gauge of investor sentiment.",
  },
  {
    id: "pibs-foreign-investor-interest",
    aliases: ["do foreigners buy pibs", "foreign investment in pakistan bonds"],
    category: "PIBs",
    answer: "Foreign investors have at times bought Pakistani PIBs/T-Bills seeking high local-currency yields, though such 'hot money' flows can reverse quickly during periods of currency or political risk.",
  },
  {
    id: "pibs-and-bank-balance-sheets",
    aliases: ["banks holding pibs", "pib exposure pakistani banks"],
    category: "PIBs",
    answer: "Pakistani commercial banks hold large amounts of PIBs and T-Bills on their balance sheets, making bank profitability sensitive to swings in government bond yields and interest rate cycles.",
  },

  // ── Sukuk ────────────────────────────────────────────────────────────────
  {
    id: "sukuk-what-is",
    aliases: ["what is sukuk", "sukuk meaning", "define sukuk"],
    category: "Sukuk",
    answer: "Sukuk are Shariah-compliant financial certificates, often called 'Islamic bonds,' that represent ownership in an underlying asset and generate returns through profit-sharing or lease payments rather than interest.",
  },
  {
    id: "sukuk-vs-conventional-bond",
    aliases: ["sukuk vs conventional bond", "difference between sukuk and bond"],
    category: "Sukuk",
    answer: "A conventional bond is a debt instrument paying interest. A sukuk represents partial ownership in a tangible asset or project, generating Shariah-compliant returns through rental or profit-sharing instead of interest.",
  },
  {
    id: "sukuk-ijara",
    aliases: ["what is ijara sukuk", "ijara sukuk meaning"],
    category: "Sukuk",
    answer: "Ijara Sukuk are structured as a sale-and-leaseback arrangement: the issuer sells an asset to investors and leases it back, paying rental income that functions like a bond's coupon.",
  },
  {
    id: "sukuk-pakistan-energy",
    aliases: ["pakistan energy sukuk", "what is pakistan energy sukuk"],
    category: "Sukuk",
    answer: "Pakistan Energy Sukuk are government-issued Islamic bonds backed by energy sector assets, used partly to help settle circular debt within the power sector.",
  },
  {
    id: "sukuk-why-pakistan-issues",
    aliases: ["why does pakistan issue sukuk", "benefits of sukuk for pakistan"],
    category: "Sukuk",
    answer: "Pakistan issues sukuk to tap into Islamic finance demand (both domestic and international), diversify its funding sources, and meet the preferences of Shariah-compliant investors.",
  },
  {
    id: "sukuk-international",
    aliases: ["pakistan international sukuk", "pakistan eurobond sukuk"],
    category: "Sukuk",
    answer: "Pakistan has issued international sukuk (sometimes called 'Sukuk bonds') in global markets to raise foreign currency financing from Islamic finance investors abroad.",
  },
  {
    id: "sukuk-structure-types",
    aliases: ["types of sukuk structures", "musharaka sukuk wakala sukuk"],
    category: "Sukuk",
    answer: "Common sukuk structures include Ijara (lease-based), Musharaka (partnership-based), and Wakala (agency-based) — each defines differently how returns are generated and risk is shared.",
  },
  {
    id: "islamic-finance-basics",
    aliases: ["what is islamic finance", "shariah compliant finance basics"],
    category: "Sukuk",
    answer: "Islamic finance follows Shariah principles, prohibiting interest (riba) and requiring transactions to be backed by tangible assets or genuine risk-sharing, which is why sukuk and Islamic banking use profit-and-loss or lease-based structures instead.",
  },

  // ── Yield Curves ─────────────────────────────────────────────────────────
  {
    id: "yield-curve-what-is",
    aliases: ["what is a yield curve", "yield curve meaning", "define yield curve"],
    category: "Yield Curves",
    answer: "A yield curve plots interest rates (yields) of bonds with the same credit quality but different maturities, showing the relationship between time-to-maturity and return.",
  },
  {
    id: "yield-curve-normal",
    aliases: ["what is a normal yield curve", "upward sloping yield curve meaning"],
    category: "Yield Curves",
    answer: "A normal (upward-sloping) yield curve has longer-term bonds yielding more than shorter-term ones, reflecting the extra compensation investors demand for tying up money longer.",
  },
  {
    id: "yield-curve-inverted",
    aliases: buildAliases(["inverted yield curve", "yield curve inversion"], ["what does an inverted yield curve mean"]),
    category: "Yield Curves",
    answer: "An inverted yield curve occurs when short-term yields exceed long-term yields, often signaling markets expect future rate cuts — historically a watched (though imperfect) recession predictor.",
  },
  {
    id: "yield-curve-and-recession",
    aliases: ["yield curve inversion and recession", "why does inverted curve predict recession"],
    category: "Yield Curves",
    answer: "An inverted yield curve has preceded many past recessions because it reflects markets pricing in future rate cuts — usually a response to anticipated economic weakness ahead.",
  },
  {
    id: "yield-curve-pakistan",
    aliases: ["pakistan yield curve shape", "is pakistan yield curve inverted"],
    category: "Yield Curves",
    answer: "Pakistan's yield curve has shifted between normal and inverted shapes depending on the rate cycle — during 2023's high-rate environment, short-term yields at times exceeded longer-term ones as markets priced in future cuts.",
  },
  {
    id: "yield-curve-spread",
    aliases: ["what is yield spread", "3y-3m spread meaning"],
    category: "Yield Curves",
    answer: "Yield spread is the difference between two yields at different maturities (e.g., 3-year minus 3-month) — a shrinking or negative spread suggests the market expects rates to fall.",
  },
  {
    id: "yield-curve-flat",
    aliases: ["what is a flat yield curve", "flat yield curve meaning"],
    category: "Yield Curves",
    answer: "A flat yield curve occurs when short and long-term yields are similar, often reflecting market uncertainty about the future direction of interest rates and growth.",
  },
  {
    id: "yield-curve-rate-expectations",
    aliases: ["yield curve and rate expectations", "how yield curve predicts rate cuts"],
    category: "Yield Curves",
    answer: "Bond markets price in expected future rate moves, so the shape of the yield curve reflects the collective market view on where interest rates are headed over different time horizons.",
  },

  // ── PSX ──────────────────────────────────────────────────────────────────
  {
    id: "psx-what-is",
    aliases: ["what is psx", "pakistan stock exchange meaning", "what does psx stand for"],
    category: "PSX",
    answer: "PSX (Pakistan Stock Exchange) is Pakistan's sole stock exchange, formed in 2016 from the merger of the Karachi, Lahore, and Islamabad stock exchanges.",
  },
  {
    id: "psx-history",
    aliases: ["psx history", "when was psx formed", "karachi stock exchange history"],
    category: "PSX",
    answer: "PSX traces its roots to the Karachi Stock Exchange, founded in 1947 shortly after independence, and was formally renamed/restructured as the unified Pakistan Stock Exchange in January 2016.",
  },
  {
    id: "psx-trading-hours",
    aliases: ["psx trading hours", "what time does psx open"],
    category: "PSX",
    answer: "PSX trading sessions typically run on weekday mornings to early afternoon Pakistan time, with specific hours varying somewhat by season and market segment.",
  },
  {
    id: "psx-indices-overview",
    aliases: ["psx indices list", "what indices does psx have"],
    category: "PSX",
    answer: "PSX's main indices include the KSE-100 (top 100 companies by market cap/liquidity), KSE-All Share (all listed companies), KSE-30, and KMI-30 (Shariah-compliant index).",
  },
  {
    id: "psx-how-to-invest",
    aliases: ["how to invest in psx", "how to buy pakistani stocks"],
    category: "PSX",
    answer: "Investing in PSX requires opening a brokerage account with a SECP-licensed broker, completing CDC (Central Depository Company) account registration, and funding the account to place buy/sell orders.",
  },
  {
    id: "psx-circuit-breakers",
    aliases: ["psx circuit breaker rules", "psx price limits"],
    category: "PSX",
    answer: "PSX uses circuit breakers — daily price limits that halt trading in a stock if it moves too far up or down — to curb excessive volatility and give the market time to absorb news.",
  },
  {
    id: "psx-brokers",
    aliases: ["psx brokers list", "how to choose a stock broker pakistan"],
    category: "PSX",
    answer: "PSX trading is conducted through SECP-licensed brokerage houses, which provide trading platforms, research, and execute buy/sell orders on behalf of investors for a commission.",
  },
  {
    id: "psx-regulation-secp",
    aliases: ["who regulates psx", "secp role in stock market"],
    category: "PSX",
    answer: "The Securities and Exchange Commission of Pakistan (SECP) regulates PSX, brokers, and listed companies, overseeing disclosure requirements, market conduct, and investor protection.",
  },
  {
    id: "psx-market-cap",
    aliases: ["psx total market capitalization", "how big is pakistan stock market"],
    category: "PSX",
    answer: "PSX's total market capitalization reflects the combined value of all listed companies' shares — it's relatively small compared to regional peers, reflecting Pakistan's still-developing capital markets.",
  },
  {
    id: "psx-sectors",
    aliases: ["psx sector breakdown", "which sectors dominate psx"],
    category: "PSX",
    answer: "Banking, oil & gas exploration/marketing, cement, fertilizer, and power are among the most heavily weighted sectors on PSX, reflecting Pakistan's industrial structure.",
  },
  {
    id: "psx-foreign-investment",
    aliases: ["foreign investment in psx", "do foreign investors trade on psx"],
    category: "PSX",
    answer: "Foreign investors can trade on PSX through Special Convertible Rupee Accounts (SCRA), though foreign portfolio flows into PSX have been relatively modest and at times volatile in recent years.",
  },
  {
    id: "psx-settlement",
    aliases: ["psx trade settlement process", "t+2 settlement psx"],
    category: "PSX",
    answer: "PSX trades typically settle through the National Clearing Company of Pakistan Limited (NCCPL) on a T+2 basis, meaning shares and funds officially change hands two business days after the trade.",
  },
  {
    id: "psx-ipos",
    aliases: ["psx ipo process", "how do companies list on psx"],
    category: "PSX",
    answer: "Companies list on PSX through an Initial Public Offering (IPO), issuing new shares to the public after SECP approval, allowing them to raise capital and become publicly traded.",
  },
  {
    id: "psx-vs-other-exchanges",
    aliases: ["psx vs other stock exchanges", "pakistan stock market vs international markets"],
    category: "PSX",
    answer: "PSX is much smaller than major regional exchanges like India's NSE/BSE, both in market capitalization and trading volume, reflecting Pakistan's smaller economy and less-developed capital markets.",
  },
  {
    id: "psx-data-access",
    aliases: ["how to get live psx data", "psx real-time data access"],
    category: "PSX",
    answer: "Real-time PSX data (including the KSE-100 index) requires a commercial data license directly from PSX — free-tier financial data providers generally don't carry live Pakistani stock market feeds.",
  },

  // ── KSE-100 ──────────────────────────────────────────────────────────────
  {
    id: "kse100-what-is",
    aliases: ["what is kse-100", "kse 100 meaning", "what does kse100 stand for"],
    category: "KSE-100",
    answer: "The KSE-100 is PSX's benchmark index, tracking the performance of the 100 largest and most liquid companies listed on the exchange by market capitalization.",
  },
  {
    id: "kse100-how-calculated",
    aliases: ["how is kse-100 calculated", "kse-100 calculation method"],
    category: "KSE-100",
    answer: "The KSE-100 is a free-float market-capitalization-weighted index — companies are weighted by the value of their publicly tradable shares, not total shares outstanding.",
  },
  {
    id: "kse100-history",
    aliases: ["kse-100 history", "when was kse-100 launched"],
    category: "KSE-100",
    answer: "The KSE-100 index was introduced in 1991 with a base value of 1,000 points, and has grown many multiples of that over subsequent decades despite significant volatility.",
  },
  {
    id: "kse100-free-float",
    aliases: ["what is free float in kse-100", "free float methodology meaning"],
    category: "KSE-100",
    answer: "Free float refers to the shares of a company actually available for public trading, excluding shares held by founders, government, or strategic investors — KSE-100 weights companies based on this freely-tradable portion.",
  },
  {
    id: "kse100-vs-all-share",
    aliases: ["kse-100 vs kse all share index", "difference between kse100 and kse all share"],
    category: "KSE-100",
    answer: "KSE-100 covers only the top 100 companies by size/liquidity, while the KSE-All Share Index includes every company listed on PSX, giving a broader (though less liquidity-focused) market picture.",
  },
  {
    id: "kse100-record-highs",
    aliases: ["kse-100 all time high", "kse-100 record level"],
    category: "KSE-100",
    answer: "The KSE-100 has hit successive record highs at various points, often driven by improving macroeconomic stability, falling interest rates, or strong corporate earnings — though it has also seen sharp crashes during crisis periods.",
  },
  {
    id: "kse100-and-foreign-investors",
    aliases: ["foreign investors and kse-100", "foreign flows psx"],
    category: "KSE-100",
    answer: "Foreign investor flows into KSE-100 stocks can meaningfully move the index, particularly in large-cap banking and energy names — foreign selling pressure has at times weighed heavily on the index during risk-off periods.",
  },
  {
    id: "kse100-sector-weights",
    aliases: ["kse-100 sector weightage", "which sectors weigh most in kse-100"],
    category: "KSE-100",
    answer: "Banks, oil & gas exploration companies, fertilizer, cement, and power generation typically carry the largest sector weights in the KSE-100, reflecting Pakistan's economic structure.",
  },
  {
    id: "kse100-rebalancing",
    aliases: ["kse-100 index rebalancing", "how often is kse-100 reviewed"],
    category: "KSE-100",
    answer: "The KSE-100 composition is periodically reviewed and rebalanced (typically semi-annually) to ensure it continues to reflect the 100 largest and most liquid companies on PSX.",
  },
  {
    id: "kse100-drivers",
    aliases: ["what moves kse-100 daily", "kse-100 daily movement drivers"],
    category: "KSE-100",
    answer: "KSE-100 movements are typically driven by corporate earnings, interest rate expectations, currency stability, IMF program news, political developments, and global market sentiment toward emerging markets.",
  },
  {
    id: "kse100-economy-correlation",
    aliases: ["does kse-100 reflect the economy", "stock market vs real economy pakistan"],
    category: "KSE-100",
    answer: "KSE-100 often anticipates economic turning points (since it's forward-looking), but it doesn't perfectly track GDP — it can rally on rate-cut expectations even when current economic conditions are still weak.",
  },
  {
    id: "kse100-live-data-unavailable",
    aliases: ["why no live kse-100 data", "kse-100 data unavailable dashboard"],
    category: "KSE-100",
    answer: "Live KSE-100 index data requires a commercial license from PSX; this dashboard cannot display a real-time KSE-100 feed for this reason, and uses an ETF proxy or external sources for directional context instead.",
  },

  // ── KMI-30 ───────────────────────────────────────────────────────────────
  {
    id: "kmi30-what-is",
    aliases: ["what is kmi-30", "kmi 30 meaning", "what does kmi stand for"],
    category: "KMI-30",
    answer: "The KMI-30 (KSE-Meezan Index) is PSX's benchmark Shariah-compliant index, tracking the 30 largest Islamic-finance-eligible companies on the exchange.",
  },
  {
    id: "kmi30-shariah-screening",
    aliases: ["kmi-30 shariah screening criteria", "how are kmi-30 stocks screened"],
    category: "KMI-30",
    answer: "Companies in KMI-30 are screened for Shariah compliance — excluding businesses involved in interest-based finance, alcohol, gambling, and other prohibited activities, plus financial ratio screens (like debt levels).",
  },
  {
    id: "kmi30-vs-kse100",
    aliases: ["kmi-30 vs kse-100", "difference between kmi30 and kse100"],
    category: "KMI-30",
    answer: "KSE-100 includes companies regardless of Shariah compliance, while KMI-30 only includes companies passing Islamic finance screening — the two indices often move similarly but can diverge based on sector composition (e.g., conventional banks are excluded from KMI-30).",
  },
  {
    id: "kmi30-who-can-invest",
    aliases: ["who invests in kmi-30", "shariah compliant investing pakistan"],
    category: "KMI-30",
    answer: "KMI-30 is designed for investors seeking Shariah-compliant equity exposure, including Islamic mutual funds, takaful (Islamic insurance) companies, and individual investors avoiding conventional interest-based instruments.",
  },
  {
    id: "kmi30-history",
    aliases: ["kmi-30 history", "when was kmi-30 launched"],
    category: "KMI-30",
    answer: "KMI-30 was launched in 2009 as a joint initiative between PSX (then KSE) and Al Meezan Investment Management, becoming Pakistan's primary Islamic equity benchmark.",
  },
  {
    id: "kmi30-sectors",
    aliases: ["kmi-30 sector composition", "which sectors are excluded from kmi-30"],
    category: "KMI-30",
    answer: "KMI-30 excludes conventional banks and insurance companies (due to interest-based operations) but includes Islamic banks, and tends to weight more heavily toward energy, cement, and fertilizer companies.",
  },
  {
    id: "kmi30-rebalancing",
    aliases: ["kmi-30 review schedule", "how often is kmi-30 rebalanced"],
    category: "KMI-30",
    answer: "KMI-30's constituents are reviewed periodically (semi-annually) to ensure ongoing Shariah compliance and that the index reflects the most liquid eligible companies.",
  },
  {
    id: "kmi30-all-share-version",
    aliases: ["islamic all share index pakistan", "kmi all share islamic index"],
    category: "KMI-30",
    answer: "Beyond KMI-30, PSX also maintains a broader KMI All Share Islamic Index, covering all Shariah-compliant listed companies rather than just the top 30.",
  },

  // ── Mutual Funds ─────────────────────────────────────────────────────────
  {
    id: "mutual-funds-what-are",
    aliases: ["what is a mutual fund", "mutual fund meaning", "define mutual fund"],
    category: "Mutual Funds",
    answer: "A mutual fund pools money from many investors to invest collectively in stocks, bonds, or other assets, managed by a professional fund manager, with returns shared proportionally among investors.",
  },
  {
    id: "mutual-funds-types",
    aliases: ["types of mutual funds", "categories of mutual funds pakistan"],
    category: "Mutual Funds",
    answer: "Common mutual fund types include equity funds (stocks), income funds (bonds), money market funds (short-term instruments), and balanced funds (a mix), each with different risk/return profiles.",
  },
  {
    id: "mutual-funds-equity-vs-income",
    aliases: ["equity fund vs income fund", "stock fund vs bond fund"],
    category: "Mutual Funds",
    answer: "Equity funds invest mainly in stocks, offering higher potential returns with higher risk. Income funds invest in fixed-income instruments like bonds, offering more stable but typically lower returns.",
  },
  {
    id: "mutual-funds-nav",
    aliases: ["what is nav mutual fund", "net asset value meaning"],
    category: "Mutual Funds",
    answer: "NAV (Net Asset Value) is the per-unit value of a mutual fund, calculated by dividing the total value of the fund's holdings by the number of units outstanding — it's the price at which units are bought/sold.",
  },
  {
    id: "mutual-funds-fees",
    aliases: ["mutual fund fees pakistan", "what is a management fee"],
    category: "Mutual Funds",
    answer: "Mutual funds charge a management fee (typically 1-2% annually) for professional management, plus sometimes front-end/back-end load fees on buying or selling units.",
  },
  {
    id: "mutual-funds-money-market-pakistan",
    aliases: ["money market funds pakistan", "best money market fund pakistan"],
    category: "Mutual Funds",
    answer: "Money market funds invest in very short-term, low-risk instruments like T-Bills, offering returns close to prevailing short-term interest rates with high liquidity — popular for parking cash in Pakistan's high-rate environment.",
  },
  {
    id: "mutual-funds-how-to-invest-pakistan",
    aliases: ["how to invest in mutual funds pakistan", "buying mutual funds pakistan"],
    category: "Mutual Funds",
    answer: "Investing in Pakistani mutual funds typically involves opening an account directly with an Asset Management Company (AMC) or through their digital apps, then purchasing units of the chosen fund.",
  },
  {
    id: "mutual-funds-risk",
    aliases: ["mutual fund risk levels", "are mutual funds risky"],
    category: "Mutual Funds",
    answer: "Mutual fund risk varies by type — equity funds carry market risk and can lose value, while money market funds are much lower risk but still not entirely risk-free (e.g., credit risk on underlying holdings).",
  },
  {
    id: "mutual-funds-open-vs-closed",
    aliases: ["open-end vs closed-end funds", "closed end fund meaning"],
    category: "Mutual Funds",
    answer: "Open-end funds continuously issue/redeem units at NAV, so the fund size changes with investor flows. Closed-end funds issue a fixed number of shares that trade on an exchange, with prices that can differ from NAV.",
  },
  {
    id: "mutual-funds-regulation-secp",
    aliases: ["mutual fund regulation pakistan", "secp asset management regulation"],
    category: "Mutual Funds",
    answer: "Mutual funds and Asset Management Companies (AMCs) in Pakistan are regulated by SECP, which sets rules on disclosure, fund structure, and investor protection.",
  },
  {
    id: "mutual-funds-voluntary-pension",
    aliases: ["voluntary pension scheme pakistan", "vps mutual fund"],
    category: "Mutual Funds",
    answer: "Voluntary Pension Schemes (VPS) are a fund structure offering tax benefits for long-term retirement savings, allowing contributors to allocate among equity, debt, and money market sub-funds.",
  },
  {
    id: "mutual-funds-islamic",
    aliases: ["islamic mutual funds pakistan", "shariah compliant mutual funds"],
    category: "Mutual Funds",
    answer: "Islamic mutual funds invest only in Shariah-compliant stocks and instruments (similar to KMI-30 screening), avoiding interest-based securities and prohibited sectors.",
  },

  // ── ETFs ─────────────────────────────────────────────────────────────────
  {
    id: "etf-what-is",
    aliases: ["what is an etf", "etf meaning", "exchange traded fund definition"],
    category: "ETFs",
    answer: "An ETF (Exchange-Traded Fund) is a basket of securities (like stocks) that trades on an exchange like a single stock, typically tracking an index, offering instant diversification.",
  },
  {
    id: "etf-vs-mutual-fund",
    aliases: ["etf vs mutual fund", "difference between etf and mutual fund"],
    category: "ETFs",
    answer: "ETFs trade continuously on an exchange throughout the day at market prices, while mutual funds are bought/sold once daily at end-of-day NAV — ETFs also tend to have lower fees on average.",
  },
  {
    id: "etf-pakistan",
    aliases: ["etfs in pakistan", "pakistan etf market"],
    category: "ETFs",
    answer: "Pakistan's ETF market is still developing, with a small number of locally listed ETFs tracking indices like KSE-100, alongside historical foreign-listed options like the now-delisted Global X MSCI Pakistan ETF.",
  },
  {
    id: "etf-pak-nyse",
    aliases: ["pakistan etf nyse pak", "global x msci pakistan etf"],
    category: "ETFs",
    answer: "The Global X MSCI Pakistan ETF (NYSE: PAK) was a US-listed fund tracking Pakistan's top companies, used by foreign investors as a proxy for Pakistani equity exposure, though it became illiquid and was delisted by mid-2025.",
  },
  {
    id: "etf-gold",
    aliases: ["gold etf pakistan", "what is a gold etf"],
    category: "ETFs",
    answer: "A gold ETF holds physical gold or gold-related assets and trades on an exchange, letting investors gain gold price exposure without storing physical metal.",
  },
  {
    id: "etf-how-trade",
    aliases: ["how do etfs trade", "etf trading mechanism"],
    category: "ETFs",
    answer: "ETFs trade on stock exchanges throughout market hours at fluctuating prices, similar to individual stocks, using market makers/authorized participants to keep the ETF's price aligned with its underlying assets' value.",
  },
  {
    id: "etf-expense-ratio",
    aliases: ["what is etf expense ratio", "etf fees meaning"],
    category: "ETFs",
    answer: "An ETF's expense ratio is the annual fee (as a percentage of assets) charged for managing the fund — index ETFs typically have lower expense ratios than actively managed mutual funds.",
  },
  {
    id: "etf-liquidity",
    aliases: ["etf liquidity meaning", "why etf liquidity matters"],
    category: "ETFs",
    answer: "ETF liquidity refers to how easily shares can be bought/sold without significantly affecting price — low-liquidity ETFs (common in smaller markets like Pakistan's) can have wider bid-ask spreads.",
  },

  // ── Banking ──────────────────────────────────────────────────────────────
  {
    id: "banking-how-banks-work",
    aliases: ["how do banks work", "how do banks make money"],
    category: "Banking",
    answer: "Banks take deposits from savers (paying them interest) and lend that money to borrowers (charging higher interest), profiting from the spread between the two rates plus fees.",
  },
  {
    id: "banking-commercial-banks-pakistan",
    aliases: ["commercial banks in pakistan", "biggest banks in pakistan"],
    category: "Banking",
    answer: "Pakistan's banking sector includes large commercial banks (both private and partially state-owned), regulated by SBP, providing deposits, loans, and increasingly digital banking services.",
  },
  {
    id: "banking-islamic-banking",
    aliases: ["what is islamic banking", "islamic banking pakistan growth"],
    category: "Banking",
    answer: "Islamic banking offers Shariah-compliant alternatives to conventional banking — using profit-sharing and lease-based products instead of interest — and has grown to represent a significant and rising share of Pakistan's banking sector.",
  },
  {
    id: "banking-spread",
    aliases: ["what is banking spread", "interest rate spread banks pakistan"],
    category: "Banking",
    answer: "Banking spread is the difference between the interest rate banks charge borrowers and the rate they pay depositors — Pakistani banks have historically had relatively wide spreads, boosting profitability especially in high-rate periods.",
  },
  {
    id: "banking-non-performing-loans",
    aliases: ["what are non-performing loans", "npl ratio meaning"],
    category: "Banking",
    answer: "Non-performing loans (NPLs) are loans where the borrower has stopped making payments as agreed — a high NPL ratio signals asset quality stress within the banking sector.",
  },
  {
    id: "banking-capital-adequacy",
    aliases: ["bank capital adequacy ratio meaning", "car ratio banking"],
    category: "Banking",
    answer: "The Capital Adequacy Ratio (CAR) measures a bank's capital relative to its risk-weighted assets, ensuring banks hold enough of a buffer to absorb losses — SBP sets minimum CAR requirements for Pakistani banks.",
  },
  {
    id: "banking-sector-profitability",
    aliases: ["why are pakistani banks profitable", "bank profits from government debt"],
    category: "Banking",
    answer: "Pakistani banks have often posted strong profits by holding large amounts of high-yielding government securities (T-Bills/PIBs), benefiting directly from high interest rate environments.",
  },
  {
    id: "banking-digital-pakistan",
    aliases: ["digital banking pakistan", "raast payment system"],
    category: "Banking",
    answer: "Pakistan has pushed digital banking adoption through SBP's Raast instant payment system, branchless banking, and a growing number of digital-only banks, aiming to expand financial inclusion.",
  },
  {
    id: "banking-microfinance",
    aliases: ["microfinance banks pakistan", "what is microfinance banking"],
    category: "Banking",
    answer: "Microfinance banks provide small loans and basic financial services to low-income individuals and small businesses who typically lack access to traditional banking, supporting financial inclusion in Pakistan.",
  },
  {
    id: "banking-regulation",
    aliases: ["who regulates banks in pakistan", "banking regulation framework pakistan"],
    category: "Banking",
    answer: "SBP regulates and supervises all banks in Pakistan under the Banking Companies Ordinance and related laws, setting capital, liquidity, and conduct requirements.",
  },
  {
    id: "banking-deposit-protection",
    aliases: ["deposit insurance pakistan", "depositor protection corporation"],
    category: "Banking",
    answer: "The Deposit Protection Corporation (a subsidiary of SBP) insures bank deposits up to a set limit, protecting depositors if a bank fails.",
  },
  {
    id: "banking-interbank-market",
    aliases: buildAliases(["interbank market"], ["interbank lending meaning"]),
    category: "Banking",
    answer: "The interbank market is where banks lend to and borrow from each other (usually overnight) to manage short-term liquidity needs — KIBOR is derived from rates in this market.",
  },
  {
    id: "banking-correspondent-banking",
    aliases: buildAliases(["correspondent banking"], ["correspondent banking pakistan challenges"]),
    category: "Banking",
    answer: "Correspondent banking relationships allow domestic banks to access international payment networks through partner banks abroad — Pakistan has faced some de-risking challenges in maintaining these relationships due to compliance concerns.",
  },
  {
    id: "banking-mergers-pakistan",
    aliases: ["bank mergers pakistan", "why do banks merge"],
    category: "Banking",
    answer: "Bank mergers in Pakistan (and globally) typically aim to build scale, strengthen capital bases, expand branch networks, and improve operational efficiency.",
  },

  // ── IMF ──────────────────────────────────────────────────────────────────
  {
    id: "imf-what-is",
    aliases: ["what is imf", "international monetary fund meaning", "what does imf do"],
    category: "IMF",
    answer: "The IMF (International Monetary Fund) is an international organization that provides financial assistance and policy advice to member countries facing balance-of-payments problems, in exchange for agreed economic reforms.",
  },
  {
    id: "imf-loan-programs",
    aliases: ["imf loan programs types", "what is an imf program"],
    category: "IMF",
    answer: "IMF programs (like the Extended Fund Facility or Stand-By Arrangement) provide financing in exchange for the borrowing country committing to specific economic policy reforms, reviewed periodically for compliance.",
  },
  {
    id: "imf-conditions",
    aliases: ["what are imf conditions", "imf conditionality meaning"],
    category: "IMF",
    answer: "IMF conditionality refers to the policy commitments a borrowing country must meet to receive and continue receiving loan disbursements — often including fiscal targets, tax reforms, and exchange rate flexibility.",
  },
  {
    id: "imf-pakistan-history",
    aliases: ["pakistan imf program history", "how many times has pakistan gone to imf"],
    category: "IMF",
    answer: "Pakistan has entered more than 20 IMF programs since the 1950s, reflecting a recurring pattern of balance-of-payments crises driven by structural fiscal and external imbalances.",
  },
  {
    id: "imf-eff",
    aliases: ["what is extended fund facility", "imf eff meaning"],
    category: "IMF",
    answer: "The Extended Fund Facility (EFF) is a longer-term IMF lending instrument (typically 3+ years) designed for countries needing extended structural reforms, as opposed to shorter-term balance-of-payments support.",
  },
  {
    id: "imf-review-process",
    aliases: ["imf review process meaning", "what is an imf review"],
    category: "IMF",
    answer: "IMF reviews are periodic assessments of whether a borrowing country has met agreed targets (structural benchmarks, fiscal goals); passing a review unlocks the next loan disbursement (tranche).",
  },
  {
    id: "imf-quota",
    aliases: ["what is imf quota", "imf quota meaning"],
    category: "IMF",
    answer: "An IMF quota is a member country's financial contribution to the fund, which determines its voting power and how much it can potentially borrow from the IMF.",
  },
  {
    id: "imf-why-pakistan-needs",
    aliases: ["why does pakistan need imf", "why does pakistan keep going to imf"],
    category: "IMF",
    answer: "Pakistan turns to the IMF when its foreign reserves run critically low and it can't otherwise meet external debt and import payment obligations — the IMF provides bridge financing tied to stabilization reforms.",
  },
  {
    id: "imf-bailout-meaning",
    aliases: ["what is an imf bailout", "imf bailout meaning"],
    category: "IMF",
    answer: "An 'IMF bailout' colloquially refers to an IMF lending program that helps a country avoid default or a deeper financial crisis, in exchange for policy reform commitments.",
  },
  {
    id: "imf-subsidies",
    aliases: ["imf and subsidy removal pakistan", "why does imf want subsidies removed"],
    category: "IMF",
    answer: "IMF programs typically require reducing or removing energy and other subsidies that strain the budget, since these are seen as fiscally unsustainable and often poorly targeted toward those who need them most.",
  },
  {
    id: "imf-sdr",
    aliases: ["what is sdr special drawing rights", "sdr meaning imf"],
    category: "IMF",
    answer: "Special Drawing Rights (SDRs) are an IMF-created reserve asset that member countries can use to supplement their own reserves, based on a basket of major currencies.",
  },
  {
    id: "imf-board",
    aliases: ["imf executive board", "who runs the imf"],
    category: "IMF",
    answer: "The IMF is governed by an Executive Board representing member countries, with decisions on lending programs requiring board approval, while a Managing Director leads daily operations.",
  },
  {
    id: "imf-structural-benchmarks",
    aliases: ["what are structural benchmarks imf", "imf structural reforms meaning"],
    category: "IMF",
    answer: "Structural benchmarks are specific, often non-fiscal reform commitments (like energy sector restructuring or tax law amendments) that a country agrees to implement as part of an IMF program.",
  },
  {
    id: "imf-vs-other-lenders",
    aliases: ["imf vs bilateral lenders pakistan", "imf loans vs china loans"],
    category: "IMF",
    answer: "IMF financing is typically lower-cost and comes with policy conditions aimed at long-term stability, while bilateral loans (e.g., from China or Gulf states) often come with fewer public conditions but different strategic considerations.",
  },

  // ── World Bank ───────────────────────────────────────────────────────────
  {
    id: "world-bank-what-is",
    aliases: ["what is the world bank", "world bank meaning", "what does world bank do"],
    category: "World Bank",
    answer: "The World Bank is an international institution providing loans and grants to developing countries for development projects — infrastructure, education, health, and poverty reduction — distinct from the IMF's focus on macroeconomic stability.",
  },
  {
    id: "world-bank-vs-imf",
    aliases: ["world bank vs imf", "difference between world bank and imf"],
    category: "World Bank",
    answer: "The IMF focuses on short-to-medium-term macroeconomic and balance-of-payments stability. The World Bank focuses on longer-term development financing for specific projects and structural reforms.",
  },
  {
    id: "world-bank-pakistan-loans",
    aliases: ["world bank loans to pakistan", "world bank projects pakistan"],
    category: "World Bank",
    answer: "The World Bank has funded numerous projects in Pakistan across energy, water, education, health, and social safety nets, typically through long-term, low-interest loans and grants.",
  },
  {
    id: "world-bank-ida",
    aliases: ["what is ida international development association", "ida loans meaning"],
    category: "World Bank",
    answer: "The International Development Association (IDA) is the World Bank's arm providing concessional (very low-interest, long-maturity) loans and grants to the poorest developing countries.",
  },
  {
    id: "world-bank-project-financing",
    aliases: ["world bank project financing structure", "how world bank loans work"],
    category: "World Bank",
    answer: "World Bank project financing typically funds specific infrastructure or social programs, with disbursements tied to project milestones and implementation progress rather than general budget support.",
  },
  {
    id: "world-bank-governance",
    aliases: ["who runs the world bank", "world bank governance structure"],
    category: "World Bank",
    answer: "The World Bank is governed by a Board of Executive Directors representing member countries, with voting power weighted by financial contributions, and led by a President.",
  },
  {
    id: "world-bank-poverty-reports",
    aliases: ["world bank pakistan poverty report", "world bank poverty estimates pakistan"],
    category: "World Bank",
    answer: "The World Bank regularly publishes poverty and economic outlook reports on Pakistan, tracking poverty rates, growth projections, and structural reform recommendations.",
  },
  {
    id: "world-bank-ifc",
    aliases: buildAliases(["ifc", "international finance corporation"], []),
    category: "World Bank",
    answer: "The International Finance Corporation (IFC) is the World Bank Group's private-sector investment arm, providing financing directly to private companies and projects in developing countries rather than to governments.",
  },
  {
    id: "world-bank-climate-financing",
    aliases: ["world bank climate financing pakistan", "world bank flood relief pakistan"],
    category: "World Bank",
    answer: "The World Bank has increasingly directed financing toward climate resilience and disaster recovery in Pakistan, including support following the devastating 2022 floods.",
  },
  {
    id: "world-bank-country-partnership",
    aliases: ["world bank country partnership framework pakistan", "cpf meaning world bank"],
    category: "World Bank",
    answer: "A Country Partnership Framework (CPF) outlines the World Bank's planned engagement and priority areas for a specific country over a multi-year period, guiding its lending and advisory program.",
  },

  // ── Macroeconomics ───────────────────────────────────────────────────────
  {
    id: "macro-what-is",
    aliases: ["what is macroeconomics", "macroeconomics meaning", "define macroeconomics"],
    category: "Macroeconomics",
    answer: "Macroeconomics studies the economy as a whole — growth, inflation, unemployment, trade, and government policy — as opposed to microeconomics, which studies individual markets, firms, and consumers.",
  },
  {
    id: "macro-micro-vs-macro",
    aliases: ["micro vs macro economics", "difference between microeconomics and macroeconomics"],
    category: "Macroeconomics",
    answer: "Microeconomics examines individual decisions — a single firm's pricing, a household's budget. Macroeconomics looks at aggregate, economy-wide outcomes like total output, overall price levels, and national employment.",
  },
  {
    id: "macro-business-cycle",
    aliases: ["what is the business cycle", "business cycle meaning"],
    category: "Macroeconomics",
    answer: "The business cycle describes the natural rise and fall of economic activity over time — alternating between expansion (growth), peak, contraction (recession), and trough phases.",
  },
  {
    id: "macro-unemployment-types",
    aliases: ["types of unemployment", "structural vs cyclical unemployment"],
    category: "Macroeconomics",
    answer: "Key unemployment types include cyclical (tied to the business cycle), structural (skills/jobs mismatch), frictional (short-term job search), and seasonal (tied to specific times of year).",
  },
  {
    id: "macro-phillips-curve",
    aliases: ["what is the phillips curve", "phillips curve meaning"],
    category: "Macroeconomics",
    answer: "The Phillips Curve describes an observed inverse relationship between inflation and unemployment — historically, lower unemployment has often come with higher inflation, though this relationship has weakened in some economies over time.",
  },
  {
    id: "macro-fiscal-vs-monetary-policy",
    aliases: ["fiscal policy vs monetary policy", "difference between fiscal and monetary policy"],
    category: "Macroeconomics",
    answer: "Fiscal policy is government spending and taxation decisions, set by the finance ministry/legislature. Monetary policy is interest rate and money supply management, set by the central bank — both aim to influence economic activity but through different levers.",
  },
  {
    id: "macro-aggregate-demand",
    aliases: ["what is aggregate demand", "aggregate demand meaning", "aggregate demand vs aggregate supply"],
    category: "Macroeconomics",
    answer: "Aggregate demand is the total demand for goods and services in an economy at a given price level, combining consumption, investment, government spending, and net exports.",
  },
  {
    id: "macro-aggregate-supply",
    aliases: ["what is aggregate supply", "aggregate supply meaning"],
    category: "Macroeconomics",
    answer: "Aggregate supply is the total quantity of goods and services producers in an economy are willing to supply at a given price level, shaped by production costs, capacity, and technology.",
  },
  {
    id: "macro-multiplier-effect",
    aliases: ["what is the multiplier effect", "fiscal multiplier meaning"],
    category: "Macroeconomics",
    answer: "The multiplier effect describes how an initial injection of spending (like government investment) generates additional rounds of spending throughout the economy, amplifying its total impact on GDP.",
  },
  {
    id: "macro-leading-vs-lagging-indicators",
    aliases: ["leading vs lagging economic indicators", "what are leading indicators"],
    category: "Macroeconomics",
    answer: "Leading indicators (like LSM or new orders) tend to change before the broader economy does, useful for forecasting. Lagging indicators (like unemployment) confirm trends only after they've already happened.",
  },
  {
    id: "macro-gnp",
    aliases: ["what is gnp", "gross national product meaning"],
    category: "Macroeconomics",
    answer: "GNP (Gross National Product) measures total output produced by a country's citizens and companies, regardless of location, unlike GDP which measures output within the country's borders.",
  },
  {
    id: "macro-national-income",
    aliases: ["what is national income", "national income meaning"],
    category: "Macroeconomics",
    answer: "National income is the total income earned by a country's residents from production, including wages, profits, rent, and interest, closely related to but distinct in calculation from GDP.",
  },
  {
    id: "macro-ppp",
    aliases: ["what is purchasing power parity", "ppp meaning economics"],
    category: "Macroeconomics",
    answer: "Purchasing Power Parity (PPP) adjusts exchange rate comparisons to account for differences in the cost of living between countries, often used to compare living standards more meaningfully than market exchange rates alone.",
  },
  {
    id: "macro-growth-vs-development",
    aliases: ["economic growth vs economic development", "difference between growth and development"],
    category: "Macroeconomics",
    answer: "Economic growth refers to an increase in output (GDP). Economic development is broader, encompassing improvements in living standards, education, health, and institutions — growth without development can leave underlying welfare unchanged.",
  },
  {
    id: "macro-supply-shock",
    aliases: ["what is a supply shock", "supply shock meaning economics"],
    category: "Macroeconomics",
    answer: "A supply shock is a sudden, unexpected event that changes the supply of a good or input — like an oil price spike or a crop failure — that can disrupt production and prices economy-wide.",
  },
  {
    id: "macro-demand-shock",
    aliases: ["what is a demand shock", "demand shock meaning economics"],
    category: "Macroeconomics",
    answer: "A demand shock is a sudden, unexpected change in the demand for goods and services — such as a financial crisis denting consumer confidence — that can sharply affect output and employment.",
  },

  // ── Investing Basics ─────────────────────────────────────────────────────
  {
    id: "investing-what-is",
    aliases: ["what is investing", "investing meaning", "how to start investing"],
    category: "Investing Basics",
    answer: "Investing means putting money into assets — stocks, bonds, real estate, funds — with the expectation of generating returns over time, as opposed to simply holding cash.",
  },
  {
    id: "investing-risk-vs-return",
    aliases: ["risk vs return relationship", "risk return tradeoff meaning"],
    category: "Investing Basics",
    answer: "Risk and return are generally linked: higher potential returns usually come with higher risk of loss, while safer investments typically offer lower expected returns.",
  },
  {
    id: "investing-diversification",
    aliases: ["what is diversification", "why diversify investments"],
    category: "Investing Basics",
    answer: "Diversification means spreading investments across different assets, sectors, or geographies to reduce the impact of any single investment performing poorly — 'not putting all eggs in one basket.'",
  },
  {
    id: "investing-compounding",
    aliases: ["what is compounding", "power of compound interest"],
    category: "Investing Basics",
    answer: "Compounding is earning returns not just on your original investment, but also on previously earned returns — over long periods, this can dramatically accelerate wealth growth.",
  },
  {
    id: "investing-real-returns",
    aliases: ["inflation adjusted returns", "what is real return on investment"],
    category: "Investing Basics",
    answer: "Real return is your investment return after subtracting inflation — if you earn 10% but inflation is 12%, your real return is actually negative, meaning your purchasing power fell despite a nominal gain.",
  },
  {
    id: "investing-asset-classes",
    aliases: ["what are asset classes", "types of investment assets"],
    category: "Investing Basics",
    answer: "Major asset classes include stocks (equities), bonds (fixed income), cash/money market instruments, real estate, and commodities (like gold) — each with different risk, return, and liquidity characteristics.",
  },
  {
    id: "investing-stocks-vs-bonds",
    aliases: ["stocks vs bonds difference", "should I invest in stocks or bonds"],
    category: "Investing Basics",
    answer: "Stocks represent ownership in a company, offering higher growth potential but more volatility. Bonds are loans to a borrower, offering more predictable (but typically lower) income and generally less risk.",
  },
  {
    id: "investing-dollar-cost-averaging",
    aliases: buildAliases(["dollar cost averaging", "rupee cost averaging"], ["dca investing strategy"]),
    category: "Investing Basics",
    answer: "Dollar (or Rupee) cost averaging means investing a fixed amount at regular intervals regardless of price, which smooths out the impact of market volatility over time compared to investing a lump sum all at once.",
  },
  {
    id: "investing-portfolio-rebalancing",
    aliases: ["what is portfolio rebalancing", "why rebalance a portfolio"],
    category: "Investing Basics",
    answer: "Portfolio rebalancing means periodically adjusting your holdings back to your target allocation (e.g., selling some stocks if they've grown to dominate the portfolio), keeping risk levels consistent over time.",
  },
  {
    id: "investing-dividend-investing",
    aliases: ["what is dividend investing", "dividend yield meaning"],
    category: "Investing Basics",
    answer: "Dividend investing focuses on stocks that pay regular cash dividends to shareholders, providing income alongside any potential price appreciation — dividend yield is the annual dividend divided by share price.",
  },
  {
    id: "investing-capital-gains",
    aliases: ["what is capital gain", "capital gains tax meaning"],
    category: "Investing Basics",
    answer: "A capital gain is the profit from selling an investment for more than you paid for it. Capital gains can be taxed, with rates and rules varying by holding period and asset type.",
  },
  {
    id: "investing-time-horizon",
    aliases: ["what is investment horizon", "short term vs long term investing"],
    category: "Investing Basics",
    answer: "Investment horizon is how long you plan to hold an investment before needing the money — longer horizons generally allow for more risk-taking since there's more time to recover from downturns.",
  },
  {
    id: "investing-emergency-fund",
    aliases: buildAliases(["emergency fund"], ["why have an emergency fund before investing", "how much should an emergency fund be"]),
    category: "Investing Basics",
    answer: "An emergency fund is readily accessible cash savings (often 3-6 months of expenses) kept aside before investing, so unexpected costs don't force you to sell investments at a bad time.",
  },
  {
    id: "investing-financial-goals",
    aliases: ["how to set financial goals", "investing for goals"],
    category: "Investing Basics",
    answer: "Setting clear financial goals (retirement, a home, education) helps determine appropriate investment choices, since the right mix of risk and time horizon depends heavily on what you're investing for.",
  },
  {
    id: "investing-risk-tolerance",
    aliases: ["what is risk tolerance", "how to assess risk tolerance"],
    category: "Investing Basics",
    answer: "Risk tolerance is how much investment value decline you can handle, both financially and emotionally, without panic-selling — it should guide how much of a portfolio goes into volatile assets like stocks.",
  },
  {
    id: "investing-index-investing",
    aliases: ["what is index investing", "passive vs active investing"],
    category: "Investing Basics",
    answer: "Index investing means buying a fund that tracks a market index (like KSE-100) rather than picking individual stocks — a passive approach that typically has lower fees than active stock-picking strategies.",
  },
  {
    id: "investing-value-vs-growth",
    aliases: ["value investing vs growth investing", "what is value investing"],
    category: "Investing Basics",
    answer: "Value investing looks for stocks trading below their estimated intrinsic worth. Growth investing focuses on companies expected to grow earnings rapidly, often paying a premium price for that future growth potential.",
  },
  {
    id: "investing-beginners-pakistan",
    aliases: ["how to start investing in pakistan", "beginner investing guide pakistan", "how do i start investing with little money pakistan", "best way to start investing in pakistan"],
    category: "Investing Basics",
    answer: "Beginners in Pakistan typically start with a savings account or money market mutual fund for safety, then consider PSX stocks or diversified mutual funds once comfortable with risk, ideally after building an emergency fund first.",
  },

  // ── Pakistan Economy ─────────────────────────────────────────────────────
  {
    id: "pk-economy-overview",
    aliases: ["overview of pakistan economy", "pakistan economy summary", "how is pakistan economy doing"],
    category: "Pakistan Economy",
    answer: "Pakistan has a developing, services-dominated economy (~60% of GDP) with significant agriculture and a narrower industrial base, facing recurring balance-of-payments crises, high inflation volatility, and chronic fiscal deficits.",
  },
  {
    id: "pk-economy-key-challenges",
    aliases: ["pakistan economic challenges", "biggest problems with pakistan economy"],
    category: "Pakistan Economy",
    answer: "Pakistan's key economic challenges include a narrow tax base, energy sector inefficiencies (circular debt), low export diversification, high debt servicing costs, and vulnerability to external shocks given thin foreign reserves.",
  },
  {
    id: "pk-economy-history",
    aliases: ["pakistan economic history overview", "pakistan economy since independence"],
    category: "Pakistan Economy",
    answer: "Pakistan's economy has gone through cycles of strong growth (1960s, 2000s) and crisis (1990s, 2008, 2022-23), shaped by political instability, geopolitical events, and recurring need for IMF support.",
  },
  {
    id: "pk-economy-agriculture-role",
    aliases: ["agriculture role in pakistan economy", "importance of agriculture pakistan"],
    category: "Pakistan Economy",
    answer: "Agriculture employs roughly 38% of Pakistan's workforce and supplies key export inputs like cotton, making it central to both rural livelihoods and the textile industry's competitiveness.",
  },
  {
    id: "pk-economy-textile-importance",
    aliases: ["textile industry pakistan importance", "why textile matters for pakistan"],
    category: "Pakistan Economy",
    answer: "Textiles account for roughly 60% of Pakistan's exports and employ millions, making the sector central to the country's foreign currency earnings and industrial employment.",
  },
  {
    id: "pk-economy-energy-challenges",
    aliases: ["pakistan energy sector problems", "why does pakistan have power shortages"],
    category: "Pakistan Economy",
    answer: "Pakistan's energy sector struggles with circular debt, transmission losses, reliance on costly imported fuel, and periodic supply shortages, all of which raise costs for industry and households alike.",
  },
  {
    id: "pk-economy-circular-debt-explained",
    aliases: ["circular debt explained simply", "what causes circular debt pakistan"],
    category: "Pakistan Economy",
    answer: "Circular debt builds when the government doesn't fully pay power producers (often due to under-recovered tariffs or subsidies), who then can't pay fuel suppliers — creating a chain of unpaid obligations across the energy sector.",
  },
  {
    id: "pk-economy-population",
    aliases: ["pakistan population and economy", "population growth impact on economy pakistan"],
    category: "Pakistan Economy",
    answer: "Pakistan's large and fast-growing population (over 240 million) creates both opportunity (a young workforce) and pressure (job creation needs, strained public services, food/energy demand).",
  },
  {
    id: "pk-economy-informal-economy-size",
    aliases: ["how big is pakistan informal economy", "undocumented economy estimate pakistan"],
    category: "Pakistan Economy",
    answer: "Estimates suggest Pakistan's informal (undocumented) economy could be equivalent to 30% or more of official GDP, representing significant economic activity and tax revenue outside formal channels.",
  },
  {
    id: "pk-economy-remittance-dependent",
    aliases: ["is pakistan remittance dependent", "remittance dependent economy meaning"],
    category: "Pakistan Economy",
    answer: "Pakistan's economy relies heavily on remittances from overseas workers, which consistently exceed total goods exports and provide a crucial cushion for the external account and household incomes.",
  },
  {
    id: "pk-economy-cpec-overview",
    aliases: ["cpec overview", "china pakistan economic corridor summary"],
    category: "Pakistan Economy",
    answer: "CPEC (China-Pakistan Economic Corridor) is a multi-billion dollar program of Chinese-financed infrastructure and energy projects in Pakistan, aimed at boosting connectivity and industrial capacity, though it has also added to external debt.",
  },
  {
    id: "pk-economy-reforms-needed",
    aliases: ["economic reforms needed pakistan", "what reforms does pakistan need"],
    category: "Pakistan Economy",
    answer: "Commonly cited needed reforms include broadening the tax base, restructuring loss-making state enterprises, fixing energy sector pricing, and improving the ease of doing business to attract investment.",
  },
  {
    id: "pk-economy-privatization",
    aliases: ["privatization in pakistan", "state owned enterprises pakistan privatization"],
    category: "Pakistan Economy",
    answer: "Privatization of loss-making state-owned enterprises (like PIA and some power distribution companies) has been a recurring policy goal in Pakistan, often tied to IMF program commitments, though progress has been slow.",
  },
  {
    id: "pk-economy-tax-to-gdp",
    aliases: ["pakistan tax to gdp ratio", "why is pakistan tax collection low"],
    category: "Pakistan Economy",
    answer: "Pakistan's tax-to-GDP ratio (around 9-11%) is low by international standards, reflecting a narrow tax base, widespread exemptions, and significant informal economic activity outside the tax net.",
  },
  {
    id: "pk-economy-fbr",
    aliases: ["what is fbr pakistan", "federal board of revenue meaning"],
    category: "Pakistan Economy",
    answer: "The Federal Board of Revenue (FBR) is Pakistan's tax collection authority, responsible for administering income tax, sales tax, and customs duties at the federal level.",
  },
  {
    id: "pk-economy-ease-of-doing-business",
    aliases: ["ease of doing business pakistan ranking", "business climate pakistan"],
    category: "Pakistan Economy",
    answer: "Pakistan has historically ranked relatively low on global ease-of-doing-business measures, citing bureaucratic delays, inconsistent regulation, and energy reliability as key obstacles for investors.",
  },
  {
    id: "pk-economy-youth-unemployment",
    aliases: ["youth unemployment pakistan", "pakistan job creation challenge"],
    category: "Pakistan Economy",
    answer: "Pakistan faces significant youth unemployment and underemployment pressure, as its young, fast-growing population outpaces the formal economy's capacity to create enough quality jobs.",
  },
  {
    id: "pk-economy-urbanization",
    aliases: ["urbanization and economy pakistan", "pakistan urban population growth"],
    category: "Pakistan Economy",
    answer: "Rapid urbanization in Pakistan is straining city infrastructure and housing, while also driving demand growth in services, retail, and construction sectors.",
  },
  {
    id: "pk-economy-climate-impact",
    aliases: ["climate change economic impact pakistan", "2022 floods economic cost pakistan"],
    category: "Pakistan Economy",
    answer: "Climate-related disasters, like the 2022 floods (which caused tens of billions of dollars in damage), pose a growing economic risk for Pakistan, straining the budget and disrupting agriculture and infrastructure.",
  },
  {
    id: "pk-economy-outlook",
    aliases: ["pakistan economic outlook", "future of pakistan economy"],
    category: "Pakistan Economy",
    answer: "Pakistan's economic outlook depends heavily on sustaining IMF-backed stabilization, structural reforms (tax, energy, SOEs), and avoiding external shocks — most forecasts see moderate growth contingent on continued reform momentum.",
  },
  {
    id: "pk-economy-sez",
    aliases: ["special economic zones pakistan overview", "industrial zones pakistan"],
    category: "Pakistan Economy",
    answer: "Pakistan has established Special Economic Zones, partly tied to CPEC, offering tax incentives and infrastructure to attract export-oriented manufacturing investment, though uptake has been gradual.",
  },

  // ── GDP (additional) ─────────────────────────────────────────────────────
  {
    id: "gdp-quarterly-vs-fiscal-year",
    aliases: ["pakistan fiscal year dates", "when does pakistan fiscal year start"],
    category: "GDP",
    answer: "Pakistan's fiscal year runs from July 1 to June 30, so GDP and budget figures are typically reported as 'FY24' (July 2023-June 2024) rather than the calendar year.",
  },
  {
    id: "gdp-services-it-contribution",
    aliases: ["it sector contribution to gdp pakistan", "freelancing gdp contribution"],
    category: "GDP",
    answer: "IT and IT-enabled services are a small but fast-growing contributor to Pakistan's GDP, with exports in this category rising significantly faster than the overall economy in recent years.",
  },
  {
    id: "gdp-construction-sector",
    aliases: ["construction sector gdp pakistan", "real estate contribution to gdp"],
    category: "GDP",
    answer: "Construction is a meaningful component of Pakistan's industrial GDP, sensitive to interest rates (financing costs) and government infrastructure spending cycles.",
  },

  // ── Inflation (additional) ───────────────────────────────────────────────
  {
    id: "inflation-base-effect",
    aliases: ["what is base effect inflation", "base effect meaning"],
    category: "Inflation",
    answer: "The 'base effect' refers to how a YoY inflation rate can look artificially high or low simply because of what prices were doing in the same month a year ago, independent of current price trends.",
  },
  {
    id: "inflation-administered-prices",
    aliases: ["administered prices pakistan", "government-set prices and inflation"],
    category: "Inflation",
    answer: "Administered prices are those set or heavily influenced by the government (like electricity and gas tariffs) rather than determined purely by market forces — periodic adjustments to these can cause inflation spikes.",
  },
  {
    id: "inflation-taxation-impact",
    aliases: ["taxes and inflation pakistan", "sales tax and inflation"],
    category: "Inflation",
    answer: "Increases in sales tax, GST, or other indirect taxes raise the final price consumers pay for goods, directly contributing to measured inflation even without any change in underlying production costs.",
  },

  // ── Interest Rates (additional) ──────────────────────────────────────────
  {
    id: "interest-rate-real-vs-nominal-pakistan",
    aliases: ["pakistan real interest rate currently", "is pakistan real rate positive"],
    category: "Interest Rates",
    answer: "Pakistan's real interest rate (policy rate minus inflation) swings between positive and negative depending on the cycle — a deeply negative real rate, as seen during 2022-23's inflation spike, signals very loose effective monetary conditions despite high nominal rates.",
  },
  {
    id: "interest-rate-savings-accounts-pakistan",
    aliases: ["bank savings account interest rate pakistan", "national savings rates pakistan"],
    category: "Interest Rates",
    answer: "Pakistani bank savings accounts and National Savings Schemes offer returns that typically track the policy rate environment, with National Savings products often offering relatively competitive fixed rates for retail savers.",
  },

  // ── SBP (additional) ─────────────────────────────────────────────────────
  {
    id: "sbp-foreign-currency-accounts",
    aliases: ["foreign currency accounts pakistan rules", "sbp fcy account regulation"],
    category: "SBP",
    answer: "SBP regulates foreign currency accounts held by residents and non-residents in Pakistani banks, setting rules on deposits, withdrawals, and repatriation to balance financial flexibility with reserve management.",
  },
  {
    id: "sbp-prudential-regulations",
    aliases: ["sbp prudential regulations meaning", "what are prudential regulations"],
    category: "SBP",
    answer: "Prudential regulations are SBP's rules governing bank risk management — covering capital requirements, loan classification, provisioning, and exposure limits — designed to keep the banking system sound.",
  },

  // ── Exchange Rates (additional) ──────────────────────────────────────────
  {
    id: "exchange-rate-forward-rate",
    aliases: ["what is a forward exchange rate", "forward rate meaning currency"],
    category: "Exchange Rates",
    answer: "A forward exchange rate is a rate agreed today for a currency transaction that will settle at a future date, used by businesses and investors to hedge against future currency fluctuations.",
  },
  {
    id: "exchange-rate-hedging",
    aliases: ['what is currency hedging', "how do importers hedge currency risk"],
    category: "Exchange Rates",
    answer: "Currency hedging involves using financial instruments (like forward contracts) to lock in an exchange rate for a future transaction, protecting businesses from adverse currency movements.",
  },
  {
    id: "exchange-rate-spot-vs-forward",
    aliases: ["spot rate vs forward rate", "spot exchange rate meaning"],
    category: "Exchange Rates",
    answer: "The spot rate is the current exchange rate for immediate transactions, while the forward rate is agreed now for a transaction settling later — the difference between them reflects interest rate differentials between the two currencies.",
  },

  // ── Foreign Reserves (additional) ────────────────────────────────────────
  {
    id: "reserves-bilateral-deposits",
    aliases: ["bilateral deposits pakistan reserves", "saudi arabia deposit pakistan reserves"],
    category: "Foreign Reserves",
    answer: "Bilateral deposits — funds placed with SBP by friendly countries like Saudi Arabia, the UAE, and China — have repeatedly helped shore up Pakistan's reserves during periods of acute stress, though these are typically rolled over rather than permanent.",
  },
  {
    id: "reserves-net-vs-gross",
    aliases: ["net reserves vs gross reserves", "what is net international reserves", "usable reserves meaning pakistan"],
    category: "Foreign Reserves",
    answer: "Gross reserves are total foreign currency holdings. Net (or net international) reserves subtract short-term foreign currency liabilities, often giving a more accurate picture of a country's true external buffer.",
  },

  // ── Current Account (additional) ─────────────────────────────────────────
  {
    id: "current-account-seasonal-patterns",
    aliases: ["current account seasonality pakistan", "current account monthly swings"],
    category: "Current Account",
    answer: "Pakistan's current account can show seasonal swings tied to remittance patterns (Ramadan/Eid spikes) and import timing around harvest and energy procurement cycles.",
  },
  {
    id: "current-account-twin-deficits",
    aliases: ["what is twin deficits", "twin deficit problem pakistan"],
    category: "Current Account",
    answer: "The 'twin deficits' problem refers to a country running both a fiscal deficit and a current account deficit simultaneously — common in Pakistan's history, since government overspending often spills into import demand.",
  },

  // ── Government Debt (additional) ─────────────────────────────────────────
  {
    id: "gov-debt-floating-vs-fixed",
    aliases: ["floating rate debt vs fixed rate debt", "interest rate risk on government debt"],
    category: "Government Debt",
    answer: "Floating-rate government debt has interest costs that rise and fall with market rates, increasing budget vulnerability during rate hikes. Fixed-rate debt locks in costs but can't benefit if rates later fall.",
  },
  {
    id: "gov-debt-domestic-bank-holdings",
    aliases: ["banks holding government debt pakistan", "why do pakistani banks buy government bonds"],
    category: "Government Debt",
    answer: "Pakistani commercial banks are major holders of domestic government debt (T-Bills/PIBs), partly because high-yielding, low-risk government securities have often been more attractive than private-sector lending.",
  },
  {
    id: "gov-debt-china-loans",
    aliases: ["pakistan china loans details", "cpec debt pakistan"],
    category: "Government Debt",
    answer: "China is one of Pakistan's largest bilateral creditors, with loans tied significantly to CPEC energy and infrastructure projects, alongside direct financial support deposits with SBP.",
  },

  // ── Bonds (additional) ───────────────────────────────────────────────────
  {
    id: "bonds-zero-coupon",
    aliases: ["what is a zero coupon bond", "zero coupon bond meaning"],
    category: "Bonds",
    answer: "A zero-coupon bond pays no periodic interest; instead, it's sold at a deep discount to face value and the investor's entire return comes from the difference at maturity — T-Bills work this way.",
  },
  {
    id: "bonds-secondary-market",
    aliases: ["bond secondary market meaning", "can I sell a bond before maturity"],
    category: "Bonds",
    answer: "The secondary market lets investors buy and sell existing bonds before maturity, with prices fluctuating based on interest rate changes, credit quality, and time remaining until maturity.",
  },

  // ── PSX (additional) ─────────────────────────────────────────────────────
  {
    id: "psx-dividend-yield",
    aliases: ["psx average dividend yield", "do pakistani stocks pay dividends"],
    category: "PSX",
    answer: "Many PSX-listed companies, particularly in banking, energy, and fertilizer sectors, pay regular dividends, and dividend yield is a significant component of total returns for PSX investors.",
  },
  {
    id: "psx-margin-trading",
    aliases: ["margin trading psx", "leveraged trading pakistan stock market"],
    category: "PSX",
    answer: "PSX offers margin financing facilities allowing investors to borrow funds to buy additional shares, amplifying both potential gains and losses — a higher-risk strategy requiring careful risk management.",
  },
  {
    id: "psx-psx-vs-money-market",
    aliases: ["stocks vs money market funds pakistan", "should I invest in psx or fixed income"],
    category: "PSX",
    answer: "PSX stocks offer higher long-term growth potential but more volatility, while money market funds offer stable, predictable (often attractive in high-rate periods) returns with much lower risk — the right mix depends on goals and risk tolerance.",
  },

  // ── KSE-100 (additional) ─────────────────────────────────────────────────
  {
    id: "kse100-pe-ratio",
    aliases: ["kse-100 price to earnings ratio", "is psx cheap or expensive"],
    category: "KSE-100",
    answer: "The KSE-100's price-to-earnings (P/E) ratio is used to gauge whether the market is cheap or expensive relative to its own history or regional peers — Pakistani equities have often traded at a discount to regional markets.",
  },
  {
    id: "kse100-volatility",
    aliases: ["why is kse-100 volatile", "kse-100 risk profile"],
    category: "KSE-100",
    answer: "KSE-100 tends to be more volatile than developed-market indices, reflecting Pakistan's exposure to currency risk, political uncertainty, and the binary nature of news around IMF program progress.",
  },

  // ── Banking (additional) ─────────────────────────────────────────────────
  {
    id: "banking-advances-to-deposit-ratio",
    aliases: ["advances to deposit ratio meaning", "adr ratio banking pakistan"],
    category: "Banking",
    answer: "The Advances-to-Deposit Ratio (ADR) measures how much of a bank's deposits are lent out as loans versus parked in safer assets like government securities — a low ADR suggests banks are favoring government debt over private lending.",
  },
  {
    id: "banking-branchless-banking",
    aliases: ["branchless banking pakistan", "mobile wallet pakistan"],
    category: "Banking",
    answer: "Branchless banking (mobile wallets like JazzCash and Easypaisa) has expanded financial access in Pakistan significantly, letting users save, transfer, and pay without needing a traditional bank branch.",
  },

  // ── IMF (additional) ─────────────────────────────────────────────────────
  {
    id: "imf-staff-level-agreement",
    aliases: ["what is staff level agreement imf", "sla meaning imf pakistan"],
    category: "IMF",
    answer: "A Staff-Level Agreement (SLA) is a preliminary agreement between IMF staff and a country's government, which must still be approved by the IMF's Executive Board before any funds are disbursed.",
  },
  {
    id: "imf-program-completion",
    aliases: ["what happens when imf program ends", "imf program completion meaning"],
    category: "IMF",
    answer: "When an IMF program is successfully completed, the country has typically met its policy targets and may no longer need IMF financing, though some countries (like Pakistan) have repeatedly required new programs shortly after a previous one ends.",
  },

  // ── Macroeconomics (additional) ──────────────────────────────────────────
  {
    id: "macro-crowding-out",
    aliases: ["what is crowding out economics", "crowding out effect meaning"],
    category: "Macroeconomics",
    answer: "Crowding out occurs when increased government borrowing pushes up interest rates or absorbs available credit, leaving less financing available (or more expensive financing) for private sector investment.",
  },
  {
    id: "macro-economic-indicators-list",
    aliases: ["list of key economic indicators", "what economic indicators should I watch"],
    category: "Macroeconomics",
    answer: "Key economic indicators include GDP growth, inflation (CPI), unemployment, the policy interest rate, the trade/current account balance, foreign reserves, and the exchange rate — together giving a broad picture of economic health.",
  },
  {
    id: "macro-economic-cycle-indicators",
    aliases: ["how to tell where we are in the business cycle", "recession indicators to watch"],
    category: "Macroeconomics",
    answer: "Signs of a slowing business cycle include falling industrial output (LSM), rising unemployment, slowing credit growth, an inverted yield curve, and declining business/consumer confidence surveys.",
  },

  // ── Investing Basics (additional) ────────────────────────────────────────
  {
    id: "investing-inflation-hedge-assets",
    aliases: ["best inflation hedge investments", "how to protect savings from inflation"],
    category: "Investing Basics",
    answer: "Common inflation hedges include real assets like real estate and gold, inflation-linked bonds, and equities of companies with strong pricing power — though no hedge is perfect in every inflation environment.",
  },
  {
    id: "investing-liquidity",
    aliases: ["what is liquidity in investing", "liquid vs illiquid assets"],
    category: "Investing Basics",
    answer: "Liquidity refers to how quickly and easily an asset can be converted to cash without a significant loss in value — cash and listed stocks are highly liquid, while real estate is relatively illiquid.",
  },
  {
    id: "investing-behavioral-biases",
    aliases: ["common investing mistakes", "behavioral biases in investing"],
    category: "Investing Basics",
    answer: "Common investing mistakes include panic-selling during downturns, chasing recent performance, overconfidence, and lack of diversification — awareness of these behavioral biases can improve long-term outcomes.",
  },
  {
    id: "investing-net-worth",
    aliases: ["what is net worth", "how to calculate net worth"],
    category: "Investing Basics",
    answer: "Net worth is the total value of your assets (savings, investments, property) minus your liabilities (debts) — a useful overall measure of financial position beyond just income.",
  },

  // ── Pakistan Economy (additional) ────────────────────────────────────────
  {
    id: "pk-economy-power-sector-reform",
    aliases: ["power sector reform pakistan", "electricity tariff reform pakistan"],
    category: "Pakistan Economy",
    answer: "Power sector reform efforts in Pakistan focus on reducing transmission losses, adjusting tariffs to reflect true costs, improving bill recovery, and tackling circular debt — all recurring IMF program priorities.",
  },
  {
    id: "pk-economy-real-estate",
    aliases: ["real estate sector pakistan economy", "property market pakistan"],
    category: "Pakistan Economy",
    answer: "Real estate is a major store of wealth in Pakistan and a significant economic sector, though it's also been associated with undocumented (informal) money flows, prompting periodic regulatory tightening.",
  },
  {
    id: "pk-economy-sme-sector",
    aliases: ["small and medium enterprises pakistan", "sme financing pakistan"],
    category: "Pakistan Economy",
    answer: "Small and Medium Enterprises (SMEs) make up a large share of Pakistan's private sector employment but often struggle with access to formal bank financing, prompting targeted SBP refinance schemes.",
  },
  {
    id: "pk-economy-agriculture-water",
    aliases: ["water scarcity pakistan agriculture", "irrigation challenges pakistan"],
    category: "Pakistan Economy",
    answer: "Water scarcity and aging irrigation infrastructure are long-term risks to Pakistan's agriculture sector, which relies heavily on the Indus river system for crop production.",
  },
  {
    id: "pk-economy-demographic-dividend",
    aliases: ["pakistan demographic dividend", "young population economic opportunity pakistan"],
    category: "Pakistan Economy",
    answer: "Pakistan's young population is often described as a potential 'demographic dividend' — a large working-age workforce that could drive growth if matched with sufficient education, skills training, and job creation.",
  },
  {
    id: "pk-economy-remittance-vs-export-comparison",
    aliases: ["remittances vs exports pakistan comparison", "which is bigger remittances or exports"],
    category: "Pakistan Economy",
    answer: "Pakistan's annual remittance inflows are typically comparable to or exceed total goods exports, underscoring how central overseas worker income is to the country's foreign exchange position.",
  },
  {
    id: "pk-economy-currency-history-pegs",
    aliases: ["pakistan currency peg history", "when did pakistan float the rupee"],
    category: "Pakistan Economy",
    answer: "Pakistan moved from a managed/pegged exchange rate system toward greater flexibility over time, with a more fully market-determined approach adopted in recent years partly under IMF program conditions.",
  },
  {
    id: "pk-economy-inflation-poverty-link",
    aliases: ["inflation and poverty pakistan", "how inflation hurts poor people"],
    category: "Pakistan Economy",
    answer: "High inflation disproportionately hurts lower-income households in Pakistan, who spend a larger share of income on food and energy — the items most exposed to price spikes.",
  },
  {
    id: "pk-economy-budget-process",
    aliases: ["how is pakistan budget made", "federal budget process pakistan"],
    category: "Pakistan Economy",
    answer: "Pakistan's federal budget is prepared by the Ministry of Finance and presented annually to Parliament, outlining planned revenue, expenditure, and the resulting fiscal deficit for the coming fiscal year (July-June).",
  },
  {
    id: "pk-economy-nfc-award",
    aliases: ["what is nfc award pakistan", "national finance commission meaning"],
    category: "Pakistan Economy",
    answer: "The National Finance Commission (NFC) Award determines how federal tax revenue is distributed between the federal government and the four provinces, a politically significant formula reviewed periodically.",
  },
  {
    id: "pk-economy-textile-policy",
    aliases: ["textile policy pakistan", "textile export incentives"],
    category: "Pakistan Economy",
    answer: "Pakistan has periodically introduced textile-specific policies — energy subsidies, tax exemptions, financing schemes — aiming to maintain the sector's export competitiveness against regional rivals.",
  },
  {
    id: "pk-economy-overseas-investment-schemes",
    aliases: ["roshan digital account overview", "naya pakistan certificates"],
    category: "Pakistan Economy",
    answer: "Pakistan has launched schemes like Roshan Digital Accounts and Naya Pakistan Certificates to attract overseas Pakistanis' savings into formal investment and foreign currency deposit instruments.",
  },
  {
    id: "pk-economy-import-substitution-history",
    aliases: ["pakistan import substitution policy history", "local manufacturing push pakistan"],
    category: "Pakistan Economy",
    answer: "Pakistan has periodically pursued import substitution policies — promoting local production of items like edible oil, fertilizer, and automobiles — to reduce foreign currency outflows, with mixed long-term success.",
  },
  {
    id: "pk-economy-fdi-vs-portfolio-flows",
    aliases: ["pakistan fdi vs hot money", "stability of capital flows pakistan"],
    category: "Pakistan Economy",
    answer: "Pakistan has historically attracted more stable, long-term FDI alongside smaller, more volatile portfolio ('hot money') inflows into bonds/stocks — the latter can reverse quickly during periods of risk aversion.",
  },
  {
    id: "pk-economy-current-imf-program-status",
    aliases: ["is pakistan currently in an imf program", "latest imf program pakistan status"],
    category: "Pakistan Economy",
    answer: "Pakistan's IMF program status changes over time as reviews are completed or new arrangements are negotiated — check the dashboard's News & Intelligence section or ask about 'IMF' for the latest tagged headlines.",
  },
  {
    id: "pk-economy-credit-rating-trend",
    aliases: ["pakistan credit rating trend", "has pakistan credit rating improved"],
    category: "Pakistan Economy",
    answer: "Pakistan's sovereign credit rating has moved between deep speculative-grade lows (during crisis periods) and modest upgrades when stabilization programs show progress, directly affecting its international borrowing costs.",
  },
  {
    id: "pk-economy-export-processing-zones",
    aliases: ["export processing zones pakistan", "epz meaning"],
    category: "Pakistan Economy",
    answer: "Export Processing Zones (EPZs) offer tax and regulatory incentives for businesses focused on producing goods for export, aiming to boost Pakistan's manufacturing export base.",
  },
  {
    id: "pk-economy-public-private-partnership",
    aliases: ["public private partnership pakistan infrastructure", "ppp infrastructure projects"],
    category: "Pakistan Economy",
    answer: "Public-Private Partnerships (PPPs) let the government collaborate with private investors to fund infrastructure projects (roads, power plants), sharing costs and risks rather than relying solely on public borrowing.",
  },
  {
    id: "pk-economy-remittance-policy-incentives",
    aliases: ["government incentives for remittances pakistan", "why send remittances through banks"],
    category: "Pakistan Economy",
    answer: "Pakistan has used incentive schemes (rebates, tax exemptions, preferential exchange rates at times) to encourage remittances through formal banking channels rather than informal hawala/hundi networks.",
  },
  {
    id: "pk-economy-agri-credit",
    aliases: ["agricultural credit pakistan", "farm loans pakistan"],
    category: "Pakistan Economy",
    answer: "SBP sets indicative agricultural credit disbursement targets for banks to ensure farmers have access to financing for seeds, fertilizer, and equipment, supporting productivity in the sector.",
  },
  {
    id: "pk-economy-textile-value-chain",
    aliases: ["textile value chain pakistan", "raw cotton vs finished garments exports"],
    category: "Pakistan Economy",
    answer: "Pakistan's textile exports have gradually shifted up the value chain — from raw cotton and yarn toward finished garments and home textiles — though further value-addition remains a policy priority.",
  },
  {
    id: "pk-economy-population-census",
    aliases: ["pakistan census results", "pakistan population latest count"],
    category: "Pakistan Economy",
    answer: "Pakistan's periodic national census provides updated population figures used for resource allocation (including the NFC Award formula) and economic planning, though census timing and methodology have at times been contested.",
  },
  {
    id: "pk-economy-poverty-rate",
    aliases: ["pakistan poverty rate", "how many people are poor in pakistan"],
    category: "Pakistan Economy",
    answer: "Poverty rate estimates for Pakistan vary by methodology and threshold used, but a meaningful share of the population lives below the poverty line, with rates worsening during high-inflation, low-growth periods.",
  },
  {
    id: "pk-economy-social-safety-nets",
    aliases: ["benazir income support programme", "bisp pakistan social safety net"],
    category: "Pakistan Economy",
    answer: "The Benazir Income Support Programme (BISP) is Pakistan's main cash-transfer social safety net, providing direct financial support to low-income households, often expanded during economic stress periods.",
  },
  {
    id: "pk-economy-energy-mix",
    aliases: ["pakistan energy mix sources", "pakistan electricity generation sources"],
    category: "Pakistan Economy",
    answer: "Pakistan's electricity generation mix includes thermal (gas, oil, coal), hydropower, nuclear, and a growing share of renewables (solar, wind), with the mix affecting both generation costs and import dependence.",
  },
  {
    id: "pk-economy-trade-agreements",
    aliases: ["pakistan free trade agreements", "pakistan china free trade agreement"],
    category: "Pakistan Economy",
    answer: "Pakistan has trade agreements with countries like China and within regional frameworks, aiming to boost export market access, though the trade balance with China specifically remains heavily in China's favor.",
  },
  {
    id: "pk-economy-inflation-vs-growth-tradeoff",
    aliases: ["inflation vs growth tradeoff pakistan", "why does fighting inflation slow growth"],
    category: "Pakistan Economy",
    answer: "Pakistan's policymakers regularly face a tradeoff: raising interest rates to fight inflation also slows growth and raises borrowing costs, while cutting rates too soon risks reigniting price pressure and currency weakness.",
  },

  // ── Additional cross-category coverage ──────────────────────────────────
  {
    id: "sukuk-global-market-size",
    aliases: ["global sukuk market size", "is sukuk popular worldwide"],
    category: "Sukuk",
    answer: "The global sukuk market has grown substantially over the past two decades, led by issuers in Malaysia, Saudi Arabia, and the GCC, with Pakistan being a smaller but active participant.",
  },
  {
    id: "yield-curve-credit-spread",
    aliases: ["what is credit spread bonds", "credit spread meaning"],
    category: "Yield Curves",
    answer: "Credit spread is the extra yield investors demand for holding a riskier bond over a comparable risk-free government bond, compensating for the additional default risk.",
  },
  {
    id: "tbills-vs-savings-account",
    aliases: ["t-bills vs savings account returns", "which is better t-bill or bank deposit"],
    category: "Treasury Bills",
    answer: "T-Bills often offer competitive or higher returns than standard bank savings accounts during high-rate periods, though savings accounts offer more flexibility/liquidity for accessing funds anytime.",
  },
  {
    id: "pibs-real-return",
    aliases: ["pib real return after inflation", "are pibs a good investment during high inflation"],
    category: "PIBs",
    answer: "PIB real returns can turn negative if inflation runs above the bond's fixed yield, which is why investors watch inflation expectations closely when deciding on long-duration fixed-rate PIBs.",
  },
  {
    id: "etf-tracking-error",
    aliases: ["what is etf tracking error", "tracking error meaning"],
    category: "ETFs",
    answer: "Tracking error measures how closely an ETF's performance matches its target index — a lower tracking error means the fund is doing a better job replicating the index it's designed to follow.",
  },
  {
    id: "mutual-funds-redemption",
    aliases: ["how to redeem mutual fund units", "mutual fund redemption process pakistan"],
    category: "Mutual Funds",
    answer: "Redeeming mutual fund units means selling them back to the fund at the current NAV, with proceeds typically credited to the investor's bank account within a few business days depending on the fund type.",
  },
  {
    id: "banking-treasury-operations",
    aliases: ["what does a bank treasury department do", "bank treasury function"],
    category: "Banking",
    answer: "A bank's treasury department manages its liquidity, interest rate risk, and investment portfolio (including government securities), playing a central role in overall bank profitability.",
  },
  {
    id: "imf-pakistan-2023-program",
    aliases: ["pakistan 2023 imf stand-by arrangement", "what was the 2023 imf deal"],
    category: "IMF",
    answer: "In 2023, Pakistan secured a Stand-By Arrangement with the IMF after a severe reserves crisis, providing critical bridge financing tied to fiscal and energy sector reforms.",
  },
  {
    id: "world-bank-pakistan-education",
    aliases: ["world bank education projects pakistan", "world bank health projects pakistan"],
    category: "World Bank",
    answer: "The World Bank has funded major education and health sector projects in Pakistan, aiming to improve school enrollment, learning outcomes, and access to basic health services.",
  },
  {
    id: "macro-okuns-law",
    aliases: ["what is okun's law", "okuns law meaning"],
    category: "Macroeconomics",
    answer: "Okun's Law describes an empirical relationship between unemployment and GDP growth — roughly, for every 1% rise in unemployment above its natural rate, GDP tends to fall by a multiple of that amount below potential.",
  },
  {
    id: "investing-systematic-investment-plan",
    aliases: ["what is a systematic investment plan", "sip mutual fund meaning"],
    category: "Investing Basics",
    answer: "A Systematic Investment Plan (SIP) lets investors contribute a fixed amount regularly (e.g., monthly) into a mutual fund, building wealth gradually while smoothing out market timing risk.",
  },
  {
    id: "gdp-services-exports-share",
    aliases: ["services exports share of gdp pakistan", "are service exports growing"],
    category: "GDP",
    answer: "Services exports (including IT, telecom, and business services) remain a smaller share of Pakistan's GDP and exports than goods, but they have been among the fastest-growing categories in recent years.",
  },
  {
    id: "inflation-administered-energy-adjustments",
    aliases: ["fuel price adjustment pakistan", "monthly petrol price revision"],
    category: "Inflation",
    answer: "Pakistan revises domestic fuel prices periodically (often monthly) in line with global oil prices and exchange rate movements, which can cause visible jumps in transport-related inflation.",
  },
  {
    id: "exchange-rate-real-vs-nominal",
    aliases: ["real exchange rate vs nominal exchange rate", "nominal exchange rate meaning", "what is a real exchange rate"],
    category: "Exchange Rates",
    answer: "The nominal exchange rate is the simple market quote (like USD/PKR). The real exchange rate adjusts this for relative inflation between countries, giving a better sense of true competitiveness.",
  },
  {
    id: "gov-debt-maturity-profile",
    aliases: ["debt maturity profile pakistan", "short term vs long term government debt"],
    category: "Government Debt",
    answer: "Pakistan's domestic debt has historically skewed toward shorter maturities (heavy reliance on T-Bills), creating frequent refinancing needs and exposure to interest rate changes — a focus area for debt management reform.",
  },
  {
    id: "fiscal-deficit-development-vs-current-spending",
    aliases: ["development spending vs current spending pakistan", "pakistan budget current vs development expenditure"],
    category: "Fiscal Deficit",
    answer: "Government spending is typically split into current expenditure (debt servicing, defense, salaries — largely fixed) and development expenditure (infrastructure, social programs) — development spending is often cut first when fiscal space is tight.",
  },
  {
    id: "current-account-import-cover-relationship",
    aliases: ["current account deficit and reserves relationship", "how cad affects reserves"],
    category: "Current Account",
    answer: "An unfinanced current account deficit directly drains foreign reserves, since the gap between what flows in and out must be covered somehow — typically by drawing down the central bank's reserve buffer.",
  },
  {
    id: "remittances-and-gdp-share",
    aliases: ["remittances as percentage of gdp pakistan", "how much of gdp is remittances"],
    category: "Remittances",
    answer: "Remittances typically account for roughly 7-9% of Pakistan's GDP, an unusually high share by global standards, underscoring the economy's reliance on overseas worker income.",
  },
  {
    id: "fdi-vs-remittances-stability",
    aliases: ["are remittances more stable than fdi", "why remittances are preferred over hot money"],
    category: "FDI",
    answer: "Remittances tend to be more stable and resilient during crises than FDI or portfolio flows, since they're driven by family support motives rather than pure investment return-seeking.",
  },
  {
    id: "kmi30-dividend-considerations",
    aliases: ["kmi-30 dividend purification", "islamic investing dividend cleansing"],
    category: "KMI-30",
    answer: "Shariah-compliant investing sometimes requires 'purifying' a small portion of dividend income derived from incidental non-compliant activity within an otherwise eligible company, donating that portion to charity.",
  },
];

// ── Phase 2 expansion: new topics ───────────────────────────────────────────
// Each entry below uses buildAliases() for broad template coverage plus a
// handful of hand-curated extras for phrasing a template can't predict.
const NEW_ENTRIES: KnowledgeEntry[] = [
  // ── Crypto ───────────────────────────────────────────────────────────────
  {
    id: "crypto-bitcoin-what-is",
    aliases: buildAliases(["bitcoin", "btc"], ["what is cryptocurrency bitcoin", "who created bitcoin"]),
    category: "Crypto",
    answer: "Bitcoin is a decentralized digital currency that runs on a public ledger (the blockchain) without a central bank or single administrator, created in 2009 by the pseudonymous Satoshi Nakamoto. It can be sent peer-to-peer without an intermediary like a bank.",
  },
  {
    id: "crypto-bitcoin-how-works",
    aliases: buildAliases(["how bitcoin works", "how does bitcoin transaction work"]),
    category: "Crypto",
    answer: "Bitcoin transactions are broadcast to a global network of computers (nodes), verified by miners solving cryptographic puzzles, and permanently recorded on the blockchain — a shared, tamper-resistant ledger that everyone on the network can verify.",
  },
  {
    id: "crypto-bitcoin-mining",
    aliases: buildAliases(["bitcoin mining", "crypto mining"], ["how does bitcoin mining work", "what do bitcoin miners do"]),
    category: "Crypto",
    answer: "Bitcoin mining is the process of using computing power to solve complex puzzles that validate transactions and add new blocks to the blockchain. Miners are rewarded with newly created Bitcoin and transaction fees for their work.",
  },
  {
    id: "crypto-bitcoin-halving",
    aliases: buildAliases(["bitcoin halving"], ["what is the bitcoin halving event"]),
    category: "Crypto",
    answer: "Bitcoin halving is a pre-programmed event (roughly every four years) that cuts the reward miners receive for validating blocks in half, slowing the rate of new Bitcoin creation and reinforcing its capped 21 million coin supply.",
  },
  {
    id: "crypto-bitcoin-pakistan-legal",
    aliases: ["is bitcoin legal in pakistan", "is cryptocurrency legal in pakistan", "can i buy bitcoin in pakistan", "crypto regulation pakistan", "sbp stance on cryptocurrency", "is crypto banned in pakistan"],
    category: "Crypto",
    answer: "Cryptocurrency is not officially recognized as legal tender in Pakistan, and SBP has historically warned against its use, though the government has explored regulatory frameworks for digital assets. Always check the latest SBP and SECP guidance before transacting.",
  },
  {
    id: "crypto-bitcoin-volatility",
    aliases: buildAliases(["bitcoin volatility", "crypto volatility"], ["why is bitcoin price so volatile"]),
    category: "Crypto",
    answer: "Bitcoin and other cryptocurrencies are known for large, rapid price swings, driven by relatively thin liquidity compared to traditional markets, speculative trading, regulatory news, and shifting investor sentiment.",
  },
  {
    id: "crypto-ethereum-what-is",
    aliases: buildAliases(["ethereum", "eth"], ["what is ether cryptocurrency"]),
    category: "Crypto",
    answer: "Ethereum is a decentralized blockchain platform that supports smart contracts — self-executing code — enabling applications beyond simple payments, such as decentralized finance (DeFi) and NFTs. Its native currency is Ether (ETH).",
  },
  {
    id: "crypto-ethereum-vs-bitcoin",
    aliases: ["ethereum vs bitcoin", "difference between ethereum and bitcoin", "eth vs btc", "is ethereum better than bitcoin"],
    category: "Crypto",
    answer: "Bitcoin was designed primarily as a digital currency and store of value. Ethereum was designed as a programmable platform supporting smart contracts and decentralized applications, with Ether used to pay for computation on the network.",
  },
  {
    id: "crypto-smart-contracts",
    aliases: buildAliases(["smart contract", "smart contracts"], ["how do smart contracts work"]),
    category: "Crypto",
    answer: "A smart contract is self-executing code stored on a blockchain that automatically carries out agreed terms when conditions are met, without needing a third party to enforce the agreement.",
  },
  {
    id: "crypto-ethereum-gas-fees",
    aliases: buildAliases(["gas fees", "ethereum gas fees"], ["why are ethereum fees so high"]),
    category: "Crypto",
    answer: "Gas fees are the transaction costs paid to process operations on the Ethereum network, varying with network congestion — more demand for block space means higher fees, similar to a real-time auction for computing resources.",
  },
  {
    id: "crypto-proof-of-stake",
    aliases: buildAliases(["proof of stake", "proof of work"], ["proof of stake vs proof of work"]),
    category: "Crypto",
    answer: "Proof of Work (used by Bitcoin) secures a blockchain through energy-intensive computational puzzles. Proof of Stake (used by Ethereum since 2022) instead has validators lock up ('stake') cryptocurrency as collateral to validate transactions, using far less energy.",
  },
  {
    id: "crypto-stablecoin-what-is",
    aliases: buildAliases(["stablecoin", "stablecoins"], ["what is a stablecoin cryptocurrency"]),
    category: "Crypto",
    answer: "A stablecoin is a cryptocurrency designed to maintain a stable value, typically pegged 1:1 to a fiat currency like the US Dollar, by holding reserves or using algorithmic mechanisms — used to reduce the volatility common in other cryptocurrencies.",
  },
  {
    id: "crypto-stablecoin-types",
    aliases: ["types of stablecoins", "fiat backed vs crypto backed stablecoin", "algorithmic stablecoin meaning"],
    category: "Crypto",
    answer: "Stablecoins are generally backed by fiat currency reserves (like USDC, USDT), backed by other crypto assets held as over-collateral, or algorithmically managed by smart contracts that adjust supply to maintain the peg.",
  },
  {
    id: "crypto-stablecoin-why-use",
    aliases: ["why use stablecoins", "benefits of stablecoins"],
    category: "Crypto",
    answer: "Stablecoins let crypto users move value, trade, or earn yield without exiting the crypto ecosystem entirely, while avoiding the sharp price swings of assets like Bitcoin or Ethereum.",
  },
  {
    id: "crypto-stablecoin-risks",
    aliases: ["stablecoin risks", "are stablecoins safe", "stablecoin depegging"],
    category: "Crypto",
    answer: "Stablecoin risks include the issuer not actually holding sufficient reserves, regulatory uncertainty, and 'depegging' — losing the 1:1 value relationship during periods of market stress, as has happened to several stablecoins historically.",
  },
  {
    id: "crypto-staking-what-is",
    aliases: buildAliases(["staking", "crypto staking"], ["what does staking mean in crypto"]),
    category: "Crypto",
    answer: "Staking means locking up cryptocurrency to help validate transactions on a Proof-of-Stake blockchain, in return for earning rewards — similar in spirit to earning interest on a deposit, but with different risks.",
  },
  {
    id: "crypto-staking-how-works",
    aliases: ["how does staking work", "how do i stake crypto"],
    category: "Crypto",
    answer: "Stakers lock their tokens with a validator (or run their own validator node), which participates in confirming transactions. In return, stakers earn a share of newly issued tokens or transaction fees, proportional to their stake.",
  },
  {
    id: "crypto-staking-risks",
    aliases: ["staking risks", "is staking crypto safe", "staking lock up period risk"],
    category: "Crypto",
    answer: "Staking risks include price volatility of the staked asset, lock-up periods that prevent quick withdrawal, validator/platform failure ('slashing'), and smart contract risk if staking through a third-party platform.",
  },
  {
    id: "crypto-defi-what-is",
    aliases: buildAliases(["defi", "decentralized finance"], ["what does defi stand for"]),
    category: "Crypto",
    answer: "DeFi (Decentralized Finance) refers to financial services — lending, borrowing, trading, earning interest — built on blockchain networks using smart contracts, operating without traditional banks or brokers as intermediaries.",
  },
  {
    id: "crypto-defi-vs-traditional",
    aliases: ["defi vs traditional finance", "defi vs banks"],
    category: "Crypto",
    answer: "Traditional finance relies on banks and regulated intermediaries to manage accounts, lending, and trading. DeFi automates these functions through smart contracts, offering more open access but with less regulatory protection and higher technical risk.",
  },
  {
    id: "crypto-defi-risks",
    aliases: ["defi risks", "is defi safe"],
    category: "Crypto",
    answer: "DeFi risks include smart contract bugs/exploits, lack of regulatory protection if something goes wrong, extreme price volatility of underlying tokens, and the complexity of safely managing private keys and wallets.",
  },
  {
    id: "crypto-blockchain-what-is",
    aliases: buildAliases(["blockchain"], ["what does blockchain mean", "how is blockchain different from a database"]),
    category: "Crypto",
    answer: "A blockchain is a distributed, tamper-resistant digital ledger that records transactions across many computers, with each new 'block' of data cryptographically linked to the previous one, making past records extremely difficult to alter.",
  },
  {
    id: "crypto-blockchain-vs-bitcoin",
    aliases: ["blockchain vs bitcoin", "is blockchain the same as bitcoin"],
    category: "Crypto",
    answer: "Bitcoin is one application built on blockchain technology. Blockchain itself is the broader underlying technology, which can be used for many purposes beyond cryptocurrency, like supply chain tracking or digital identity.",
  },
  {
    id: "crypto-blockchain-use-cases",
    aliases: ["blockchain use cases", "what is blockchain used for"],
    category: "Crypto",
    answer: "Beyond cryptocurrency, blockchain technology is used for supply chain tracking, digital identity verification, cross-border payments, tokenizing real-world assets, and recording ownership of digital items like NFTs.",
  },
  {
    id: "crypto-wallet-what-is",
    aliases: buildAliases(["crypto wallet", "cryptocurrency wallet"], ["what is a digital wallet for crypto"]),
    category: "Crypto",
    answer: "A crypto wallet is software or hardware that stores the private keys needed to access and manage cryptocurrency on the blockchain. It doesn't store the coins themselves — it stores the keys that prove ownership and authorize transactions.",
  },
  {
    id: "crypto-wallet-hot-vs-cold",
    aliases: ["hot wallet vs cold wallet", "what is a hot wallet", "what is a cold wallet"],
    category: "Crypto",
    answer: "A hot wallet is connected to the internet (convenient but more vulnerable to hacking). A cold wallet stores keys offline (like a hardware device), offering much stronger security for long-term holdings at the cost of convenience.",
  },
  {
    id: "crypto-wallet-custodial",
    aliases: ["custodial vs non-custodial wallet", "what is a custodial wallet"],
    category: "Crypto",
    answer: "A custodial wallet (like on an exchange) means a third party holds your private keys on your behalf. A non-custodial wallet means you alone control your private keys — more responsibility, but no reliance on a third party's solvency or security.",
  },
  {
    id: "crypto-wallet-security",
    aliases: ["how to secure a crypto wallet", "crypto wallet security tips"],
    category: "Crypto",
    answer: "Securing a crypto wallet typically involves using a hardware (cold) wallet for significant holdings, never sharing your private key or seed phrase, enabling two-factor authentication on exchange accounts, and being wary of phishing attempts.",
  },
  {
    id: "crypto-nft-what-is",
    aliases: buildAliases(["nft", "non fungible token"], ["what does nft stand for"]),
    category: "Crypto",
    answer: "An NFT (Non-Fungible Token) is a unique digital certificate of ownership recorded on a blockchain, often associated with digital art, collectibles, or other unique digital/physical assets — unlike cryptocurrencies, each NFT is distinct and not interchangeable.",
  },
  {
    id: "crypto-exchange-what-is",
    aliases: buildAliases(["crypto exchange", "cryptocurrency exchange"], ["how do crypto exchanges work"]),
    category: "Crypto",
    answer: "A crypto exchange is a platform where users can buy, sell, and trade cryptocurrencies, either through a centralized company (CEX) that holds custody of funds, or a decentralized exchange (DEX) that operates via smart contracts without a central custodian.",
  },
  {
    id: "crypto-market-cap",
    aliases: buildAliases(["crypto market cap", "cryptocurrency market capitalization"], ["how is crypto market cap calculated"]),
    category: "Crypto",
    answer: "Cryptocurrency market capitalization is calculated by multiplying a coin's current price by its total circulating supply, used to gauge the relative size of different cryptocurrencies.",
  },

  // ── Investing: Valuation Ratios & Metrics ───────────────────────────────
  {
    id: "investing-pe-ratio-what-is",
    aliases: buildAliases(["pe ratio", "price to earnings ratio", "p e ratio"], ["what does pe ratio mean in stocks"]),
    category: "Investing Basics",
    answer: "The P/E (Price-to-Earnings) ratio divides a company's share price by its earnings per share, showing how much investors are willing to pay for each rupee (or dollar) of a company's profit — a common, quick valuation gauge.",
  },
  {
    id: "investing-pe-ratio-calculate",
    aliases: ["how to calculate pe ratio", "pe ratio formula"],
    category: "Investing Basics",
    answer: "P/E ratio = Share Price ÷ Earnings Per Share (EPS). For example, a stock trading at 100 with an EPS of 10 has a P/E ratio of 10, meaning investors are paying 10 times the company's annual per-share earnings.",
  },
  {
    id: "investing-pe-ratio-high-vs-low",
    aliases: ["high pe ratio vs low pe ratio", "is a high pe ratio good or bad", "what is a good pe ratio"],
    category: "Investing Basics",
    answer: "A high P/E often suggests investors expect strong future growth (or that a stock is overvalued). A low P/E can suggest a stock is undervalued, or that the market has low growth expectations — context and industry comparison matter more than the number alone.",
  },
  {
    id: "investing-pe-ratio-limitations",
    aliases: ["pe ratio limitations", "problems with pe ratio"],
    category: "Investing Basics",
    answer: "P/E ratios can be distorted by one-off accounting items, don't account for debt levels, and aren't comparable across very different industries — analysts often use it alongside other metrics like P/B, EV/EBITDA, or DCF valuation.",
  },
  {
    id: "investing-eps-what-is",
    aliases: buildAliases(["eps", "earnings per share"], ["what does eps mean in stocks"]),
    category: "Investing Basics",
    answer: "EPS (Earnings Per Share) is a company's net profit divided by its number of outstanding shares, showing how much profit is attributable to each individual share — a key input for the P/E ratio and overall profitability analysis.",
  },
  {
    id: "investing-eps-calculate",
    aliases: ["how is eps calculated", "eps formula"],
    category: "Investing Basics",
    answer: "EPS = Net Profit ÷ Number of Outstanding Shares. A company earning 100 million profit with 10 million shares outstanding has an EPS of 10.",
  },
  {
    id: "investing-eps-diluted",
    aliases: ["eps vs diluted eps", "what is diluted eps"],
    category: "Investing Basics",
    answer: "Basic EPS uses the current number of outstanding shares. Diluted EPS accounts for the potential impact of convertible securities, stock options, or warrants if they were all converted into shares — diluted EPS is always equal to or lower than basic EPS.",
  },
  {
    id: "investing-roe-what-is",
    aliases: buildAliases(["roe", "return on equity"], ["what does roe mean"]),
    category: "Investing Basics",
    answer: "ROE (Return on Equity) measures how efficiently a company generates profit from shareholders' equity, calculated as Net Profit divided by Shareholders' Equity — a key gauge of management's effectiveness at using investor capital.",
  },
  {
    id: "investing-roe-calculate",
    aliases: ["how to calculate roe", "roe formula", "what is a good roe"],
    category: "Investing Basics",
    answer: "ROE = Net Profit ÷ Shareholders' Equity, usually expressed as a percentage. ROE above 15-20% is often considered strong, though what counts as 'good' varies significantly by industry.",
  },
  {
    id: "investing-roa-what-is",
    aliases: buildAliases(["roa", "return on assets"], ["what does roa mean"]),
    category: "Investing Basics",
    answer: "ROA (Return on Assets) measures how efficiently a company generates profit from its total assets, calculated as Net Profit divided by Total Assets — useful for comparing efficiency across capital-intensive businesses like banks.",
  },
  {
    id: "investing-roa-vs-roe",
    aliases: ["roa vs roe", "difference between roa and roe"],
    category: "Investing Basics",
    answer: "ROE measures returns relative to shareholders' equity alone, while ROA measures returns relative to ALL assets (including those funded by debt) — a company with high debt can have a much higher ROE than ROA.",
  },
  {
    id: "investing-dcf-what-is",
    aliases: buildAliases(["dcf", "discounted cash flow"], ["what does dcf stand for"]),
    category: "Investing Basics",
    answer: "DCF (Discounted Cash Flow) is a valuation method that estimates an investment's worth by projecting its future cash flows and discounting them back to today's value using a required rate of return.",
  },
  {
    id: "investing-dcf-how-works",
    aliases: ["how does dcf work", "dcf valuation method"],
    category: "Investing Basics",
    answer: "A DCF model forecasts a company's future free cash flows over several years, then discounts each year's cash flow back to present value using a discount rate (often the weighted average cost of capital), summing them to estimate intrinsic value.",
  },
  {
    id: "investing-dcf-limitations",
    aliases: ["dcf limitations", "problems with dcf valuation"],
    category: "Investing Basics",
    answer: "DCF valuations are highly sensitive to assumptions about growth rates and the discount rate used — small changes in these inputs can produce dramatically different valuations, making DCF more useful for framing a range than a precise number.",
  },
  {
    id: "investing-npv-what-is",
    aliases: buildAliases(["npv", "net present value"], ["what does npv mean"]),
    category: "Investing Basics",
    answer: "NPV (Net Present Value) is the difference between the present value of an investment's expected cash inflows and the present value of its cash outflows — a positive NPV suggests an investment is expected to add value.",
  },
  {
    id: "investing-npv-calculate",
    aliases: ["how to calculate npv", "npv formula"],
    category: "Investing Basics",
    answer: "NPV is calculated by discounting each period's expected cash flow back to today's value using a chosen discount rate, then summing them and subtracting the initial investment cost.",
  },
  {
    id: "investing-irr-what-is",
    aliases: buildAliases(["irr", "internal rate of return"], ["what does irr mean"]),
    category: "Investing Basics",
    answer: "IRR (Internal Rate of Return) is the discount rate at which an investment's NPV equals zero — essentially, the annualized rate of return the investment is expected to generate.",
  },
  {
    id: "investing-irr-vs-npv",
    aliases: ["irr vs npv", "difference between irr and npv", "irr vs roi"],
    category: "Investing Basics",
    answer: "NPV gives a dollar/rupee value of expected profit. IRR gives a percentage rate of return. Both are used together in capital budgeting decisions — NPV is generally considered more reliable when comparing investments of different sizes.",
  },
  {
    id: "investing-risk-what-is",
    aliases: buildAliases(["investment risk", "financial risk"], ["what is risk in investing"]),
    category: "Investing Basics",
    answer: "Investment risk is the chance that an investment's actual return will differ from its expected return, including the possibility of losing some or all of the invested capital.",
  },
  {
    id: "investing-return-what-is",
    aliases: buildAliases(["investment return", "rate of return"], ["what is return in investing"]),
    category: "Investing Basics",
    answer: "Investment return is the gain or loss generated on an investment relative to the amount invested, usually expressed as a percentage, and can come from price appreciation, dividends, or interest.",
  },
  {
    id: "investing-market-order-vs-limit",
    aliases: buildAliases(["market order", "limit order"], ["market order vs limit order", "what is a stop loss order"]),
    category: "Investing Basics",
    answer: "A market order executes immediately at the best available price. A limit order only executes at a specified price or better. A stop-loss order automatically sells a position if it falls to a set price, limiting downside risk.",
  },
  {
    id: "investing-bid-ask-spread",
    aliases: buildAliases(["bid ask spread", "bid price vs ask price"], ["what is the spread in trading"]),
    category: "Investing Basics",
    answer: "The bid price is what buyers are willing to pay; the ask price is what sellers are willing to accept. The bid-ask spread is the difference between them, and a narrower spread generally indicates a more liquid, actively traded security.",
  },

  // ── PSX mechanics ────────────────────────────────────────────────────────
  {
    id: "psx-market-cap-general",
    aliases: buildAliases(["market capitalization", "market cap"], ["how is market cap calculated", "what does market cap mean for a stock"]),
    category: "PSX",
    answer: "Market capitalization is a company's total share price multiplied by its number of outstanding shares — it represents the total market value of a company's equity and is used to classify companies as large-cap, mid-cap, or small-cap.",
  },
  {
    id: "psx-free-float-general",
    aliases: buildAliases(["free float", "free float shares"], ["what does free float mean in stock market"]),
    category: "PSX",
    answer: "Free float refers to the portion of a company's shares that are freely available for public trading, excluding shares held by founders, government, or strategic/locked-in investors — indices like KSE-100 weight companies by free-float market cap, not total shares.",
  },
  {
    id: "psx-dividends-general",
    aliases: buildAliases(["dividend", "dividends"], ["what is a dividend", "how do dividends work", "dividend yield meaning stocks"]),
    category: "PSX",
    answer: "A dividend is a portion of a company's profit distributed to shareholders, usually in cash, as a reward for holding the stock. Dividend yield is the annual dividend per share divided by the current share price.",
  },
  {
    id: "psx-dividend-types",
    aliases: ["cash dividend vs stock dividend", "interim dividend vs final dividend"],
    category: "PSX",
    answer: "A cash dividend pays shareholders in cash; a stock dividend issues additional shares instead. An interim dividend is declared during the financial year, while a final dividend is declared after annual results and approved by shareholders.",
  },
  {
    id: "psx-bonus-shares-what-are",
    aliases: buildAliases(["bonus shares", "bonus issue"], ["what does bonus shares mean", "how do bonus shares work"]),
    category: "PSX",
    answer: "Bonus shares are additional shares a company issues to existing shareholders for free, in proportion to their current holdings (e.g., a 1:5 bonus issue gives 1 new share for every 5 held), typically funded from retained earnings rather than cash.",
  },
  {
    id: "psx-bonus-shares-effect",
    aliases: ["do bonus shares increase wealth", "bonus shares vs dividend", "effect of bonus shares on share price"],
    category: "PSX",
    answer: "Bonus shares increase the number of shares an investor holds but proportionally reduce the share price (since the company's total value is unchanged) — they don't directly create new wealth, but can signal management confidence and improve trading liquidity.",
  },
  {
    id: "psx-bonus-shares-tax",
    aliases: ["are bonus shares taxed in pakistan", "bonus shares tax treatment pakistan"],
    category: "PSX",
    answer: "In Pakistan, bonus shares issued by companies have historically been subject to specific tax treatment under the Income Tax Ordinance — rules have changed over time, so investors should check current FBR guidance before assuming tax-free status.",
  },
  {
    id: "psx-rights-shares-what-are",
    aliases: buildAliases(["rights shares", "rights issue"], ["what does rights issue mean", "how do rights shares work"]),
    category: "PSX",
    answer: "A rights issue gives existing shareholders the right (not obligation) to buy additional new shares, usually at a discount to the market price, in proportion to their current holding — used by companies to raise fresh capital.",
  },
  {
    id: "psx-rights-shares-decision",
    aliases: ["should i subscribe to rights shares", "what happens if i dont subscribe to rights issue"],
    category: "PSX",
    answer: "Shareholders who don't subscribe to a rights issue see their percentage ownership diluted as new shares are issued to other participants; some companies allow renouncing/selling rights entitlements to other investors instead.",
  },
  {
    id: "psx-rights-vs-bonus",
    aliases: ["rights shares vs bonus shares", "difference between rights issue and bonus issue"],
    category: "PSX",
    answer: "Bonus shares are issued free of cost from retained earnings. Rights shares are offered for purchase (usually at a discount) and raise fresh capital for the company — bonus shares don't raise new money, rights issues do.",
  },
  {
    id: "psx-ipo-process",
    aliases: buildAliases(["ipo", "initial public offering"], ["how does an ipo work", "ipo process pakistan"]),
    category: "PSX",
    answer: "An IPO (Initial Public Offering) is when a private company sells shares to the public for the first time, becoming a publicly listed company. In Pakistan, this involves SECP approval, a prospectus, and typically a combination of book-building and fixed-price subscription.",
  },
  {
    id: "psx-ipo-oversubscription",
    aliases: buildAliases(["ipo oversubscription", "ipo book building"], ["what does ipo oversubscribed mean"]),
    category: "PSX",
    answer: "An IPO is 'oversubscribed' when investor demand for shares exceeds the number being offered, often leading to pro-rata allotment. Book-building is the process of gauging institutional investor demand to help set the final IPO price.",
  },
  {
    id: "psx-trading-basics-account",
    aliases: buildAliases(["how to start trading on psx", "psx trading account"], ["how to open a brokerage account in pakistan"]),
    category: "PSX",
    answer: "To trade on PSX, you open an account with a SECP-licensed broker, complete CDC (Central Depository Company) sub-account registration for holding shares electronically, fund the account, and then place buy/sell orders through the broker's trading platform.",
  },
  {
    id: "psx-trading-basics-lot-size",
    aliases: ["psx minimum lot size", "can i buy one share on psx"],
    category: "PSX",
    answer: "PSX generally allows trading in board lots, though odd-lot trading for smaller quantities is also supported on most platforms — minimums and lot conventions can vary slightly by broker and instrument.",
  },
  {
    id: "psx-trading-basics-order-types",
    aliases: ["psx order types", "good till cancelled order meaning"],
    category: "PSX",
    answer: "PSX trading platforms typically support market orders (execute immediately), limit orders (execute at a specified price), and day or good-till-cancelled (GTC) order durations, similar to other modern exchanges.",
  },
  {
    id: "psx-trading-basics-settlement-risk",
    aliases: ["psx settlement risk", "what happens if a trade fails to settle"],
    category: "PSX",
    answer: "PSX trades settle through NCCPL on a T+2 basis. Settlement risk (the chance a counterparty fails to deliver shares or payment) is mitigated through NCCPL's clearing and guarantee mechanisms.",
  },

  // ── Bonds: face value, callable/putable ─────────────────────────────────
  {
    id: "bonds-face-value-what-is",
    aliases: buildAliases(["face value", "par value", "face value of a bond"], ["what does face value mean in bonds"]),
    category: "Bonds",
    answer: "Face value (or par value) is the amount a bond will be worth at maturity, and the amount on which coupon interest is calculated — it's not necessarily what an investor pays, since bonds can trade above or below face value in the secondary market.",
  },
  {
    id: "bonds-face-value-vs-market-price",
    aliases: ["face value vs market price bond", "why does bond price differ from face value"],
    category: "Bonds",
    answer: "A bond's market price fluctuates with interest rates and credit perception, while its face value stays fixed. A bond trading above face value is at a 'premium'; below face value is at a 'discount.'",
  },
  {
    id: "bonds-callable-what-are",
    aliases: buildAliases(["callable bond", "callable bonds"], ["what does callable bond mean"]),
    category: "Bonds",
    answer: "A callable bond gives the ISSUER the right to repay (redeem) the bond before its maturity date, usually after a set period — typically used when the issuer expects interest rates to fall, allowing them to refinance more cheaply later.",
  },
  {
    id: "bonds-callable-investor-risk",
    aliases: ["callable bond risk for investors", "why do callable bonds pay higher yield"],
    category: "Bonds",
    answer: "Callable bonds carry 'call risk' for investors — if rates fall, the issuer may redeem the bond early, forcing the investor to reinvest at lower prevailing rates. To compensate for this risk, callable bonds typically offer a higher yield than non-callable equivalents.",
  },
  {
    id: "bonds-putable-what-are",
    aliases: buildAliases(["putable bond", "putable bonds", "put bond"], ["what does putable bond mean"]),
    category: "Bonds",
    answer: "A putable bond gives the INVESTOR the right to sell the bond back to the issuer before maturity at a predetermined price — the opposite of a callable bond, giving the holder protection if interest rates rise or credit quality worsens.",
  },
  {
    id: "bonds-putable-vs-callable",
    aliases: ["putable vs callable bonds", "difference between callable and putable bonds"],
    category: "Bonds",
    answer: "A callable bond benefits the issuer (who can redeem early if it's favorable to them). A putable bond benefits the investor (who can demand early repayment if it's favorable to them) — putable bonds typically offer a lower yield since the option favors the buyer.",
  },

  // ── Banking: deposits, loans, credit risk ───────────────────────────────
  {
    id: "banking-deposits-what-are",
    aliases: buildAliases(["bank deposit", "deposits"], ["what is a bank deposit", "types of bank deposits pakistan"]),
    category: "Banking",
    answer: "A bank deposit is money placed into a bank account, which the bank can then lend out to others while paying the depositor interest. Common types include current accounts (no/low interest, fully liquid), savings accounts, and fixed/term deposits.",
  },
  {
    id: "banking-deposits-fixed-vs-savings",
    aliases: ["fixed deposit vs savings account", "term deposit meaning pakistan"],
    category: "Banking",
    answer: "A savings account offers easy access to funds with modest interest. A fixed (term) deposit locks funds for a set period in exchange for a higher, guaranteed interest rate, with penalties for early withdrawal.",
  },
  {
    id: "banking-loans-what-are",
    aliases: buildAliases(["bank loan", "loans"], ["what is a loan", "types of bank loans pakistan"]),
    category: "Banking",
    answer: "A bank loan is borrowed money that must be repaid with interest over an agreed period. Common types include personal loans, mortgages (house finance), auto loans, and business/working capital loans.",
  },
  {
    id: "banking-loans-secured-vs-unsecured",
    aliases: ["secured loan vs unsecured loan", "collateral meaning loan"],
    category: "Banking",
    answer: "A secured loan is backed by collateral (an asset the bank can claim if you default), typically offering lower interest rates. An unsecured loan has no collateral backing and usually carries higher interest rates to compensate for the bank's added risk.",
  },
  {
    id: "banking-credit-risk-what-is",
    aliases: buildAliases(["credit risk"], ["what is credit risk in banking", "default risk meaning loan"]),
    category: "Banking",
    answer: "Credit risk is the risk that a borrower fails to repay a loan as agreed, causing a loss for the lender. Banks manage credit risk through credit checks, collateral requirements, diversification, and loan provisioning.",
  },
  {
    id: "banking-credit-risk-assessment",
    aliases: ["how do banks assess credit risk", "credit score meaning"],
    category: "Banking",
    answer: "Banks assess credit risk using factors like income, repayment history, existing debt levels, collateral value, and credit bureau data, often summarized into a credit score that influences loan approval and pricing.",
  },
  {
    id: "banking-credit-risk-provisioning",
    aliases: ["loan loss provisioning meaning", "what is provisioning against npls"],
    category: "Banking",
    answer: "Loan loss provisioning is money a bank sets aside in advance to cover expected losses from loans that may not be repaid, directly reducing reported profit but cushioning the bank's balance sheet against bad debts.",
  },

  // ── Mutual Funds: asset allocation ──────────────────────────────────────
  {
    id: "mutual-funds-asset-allocation-what-are",
    aliases: buildAliases(["asset allocation fund", "balanced fund"], ["what is an asset allocation fund"]),
    category: "Mutual Funds",
    answer: "An asset allocation (or balanced) fund invests across multiple asset classes — typically a mix of equities, fixed income, and money market instruments — with the fund manager adjusting the mix based on market conditions, offering built-in diversification.",
  },
  {
    id: "mutual-funds-asset-allocation-vs-equity",
    aliases: ["asset allocation fund vs equity fund", "balanced fund vs pure equity fund"],
    category: "Mutual Funds",
    answer: "An equity fund invests almost entirely in stocks, carrying higher risk and higher potential return. An asset allocation fund spreads investments across stocks, bonds, and cash, generally offering a smoother, lower-volatility return profile.",
  },

  // ── SBP: liquidity, reserve requirements, currency management ──────────
  {
    id: "sbp-liquidity-what-is",
    aliases: buildAliases(["banking system liquidity", "money market liquidity"], ["what is liquidity in banking system pakistan"]),
    category: "SBP",
    answer: "Banking system liquidity refers to the amount of readily available cash/reserves banks hold to meet withdrawal demands and settle obligations. SBP manages system-wide liquidity through tools like open market operations to keep short-term rates near its policy target.",
  },
  {
    id: "sbp-liquidity-shortage",
    aliases: ["liquidity shortage banking system", "what happens when banks face a liquidity crunch"],
    category: "SBP",
    answer: "A liquidity shortage occurs when banks collectively don't have enough readily available funds to meet demand, pushing up short-term interbank rates — SBP responds by injecting liquidity through reverse repo operations or other tools.",
  },
  {
    id: "sbp-liquidity-injection-mop-up",
    aliases: ["liquidity injection meaning", "liquidity mop up meaning"],
    category: "SBP",
    answer: "A liquidity injection is when SBP adds funds to the banking system (e.g., via reverse repo) to ease a shortage. A liquidity 'mop-up' is the opposite — SBP withdraws excess funds (via repo) to prevent rates from falling too far below target.",
  },
  {
    id: "sbp-reserve-requirements-what-are",
    aliases: buildAliases(["reserve requirement", "cash reserve requirement"], ["what is crr cash reserve ratio", "what is slr statutory liquidity ratio"]),
    category: "SBP",
    answer: "Reserve requirements are the minimum percentage of deposits banks must hold in reserve (rather than lend out) — the Cash Reserve Requirement (CRR) must be held with SBP, while the Statutory Liquidity Requirement (SLR) can include approved liquid assets like government securities.",
  },
  {
    id: "sbp-reserve-requirements-purpose",
    aliases: ["why do reserve requirements exist", "purpose of cash reserve ratio"],
    category: "SBP",
    answer: "Reserve requirements ensure banks maintain a buffer to meet depositor withdrawals and give the central bank a tool to influence how much money banks can lend — raising requirements tightens lending capacity; lowering them eases it.",
  },
  {
    id: "sbp-currency-management-what-is",
    aliases: buildAliases(["currency management", "currency issuance"], ["who prints pakistani currency", "how is currency supply managed"]),
    category: "SBP",
    answer: "Currency management refers to SBP's responsibility for issuing and managing the supply of Pakistani Rupee banknotes and coins, ensuring enough currency is in circulation to meet the economy's needs while supporting overall monetary policy goals.",
  },
  {
    id: "sbp-currency-management-printing-inflation",
    aliases: ["does printing money cause inflation", "currency printing and inflation pakistan"],
    category: "SBP",
    answer: "Printing significantly more currency than the economy's real output growth justifies can fuel inflation, since more money chasing the same amount of goods pushes prices up — this is why SBP's lending to the government is legally restricted.",
  },
  {
    id: "sbp-monetary-policy-general",
    aliases: buildAliases(["monetary policy"], ["what is monetary policy", "monetary policy tools"]),
    category: "SBP",
    answer: "Monetary policy is a central bank's use of tools — primarily interest rates, but also reserve requirements and open market operations — to influence inflation, employment, and overall economic activity.",
  },
  {
    id: "sbp-monetary-policy-expansionary-contractionary",
    aliases: ["expansionary vs contractionary monetary policy", "what is expansionary monetary policy", "what is contractionary monetary policy"],
    category: "SBP",
    answer: "Expansionary monetary policy lowers interest rates or increases money supply to stimulate growth. Contractionary monetary policy raises rates or reduces money supply to cool inflation — SBP has used the latter aggressively during Pakistan's recent inflation crises.",
  },

  // ── General Economics: supply, demand, productivity, unemployment ──────
  {
    id: "econ-supply-what-is",
    aliases: buildAliases(["supply", "economic supply"], ["what is supply in economics", "law of supply"]),
    category: "Macroeconomics",
    answer: "Supply is the total quantity of a good or service that producers are willing and able to sell at a given price. The law of supply states that, generally, higher prices encourage producers to supply more.",
  },
  {
    id: "econ-demand-what-is",
    aliases: buildAliases(["demand", "economic demand"], ["what is demand in economics", "law of demand"]),
    category: "Macroeconomics",
    answer: "Demand is the total quantity of a good or service that buyers are willing and able to purchase at a given price. The law of demand states that, generally, higher prices reduce the quantity demanded.",
  },
  {
    id: "econ-supply-and-demand",
    aliases: ["supply and demand explained", "how supply and demand determine price", "what is equilibrium price"],
    category: "Macroeconomics",
    answer: "Supply and demand interact to determine market price: when demand exceeds supply, prices rise; when supply exceeds demand, prices fall. The point where supply and demand curves meet is the equilibrium price.",
  },
  {
    id: "econ-supply-demand-shifts",
    aliases: ["what shifts the supply curve", "what shifts the demand curve"],
    category: "Macroeconomics",
    answer: "The demand curve shifts due to changes in income, preferences, or prices of related goods. The supply curve shifts due to changes in production costs, technology, or the number of suppliers in the market.",
  },
  {
    id: "econ-productivity-what-is",
    aliases: buildAliases(["productivity", "economic productivity"], ["what is labor productivity", "why does productivity matter"]),
    category: "Macroeconomics",
    answer: "Productivity measures output produced per unit of input (commonly per worker or per hour worked). Rising productivity is a key driver of long-term economic growth and higher living standards, since more can be produced without using more resources.",
  },
  {
    id: "econ-productivity-pakistan",
    aliases: ["pakistan labor productivity", "why is productivity low in pakistan"],
    category: "Macroeconomics",
    answer: "Pakistan's labor productivity growth has historically lagged regional peers, often attributed to underinvestment in education and skills, energy reliability issues, and a large informal sector with limited access to modern technology and capital.",
  },
  {
    id: "econ-unemployment-what-is",
    aliases: buildAliases(["unemployment"], ["what is unemployment", "unemployment rate meaning"]),
    category: "Macroeconomics",
    answer: "Unemployment refers to people actively seeking work who cannot find a job. The unemployment rate is the percentage of the labor force that is unemployed, one of the most closely watched economic indicators globally.",
  },
  {
    id: "econ-unemployment-pakistan",
    aliases: ["pakistan unemployment rate", "youth unemployment rate pakistan"],
    category: "Macroeconomics",
    answer: "Pakistan's unemployment and underemployment, particularly among youth, remains a significant economic challenge, with the formal economy struggling to absorb the country's fast-growing working-age population.",
  },
  {
    id: "econ-money-supply-general",
    aliases: buildAliases(["money supply"], ["what is money supply", "m0 m1 m2 m3 meaning"]),
    category: "Macroeconomics",
    answer: "Money supply is the total amount of money circulating in an economy, typically measured in tiers: M0/M1 (physical cash and instantly accessible deposits), M2 (M1 plus savings deposits), and M3 (M2 plus larger, less liquid deposits).",
  },
  {
    id: "econ-money-supply-and-inflation",
    aliases: ["money supply and inflation relationship", "quantity theory of money"],
    category: "Macroeconomics",
    answer: "The quantity theory of money suggests that, all else equal, a faster-growing money supply relative to economic output leads to higher inflation — a key reason central banks track and try to manage money supply growth.",
  },

  // ── Pakistan: Budget, Taxation, ADB ──────────────────────────────────────
  {
    id: "pk-budget-what-is",
    aliases: buildAliases(["federal budget", "pakistan budget"], ["what is the pakistan federal budget", "when is pakistan budget announced"]),
    category: "Pakistan Economy",
    answer: "Pakistan's federal budget is the government's annual financial plan, outlining expected revenue and planned spending for the fiscal year (July to June), presented to Parliament typically in early June.",
  },
  {
    id: "pk-budget-deficit-financing",
    aliases: ["how is budget deficit financed pakistan", "budget deficit meaning"],
    category: "Pakistan Economy",
    answer: "A budget deficit (when spending exceeds revenue) is financed through domestic borrowing (T-Bills, PIBs, Sukuk) and external borrowing (multilateral/bilateral loans, Eurobonds) — this is essentially the same concept as the fiscal deficit.",
  },
  {
    id: "pk-budget-revenue-vs-expenditure",
    aliases: ["budget revenue vs expenditure", "tax revenue vs non-tax revenue pakistan"],
    category: "Pakistan Economy",
    answer: "Government revenue includes tax revenue (income tax, sales tax, customs duty) and non-tax revenue (like SBP profits or petroleum levy). Expenditure includes current spending (debt servicing, defense, salaries) and development spending (infrastructure, social programs).",
  },
  {
    id: "pk-budget-supplementary",
    aliases: ["what is a supplementary budget", "mini budget pakistan meaning"],
    category: "Pakistan Economy",
    answer: "A supplementary (or 'mini') budget is an additional set of fiscal measures introduced mid-year, often to meet IMF program conditions or address an unexpected revenue shortfall, typically involving new taxes or spending cuts.",
  },
  {
    id: "pk-taxation-what-is",
    aliases: buildAliases(["taxation in pakistan", "pakistan tax system"], ["how does taxation work in pakistan"]),
    category: "Pakistan Economy",
    answer: "Pakistan's tax system includes direct taxes (income tax on individuals/companies) and indirect taxes (sales tax/GST, customs duty, federal excise duty), collected primarily by the Federal Board of Revenue (FBR), alongside provincial tax collection.",
  },
  {
    id: "pk-taxation-income-tax",
    aliases: buildAliases(["income tax pakistan"], ["how is income tax calculated in pakistan", "income tax slabs pakistan"]),
    category: "Pakistan Economy",
    answer: "Income tax in Pakistan is charged on individuals' and companies' taxable income using progressive tax slabs (higher income, higher rate for individuals), with the Federal Board of Revenue (FBR) responsible for collection and enforcement.",
  },
  {
    id: "pk-taxation-sales-tax",
    aliases: buildAliases(["sales tax pakistan", "gst pakistan"], ["what is general sales tax pakistan"]),
    category: "Pakistan Economy",
    answer: "Sales tax (General Sales Tax/GST) in Pakistan is an indirect tax charged on the sale of most goods and some services, collected at the point of sale and ultimately borne by the end consumer, with rates varying by category.",
  },
  {
    id: "pk-taxation-withholding",
    aliases: buildAliases(["withholding tax pakistan"], ["what is withholding tax"]),
    category: "Pakistan Economy",
    answer: "Withholding tax is tax deducted at the source of a transaction (like on salary, bank transactions, or contractor payments) by the paying party, who then deposits it with FBR on the taxpayer's behalf, advance against their final tax liability.",
  },
  {
    id: "pk-taxation-filer-non-filer",
    aliases: ["filer vs non-filer pakistan", "what is an active taxpayer list pakistan"],
    category: "Pakistan Economy",
    answer: "A 'filer' is someone registered and appearing on FBR's Active Taxpayers List by filing tax returns. Non-filers typically face higher withholding tax rates on various transactions (like banking and property) as an incentive to formally register.",
  },
  {
    id: "pk-adb-what-is",
    aliases: buildAliases(["asian development bank", "adb"], ["what does adb do in pakistan"]),
    category: "World Bank",
    answer: "The Asian Development Bank (ADB) is a regional multilateral development bank that provides loans, grants, and technical assistance to Pakistan and other Asian/Pacific countries for infrastructure, energy, and social sector projects.",
  },
  {
    id: "pk-adb-vs-world-bank",
    aliases: ["adb vs world bank", "difference between adb and world bank"],
    category: "World Bank",
    answer: "Both ADB and the World Bank provide development financing to Pakistan, but ADB focuses specifically on Asia and the Pacific region, while the World Bank operates globally — Pakistan often receives complementary financing from both for similar sectors.",
  },
  {
    id: "pk-adb-pakistan-projects",
    aliases: ["adb projects in pakistan", "adb loans to pakistan"],
    category: "World Bank",
    answer: "ADB has financed numerous projects in Pakistan across energy, transport, water, and urban infrastructure, typically through long-term concessional or market-based loans depending on the project and financing window.",
  },
  {
    id: "pk-adb-outlook-reports",
    aliases: ["adb pakistan economic outlook", "asian development outlook pakistan"],
    category: "World Bank",
    answer: "ADB publishes periodic economic outlook reports (like the Asian Development Outlook) covering Pakistan's growth, inflation, and fiscal projections, similar in purpose to IMF and World Bank country assessments.",
  },

  // ── General finance literacy ─────────────────────────────────────────────
  {
    id: "finance-stock-what-is",
    aliases: buildAliases(["stock", "share"], ["what is a stock", "what is a share", "stock vs share difference"]),
    category: "Investing Basics",
    answer: "A stock (or share) represents a unit of ownership in a company. Owning shares entitles you to a proportional claim on the company's assets and profits, and often a vote on major corporate decisions.",
  },
  {
    id: "finance-equity-what-is",
    aliases: buildAliases(["equity", "shareholders equity"], ["what is equity in finance", "what does equity mean"]),
    category: "Investing Basics",
    answer: "Equity generally refers to ownership value — in a company, shareholders' equity is total assets minus total liabilities, representing what would be left for owners if all debts were paid off.",
  },
  {
    id: "finance-asset-what-is",
    aliases: buildAliases(["asset", "financial asset"], ["what is an asset in finance"]),
    category: "Investing Basics",
    answer: "An asset is anything of economic value that a person or company owns or controls, expected to provide future benefit — examples include cash, stocks, property, and equipment.",
  },
  {
    id: "finance-liability-what-is",
    aliases: buildAliases(["liability", "liabilities"], ["what is a liability in finance"]),
    category: "Investing Basics",
    answer: "A liability is an obligation owed to another party, typically involving future payment of money, goods, or services — examples include loans, bonds payable, and accounts payable.",
  },
  {
    id: "finance-balance-sheet-what-is",
    aliases: buildAliases(["balance sheet"], ["what is a balance sheet", "how to read a balance sheet"]),
    category: "Investing Basics",
    answer: "A balance sheet is a financial statement showing a company's assets, liabilities, and shareholders' equity at a specific point in time, following the equation: Assets = Liabilities + Equity.",
  },
  {
    id: "finance-income-statement-what-is",
    aliases: buildAliases(["income statement", "profit and loss statement"], ["what is an income statement", "what is a p&l statement"]),
    category: "Investing Basics",
    answer: "An income statement (or profit and loss statement) shows a company's revenue, expenses, and resulting net profit or loss over a specific period, such as a quarter or fiscal year.",
  },
  {
    id: "finance-cash-flow-statement-what-is",
    aliases: buildAliases(["cash flow statement"], ["what is a cash flow statement", "operating cash flow meaning"]),
    category: "Investing Basics",
    answer: "A cash flow statement tracks the actual cash moving in and out of a business across operating, investing, and financing activities — distinct from the income statement, which can include non-cash items like depreciation.",
  },
  {
    id: "finance-working-capital-what-is",
    aliases: buildAliases(["working capital"], ["what is working capital", "working capital formula"]),
    category: "Investing Basics",
    answer: "Working capital is current assets minus current liabilities, measuring a company's short-term liquidity — its ability to cover near-term obligations using assets that can be converted to cash quickly.",
  },
  {
    id: "finance-leverage-what-is",
    aliases: buildAliases(["leverage", "financial leverage"], ["what is leverage in finance", "what is leverage trading"]),
    category: "Investing Basics",
    answer: "Leverage means using borrowed money to increase the potential return of an investment. It magnifies both gains and losses — a company or investor with high leverage carries more financial risk.",
  },
  {
    id: "finance-collateral-what-is",
    aliases: buildAliases(["collateral"], ["what is collateral in finance", "what is collateral for a loan"]),
    category: "Investing Basics",
    answer: "Collateral is an asset a borrower pledges to a lender as security for a loan — if the borrower defaults, the lender can seize the collateral to recover some or all of the outstanding amount.",
  },
  {
    id: "finance-amortization-what-is",
    aliases: buildAliases(["amortization"], ["what is amortization", "amortization schedule meaning"]),
    category: "Investing Basics",
    answer: "Amortization refers to gradually paying off a loan through scheduled, regular payments of principal and interest, or to spreading the cost of an intangible asset over its useful life in accounting.",
  },
  {
    id: "finance-depreciation-accounting-what-is",
    aliases: ["what is depreciation in accounting", "depreciation vs amortization"],
    category: "Investing Basics",
    answer: "Depreciation is the accounting practice of spreading the cost of a tangible asset (like machinery or a vehicle) over its useful life. Amortization is the equivalent concept applied to intangible assets like patents or loans.",
  },
  {
    id: "finance-goodwill-what-is",
    aliases: buildAliases(["goodwill"], ["what is goodwill in accounting"]),
    category: "Investing Basics",
    answer: "Goodwill is an intangible asset that arises when a company acquires another business for more than the fair value of its identifiable net assets, reflecting factors like brand value, customer relationships, and reputation.",
  },
  {
    id: "finance-index-fund-what-is",
    aliases: buildAliases(["index fund"], ["what is an index fund", "index fund vs etf"]),
    category: "Mutual Funds",
    answer: "An index fund is a fund designed to track the performance of a specific market index (like KSE-100), holding the same (or representative) securities in similar proportions, typically at low cost due to passive management.",
  },
  {
    id: "finance-hedge-fund-what-is",
    aliases: buildAliases(["hedge fund"], ["what is a hedge fund", "hedge fund vs mutual fund"]),
    category: "Investing Basics",
    answer: "A hedge fund is a pooled investment vehicle, typically for sophisticated/institutional investors, that uses a wider range of strategies (leverage, derivatives, short-selling) than traditional mutual funds, aiming for absolute returns regardless of market direction.",
  },
  {
    id: "finance-private-equity-what-is",
    aliases: buildAliases(["private equity"], ["what is private equity", "private equity vs venture capital"]),
    category: "Investing Basics",
    answer: "Private equity involves investing directly in private companies (or taking public companies private), typically to restructure and improve operations before eventually selling for a profit — distinct from venture capital, which focuses on early-stage startups.",
  },
  {
    id: "finance-venture-capital-what-is",
    aliases: buildAliases(["venture capital", "vc funding"], ["what is venture capital", "what is an angel investor"]),
    category: "Investing Basics",
    answer: "Venture capital is funding provided to early-stage, high-growth-potential startups in exchange for equity. Angel investors are typically wealthy individuals who provide even earlier-stage funding, often before formal VC rounds.",
  },
  {
    id: "finance-short-selling-what-is",
    aliases: buildAliases(["short selling", "shorting a stock"], ["what is short selling", "how does short selling work"]),
    category: "Investing Basics",
    answer: "Short selling means borrowing shares and selling them, betting the price will fall so you can buy them back later at a lower price and return them, pocketing the difference — it carries theoretically unlimited risk if the price rises instead.",
  },
  {
    id: "finance-margin-call-what-is",
    aliases: buildAliases(["margin call"], ["what is a margin call", "what triggers a margin call"]),
    category: "Investing Basics",
    answer: "A margin call happens when an investor's leveraged position loses enough value that their broker demands additional funds (or collateral) to maintain the position, or the broker will close it out to limit further losses.",
  },
  {
    id: "finance-volatility-what-is",
    aliases: buildAliases(["volatility", "market volatility"], ["what is volatility in stocks"]),
    category: "Investing Basics",
    answer: "Volatility measures how much an asset's price fluctuates over time. Higher volatility means larger, more frequent price swings (more risk and more potential reward); lower volatility means more stable, predictable price behavior.",
  },
  {
    id: "finance-beta-what-is",
    aliases: buildAliases(["beta", "stock beta"], ["what is beta in finance", "what does a stock's beta mean"]),
    category: "Investing Basics",
    answer: "Beta measures a stock's volatility relative to the overall market. A beta of 1 means it moves in line with the market; above 1 means more volatile than the market; below 1 means less volatile.",
  },
  {
    id: "finance-alpha-what-is",
    aliases: buildAliases(["alpha", "investment alpha"], ["what is alpha in investing"]),
    category: "Investing Basics",
    answer: "Alpha measures an investment's performance relative to a benchmark index, after adjusting for risk. Positive alpha means an investment or fund manager outperformed the benchmark; negative alpha means underperformance.",
  },
  {
    id: "finance-benchmark-what-is",
    aliases: buildAliases(["benchmark", "investment benchmark"], ["what is a benchmark index"]),
    category: "Investing Basics",
    answer: "A benchmark is a standard (often a market index like KSE-100) against which an investment's or fund's performance is measured, helping investors judge whether a manager added value relative to simply buying the broader market.",
  },
  {
    id: "finance-liquidity-general",
    aliases: buildAliases(["liquidity", "financial liquidity"], ["what is liquidity in finance"]),
    category: "Investing Basics",
    answer: "Liquidity refers to how quickly and easily an asset can be converted to cash without significantly affecting its price. Cash is the most liquid asset; real estate and private business stakes are relatively illiquid.",
  },
  {
    id: "finance-solvency-what-is",
    aliases: buildAliases(["solvency"], ["what is solvency", "solvency vs liquidity"]),
    category: "Investing Basics",
    answer: "Solvency is a company's ability to meet its long-term debt obligations and continue operating, distinct from liquidity (short-term cash availability) — a company can be liquid but insolvent, or solvent but temporarily illiquid.",
  },

  // ── Pakistan-specific economic terms ─────────────────────────────────────
  {
    id: "pk-econ-fatf-what-is",
    aliases: buildAliases(["fatf", "financial action task force"], ["what is fatf grey list", "pakistan fatf history"]),
    category: "Pakistan Economy",
    answer: "FATF (Financial Action Task Force) is a global watchdog setting standards against money laundering and terror financing. Pakistan was placed on FATF's 'grey list' for several years (requiring enhanced monitoring) before being removed after completing an action plan.",
  },
  {
    id: "pk-econ-devaluation-vs-depreciation",
    aliases: ["devaluation vs depreciation", "what is currency devaluation"],
    category: "Exchange Rates",
    answer: "Depreciation is a market-driven fall in a currency's value under a floating exchange rate. Devaluation is a deliberate, official downward adjustment of a currency's value, typically under a fixed or managed exchange rate regime.",
  },
  {
    id: "pk-econ-hot-money-what-is",
    aliases: buildAliases(["hot money"], ["what is hot money in economics"]),
    category: "Pakistan Economy",
    answer: "'Hot money' refers to short-term, fast-moving capital flows (like portfolio investment in bonds or stocks) that can enter or exit a country quickly chasing high returns, in contrast to longer-term, stickier FDI.",
  },
  {
    id: "pk-econ-dutch-disease-what-is",
    aliases: buildAliases(["dutch disease"], ["what is dutch disease economics"]),
    category: "Macroeconomics",
    answer: "Dutch disease describes how a resource boom (like a surge in oil or gas exports) can cause currency appreciation that hurts the competitiveness of a country's other export sectors, paradoxically weakening the broader economy.",
  },
  {
    id: "pk-econ-dollarization-what-is",
    aliases: buildAliases(["dollarization"], ["what is dollarization of an economy"]),
    category: "Pakistan Economy",
    answer: "Dollarization is when residents and businesses increasingly use US Dollars (instead of local currency) for savings or transactions, often during periods of high local inflation or currency instability, which can erode confidence in the domestic currency further.",
  },
  {
    id: "pk-econ-austerity-what-is",
    aliases: buildAliases(["austerity", "austerity measures"], ["what is austerity economics", "imf austerity pakistan"]),
    category: "Pakistan Economy",
    answer: "Austerity refers to government policies that cut spending and/or raise taxes to reduce a fiscal deficit, often required under IMF programs — while aimed at restoring fiscal stability, austerity can slow growth and is often politically unpopular.",
  },
  {
    id: "pk-econ-brain-drain-what-is",
    aliases: buildAliases(["brain drain"], ["what is brain drain pakistan"]),
    category: "Pakistan Economy",
    answer: "Brain drain refers to skilled professionals emigrating from Pakistan for better opportunities abroad — while remittances from this diaspora benefit the economy, the loss of skilled talent can also hurt domestic productivity and innovation.",
  },
  {
    id: "pk-econ-sifc-what-is",
    aliases: buildAliases(["sifc", "special investment facilitation council"], ["what does sifc do pakistan"]),
    category: "Pakistan Economy",
    answer: "The Special Investment Facilitation Council (SIFC) is a Pakistani government body created to fast-track foreign investment, particularly from Gulf states, in sectors like agriculture, mining, and energy by reducing bureaucratic hurdles.",
  },
  {
    id: "pk-econ-petrodollar-what-is",
    aliases: buildAliases(["petrodollar"], ["what is a petrodollar"]),
    category: "Pakistan Economy",
    answer: "'Petrodollars' refers to US Dollar revenues earned by oil-exporting nations, often recycled into global financial markets or, in Pakistan's case, received as bilateral deposits and investment from Gulf oil exporters.",
  },

  // ── Macroeconomics depth ─────────────────────────────────────────────────
  {
    id: "macro-terms-of-trade-what-is",
    aliases: buildAliases(["terms of trade"], ["what are terms of trade economics"]),
    category: "Trade Balance",
    answer: "Terms of trade is the ratio of a country's export prices to its import prices. Improving terms of trade mean a country earns more per unit exported relative to what it pays per unit imported — a tailwind for the trade balance and currency.",
  },
  {
    id: "macro-balance-of-payments-what-is",
    aliases: buildAliases(["balance of payments", "bop"], ["what is balance of payments"]),
    category: "Current Account",
    answer: "The balance of payments is a complete record of all economic transactions between a country and the rest of the world, made up of the current account (trade, income, transfers) and the financial/capital account (investment flows, loans, reserves).",
  },
  {
    id: "macro-output-gap-what-is",
    aliases: buildAliases(["output gap"], ["what is the output gap economics"]),
    category: "Macroeconomics",
    answer: "The output gap is the difference between an economy's actual output and its potential output (what it could produce at full employment without overheating) — a positive gap suggests overheating risk; a negative gap suggests slack/recession risk.",
  },

  // ── Investing depth: DCA, asset classes ─────────────────────────────────
  {
    id: "investing-rule-of-72",
    aliases: buildAliases(["rule of 72"], ["what is the rule of 72"]),
    category: "Investing Basics",
    answer: "The Rule of 72 is a quick estimate for how long an investment takes to double: divide 72 by the annual rate of return. At a 12% annual return, an investment would roughly double in 6 years (72 ÷ 12).",
  },
  {
    id: "investing-dividend-reinvestment",
    aliases: buildAliases(["dividend reinvestment"], ["what is a dividend reinvestment plan"]),
    category: "Investing Basics",
    answer: "Dividend reinvestment means using cash dividends received to automatically buy more shares of the same investment, rather than taking the cash — this compounds returns over time by increasing the number of shares you own.",
  },
  {
    id: "investing-diversification-deep",
    aliases: ["why is diversification important", "how many stocks for diversification"],
    category: "Investing Basics",
    answer: "Diversification spreads investments across different assets, sectors, or geographies so that poor performance in one area doesn't disproportionately hurt the overall portfolio — it reduces unsystematic (company/sector-specific) risk, though it can't eliminate broad market risk.",
  },
  {
    id: "investing-time-horizon-what-is",
    aliases: buildAliases(["investment time horizon"], ["what is investment time horizon", "why does time horizon matter investing"]),
    category: "Investing Basics",
    answer: "Investment time horizon is how long you plan to hold an investment before needing the money. Longer horizons generally allow for taking on more risk (like equities), since there's more time to recover from short-term volatility.",
  },

  // ── Banking depth ─────────────────────────────────────────────────────────
  {
    id: "banking-base-rate-what-is",
    aliases: buildAliases(["base rate banking"], ["what is base rate in banking pakistan"]),
    category: "Banking",
    answer: "Pakistan's banking sector uses a Karachi Interbank Offered Rate (KIBOR)-based pricing benchmark for most floating-rate loans, where the bank charges KIBOR plus a spread reflecting the borrower's credit risk.",
  },
  {
    id: "banking-interest-rate-spread-what-is",
    aliases: buildAliases(["interest rate spread", "bank spread"], ["what is interest rate spread banking"]),
    category: "Banking",
    answer: "Interest rate spread is the difference between the rate a bank charges on loans and the rate it pays on deposits — a core driver of bank profitability, sometimes also called the net interest margin when expressed relative to earning assets.",
  },
  {
    id: "banking-islamic-vs-conventional",
    aliases: ["islamic banking vs conventional banking", "how is islamic banking different from regular banking"],
    category: "Banking",
    answer: "Conventional banking is built around interest (riba) on loans and deposits. Islamic banking instead uses profit-and-loss sharing and asset-backed structures (like Murabaha, Ijarah, and Musharakah) to avoid interest while still providing similar financial services.",
  },
  {
    id: "banking-car-deep",
    aliases: ["why do banks need capital adequacy ratio", "car ratio meaning banking pakistan"],
    category: "Banking",
    answer: "The Capital Adequacy Ratio (CAR) measures a bank's capital relative to its risk-weighted assets, acting as a buffer against unexpected losses. SBP sets minimum CAR requirements (aligned with Basel standards) to keep the banking system resilient.",
  },
  {
    id: "banking-adr-deep",
    aliases: ["what does adr ratio mean banking", "advance to deposit ratio explained"],
    category: "Banking",
    answer: "The Advance-to-Deposit Ratio (ADR) measures how much of a bank's deposits are lent out as advances/loans. A low ADR suggests banks are parking funds in safer government securities rather than lending to the private sector.",
  },

  // ── Trade, remittances, FDI depth ───────────────────────────────────────
  {
    id: "trade-export-composition-pakistan",
    aliases: ["what does pakistan export the most", "pakistan top exports", "pakistan export composition"],
    category: "Exports",
    answer: "Pakistan's exports are heavily concentrated in textiles and apparel (around half of total exports), followed by rice, leather goods, surgical instruments, and sports goods — a narrower export base than regional peers like Bangladesh or Vietnam.",
  },
  {
    id: "trade-import-composition-pakistan",
    aliases: ["what does pakistan import the most", "pakistan top imports", "pakistan import composition"],
    category: "Imports",
    answer: "Pakistan's largest import categories are petroleum and energy products, machinery, raw materials for industry (like cotton and chemicals), and palm oil — energy imports are especially sensitive to global oil price swings.",
  },
  {
    id: "trade-it-exports-pakistan",
    aliases: buildAliases(["pakistan it exports", "freelance exports pakistan"], ["how big are pakistan it exports"]),
    category: "Exports",
    answer: "Pakistan's IT and IT-enabled services exports (software development, freelancing, BPO) have grown into a meaningful and fast-growing foreign exchange earner, though still much smaller than textile exports in absolute terms.",
  },
  {
    id: "remittances-top-source-countries",
    aliases: ["where do pakistan remittances come from", "top countries sending remittances to pakistan"],
    category: "Remittances",
    answer: "The largest sources of remittances to Pakistan are Saudi Arabia, the UAE, the United Kingdom, and the United States, reflecting the size of the Pakistani diaspora and migrant labor force in those countries.",
  },
  {
    id: "remittances-hundi-hawala",
    aliases: buildAliases(["hundi", "hawala"], ["what is hundi hawala system"]),
    category: "Remittances",
    answer: "Hundi/Hawala is an informal, unofficial money transfer system used to move funds outside regulated banking/exchange company channels — its use diverts remittance flows away from official channels, understating reported figures and bypassing SBP-monitored forex inflows.",
  },
  {
    id: "remittances-roshan-digital-account",
    aliases: buildAliases(["roshan digital account"], ["what is roshan digital account"]),
    category: "Remittances",
    answer: "Roshan Digital Account is an SBP initiative letting Non-Resident Pakistanis open and operate Pakistani bank accounts digitally from abroad, used to channel remittances and investment (including in Naya Pakistan Certificates) through formal banking channels.",
  },
  {
    id: "fdi-pakistan-top-sectors",
    aliases: ["which sectors get the most fdi pakistan", "fdi sectors pakistan"],
    category: "FDI",
    answer: "Pakistan's FDI has historically concentrated in power/energy, financial services, oil & gas exploration, telecom, and more recently, sectors prioritized by the Special Investment Facilitation Council like mining and agriculture.",
  },

  // ── Foreign reserves & government debt depth ────────────────────────────
  {
    id: "reserves-swap-lines",
    aliases: buildAliases(["currency swap line"], ["what is a central bank swap line", "china pakistan swap line"]),
    category: "Foreign Reserves",
    answer: "A currency swap line is an agreement between two central banks to exchange currencies, giving a country temporary access to foreign currency liquidity without depleting its own reserves — Pakistan has used renewable swap arrangements with China's central bank.",
  },
  {
    id: "debt-rollover-risk",
    aliases: buildAliases(["debt rollover risk"], ["what is rollover risk in debt"]),
    category: "Government Debt",
    answer: "Rollover risk is the risk that a borrower won't be able to refinance (roll over) maturing debt with new borrowing on acceptable terms — a major concern for Pakistan given its reliance on short-term domestic debt and bilateral foreign deposits.",
  },

  // ── IMF & World Bank depth ────────────────────────────────────────────────
  {
    id: "imf-tranche-what-is",
    aliases: buildAliases(["imf tranche"], ["what is an imf loan tranche"]),
    category: "IMF",
    answer: "An IMF loan tranche is a portion of the total approved loan amount disbursed at a time, released after the IMF Executive Board confirms a country has met agreed performance criteria and structural benchmarks for that review period.",
  },
  {
    id: "imf-staff-level-agreement-what-is",
    aliases: buildAliases(["staff level agreement", "sla imf"], ["what is an imf staff level agreement"]),
    category: "IMF",
    answer: "A Staff-Level Agreement (SLA) is a preliminary agreement between IMF staff and a country's government on program terms, which must still be approved by the IMF's Executive Board before any loan tranche is actually disbursed.",
  },
  {
    id: "worldbank-ida-what-is",
    aliases: buildAliases(["ida", "international development association"], ["what is ida world bank"]),
    category: "World Bank",
    answer: "The International Development Association (IDA) is the World Bank's arm that provides low-interest loans and grants to the world's poorest countries — Pakistan has historically received significant financing through IDA alongside market-rate IBRD lending.",
  },
  {
    id: "worldbank-ibrd-what-is",
    aliases: buildAliases(["ibrd"], ["what is ibrd world bank", "ida vs ibrd"]),
    category: "World Bank",
    answer: "The International Bank for Reconstruction and Development (IBRD) is the World Bank's main lending arm for middle-income countries, offering loans at near-market rates, in contrast to IDA's concessional (low-interest/grant) financing for poorer countries.",
  },
  {
    id: "worldbank-cpf-what-is",
    aliases: buildAliases(["country partnership framework"], ["what is a world bank country partnership framework"]),
    category: "World Bank",
    answer: "A Country Partnership Framework (CPF) is the World Bank's multi-year strategy document outlining its priorities and planned support for a specific country, like Pakistan, aligned with the country's own development goals.",
  },

  // ── Inflation, CPI, WPI, SPI depth ──────────────────────────────────────
  {
    id: "inflation-mom-vs-yoy",
    aliases: ["month over month vs year over year inflation", "mom inflation vs yoy inflation"],
    category: "Inflation",
    answer: "Month-over-month (MoM) inflation compares prices to the immediately preceding month, capturing the most recent momentum. Year-over-year (YoY) inflation compares to the same month a year earlier, smoothing out seasonal effects but reacting more slowly to recent trends.",
  },
  {
    id: "wpi-what-is-deep",
    aliases: ["wpi vs cpi pakistan", "wholesale price index meaning"],
    category: "CPI",
    answer: "The Wholesale Price Index (WPI) tracks price changes at the wholesale/producer level, before goods reach consumers. CPI tracks prices consumers actually pay at retail. WPI often moves before CPI, acting as a leading indicator for future consumer inflation.",
  },
  {
    id: "spi-what-is-deep",
    aliases: ["sensitive price indicator meaning", "how often is spi released pakistan"],
    category: "CPI",
    answer: "The Sensitive Price Indicator (SPI) is released weekly by PBS, tracking prices of essential daily-use items for lower-income households — it's a faster, narrower gauge than monthly CPI, often used to track near-term affordability pressure.",
  },
  {
    id: "cpi-basket-what-is",
    aliases: buildAliases(["cpi basket", "consumer basket"], ["what is the cpi basket of goods"]),
    category: "CPI",
    answer: "The CPI basket is the fixed set of goods and services (and their relative weights) that statistical agencies track to measure inflation, designed to represent typical household consumption patterns, periodically updated/rebased to stay representative.",
  },

  // ── KIBOR & exchange rate depth ──────────────────────────────────────────
  {
    id: "kibor-tenors-deep",
    aliases: ["kibor 1 month vs 3 month vs 6 month", "different kibor tenors explained"],
    category: "KIBOR",
    answer: "KIBOR is quoted across multiple tenors (1-month, 3-month, 6-month, 1-year), reflecting the rate for interbank borrowing of that specific duration — 6-month KIBOR is most commonly used as the benchmark for floating-rate corporate loans in Pakistan.",
  },
  {
    id: "kibor-vs-policy-rate-deep",
    aliases: ["why is kibor different from policy rate", "kibor policy rate spread"],
    category: "KIBOR",
    answer: "KIBOR usually trades close to but not identical to the SBP policy rate, with the spread reflecting banking system liquidity conditions, credit risk perceptions among banks, and near-term rate expectations.",
  },
  {
    id: "fx-interbank-vs-open-market-rate",
    aliases: ["interbank rate vs open market rate pkr", "why does open market dollar rate differ from interbank"],
    category: "Exchange Rates",
    answer: "The interbank rate is what banks trade currency at among themselves, generally considered the 'official' reference rate. The open market rate is what currency exchange companies offer the public — the two can diverge, especially during periods of forex shortage or capital controls.",
  },
  {
    id: "fx-real-effective-exchange-rate-deep",
    aliases: ["what does reer above 100 mean", "reer overvalued undervalued pakistan"],
    category: "Exchange Rates",
    answer: "A REER (Real Effective Exchange Rate) reading above 100 suggests the Rupee may be overvalued relative to its trading partners (adjusted for inflation differentials), which can hurt export competitiveness; a reading below 100 suggests potential undervaluation.",
  },

  // ── Bonds/Sukuk/T-Bills depth ────────────────────────────────────────────
  {
    id: "tbill-auction-process",
    aliases: ["how does t-bill auction work pakistan", "t-bill cut off yield meaning"],
    category: "Treasury Bills",
    answer: "SBP conducts periodic T-Bill auctions where banks and primary dealers submit competitive bids. The 'cut-off yield' is the highest accepted yield that clears the government's target borrowing amount, determining the rate for that auction's successful bidders.",
  },
  {
    id: "sukuk-vs-conventional-bond-deep",
    aliases: ["sukuk vs bond legal structure", "why are sukuk asset-backed"],
    category: "Sukuk",
    answer: "A conventional bond is a debt instrument paying interest. A Sukuk represents partial ownership in an underlying tangible asset or business venture, with returns generated from that asset's profit or rental income rather than interest, to comply with Islamic finance principles.",
  },
  {
    id: "bonds-yield-vs-coupon-deep",
    aliases: ["yield vs coupon rate bond", "why does bond yield change but coupon stays fixed"],
    category: "Bonds",
    answer: "A bond's coupon rate is fixed at issuance and doesn't change. Its yield (yield to maturity) fluctuates as the bond's market price moves — when price falls, yield rises, and vice versa, since yield reflects the return relative to the current price paid, not the face value.",
  },

  // ── Practical / conversational investing queries ────────────────────────
  {
    id: "practical-best-investment-pakistan",
    aliases: ["best investment in pakistan", "where should i invest my money in pakistan"],
    category: "Investing Basics",
    answer: "There's no single 'best' investment — it depends on your risk tolerance, time horizon, and goals. Common options in Pakistan include PSX stocks/mutual funds (higher risk/return), government securities like T-Bills/PIBs/Sukuk (lower risk), real estate, and gold, each with different liquidity and risk profiles.",
  },
  {
    id: "practical-is-gold-good-investment-pakistan",
    aliases: ["is gold a good investment in pakistan", "should i invest in gold pakistan"],
    category: "Investing Basics",
    answer: "Gold is often used as a hedge against inflation and currency depreciation, both relevant concerns in Pakistan historically, but it doesn't generate income (no dividends or interest) and its price can be volatile in the short term.",
  },
  {
    id: "practical-real-estate-vs-stocks-pakistan",
    aliases: ["real estate vs stocks pakistan", "is real estate better than stock market in pakistan"],
    category: "Investing Basics",
    answer: "Real estate in Pakistan is popular for its perceived stability and tangible nature but is illiquid and has high transaction costs. Stocks/mutual funds are more liquid, easier to diversify, and historically more transparent in pricing, but carry higher short-term volatility.",
  },
  {
    id: "practical-how-to-save-money-inflation",
    aliases: ["how to protect savings from inflation pakistan", "how to save money during high inflation"],
    category: "Investing Basics",
    answer: "Protecting savings from inflation typically means avoiding letting cash sit idle in low-yield accounts, and considering instruments whose returns can outpace inflation over time, such as Sukuk, PIBs, or diversified investment funds — appropriate choices depend on individual risk tolerance and time horizon.",
  },

  // ── Financial literacy depth ─────────────────────────────────────────────
  {
    id: "finance-time-value-of-money",
    aliases: buildAliases(["time value of money"], ["what is time value of money", "why is a rupee today worth more than a rupee tomorrow"]),
    category: "Investing Basics",
    answer: "Time value of money is the principle that a sum of money today is worth more than the same sum in the future, because today's money can be invested to earn a return — it's the foundation behind concepts like NPV, IRR, and discounting.",
  },
  {
    id: "finance-opportunity-cost",
    aliases: buildAliases(["opportunity cost"], ["what is opportunity cost in economics"]),
    category: "Macroeconomics",
    answer: "Opportunity cost is the value of the next-best alternative you give up when making a choice — for example, the opportunity cost of keeping money in a low-interest savings account is the higher return you could have earned elsewhere.",
  },
  {
    id: "finance-sunk-cost",
    aliases: buildAliases(["sunk cost", "sunk cost fallacy"], ["what is sunk cost fallacy"]),
    category: "Investing Basics",
    answer: "A sunk cost is money already spent that cannot be recovered. The sunk cost fallacy is the mistake of letting past, irrecoverable spending influence current decisions, rather than judging a decision purely on its future costs and benefits.",
  },
  {
    id: "finance-real-vs-nominal-returns",
    aliases: ["real return vs nominal return", "inflation adjusted return meaning"],
    category: "Investing Basics",
    answer: "Nominal return is the raw percentage gain on an investment before adjusting for inflation. Real return subtracts inflation from the nominal return, showing the actual increase in purchasing power — a 12% nominal return during 15% inflation is actually a negative real return.",
  },
  {
    id: "finance-budgeting-basics",
    aliases: buildAliases(["budgeting", "personal budgeting"], ["what is the 50 30 20 budgeting rule"]),
    category: "Investing Basics",
    answer: "Personal budgeting means planning how income will be allocated across spending and saving. The 50/30/20 rule is one common guideline: roughly 50% of income to needs, 30% to wants, and 20% to savings/debt repayment.",
  },

  // ── Retirement & insurance ────────────────────────────────────────────────
  {
    id: "retirement-provident-fund-pakistan",
    aliases: buildAliases(["provident fund pakistan"], ["what is a provident fund"]),
    category: "Investing Basics",
    answer: "A provident fund is a retirement savings scheme where both employee and employer contribute a portion of salary regularly, with the accumulated balance (often plus interest/profit) paid out to the employee upon retirement or leaving the job.",
  },
  {
    id: "retirement-eobi-what-is",
    aliases: buildAliases(["eobi", "employees old age benefits institution"], ["what is eobi pakistan"]),
    category: "Investing Basics",
    answer: "EOBI (Employees' Old-Age Benefits Institution) is Pakistan's federal social security scheme providing old-age pensions, survivor's pensions, and disability benefits to registered private-sector employees, funded by mandatory employer contributions.",
  },
  {
    id: "retirement-pension-fund-pakistan",
    aliases: buildAliases(["voluntary pension scheme pakistan", "pension fund"], ["what is a voluntary pension scheme"]),
    category: "Mutual Funds",
    answer: "Pakistan's Voluntary Pension System (VPS) lets individuals invest in SECP-regulated pension funds during their working years, accessing tax credits, with the accumulated balance available (with rules) starting at retirement age.",
  },
  {
    id: "retirement-gratuity-what-is",
    aliases: buildAliases(["gratuity"], ["what is gratuity pakistan", "how is gratuity calculated"]),
    category: "Investing Basics",
    answer: "Gratuity is a lump-sum payment many employers in Pakistan owe employees upon completing a minimum service period (commonly linked to length of service and last drawn salary), separate from provident fund or EOBI benefits.",
  },
  {
    id: "insurance-term-life-what-is",
    aliases: buildAliases(["term life insurance"], ["what is term insurance"]),
    category: "Investing Basics",
    answer: "Term life insurance provides pure death-benefit coverage for a fixed period at a relatively low premium, with no investment/savings component — if the insured survives the term, no payout is made, unlike investment-linked insurance products.",
  },
  {
    id: "insurance-takaful-what-is",
    aliases: buildAliases(["takaful"], ["what is takaful insurance"]),
    category: "Investing Basics",
    answer: "Takaful is Shariah-compliant insurance, structured as mutual risk-sharing among participants rather than a conventional insurer-insured contract involving interest or speculative elements prohibited in Islamic finance.",
  },

  // ── Pakistan structural & digital finance topics ─────────────────────────
  {
    id: "pk-credit-rating-what-is",
    aliases: buildAliases(["sovereign credit rating", "pakistan credit rating"], ["what is a credit rating", "moody's fitch s&p pakistan rating"]),
    category: "Pakistan Economy",
    answer: "A sovereign credit rating, issued by agencies like Moody's, Fitch, and S&P, assesses a country's ability and willingness to repay its debt. A rating upgrade signals improving creditworthiness (cheaper future borrowing); a downgrade signals the opposite.",
  },
  {
    id: "pk-credit-rating-upgrade-downgrade",
    aliases: ["what does a credit rating upgrade mean", "what does a credit rating downgrade mean"],
    category: "Pakistan Economy",
    answer: "A credit rating upgrade typically lowers a country's future borrowing costs and signals improved investor confidence. A downgrade raises borrowing costs and can trigger capital outflows, as some institutional investors are restricted from holding below-threshold-rated debt.",
  },
  {
    id: "pk-cbdc-what-is",
    aliases: buildAliases(["cbdc", "central bank digital currency"], ["what is sbp digital currency plan"]),
    category: "SBP",
    answer: "A Central Bank Digital Currency (CBDC) is a digital form of a country's official currency, issued and backed directly by the central bank — unlike cryptocurrency, a CBDC is centralized and represents a direct liability of the central bank, similar to physical cash.",
  },
  {
    id: "pk-raast-what-is",
    aliases: buildAliases(["raast"], ["what is raast payment system"]),
    category: "SBP",
    answer: "Raast is Pakistan's instant, free, person-to-person digital payment system developed by SBP, enabling real-time fund transfers between bank accounts and mobile wallets using just a mobile number or ID.",
  },
  {
    id: "pk-microfinance-what-is",
    aliases: buildAliases(["microfinance", "microfinance bank"], ["what is microfinance pakistan"]),
    category: "Banking",
    answer: "Microfinance refers to small loans and basic financial services provided to low-income individuals and small businesses who typically lack access to conventional banking, aimed at promoting financial inclusion.",
  },
  {
    id: "pk-branchless-banking-what-is",
    aliases: buildAliases(["branchless banking", "mobile wallet pakistan"], ["what is branchless banking"]),
    category: "Banking",
    answer: "Branchless banking allows people to access basic financial services (deposits, transfers, bill payments) through mobile phones and agent networks rather than visiting a physical bank branch, significantly expanding financial access in underserved areas.",
  },

  // ── PSX depth: book value, payout ratio, circuit breakers ────────────────
  {
    id: "psx-book-value-per-share",
    aliases: buildAliases(["book value per share"], ["what is book value per share", "price to book ratio meaning"]),
    category: "PSX",
    answer: "Book value per share is a company's total shareholders' equity divided by its number of outstanding shares, representing the accounting net worth per share. The Price-to-Book (P/B) ratio compares market price to this book value.",
  },
  {
    id: "psx-dividend-payout-ratio",
    aliases: buildAliases(["dividend payout ratio"], ["what is dividend payout ratio"]),
    category: "PSX",
    answer: "Dividend payout ratio is the percentage of net profit a company distributes to shareholders as dividends, rather than retaining for reinvestment — calculated as total dividends paid divided by net profit.",
  },
  {
    id: "psx-circuit-breaker-what-is",
    aliases: buildAliases(["circuit breaker psx", "trading halt"], ["what is a circuit breaker stock market"]),
    category: "PSX",
    answer: "A circuit breaker is an automatic trading halt triggered when a stock's (or the broader index's) price moves beyond a set percentage limit in a single session, designed to curb panic-driven trading and give the market a pause to reassess.",
  },

  // ── GDP & sectoral depth ──────────────────────────────────────────────────
  {
    id: "gdp-sectoral-breakdown",
    aliases: ["agriculture industry services share of gdp pakistan", "which sector contributes most to pakistan gdp"],
    category: "GDP",
    answer: "Pakistan's GDP is conventionally broken into three broad sectors: agriculture, industry (manufacturing, construction, mining), and services — services typically contribute the largest share of GDP, while agriculture remains disproportionately important for employment.",
  },
  {
    id: "gdp-factor-cost-vs-market-price",
    aliases: buildAliases(["gdp at factor cost", "gdp at market price"], ["gdp factor cost vs market price difference"]),
    category: "GDP",
    answer: "GDP at factor cost measures output value excluding indirect taxes and including subsidies. GDP at market price adds back indirect taxes and subtracts subsidies, reflecting what consumers actually pay — most headline GDP figures reported are at market price.",
  },
  {
    id: "gdp-provisional-vs-final-estimates",
    aliases: ["provisional gdp estimate vs final estimate pakistan", "why does pakistan gdp get revised"],
    category: "GDP",
    answer: "GDP figures are typically first released as provisional estimates based on incomplete data, then revised (sometimes more than once) as more complete data on agriculture, industry, and services becomes available — revisions can meaningfully change the initially reported growth rate.",
  },
  {
    id: "gdp-base-year-what-is",
    aliases: buildAliases(["gdp base year", "rebasing gdp"], ["what does gdp base year mean", "why does pakistan rebase gdp"]),
    category: "GDP",
    answer: "The GDP base year is the reference year used to calculate real (inflation-adjusted) GDP and weight different sectors. Rebasing — updating to a more recent base year — better reflects the current structure of the economy and is done periodically by statistical agencies.",
  },
  {
    id: "gdp-large-scale-manufacturing-lsm-deep",
    aliases: ["how is lsm related to gdp", "lsm index pakistan meaning"],
    category: "Quarterly GDP",
    answer: "The Large-Scale Manufacturing (LSM) Index tracks monthly output from major industrial sectors and is one of the most timely available proxies for industrial activity, often used to gauge GDP momentum before official quarterly GDP data is released.",
  },

  // ── Mutual funds & ETF depth ─────────────────────────────────────────────
  {
    id: "mutual-funds-expense-ratio-what-is",
    aliases: buildAliases(["expense ratio", "fund management fee"], ["what is expense ratio mutual fund"]),
    category: "Mutual Funds",
    answer: "The expense ratio is the annual fee a fund charges, expressed as a percentage of assets under management, covering management fees and operating costs — it's deducted directly from fund returns, so lower expense ratios leave more return for investors.",
  },
  {
    id: "mutual-funds-open-end-vs-closed-end",
    aliases: buildAliases(["open end fund vs closed end fund"], ["what is an open end mutual fund", "what is a closed end mutual fund"]),
    category: "Mutual Funds",
    answer: "An open-end fund continuously issues and redeems units at NAV, so the fund's size grows or shrinks with investor flows. A closed-end fund issues a fixed number of units that then trade on an exchange, with its market price potentially diverging from NAV.",
  },
  {
    id: "mutual-funds-nav-calculation-deep",
    aliases: ["how is nav calculated mutual fund", "nav per unit formula"],
    category: "Mutual Funds",
    answer: "NAV (Net Asset Value) per unit is calculated as (Total Fund Assets − Total Liabilities) ÷ Number of Units Outstanding, typically calculated and published daily.",
  },
  {
    id: "mutual-funds-redemption-process",
    aliases: ["how to redeem mutual fund units pakistan", "mutual fund redemption process"],
    category: "Mutual Funds",
    answer: "Redeeming mutual fund units means selling them back to the fund (rather than to another investor), typically processed at the next calculated NAV, with proceeds paid out within a few business days depending on the fund's terms.",
  },
  {
    id: "mutual-funds-money-market-features",
    aliases: ["money market fund features pakistan", "what does a money market fund invest in"],
    category: "Mutual Funds",
    answer: "A money market fund invests in very short-term, low-risk instruments like T-Bills, commercial paper, and short-term bank deposits, prioritizing capital preservation and liquidity over high returns — often used as a parking place for cash.",
  },
  {
    id: "mutual-funds-income-fund-features",
    aliases: ["income fund features pakistan", "what does an income fund invest in"],
    category: "Mutual Funds",
    answer: "An income fund primarily invests in fixed-income instruments like PIBs, corporate bonds, and Sukuk, aiming for steady income and moderate capital growth with lower volatility than pure equity funds.",
  },
  {
    id: "etf-tracking-error-what-is",
    aliases: buildAliases(["tracking error etf"], ["what is tracking error in etf"]),
    category: "ETFs",
    answer: "Tracking error measures how closely an ETF's returns follow its underlying benchmark index — a low tracking error means the ETF closely mirrors the index it's designed to track; a high tracking error suggests larger deviations.",
  },
  {
    id: "etf-vs-mutual-fund-deep",
    aliases: ["etf vs mutual fund liquidity difference", "why are etfs usually cheaper than mutual funds"],
    category: "ETFs",
    answer: "ETFs trade on an exchange throughout the day like stocks, generally have lower expense ratios due to passive management, and offer intraday liquidity. Traditional mutual funds are priced once daily at NAV and often involve more active management at higher cost.",
  },

  // ── Ratios & macro schools of thought ─────────────────────────────────────
  {
    id: "ratio-debt-to-gdp-deep",
    aliases: ["why does debt to gdp ratio matter", "what is a sustainable debt to gdp ratio"],
    category: "Government Debt",
    answer: "The debt-to-GDP ratio compares total government debt to the size of the economy, used to gauge debt sustainability — there's no universal 'safe' threshold, but rapidly rising ratios alongside high debt servicing costs are generally viewed as a warning sign.",
  },
  {
    id: "ratio-current-ratio-what-is",
    aliases: buildAliases(["current ratio"], ["what is current ratio in finance"]),
    category: "Investing Basics",
    answer: "The current ratio measures a company's ability to cover short-term liabilities with short-term assets, calculated as Current Assets ÷ Current Liabilities — a ratio above 1 suggests adequate short-term liquidity.",
  },
  {
    id: "ratio-quick-ratio-what-is",
    aliases: buildAliases(["quick ratio", "acid test ratio"], ["what is quick ratio in finance"]),
    category: "Investing Basics",
    answer: "The quick ratio (acid-test ratio) is a stricter liquidity measure than the current ratio, excluding inventory from current assets, since inventory can be harder to quickly convert to cash.",
  },
  {
    id: "ratio-debt-to-equity-what-is",
    aliases: buildAliases(["debt to equity ratio"], ["what is debt to equity ratio"]),
    category: "Investing Basics",
    answer: "The debt-to-equity ratio compares a company's total debt to its shareholders' equity, indicating how much of the business is financed by borrowing versus owner capital — higher ratios indicate more financial leverage and risk.",
  },
  {
    id: "macro-keynesian-economics-what-is",
    aliases: buildAliases(["keynesian economics"], ["what is keynesian economics"]),
    category: "Macroeconomics",
    answer: "Keynesian economics argues that government spending and monetary policy can actively manage aggregate demand to smooth business cycles, especially advocating for fiscal stimulus during recessions when private demand is weak.",
  },
  {
    id: "macro-monetarism-what-is",
    aliases: buildAliases(["monetarism"], ["what is monetarism economics"]),
    category: "Macroeconomics",
    answer: "Monetarism emphasizes controlling the growth of money supply as the primary tool for managing inflation and the economy, associated with economist Milton Friedman, contrasting with Keynesian emphasis on fiscal policy.",
  },
  {
    id: "macro-supply-side-economics",
    aliases: buildAliases(["supply side economics"], ["what is supply side economics"]),
    category: "Macroeconomics",
    answer: "Supply-side economics focuses on policies that boost the economy's productive capacity — like tax cuts, deregulation, and investment incentives — arguing these encourage production, investment, and job creation more effectively than demand-side stimulus.",
  },
  {
    id: "macro-income-inequality-gini",
    aliases: buildAliases(["gini coefficient", "income inequality"], ["what is gini coefficient", "how is income inequality measured"]),
    category: "Macroeconomics",
    answer: "The Gini coefficient measures income or wealth inequality within a population, ranging from 0 (perfect equality) to 1 (perfect inequality) — it's a widely used summary statistic for comparing inequality across countries and over time.",
  },
  {
    id: "macro-hdi-what-is",
    aliases: buildAliases(["hdi", "human development index"], ["what is human development index"]),
    category: "Macroeconomics",
    answer: "The Human Development Index (HDI), published by the UNDP, combines life expectancy, education, and per capita income into a single score measuring a country's overall human development, beyond just economic output.",
  },

  // ── SBP corridor & market infrastructure bodies ──────────────────────────
  {
    id: "sbp-interest-rate-corridor",
    aliases: buildAliases(["interest rate corridor"], ["what is sbp interest rate corridor", "ceiling rate floor rate sbp"]),
    category: "SBP",
    answer: "SBP's interest rate corridor sets a ceiling (rate on its lending facility to banks) and a floor (rate on its deposit facility) around the policy rate, keeping short-term interbank rates anchored close to the target policy rate.",
  },
  {
    id: "sbp-discount-rate-vs-policy-rate",
    aliases: ["discount rate vs policy rate pakistan", "is discount rate the same as policy rate"],
    category: "SBP",
    answer: "Pakistan previously used the term 'discount rate' for its key policy benchmark; SBP now formally refers to it as the 'policy rate,' which serves as the target for short-term money market rates and the basis for the interest rate corridor.",
  },
  {
    id: "secp-what-is",
    aliases: buildAliases(["secp", "securities and exchange commission of pakistan"], ["what does secp do"]),
    category: "PSX",
    answer: "SECP (Securities and Exchange Commission of Pakistan) is the regulator overseeing capital markets, listed companies, mutual funds, insurance, and non-bank financial institutions in Pakistan, distinct from SBP which regulates banks and monetary policy.",
  },
  {
    id: "nccpl-what-is",
    aliases: buildAliases(["nccpl", "national clearing company"], ["what does nccpl do"]),
    category: "PSX",
    answer: "NCCPL (National Clearing Company of Pakistan Limited) provides clearing and settlement services for PSX trades, acting as the central counterparty that guarantees trade settlement between buyers and sellers.",
  },
  {
    id: "cdc-what-is",
    aliases: buildAliases(["cdc", "central depository company"], ["what does cdc do pakistan"]),
    category: "PSX",
    answer: "CDC (Central Depository Company) holds shares electronically on behalf of investors, eliminating the need for physical share certificates and enabling fast, secure transfer of ownership when trades settle.",
  },

  // ── Sukuk structures depth ────────────────────────────────────────────────
  {
    id: "sukuk-ijarah-what-is",
    aliases: buildAliases(["ijarah sukuk", "gop ijarah sukuk"], ["what is ijarah sukuk"]),
    category: "Sukuk",
    answer: "Ijarah Sukuk are structured around a lease (Ijarah) arrangement, where certificate holders effectively own a share in a leased asset and earn rental income from it — Pakistan's government regularly issues GoP Ijarah Sukuk backed by state assets.",
  },
  {
    id: "sukuk-musharakah-what-is",
    aliases: buildAliases(["sukuk al musharakah", "musharakah sukuk"], ["what is musharakah sukuk"]),
    category: "Sukuk",
    answer: "Sukuk al-Musharakah are structured as a partnership, where certificate holders share in the profits and losses of an underlying business venture or project, rather than earning a fixed rental or interest-like return.",
  },
  {
    id: "sukuk-energy-pakistan",
    aliases: buildAliases(["energy sukuk pakistan"], ["what is energy sukuk"]),
    category: "Sukuk",
    answer: "Pakistan has issued Sukuk specifically backed by state-owned energy assets (like hydropower or transmission infrastructure) to raise Shariah-compliant domestic financing for the government, often used to help address circular debt.",
  },

  // ── Investing: passive vs active, advisors ───────────────────────────────
  {
    id: "investing-passive-vs-active",
    aliases: buildAliases(["passive investing vs active investing"], ["what is passive investing", "what is active investing"]),
    category: "Investing Basics",
    answer: "Active investing involves a manager trying to outperform the market through stock selection and timing. Passive investing simply aims to replicate a market index's return at low cost — research consistently shows few active managers beat their benchmark over the long run, net of fees.",
  },
  {
    id: "investing-robo-advisor-what-is",
    aliases: buildAliases(["robo advisor"], ["what is a robo advisor"]),
    category: "Investing Basics",
    answer: "A robo-advisor is an automated, algorithm-driven investment platform that builds and manages a diversified portfolio for an investor based on their goals and risk tolerance, typically at lower cost than a traditional human financial advisor.",
  },
  {
    id: "investing-financial-advisor-vs-portfolio-manager",
    aliases: ["financial advisor vs portfolio manager", "what does a financial advisor do"],
    category: "Investing Basics",
    answer: "A financial advisor typically provides broad guidance on budgeting, goals, and product selection. A portfolio/fund manager actively makes day-to-day investment decisions for a fund or discretionary account on behalf of clients.",
  },

  // ── Forex: convertibility & controls ──────────────────────────────────────
  {
    id: "fx-current-account-convertibility",
    aliases: buildAliases(["current account convertibility"], ["what is current account convertibility"]),
    category: "Exchange Rates",
    answer: "Current account convertibility means a currency can be freely exchanged for trade and current transactions (imports/exports, remittances, travel) without restriction — Pakistan maintains current account convertibility under IMF Article VIII commitments.",
  },
  {
    id: "fx-capital-account-convertibility",
    aliases: buildAliases(["capital account convertibility"], ["what is capital account convertibility"]),
    category: "Exchange Rates",
    answer: "Capital account convertibility means a currency can be freely exchanged for investment and capital flows (like buying foreign stocks/bonds or repatriating profits) without restriction — Pakistan, like many developing economies, maintains some capital controls rather than full convertibility.",
  },
  {
    id: "fx-exchange-controls-what-are",
    aliases: buildAliases(["exchange controls", "capital controls"], ["what are exchange controls"]),
    category: "Exchange Rates",
    answer: "Exchange/capital controls are government restrictions on the flow of foreign currency in or out of a country, used to preserve scarce foreign reserves or limit destabilizing capital flight, though they can also discourage foreign investment.",
  },

  // ── PSX: margin trading, leverage products ───────────────────────────────
  {
    id: "psx-margin-trading-system",
    aliases: buildAliases(["margin trading system psx", "mts pakistan"], ["what is margin trading system psx"]),
    category: "PSX",
    answer: "The Margin Trading System (MTS) lets PSX investors borrow funds from a financier to buy additional shares using their existing portfolio as collateral, amplifying both potential gains and losses compared to trading with cash alone.",
  },
  {
    id: "psx-short-selling-rules",
    aliases: ["short selling rules on psx", "can you short sell on psx"],
    category: "PSX",
    answer: "PSX permits regulated short selling only on eligible securities through approved mechanisms, subject to SECP rules designed to prevent settlement failures — it's more restricted than short selling in many developed markets.",
  },

  // ── Technical analysis basics ────────────────────────────────────────────
  {
    id: "ta-technical-vs-fundamental",
    aliases: buildAliases(["technical analysis", "fundamental analysis"], ["technical analysis vs fundamental analysis"]),
    category: "Investing Basics",
    answer: "Fundamental analysis evaluates a company's intrinsic value using financial statements, earnings, and economic conditions. Technical analysis instead studies historical price and volume charts/patterns to forecast likely future price movements.",
  },
  {
    id: "ta-candlestick-chart-what-is",
    aliases: buildAliases(["candlestick chart"], ["what is a candlestick chart"]),
    category: "Investing Basics",
    answer: "A candlestick chart displays a security's open, high, low, and closing prices for a given period as a single 'candle,' widely used in technical analysis to visualize price action and trading patterns.",
  },
  {
    id: "ta-moving-average-what-is",
    aliases: buildAliases(["moving average"], ["what is a moving average in trading"]),
    category: "Investing Basics",
    answer: "A moving average smooths out price data by averaging it over a set period (e.g., 50-day or 200-day), helping traders identify the underlying trend direction by filtering out short-term noise.",
  },
  {
    id: "ta-support-resistance-what-is",
    aliases: buildAliases(["support and resistance"], ["what is support and resistance in trading"]),
    category: "Investing Basics",
    answer: "Support is a price level where a stock has historically tended to stop falling and bounce back up. Resistance is a price level where it has tended to stop rising — both are used by technical traders to anticipate potential turning points.",
  },
  {
    id: "ta-rsi-what-is",
    aliases: buildAliases(["rsi", "relative strength index"], ["what is rsi indicator"]),
    category: "Investing Basics",
    answer: "The Relative Strength Index (RSI) is a momentum indicator measuring the speed and magnitude of recent price changes on a 0-100 scale, commonly used to identify potentially overbought (above 70) or oversold (below 30) conditions.",
  },

  // ── Tax depth: capital gains, dividends, zakat ───────────────────────────
  {
    id: "tax-capital-gains-pakistan",
    aliases: buildAliases(["capital gains tax pakistan", "cgt pakistan"], ["how is capital gains tax calculated on stocks pakistan"]),
    category: "Pakistan Economy",
    answer: "Capital Gains Tax (CGT) in Pakistan applies to profits from selling assets like PSX shares or property, with the rate often depending on the holding period (shorter holding periods can attract higher rates) — current rates and rules should be confirmed with FBR guidance.",
  },
  {
    id: "tax-dividend-tax-pakistan",
    aliases: buildAliases(["dividend tax pakistan"], ["how are dividends taxed in pakistan"]),
    category: "Pakistan Economy",
    answer: "Dividend income in Pakistan is generally subject to withholding tax at the time of payment, with rates that can vary depending on the recipient's filer status and the paying company's sector — current rates should be confirmed with FBR guidance.",
  },
  {
    id: "tax-zakat-on-investments",
    aliases: buildAliases(["zakat on investments", "zakat on shares"], ["how is zakat calculated on stocks"]),
    category: "Investing Basics",
    answer: "Zakat is generally calculated as 2.5% of qualifying wealth held for a lunar year above a minimum threshold (nisab), including the market value of held shares and savings — specific treatment of different asset types can vary by scholarly interpretation.",
  },

  // ── Economic indicators: PMI, confidence, leading/lagging ───────────────
  {
    id: "econ-pmi-what-is",
    aliases: buildAliases(["pmi", "purchasing managers index"], ["what is pmi economic indicator"]),
    category: "Macroeconomics",
    answer: "The Purchasing Managers' Index (PMI) is a survey-based indicator of business activity in manufacturing or services, with readings above 50 indicating expansion and below 50 indicating contraction — a closely watched, timely gauge of economic momentum.",
  },
  {
    id: "econ-consumer-confidence-index",
    aliases: buildAliases(["consumer confidence index"], ["what is consumer confidence index"]),
    category: "Macroeconomics",
    answer: "The Consumer Confidence Index measures how optimistic or pessimistic consumers feel about the economy and their own finances, used as a leading indicator since confident consumers tend to spend more, supporting growth.",
  },
  {
    id: "econ-business-confidence-index",
    aliases: buildAliases(["business confidence index"], ["what is business confidence index"]),
    category: "Macroeconomics",
    answer: "The Business Confidence Index gauges sentiment among business leaders about current and future economic conditions, often correlating with future investment and hiring decisions.",
  },

  // ── Pakistan: SEZs & informal economy ────────────────────────────────────
  {
    id: "pk-sez-deep",
    aliases: ["what are special economic zones pakistan", "sez incentives pakistan"],
    category: "Pakistan Economy",
    answer: "Special Economic Zones (SEZs) in Pakistan offer tax holidays, duty exemptions, and streamlined regulations to attract domestic and foreign investment into designated industrial areas, often linked to CPEC-related industrial cooperation.",
  },
  {
    id: "pk-documentation-drive-what-is",
    aliases: buildAliases(["documentation of the economy"], ["what is fbr documentation drive"]),
    category: "Pakistan Economy",
    answer: "Documentation of the economy refers to government efforts (often via FBR) to bring informal/undocumented economic activity into the formal, tax-registered system — typically through stricter banking transaction rules, point-of-sale integration, and incentives for registration.",
  },

  // ── Investing: style/category comparisons ───────────────────────────────
  {
    id: "investing-blue-chip-what-is",
    aliases: buildAliases(["blue chip stock"], ["what is a blue chip stock"]),
    category: "Investing Basics",
    answer: "A blue-chip stock refers to shares of a large, well-established, financially stable company with a long track record, generally considered lower-risk than smaller or newer listed companies.",
  },
  {
    id: "investing-penny-stock-what-is",
    aliases: buildAliases(["penny stock"], ["what is a penny stock"]),
    category: "Investing Basics",
    answer: "A penny stock is a low-priced, often small-cap and thinly-traded share, frequently associated with higher volatility, lower liquidity, and greater risk of manipulation compared to established large-cap stocks.",
  },
  {
    id: "investing-defensive-vs-cyclical",
    aliases: buildAliases(["defensive stocks vs cyclical stocks"], ["what are defensive stocks", "what are cyclical stocks"]),
    category: "Investing Basics",
    answer: "Defensive stocks (like utilities or consumer staples) tend to hold up relatively well during economic downturns since demand for their products stays stable. Cyclical stocks (like autos or steel) tend to rise and fall more closely with the broader economic cycle.",
  },

  // ── Derivatives & hedging basics ─────────────────────────────────────────
  {
    id: "finance-derivatives-what-are",
    aliases: buildAliases(["derivatives", "financial derivatives"], ["what are derivatives in finance"]),
    category: "Investing Basics",
    answer: "Derivatives are financial contracts whose value is based on (derived from) an underlying asset, such as a stock, bond, currency, or commodity — common types include options, futures, and forwards, used for hedging or speculation.",
  },
  {
    id: "finance-options-what-are",
    aliases: buildAliases(["options trading", "stock options"], ["what are options in trading"]),
    category: "Investing Basics",
    answer: "An option gives the holder the right (not obligation) to buy (call option) or sell (put option) an underlying asset at a specified price within a set time period, in exchange for paying a premium.",
  },
  {
    id: "finance-futures-vs-forwards",
    aliases: buildAliases(["futures vs forwards", "futures contract"], ["what is a futures contract"]),
    category: "Investing Basics",
    answer: "A futures contract is a standardized agreement to buy/sell an asset at a set price on a future date, traded on an exchange with daily settlement. A forward contract is a similar but customized, privately negotiated agreement, typically traded over-the-counter.",
  },
  {
    id: "finance-hedging-what-is",
    aliases: buildAliases(["hedging"], ["what is hedging in finance"]),
    category: "Investing Basics",
    answer: "Hedging means taking an offsetting position to reduce the risk of adverse price movements in an existing investment or exposure — for example, an exporter might hedge currency risk using a forward contract to lock in a future exchange rate.",
  },

  // ── Banking: correspondent banking & cross-border ────────────────────────
  {
    id: "banking-nostro-vostro-accounts",
    aliases: buildAliases(["nostro account", "vostro account"], ["what is a nostro vostro account"]),
    category: "Banking",
    answer: "A Nostro account is a bank's account held in a foreign currency at a bank abroad ('our account with you'). A Vostro account is the same relationship from the other bank's perspective ('your account with us') — both facilitate international transactions and remittances.",
  },
  {
    id: "banking-swift-what-is",
    aliases: buildAliases(["swift", "swift code"], ["what is a swift code"]),
    category: "Banking",
    answer: "SWIFT is a global messaging network banks use to securely communicate payment instructions for international transfers. A SWIFT/BIC code uniquely identifies a specific bank when sending or receiving an international wire transfer.",
  },

  // ── Global market classification ─────────────────────────────────────────
  {
    id: "econ-emerging-market-what-is",
    aliases: buildAliases(["emerging market"], ["what is an emerging market economy"]),
    category: "Macroeconomics",
    answer: "An emerging market is a developing economy that has made progress toward more advanced market structures and institutions but hasn't yet reached the income, liquidity, and regulatory standards of fully developed markets.",
  },
  {
    id: "econ-frontier-market-what-is",
    aliases: buildAliases(["frontier market"], ["what is a frontier market", "is pakistan a frontier market"]),
    category: "Macroeconomics",
    answer: "A frontier market is an even less developed and less liquid market than an emerging market, typically smaller and riskier for foreign investors — index providers like MSCI periodically classify and reclassify countries, including Pakistan, between frontier and emerging market status.",
  },
  {
    id: "econ-msci-classification-what-is",
    aliases: buildAliases(["msci classification"], ["what is msci index classification"]),
    category: "Macroeconomics",
    answer: "MSCI (Morgan Stanley Capital International) classifies countries' stock markets as developed, emerging, or frontier based on economic development, market size/liquidity, and accessibility for foreign investors — its classification heavily influences global index-fund investment flows into a country.",
  },

  // ── Pakistan agriculture & key sectors ───────────────────────────────────
  {
    id: "pk-agriculture-support-price",
    aliases: buildAliases(["minimum support price pakistan", "wheat support price"], ["what is minimum support price"]),
    category: "Pakistan Economy",
    answer: "A minimum/support price is a government-guaranteed floor price for key crops like wheat, intended to protect farmer incomes from price crashes, though it can also distort planting decisions and burden public procurement budgets.",
  },
  {
    id: "pk-textile-sector-importance",
    aliases: ["why is textile sector important for pakistan", "textile sector contribution to pakistan economy"],
    category: "Exports",
    answer: "Textiles are Pakistan's largest manufacturing sector and largest export earner, built on the country's cotton production base, making the sector highly sensitive to cotton crop output, energy costs, and global demand conditions.",
  },

  // ── Trade policy basics ──────────────────────────────────────────────────
  {
    id: "trade-fta-what-is",
    aliases: buildAliases(["free trade agreement", "fta"], ["what is a free trade agreement"]),
    category: "Trade Balance",
    answer: "A Free Trade Agreement (FTA) is a treaty between two or more countries that reduces or eliminates tariffs and trade barriers on goods/services traded between them, aiming to boost bilateral trade volumes.",
  },
  {
    id: "trade-tariff-what-is",
    aliases: buildAliases(["tariff", "customs duty"], ["what is a tariff in trade"]),
    category: "Imports",
    answer: "A tariff (customs duty) is a tax imposed on imported (or sometimes exported) goods, used either to raise government revenue or to protect domestic industries by making imports more expensive relative to local products.",
  },
  {
    id: "trade-dumping-what-is",
    aliases: buildAliases(["dumping trade", "anti dumping duty"], ["what is dumping in international trade"]),
    category: "Trade Balance",
    answer: "Dumping occurs when a company exports a product at a price lower than what it charges in its home market (or below production cost), often to gain market share abroad. Importing countries can impose anti-dumping duties to offset this unfair pricing advantage.",
  },
  {
    id: "trade-customs-union-what-is",
    aliases: buildAliases(["customs union"], ["what is a customs union"]),
    category: "Trade Balance",
    answer: "A customs union is a trade bloc where member countries eliminate tariffs among themselves and adopt a common external tariff on imports from non-members, going a step further than a typical free trade agreement.",
  },

  // ── Energy sector & SOEs ─────────────────────────────────────────────────
  {
    id: "pk-ipp-capacity-payments",
    aliases: buildAliases(["independent power producer", "ipp capacity payments"], ["what are capacity payments pakistan"]),
    category: "Pakistan Economy",
    answer: "Independent Power Producers (IPPs) are privately-owned electricity generation companies that sell power to the national grid under long-term contracts. Capacity payments are fixed payments IPPs receive for being available to generate, regardless of how much electricity is actually used — a major driver of Pakistan's circular debt.",
  },
  {
    id: "pk-privatization-what-is",
    aliases: buildAliases(["privatization", "soe privatization pakistan"], ["what is privatization", "why does pakistan privatize state companies"]),
    category: "Pakistan Economy",
    answer: "Privatization is transferring ownership of a state-owned enterprise (SOE) to private investors, often pursued to reduce the fiscal burden of loss-making SOEs, improve efficiency, and raise one-time proceeds for the government.",
  },
  {
    id: "pk-soe-what-is",
    aliases: buildAliases(["soe", "state owned enterprise"], ["what is a state owned enterprise"]),
    category: "Pakistan Economy",
    answer: "A State-Owned Enterprise (SOE) is a company owned and controlled by the government, such as a national airline or power utility — many of Pakistan's SOEs have historically run at a loss, requiring ongoing budget subsidies.",
  },

  // ── IMF/SDR depth ─────────────────────────────────────────────────────────
  {
    id: "imf-sdr-what-is",
    aliases: buildAliases(["sdr", "special drawing rights"], ["what is special drawing rights"]),
    category: "IMF",
    answer: "Special Drawing Rights (SDR) are a supplementary international reserve asset created by the IMF, whose value is based on a basket of major currencies — member countries can use allocated SDRs to supplement their official reserves or exchange them for hard currency.",
  },
  {
    id: "imf-surveillance-vs-lending",
    aliases: ["imf surveillance vs lending role", "what is imf article iv consultation"],
    category: "IMF",
    answer: "Beyond lending, the IMF conducts regular 'surveillance' of member economies, including Article IV consultations — periodic assessments of a country's economic health and policies, even for countries with no active loan program.",
  },

  // ── Crypto: adoption & comparisons ───────────────────────────────────────
  {
    id: "crypto-vs-gold-hedge",
    aliases: ["crypto vs gold as inflation hedge", "is bitcoin a better hedge than gold"],
    category: "Crypto",
    answer: "Gold has a centuries-long track record as a store of value with lower volatility. Bitcoin is sometimes called 'digital gold' and has shown long-term appreciation, but with dramatically higher short-term volatility and a much shorter track record.",
  },
  {
    id: "crypto-p2p-trading-what-is",
    aliases: buildAliases(["p2p crypto trading", "peer to peer crypto trading"], ["what is p2p trading crypto"]),
    category: "Crypto",
    answer: "Peer-to-peer (P2P) crypto trading lets buyers and sellers transact directly with each other (often via an escrow-style platform) rather than through a centralized exchange's order book, commonly used in markets with banking restrictions on crypto.",
  },
  {
    id: "crypto-ico-what-is",
    aliases: buildAliases(["ico", "initial coin offering"], ["what is an ico crypto"]),
    category: "Crypto",
    answer: "An Initial Coin Offering (ICO) is a fundraising method where a crypto project sells new tokens to early investors/backers, similar in spirit to an IPO but typically with far less regulatory oversight and higher risk.",
  },
  {
    id: "crypto-airdrop-what-is",
    aliases: buildAliases(["crypto airdrop"], ["what is a crypto airdrop"]),
    category: "Crypto",
    answer: "A crypto airdrop is a free distribution of tokens to wallet addresses, often used by new projects to bootstrap a user base, reward early adopters, or decentralize token ownership.",
  },

  // ── PSX index methodology depth ──────────────────────────────────────────
  {
    id: "psx-all-share-index-what-is",
    aliases: buildAliases(["psx all share index"], ["what is the all share index psx"]),
    category: "PSX",
    answer: "The PSX All Share Index tracks the price performance of every eligible listed company on the exchange, offering a broader market gauge than the more widely-quoted KSE-100, which only includes the 100 largest, most liquid companies.",
  },
  {
    id: "kse100-index-methodology-deep",
    aliases: ["how is kse100 index calculated", "kse 100 free float weighting methodology"],
    category: "KSE-100",
    answer: "KSE-100 is a free-float market capitalization-weighted index, meaning each company's influence on the index level is based on its market value of publicly tradable shares (excluding locked-in/strategic holdings), reviewed and rebalanced periodically.",
  },
  {
    id: "psx-sector-indices-what-are",
    aliases: buildAliases(["psx sector indices"], ["what are sector indices psx"]),
    category: "PSX",
    answer: "PSX publishes sector-specific indices (like banking, cement, or oil & gas) tracking the performance of companies within a particular industry, useful for analyzing sector-level trends separately from the broad market.",
  },

  // ── Risk types ────────────────────────────────────────────────────────────
  {
    id: "finance-systematic-vs-unsystematic-risk",
    aliases: buildAliases(["systematic risk vs unsystematic risk"], ["what is systematic risk", "what is unsystematic risk"]),
    category: "Investing Basics",
    answer: "Systematic risk affects the entire market (like a recession or interest rate hike) and can't be diversified away. Unsystematic risk is specific to a single company or sector and can be reduced through diversification.",
  },
  {
    id: "finance-market-risk-vs-credit-risk",
    aliases: ["market risk vs credit risk vs liquidity risk", "what is operational risk in finance"],
    category: "Investing Basics",
    answer: "Market risk is exposure to broad price movements; credit risk is exposure to a borrower defaulting; liquidity risk is the risk of being unable to buy/sell quickly without a price impact; operational risk arises from internal failures, like system errors or fraud.",
  },

  // ── GDP per capita & nowcasting depth ────────────────────────────────────
  {
    id: "gdp-per-capita-ppp-deep",
    aliases: ["gdp per capita ppp meaning", "pakistan gdp per capita ppp vs nominal"],
    category: "GDP",
    answer: "GDP per capita on a Purchasing Power Parity (PPP) basis adjusts for differences in local cost of living, generally showing a higher figure for Pakistan than nominal (market exchange rate) GDP per capita, since prices for many goods/services are lower locally.",
  },
  {
    id: "gdp-nowcasting-what-is",
    aliases: buildAliases(["gdp nowcasting"], ["what is gdp nowcasting"]),
    category: "Quarterly GDP",
    answer: "GDP nowcasting uses timely, high-frequency proxy data (like LSM output, electricity consumption, or import volumes) to estimate current-quarter GDP growth before official statistics are released weeks or months later.",
  },

  // ── Banking: Basel & liquidity standards ─────────────────────────────────
  {
    id: "banking-basel-iii-what-is",
    aliases: buildAliases(["basel iii", "basel accord"], ["what is basel iii banking standard"]),
    category: "Banking",
    answer: "Basel III is a set of international banking regulatory standards (developed by the Basel Committee) covering capital adequacy, stress testing, and liquidity requirements, adopted by SBP to keep Pakistani banks resilient to financial shocks.",
  },
  {
    id: "banking-liquidity-coverage-ratio",
    aliases: buildAliases(["liquidity coverage ratio", "lcr banking"], ["what is liquidity coverage ratio"]),
    category: "Banking",
    answer: "The Liquidity Coverage Ratio (LCR) requires banks to hold enough high-quality liquid assets to survive a 30-day severe stress scenario, a key Basel III requirement aimed at preventing short-term liquidity crises.",
  },

  // ── Fiscal federalism & ESG ───────────────────────────────────────────────
  {
    id: "pk-18th-amendment-fiscal",
    aliases: buildAliases(["18th amendment fiscal devolution"], ["what is 18th amendment economic impact"]),
    category: "Pakistan Economy",
    answer: "Pakistan's 18th Constitutional Amendment (2010) devolved many spending responsibilities (like health and education) to the provinces while increasing their share of federal tax revenue under the NFC Award, significantly reshaping fiscal federalism.",
  },
  {
    id: "investing-esg-what-is",
    aliases: buildAliases(["esg investing", "esg"], ["what is esg investing", "what does esg stand for"]),
    category: "Investing Basics",
    answer: "ESG (Environmental, Social, and Governance) investing evaluates companies not just on financial metrics but also on environmental impact, social practices, and governance quality, used by some investors to screen or score potential investments.",
  },
  {
    id: "investing-reit-what-is",
    aliases: buildAliases(["reit", "real estate investment trust"], ["what is a reit pakistan"]),
    category: "Investing Basics",
    answer: "A REIT (Real Estate Investment Trust) pools investor money to buy and manage income-generating real estate, with units traded similarly to a closed-end fund — it lets investors gain real estate exposure without directly owning or managing property.",
  },
  {
    id: "investing-holding-vs-operating-company",
    aliases: ["holding company vs operating company", "what is a holding company"],
    category: "Investing Basics",
    answer: "An operating company directly runs a business producing goods or services. A holding company instead owns controlling stakes in other companies (subsidiaries) without itself conducting day-to-day operations.",
  },

  // ── Recession & default depth ────────────────────────────────────────────
  {
    id: "macro-recession-technical-definition",
    aliases: ["technical definition of recession", "two consecutive quarters of negative growth recession"],
    category: "Macroeconomics",
    answer: "A commonly cited rule of thumb defines a recession as two consecutive quarters of negative real GDP growth, though many official bodies (like the US NBER) use a broader assessment including employment, income, and production data rather than this single rule alone.",
  },
  {
    id: "macro-recession-vs-depression",
    aliases: ["recession vs depression economics", "what is an economic depression"],
    category: "Macroeconomics",
    answer: "A recession is a significant, broad decline in economic activity lasting more than a few months. A depression is a much more severe, prolonged, and deeper downturn — the term is reserved for historically extreme episodes like the 1930s Great Depression.",
  },
  {
    id: "debt-sovereign-default-what-happens",
    aliases: ["what happens when a country defaults on debt", "sovereign default consequences"],
    category: "Government Debt",
    answer: "A sovereign default occurs when a government fails to make scheduled debt payments. Consequences typically include credit rating downgrades, loss of market access for new borrowing, currency depreciation, and often a need to negotiate debt restructuring with creditors.",
  },
  {
    id: "debt-default-vs-restructuring",
    aliases: ["default vs restructuring debt", "is debt restructuring the same as default"],
    category: "Government Debt",
    answer: "A default is failing to make a payment as originally contracted. Restructuring is a negotiated change to debt terms (often to avoid or resolve a default) — a 'distressed' restructuring imposing losses on creditors can sometimes itself be classified as a default by rating agencies.",
  },

  // ── Market microstructure ────────────────────────────────────────────────
  {
    id: "finance-order-book-what-is",
    aliases: buildAliases(["order book trading"], ["what is an order book in trading"]),
    category: "Investing Basics",
    answer: "An order book is a real-time list of buy and sell orders for a security at different price levels, showing market depth — how much volume is available to trade near the current price.",
  },
  {
    id: "finance-market-depth-what-is",
    aliases: buildAliases(["market depth"], ["what is market depth trading"]),
    category: "Investing Basics",
    answer: "Market depth refers to how much buy/sell volume exists at various price levels in the order book — a market with greater depth can absorb larger trades without significantly moving the price.",
  },

  // ── KMI-30 / Shariah screening depth ─────────────────────────────────────
  {
    id: "kmi30-debt-screening-ratio",
    aliases: ["kmi-30 debt to asset screening ratio", "shariah compliant debt threshold pakistan"],
    category: "KMI-30",
    answer: "Shariah screening for KMI-30 eligibility typically caps interest-bearing debt relative to total assets at a set threshold (commonly around 30-37%, depending on the screening methodology), alongside business-activity and income-purification checks.",
  },
  {
    id: "kmi30-non-compliant-income-threshold",
    aliases: ["kmi-30 non-compliant income threshold", "how much non-shariah income is allowed"],
    category: "KMI-30",
    answer: "Shariah screening typically allows a small percentage (often around 5%) of a company's total revenue to come from incidental non-compliant activity before it's excluded from a Shariah-compliant index — any such income must still be 'purified' via charitable donation.",
  },

  // ── NBFCs, leasing, modaraba ──────────────────────────────────────────────
  {
    id: "pk-nbfc-what-is",
    aliases: buildAliases(["nbfc", "non bank financial company"], ["what is an nbfc pakistan"]),
    category: "Banking",
    answer: "A Non-Bank Financial Company (NBFC) provides financial services like leasing, investment finance, or asset management without holding a full banking license, regulated by SECP rather than SBP in Pakistan.",
  },
  {
    id: "pk-modaraba-what-is",
    aliases: buildAliases(["modaraba"], ["what is a modaraba pakistan"]),
    category: "Banking",
    answer: "A Modaraba is a Shariah-compliant business vehicle where one party provides capital and another provides management expertise, sharing profits per a pre-agreed ratio (and capital losses borne by the financier) — a distinct Islamic finance structure regulated in Pakistan.",
  },
  {
    id: "pk-leasing-company-what-is",
    aliases: buildAliases(["leasing company pakistan"], ["what does a leasing company do"]),
    category: "Banking",
    answer: "A leasing company finances the use of equipment or vehicles by purchasing the asset and renting it to a business or individual over time, often as an alternative to a conventional bank loan for acquiring fixed assets.",
  },

  // ── National income & mutual fund structure ──────────────────────────────
  {
    id: "macro-gni-what-is",
    aliases: buildAliases(["gni", "gross national income"], ["what is gni vs gdp vs gnp"]),
    category: "GDP",
    answer: "Gross National Income (GNI) is GDP plus net income received from abroad (like remittances and investment income) minus similar payments made to non-residents — conceptually very close to GNP, and often used interchangeably with it.",
  },
  {
    id: "mutual-funds-aum-what-is",
    aliases: buildAliases(["aum", "assets under management"], ["what does aum mean mutual fund"]),
    category: "Mutual Funds",
    answer: "Assets Under Management (AUM) is the total market value of all investments a fund or asset manager oversees on behalf of clients — a key indicator of a fund management company's scale.",
  },
  {
    id: "mutual-funds-trustee-custodian-roles",
    aliases: ["what is a trustee in a mutual fund", "what is a custodian bank mutual fund"],
    category: "Mutual Funds",
    answer: "A mutual fund's Asset Management Company (AMC) makes investment decisions, while an independent trustee/custodian (often a bank) holds the fund's actual assets in safekeeping, providing a layer of investor protection by separating fund management from asset custody.",
  },

  // ── PSX settlement & trading status depth ────────────────────────────────
  {
    id: "psx-t-plus-settlement-deep",
    aliases: ["what does t+2 settlement mean psx", "when issued trading meaning"],
    category: "PSX",
    answer: "T+2 settlement means a trade executed today is finalized (shares and funds exchanged) two business days later. 'When-issued' trading allows trading securities like bonus shares before they're formally credited to accounts, ahead of their official listing.",
  },
  {
    id: "psx-trading-suspension-what-is",
    aliases: buildAliases(["trading suspension psx"], ["why would psx suspend trading in a stock"]),
    category: "PSX",
    answer: "PSX or SECP can suspend trading in a company's shares — for example, due to failure to submit required financial disclosures, a pending corporate action, or a regulatory investigation — pausing all buying and selling until the issue is resolved.",
  },

  // ── Insurance basics (general) ───────────────────────────────────────────
  {
    id: "insurance-health-insurance-what-is",
    aliases: buildAliases(["health insurance"], ["what is health insurance"]),
    category: "Investing Basics",
    answer: "Health insurance covers medical expenses in exchange for regular premium payments, protecting against the financial impact of unexpected illness or injury — coverage scope, network hospitals, and exclusions vary significantly by policy.",
  },
  {
    id: "insurance-motor-insurance-pakistan",
    aliases: buildAliases(["motor insurance pakistan", "car insurance pakistan"], ["what is motor insurance"]),
    category: "Investing Basics",
    answer: "Motor insurance in Pakistan typically comes in two main forms: third-party liability (covering damage to others, sometimes mandatory) and comprehensive coverage (also covering damage to the insured's own vehicle).",
  },

  // ── Macro: real rates, safe havens ───────────────────────────────────────
  {
    id: "macro-real-vs-nominal-interest-rate",
    aliases: ["real interest rate vs nominal interest rate", "fisher equation explained"],
    category: "Interest Rates",
    answer: "The nominal interest rate is the stated rate before adjusting for inflation. The real interest rate subtracts expected inflation from the nominal rate (the Fisher equation), reflecting the actual increase in purchasing power a lender or saver earns.",
  },
  {
    id: "finance-safe-haven-asset-what-is",
    aliases: buildAliases(["safe haven asset"], ["what is a safe haven asset"]),
    category: "Investing Basics",
    answer: "A safe-haven asset (like gold, the US Dollar, or government bonds of stable economies) is expected to retain or increase in value during periods of market turmoil, as investors seek shelter from riskier assets.",
  },
  {
    id: "macro-structural-reform-what-is",
    aliases: buildAliases(["structural reform"], ["what is structural reform economics"]),
    category: "Macroeconomics",
    answer: "Structural reforms are policy changes aimed at improving an economy's long-term efficiency and growth potential — examples include tax reform, energy sector restructuring, SOE privatization, and improving business regulations, frequently tied to IMF program conditions in Pakistan.",
  },

  // ── Crypto: technical depth ──────────────────────────────────────────────
  {
    id: "crypto-layer1-vs-layer2",
    aliases: buildAliases(["layer 1 vs layer 2 blockchain"], ["what is a layer 2 blockchain"]),
    category: "Crypto",
    answer: "A Layer 1 blockchain (like Bitcoin or Ethereum) is the base network itself. Layer 2 solutions are built on top of a Layer 1 to improve speed and reduce transaction costs, while still relying on the underlying Layer 1 for final security and settlement.",
  },
  {
    id: "crypto-vasp-what-is",
    aliases: buildAliases(["vasp", "virtual asset service provider"], ["what is a vasp crypto"]),
    category: "Crypto",
    answer: "A Virtual Asset Service Provider (VASP) is a business — like a crypto exchange or wallet provider — that facilitates transactions or custody of virtual assets on behalf of customers, increasingly subject to anti-money-laundering regulation under FATF standards.",
  },

  // ── Pakistan: subsidies ──────────────────────────────────────────────────
  {
    id: "pk-fertilizer-subsidy-what-is",
    aliases: buildAliases(["fertilizer subsidy pakistan"], ["what is fertilizer subsidy"]),
    category: "Pakistan Economy",
    answer: "Fertilizer subsidies reduce the cost farmers pay for fertilizer (often through subsidized gas pricing for fertilizer manufacturers or direct price support), aimed at supporting agricultural output and food affordability, at a cost to the federal/provincial budget.",
  },
  {
    id: "pk-electricity-tariff-subsidy",
    aliases: buildAliases(["electricity subsidy pakistan", "tariff differential subsidy"], ["what is tariff differential subsidy"]),
    category: "Pakistan Economy",
    answer: "The Tariff Differential Subsidy covers the gap between the actual cost of generating/supplying electricity and the lower rate charged to certain consumer categories (like agricultural or lower-usage residential users), funded through the federal budget.",
  },

  // ── Cost of living & price comparisons ───────────────────────────────────
  {
    id: "econ-cost-of-living-index",
    aliases: buildAliases(["cost of living index"], ["what is a cost of living index"]),
    category: "Inflation",
    answer: "A cost of living index measures the relative cost of maintaining a certain standard of living across different cities or countries, accounting for prices of housing, food, transport, and other typical expenses.",
  },

  // ── Dividends mechanics & index rebalancing ──────────────────────────────
  {
    id: "psx-ex-dividend-date-what-is",
    aliases: buildAliases(["ex dividend date"], ["what is ex dividend date"]),
    category: "PSX",
    answer: "The ex-dividend date is the cutoff after which a buyer of a stock is no longer entitled to the most recently declared dividend — you must own the shares before this date to qualify for the payout.",
  },
  {
    id: "psx-book-closure-what-is",
    aliases: buildAliases(["book closure date psx"], ["what is book closure in stock market"]),
    category: "PSX",
    answer: "Book closure is the period during which a company temporarily freezes its share register to finalize the list of shareholders entitled to dividends, bonus shares, or voting rights at an upcoming corporate action.",
  },
  {
    id: "investing-dividend-aristocrats-what-are",
    aliases: buildAliases(["dividend aristocrats"], ["what are dividend aristocrats"]),
    category: "Investing Basics",
    answer: "Dividend aristocrats are companies with a long, consistent history of increasing their dividend payouts year after year, often viewed by income-focused investors as a sign of financial stability and shareholder-friendly management.",
  },
  {
    id: "etf-index-rebalancing-what-is",
    aliases: buildAliases(["index rebalancing"], ["what is index rebalancing"]),
    category: "ETFs",
    answer: "Index rebalancing is the periodic process of adjusting an index's constituent companies and their weights to reflect current market capitalization, free float, and eligibility criteria — index-tracking ETFs and funds must then trade to match the updated composition.",
  },

  // ── Trade strategy & development economics ───────────────────────────────
  {
    id: "trade-import-substitution-vs-export-led",
    aliases: ["import substitution vs export led growth", "what is import substitution industrialization"],
    category: "Trade Balance",
    answer: "Import substitution industrialization aims to reduce reliance on imports by building domestic production behind protective tariffs. Export-led growth instead focuses on building competitive industries to sell into global markets — many fast-growing Asian economies favored the latter strategy.",
  },
  {
    id: "trade-gsp-plus-what-is",
    aliases: buildAliases(["gsp plus", "gsp+ status"], ["what is gsp plus status pakistan"]),
    category: "Exports",
    answer: "GSP+ (Generalized Scheme of Preferences Plus) is a European Union trade scheme granting Pakistan preferential, largely duty-free access to EU markets for many export categories, conditional on compliance with international conventions on human rights, labor, and governance.",
  },
  {
    id: "macro-infant-industry-argument",
    aliases: buildAliases(["infant industry argument"], ["what is the infant industry argument"]),
    category: "Macroeconomics",
    answer: "The infant industry argument holds that new, developing domestic industries need temporary tariff protection from established foreign competitors until they become efficient and competitive enough to survive on their own.",
  },

  // ── Banking concentration & crypto slang ─────────────────────────────────
  {
    id: "banking-too-big-to-fail",
    aliases: buildAliases(["too big to fail"], ["what does too big to fail mean banking"]),
    category: "Banking",
    answer: "'Too big to fail' describes a financial institution so large and interconnected that its collapse could seriously destabilize the broader financial system, often leading governments to intervene/bail it out rather than allow a disorderly failure.",
  },
  {
    id: "crypto-altcoin-what-is",
    aliases: buildAliases(["altcoin"], ["what is an altcoin"]),
    category: "Crypto",
    answer: "An altcoin refers to any cryptocurrency other than Bitcoin — the term encompasses everything from major projects like Ethereum to thousands of smaller, less established tokens.",
  },
  {
    id: "crypto-meme-coin-what-is",
    aliases: buildAliases(["meme coin"], ["what is a meme coin"]),
    category: "Crypto",
    answer: "A meme coin is a cryptocurrency created largely around internet jokes or social media trends rather than underlying technology or utility, typically characterized by extreme speculation and very high volatility.",
  },

  // ── International bond issuance ───────────────────────────────────────────
  {
    id: "bonds-eurobond-what-is",
    aliases: buildAliases(["eurobond", "eurobond pakistan"], ["what is a eurobond"]),
    category: "Bonds",
    answer: "A Eurobond is a bond issued by a government or company in a currency other than its own (commonly US Dollars), sold to international investors — Pakistan periodically issues Eurobonds to raise foreign currency financing, with pricing reflecting its sovereign credit rating.",
  },
  {
    id: "bonds-panda-bond-what-is",
    aliases: buildAliases(["panda bond"], ["what is a panda bond"]),
    category: "Bonds",
    answer: "A Panda Bond is a Renminbi-denominated bond issued by a foreign entity in China's domestic bond market, an avenue some countries (including Pakistan, exploring this option) use to diversify their foreign currency financing sources beyond US Dollar markets.",
  },
  {
    id: "bonds-sukuk-eurobond-what-is",
    aliases: buildAliases(["international sukuk", "sukuk eurobond"], ["what is an international sukuk issuance"]),
    category: "Sukuk",
    answer: "An international Sukuk is a Shariah-compliant bond-equivalent issued in foreign markets (typically US Dollar-denominated) to international investors, allowing a government to raise foreign currency financing through an Islamic-compliant structure rather than a conventional Eurobond.",
  },
  {
    id: "bonds-inflation-linked-what-are",
    aliases: buildAliases(["inflation linked bond", "inflation indexed bond"], ["what is an inflation linked bond"]),
    category: "Bonds",
    answer: "An inflation-linked bond adjusts its principal or coupon payments based on a measure of inflation (like CPI), protecting investors' real (inflation-adjusted) returns — distinct from standard fixed-rate bonds, whose nominal payments don't adjust for rising prices.",
  },

  // ── Human capital & development depth ────────────────────────────────────
  {
    id: "worldbank-human-capital-index",
    aliases: buildAliases(["human capital index"], ["what is the human capital index"]),
    category: "World Bank",
    answer: "The World Bank's Human Capital Index estimates the productivity of a country's future workforce based on health and education outcomes for children born today, used as a benchmark for long-term development planning.",
  },
  {
    id: "macro-education-spending-gdp",
    aliases: ["education spending as percentage of gdp pakistan", "why is pakistan education spending low"],
    category: "Pakistan Economy",
    answer: "Pakistan's public spending on education as a share of GDP has historically lagged regional and international benchmarks, frequently cited by economists as a constraint on long-term human capital development and productivity growth.",
  },
  {
    id: "macro-health-spending-gdp",
    aliases: ["health spending as percentage of gdp pakistan", "pakistan public health expenditure"],
    category: "Pakistan Economy",
    answer: "Public health expenditure in Pakistan as a share of GDP has also historically been relatively low compared to international benchmarks, a factor often linked to weaker health outcomes and higher out-of-pocket healthcare costs for households.",
  },

  // ── Quarterly GDP & CPI regional depth ───────────────────────────────────
  {
    id: "quarterly-gdp-provisional-revision-deep",
    aliases: ["why does quarterly gdp get revised pakistan", "provisional quarterly gdp accuracy"],
    category: "Quarterly GDP",
    answer: "Quarterly GDP estimates are typically provisional, based on partial-year data and proxy indicators like LSM output, and are revised — sometimes significantly — once more complete annual data on agriculture and services becomes available.",
  },

  // ── Neobanks & remittance seasonality ────────────────────────────────────
  {
    id: "pk-digital-bank-what-is",
    aliases: buildAliases(["digital bank", "neobank"], ["what is a digital only bank pakistan"]),
    category: "Banking",
    answer: "A digital bank (neobank) operates without traditional physical branches, offering banking services entirely through mobile apps and online platforms — SBP has licensed digital bank operators in Pakistan as part of broader financial inclusion efforts.",
  },

  // ── Livestock & agriculture depth ────────────────────────────────────────
  {
    id: "pk-livestock-sector-importance",
    aliases: ["livestock sector contribution to pakistan gdp", "why is livestock important for pakistan economy"],
    category: "Pakistan Economy",
    answer: "Livestock is one of the largest sub-sectors within Pakistan's agriculture sector, contributing significantly to rural incomes and GDP through milk, meat, and related production, often exceeding crop sub-sector contribution in recent years.",
  },
  {
    id: "pk-agriculture-gdp-share-trend",
    aliases: ["agriculture share of pakistan gdp over time", "is pakistan agriculture share declining"],
    category: "Pakistan Economy",
    answer: "Agriculture's share of Pakistan's GDP has gradually declined over recent decades as services and industry have grown faster, a typical pattern of structural transformation seen in many developing economies, even though agriculture remains vital for employment.",
  },

  // ── Macro: J-curve effect ─────────────────────────────────────────────────
  {
    id: "macro-j-curve-effect",
    aliases: buildAliases(["j curve effect"], ["what is the j curve effect currency"]),
    category: "Exchange Rates",
    answer: "The J-curve effect describes how a currency devaluation can initially worsen the trade balance (as import costs rise faster than export volumes adjust) before eventually improving it as exporters gain competitiveness and import demand falls — named for the J-shaped path the trade balance traces over time.",
  },

  // ── Investing: warrants, convertibles, preference shares ────────────────
  {
    id: "investing-warrant-what-is",
    aliases: buildAliases(["stock warrant", "warrant finance"], ["what is a warrant in finance"]),
    category: "Investing Basics",
    answer: "A warrant gives the holder the right to buy a company's stock at a specified price before a set expiration date, similar to a call option but typically issued directly by the company itself (which creates new shares when exercised, unlike most options).",
  },
  {
    id: "investing-convertible-bond-what-is",
    aliases: buildAliases(["convertible bond"], ["what is a convertible bond"]),
    category: "Bonds",
    answer: "A convertible bond can be converted into a predetermined number of the issuing company's shares, giving investors fixed-income safety with the potential upside of equity participation if the stock performs well.",
  },
  {
    id: "investing-preference-shares-what-are",
    aliases: buildAliases(["preference shares", "preferred stock"], ["what are preference shares"]),
    category: "Investing Basics",
    answer: "Preference shares typically pay a fixed dividend and rank ahead of ordinary shares in claims on assets/dividends, but usually carry no voting rights — a hybrid between debt and equity in terms of risk and return characteristics.",
  },

  // ── Trade finance & sovereign wealth ──────────────────────────────────────
  {
    id: "trade-letter-of-credit-what-is",
    aliases: buildAliases(["letter of credit"], ["what is a letter of credit"]),
    category: "Imports",
    answer: "A letter of credit is a bank's guarantee of payment to an exporter on behalf of an importer, used to reduce trade risk in international transactions — the exporter ships goods confident that payment is assured once agreed conditions (like shipping documents) are met.",
  },
  {
    id: "finance-sovereign-wealth-fund-what-is",
    aliases: buildAliases(["sovereign wealth fund"], ["what is a sovereign wealth fund"]),
    category: "Macroeconomics",
    answer: "A sovereign wealth fund is a state-owned investment fund, often built from surplus reserves or commodity export revenues, used to invest in financial assets — Pakistan established a sovereign wealth fund structure to consolidate and invest stakes in select state assets.",
  },

  // ── PSX: foreign investment access ───────────────────────────────────────
  {
    id: "psx-foreign-portfolio-investment",
    aliases: buildAliases(["foreign portfolio investment psx"], ["how do foreign investors invest in psx"]),
    category: "PSX",
    answer: "Foreign investors can access PSX-listed shares through a Special Convertible Rupee Account (SCRA), which allows seamless conversion and repatriation of investment proceeds in foreign currency, simplifying entry and exit for international portfolio investment.",
  },
  {
    id: "psx-scra-what-is",
    aliases: buildAliases(["scra", "special convertible rupee account"], ["what is scra account pakistan"]),
    category: "PSX",
    answer: "A Special Convertible Rupee Account (SCRA) is a bank account structure that lets foreign investors bring in foreign currency, convert it to invest in Pakistani securities, and later repatriate proceeds back to foreign currency without separate regulatory approval each time.",
  },

  // ── Demographics ──────────────────────────────────────────────────────────
  {
    id: "pk-demographic-dividend-what-is",
    aliases: buildAliases(["demographic dividend pakistan"], ["what is demographic dividend"]),
    category: "Pakistan Economy",
    answer: "A demographic dividend refers to the economic growth potential that arises when a country has a large, growing working-age population relative to dependents — realizing this potential for Pakistan depends on creating enough jobs, education, and skills to productively employ its young population.",
  },
  {
    id: "pk-population-growth-rate",
    aliases: buildAliases(["pakistan population growth rate"], ["why is pakistan population growth high"]),
    category: "Pakistan Economy",
    answer: "Pakistan has one of the higher population growth rates in the region, which strains public services and infrastructure but also fuels its demographic dividend potential if matched with adequate education and job creation.",
  },

  // ── Fiscal rules & inflation targeting ───────────────────────────────────
  {
    id: "pk-frdl-act-what-is",
    aliases: buildAliases(["fiscal responsibility and debt limitation act", "frdl act"], ["what is frdl act pakistan"]),
    category: "Fiscal Deficit",
    answer: "The Fiscal Responsibility and Debt Limitation (FRDL) Act sets legal targets and ceilings for Pakistan's fiscal deficit and public debt levels, intended to enforce fiscal discipline over time, though actual outcomes have often exceeded these legislated limits.",
  },
  {
    id: "pk-budget-deficit-gdp-target",
    aliases: ["fiscal deficit target as percentage of gdp pakistan", "what is a sustainable fiscal deficit level"],
    category: "Fiscal Deficit",
    answer: "Pakistan's annual budget typically sets a fiscal deficit target expressed as a percentage of GDP, often guided or constrained by IMF program commitments — actual outturns can deviate from targets due to revenue shortfalls or unplanned spending.",
  },
  {
    id: "sbp-inflation-targeting-framework",
    aliases: buildAliases(["inflation targeting framework"], ["what is inflation targeting monetary policy"]),
    category: "SBP",
    answer: "Inflation targeting is a monetary policy framework where a central bank sets and communicates a specific inflation goal, then adjusts interest rates to steer actual inflation toward that target over time, aiming to anchor inflation expectations.",
  },
  {
    id: "sbp-exchange-rate-anchor",
    aliases: buildAliases(["exchange rate anchor"], ["what is an exchange rate anchor monetary policy"]),
    category: "SBP",
    answer: "An exchange rate anchor is a monetary policy approach where a country fixes or closely manages its currency to a stable foreign currency to import that currency's price stability, an alternative to inflation targeting that Pakistan has used at various points historically.",
  },

  // ── Demographics & urbanization ──────────────────────────────────────────
  {
    id: "pk-dependency-ratio-what-is",
    aliases: buildAliases(["dependency ratio"], ["what is dependency ratio economics"]),
    category: "Pakistan Economy",
    answer: "The dependency ratio measures the proportion of dependents (children and elderly) relative to the working-age population — a falling dependency ratio, as Pakistan's working-age share grows, is a key driver behind its demographic dividend potential.",
  },
  {
    id: "pk-urbanization-rate-what-is",
    aliases: buildAliases(["urbanization rate pakistan"], ["why is urbanization important for pakistan economy"]),
    category: "Pakistan Economy",
    answer: "Urbanization — the share of population living in cities — tends to correlate with higher productivity and services-sector growth, though rapid, unplanned urbanization in Pakistan has also strained housing, infrastructure, and municipal services.",
  },

  // ── Trade & bank finance instruments ──────────────────────────────────────
  {
    id: "trade-bank-guarantee-what-is",
    aliases: buildAliases(["bank guarantee"], ["what is a bank guarantee"]),
    category: "Banking",
    answer: "A bank guarantee is a bank's commitment to cover a customer's payment obligation to a third party if the customer fails to pay, commonly used in trade and large contracts to reduce counterparty risk.",
  },
  {
    id: "trade-export-financing-what-is",
    aliases: buildAliases(["export refinance scheme", "export financing pakistan"], ["what is export refinance scheme sbp"]),
    category: "SBP",
    answer: "SBP's Export Refinance Scheme provides exporters with financing at concessional rates to support pre- and post-shipment working capital needs, intended to boost export competitiveness by lowering financing costs.",
  },

  // ── Alternative financing & crypto governance ────────────────────────────
  {
    id: "finance-crowdfunding-what-is",
    aliases: buildAliases(["crowdfunding"], ["what is crowdfunding"]),
    category: "Investing Basics",
    answer: "Crowdfunding raises small amounts of money from a large number of people, typically via online platforms, to fund a business, project, or cause — equity crowdfunding lets backers receive ownership stakes in return for their contribution.",
  },
  {
    id: "finance-p2p-lending-what-is",
    aliases: buildAliases(["peer to peer lending", "p2p lending"], ["what is p2p lending"]),
    category: "Investing Basics",
    answer: "Peer-to-peer (P2P) lending platforms connect individual borrowers directly with individual lenders, bypassing traditional banks — lenders earn interest while borrowers may access credit at potentially better terms than conventional channels.",
  },
  {
    id: "crypto-dao-what-is",
    aliases: buildAliases(["dao", "decentralized autonomous organization"], ["what is a dao crypto"]),
    category: "Crypto",
    answer: "A DAO (Decentralized Autonomous Organization) is an organization governed by rules encoded in smart contracts and member voting on the blockchain, rather than by a traditional centralized management structure.",
  },
  {
    id: "crypto-regulatory-sandbox-what-is",
    aliases: buildAliases(["regulatory sandbox"], ["what is a regulatory sandbox fintech"]),
    category: "Crypto",
    answer: "A regulatory sandbox lets fintech or crypto firms test new products under relaxed regulatory conditions and close supervisory oversight, helping regulators like SBP or SECP understand and shape rules for emerging financial technology before wider market rollout.",
  },

  // ── Crypto wallet security depth ─────────────────────────────────────────
  {
    id: "crypto-seed-phrase-what-is",
    aliases: buildAliases(["seed phrase", "private key crypto"], ["what is a crypto seed phrase", "what is a private key in crypto"]),
    category: "Crypto",
    answer: "A seed phrase is a sequence of words that generates and can restore access to a crypto wallet's private keys — anyone with your seed phrase can fully control your funds, so it must be kept offline and never shared.",
  },

  // ── Islamic banking deposit products ──────────────────────────────────────
  {
    id: "banking-mudarabah-savings-what-is",
    aliases: buildAliases(["mudarabah savings account"], ["what is a mudarabah based savings account"]),
    category: "Banking",
    answer: "A Mudarabah-based savings account is an Islamic banking deposit product where the depositor (Rab-ul-Maal) provides funds and the bank (Mudarib) invests them in Shariah-compliant activities, sharing the resulting profit per a pre-agreed ratio instead of paying fixed interest.",
  },
  {
    id: "banking-murabaha-what-is",
    aliases: buildAliases(["murabaha financing"], ["what is murabaha in islamic banking"]),
    category: "Banking",
    answer: "Murabaha is an Islamic financing structure where a bank purchases an asset a customer wants and resells it to them at a disclosed markup, paid in installments — used as a Shariah-compliant alternative to a conventional interest-bearing loan.",
  },

  // ── World Bank financing instruments ──────────────────────────────────────
  {
    id: "worldbank-pforr-what-is",
    aliases: buildAliases(["program for results", "pforr"], ["what is program for results financing"]),
    category: "World Bank",
    answer: "Program-for-Results (PforR) is a World Bank financing instrument that disburses funds based on a borrowing country achieving specific, verified results (rather than against individual expenditures), aimed at strengthening institutional capacity and accountability.",
  },

  // ── Currency basket & trade-weighted measures ────────────────────────────
  {
    id: "fx-trade-weighted-exchange-rate",
    aliases: buildAliases(["trade weighted exchange rate", "nominal effective exchange rate"], ["what is nominal effective exchange rate"]),
    category: "Exchange Rates",
    answer: "A trade-weighted (nominal effective) exchange rate measures a currency's value against a basket of trading-partner currencies, weighted by trade volume — giving a more complete competitiveness picture than tracking a single bilateral rate like USD/PKR alone.",
  },

  // ── Investment performance measurement ────────────────────────────────────
  {
    id: "investing-holding-period-return",
    aliases: buildAliases(["holding period return"], ["what is holding period return"]),
    category: "Investing Basics",
    answer: "Holding period return is the total return earned on an investment over the entire time it was held, including both price appreciation and any income like dividends, expressed as a percentage of the original investment.",
  },
  {
    id: "investing-annualized-return-what-is",
    aliases: buildAliases(["annualized return", "cagr"], ["what is cagr", "compound annual growth rate"]),
    category: "Investing Basics",
    answer: "Annualized return (often expressed as CAGR — Compound Annual Growth Rate) converts a total return earned over multiple years into an equivalent constant yearly growth rate, making it easier to compare investments held for different lengths of time.",
  },

  // ── PSX corporate governance ──────────────────────────────────────────────
  {
    id: "psx-agm-egm-what-are",
    aliases: buildAliases(["agm", "egm", "annual general meeting"], ["what is an agm", "what is an egm"]),
    category: "PSX",
    answer: "An AGM (Annual General Meeting) is a company's required yearly meeting where shareholders approve financial statements, dividends, and director elections. An EGM (Extraordinary General Meeting) is called separately to address urgent or special matters outside the regular AGM cycle.",
  },
  {
    id: "psx-proxy-voting-what-is",
    aliases: buildAliases(["proxy voting shares"], ["what is proxy voting shareholders"]),
    category: "PSX",
    answer: "Proxy voting lets a shareholder who cannot attend a company meeting in person authorize another person to vote on their behalf, ensuring their shares' voting rights are still exercised.",
  },

  // ── Pakistan: textile competitiveness ────────────────────────────────────
  {
    id: "pk-textile-competitiveness-regional",
    aliases: ["pakistan textile competitiveness vs bangladesh", "why is bangladesh textile exports bigger than pakistan"],
    category: "Exports",
    answer: "Pakistan's textile exports have grown more slowly than regional competitors like Bangladesh and Vietnam in recent decades, often attributed to higher energy costs, lower investment in value-added garment manufacturing, and policy/tariff disadvantages in some key export markets.",
  },

  // ── PSX: stock splits & trading mechanics ────────────────────────────────
  {
    id: "psx-stock-split-what-is",
    aliases: buildAliases(["stock split"], ["what is a stock split", "stock split vs bonus shares"]),
    category: "PSX",
    answer: "A stock split divides each existing share into multiple shares (e.g., a 2-for-1 split), proportionally reducing the price per share without changing total market value — distinct from a bonus issue, though both increase share count for shareholders without raising new capital.",
  },
  {
    id: "psx-trading-session-timing",
    aliases: buildAliases(["psx trading hours", "psx trading session"], ["when does psx open and close"]),
    category: "PSX",
    answer: "PSX trading sessions run on business days during set hours set by the exchange, typically including a pre-open session for price discovery followed by continuous regular trading — exact timings can vary seasonally and should be confirmed via the official PSX trading calendar.",
  },
  {
    id: "psx-dividend-yield-trap",
    aliases: buildAliases(["dividend yield trap"], ["what is a dividend trap stocks", "why is a very high dividend yield risky"]),
    category: "PSX",
    answer: "A dividend yield trap is when a stock's yield looks unusually high mainly because its share price has fallen sharply (not because the dividend grew), often signaling underlying business trouble and a real risk that the dividend gets cut.",
  },

  // ── Market efficiency & arbitrage ────────────────────────────────────────
  {
    id: "investing-efficient-market-hypothesis",
    aliases: buildAliases(["efficient market hypothesis", "emh"], ["what is the efficient market hypothesis"]),
    category: "Investing Basics",
    answer: "The Efficient Market Hypothesis holds that asset prices already reflect all available information, implying it's very difficult to consistently 'beat the market' through stock-picking or timing — a key argument in favor of passive, index-based investing.",
  },
  {
    id: "investing-random-walk-theory",
    aliases: buildAliases(["random walk theory"], ["what is random walk theory investing"]),
    category: "Investing Basics",
    answer: "Random walk theory argues that short-term price movements are essentially unpredictable and resemble a random pattern, implying past price patterns (the basis of much technical analysis) have limited power to predict future prices.",
  },
  {
    id: "finance-arbitrage-what-is",
    aliases: buildAliases(["arbitrage"], ["what is arbitrage in finance"]),
    category: "Investing Basics",
    answer: "Arbitrage means simultaneously buying and selling the same (or equivalent) asset in different markets to profit from a temporary price difference, with minimal risk — arbitrage opportunities tend to be small and quickly closed by other market participants.",
  },

  // ── Banking: loan classification & facilities ────────────────────────────
  {
    id: "banking-loan-classification-categories",
    aliases: buildAliases(["loan classification banking"], ["what is substandard doubtful loss loan classification"]),
    category: "Banking",
    answer: "SBP prudential regulations classify loans by repayment performance — typically categories like 'Substandard,' 'Doubtful,' and 'Loss' for overdue accounts — determining how much provisioning a bank must hold against each loan.",
  },
  {
    id: "banking-overdraft-running-finance",
    aliases: buildAliases(["overdraft facility", "running finance"], ["what is an overdraft facility", "what is running finance pakistan"]),
    category: "Banking",
    answer: "An overdraft (or running finance) facility lets a business or individual withdraw more than their account balance, up to an approved limit, paying interest only on the amount actually utilized — commonly used to manage short-term working capital gaps.",
  },

  // ── Crypto: market correlation ───────────────────────────────────────────
  {
    id: "crypto-correlation-stock-market",
    aliases: ["does bitcoin correlate with stock market", "crypto correlation with stocks"],
    category: "Crypto",
    answer: "Bitcoin and other major cryptocurrencies have at times shown meaningful price correlation with risk assets like tech stocks, especially during periods of broad market stress, challenging the idea that crypto always acts as an uncorrelated diversifier.",
  },

  // ── Monetary policy: unconventional tools ────────────────────────────────
  {
    id: "macro-quantitative-easing-what-is",
    aliases: buildAliases(["quantitative easing", "qe"], ["what is quantitative easing"]),
    category: "Macroeconomics",
    answer: "Quantitative Easing (QE) is when a central bank creates new money to buy financial assets (typically government bonds), aiming to lower long-term interest rates and inject liquidity when conventional rate cuts alone aren't enough to stimulate the economy.",
  },
  {
    id: "macro-helicopter-money-what-is",
    aliases: buildAliases(["helicopter money"], ["what is helicopter money economics"]),
    category: "Macroeconomics",
    answer: "Helicopter money refers to a central bank directly distributing newly created money to the public or government to spend, bypassing the banking/lending system entirely — a more direct, controversial alternative to QE for stimulating demand.",
  },
  {
    id: "macro-negative-interest-rates",
    aliases: buildAliases(["negative interest rates"], ["what are negative interest rates"]),
    category: "Interest Rates",
    answer: "Negative interest rates mean depositors effectively pay to hold money with a bank (or a bond investor accepts a guaranteed loss if held to maturity) — an unconventional policy some advanced-economy central banks have used to push spending and lending during very weak demand.",
  },
  {
    id: "macro-currency-war-what-is",
    aliases: buildAliases(["currency war"], ["what is a currency war"]),
    category: "Exchange Rates",
    answer: "A currency war describes a situation where multiple countries competitively devalue or weaken their currencies to boost export competitiveness, which can escalate into retaliatory measures and broader trade tension.",
  },

  // ── Forex: black market & capital flight ─────────────────────────────────
  {
    id: "fx-black-market-rate-what-is",
    aliases: buildAliases(["black market exchange rate", "kerb market rate"], ["what is the kerb dollar rate pakistan"]),
    category: "Exchange Rates",
    answer: "A black market (or 'kerb') exchange rate is an unofficial, often illegal rate at which currency trades outside regulated banking and exchange company channels, typically emerging when official rates are misaligned with market reality or capital controls are tight.",
  },
  {
    id: "pk-capital-flight-what-is",
    aliases: buildAliases(["capital flight"], ["what is capital flight economics"]),
    category: "Pakistan Economy",
    answer: "Capital flight is the rapid outflow of money and assets from a country, usually triggered by political instability, currency depreciation fears, or loss of confidence in the economy — it can worsen reserve and currency pressure during a crisis.",
  },
  {
    id: "pk-petroleum-levy-what-is",
    aliases: buildAliases(["petroleum levy pakistan"], ["what is petroleum levy"]),
    category: "Pakistan Economy",
    answer: "The Petroleum Levy is a fixed per-liter tax the Pakistani government charges on petroleum products, an important and relatively easy-to-collect source of non-tax federal revenue, though it adds directly to pump prices for consumers.",
  },
  {
    id: "macro-currency-board-what-is",
    aliases: buildAliases(["currency board system"], ["what is a currency board"]),
    category: "Exchange Rates",
    answer: "A currency board is a strict monetary arrangement where a country's currency is fully backed by and fixed to a foreign reserve currency, removing the central bank's discretion to print money independently — a more rigid alternative to a managed float or simple peg.",
  },

  // ── Bond market terminology ───────────────────────────────────────────────
  {
    id: "bonds-basis-point-what-is",
    aliases: buildAliases(["basis point", "bps"], ["what is a basis point"]),
    category: "Bonds",
    answer: "A basis point (bps) is one-hundredth of one percentage point (0.01%) — used in finance to describe small changes in interest rates or yields precisely, e.g., a rate cut 'of 100 basis points' means a 1 percentage point cut.",
  },
  {
    id: "bonds-rating-outlook-what-is",
    aliases: buildAliases(["credit rating outlook"], ["what does a positive negative stable rating outlook mean"]),
    category: "Government Debt",
    answer: "A credit rating outlook (positive, negative, or stable) signals the rating agency's view on the likely DIRECTION of a future rating change, even before an actual upgrade or downgrade occurs — a 'negative outlook' suggests a downgrade may be coming if trends don't improve.",
  },

  // ── Banking: AML/KYC & financial system structure ────────────────────────
  {
    id: "banking-kyc-what-is",
    aliases: buildAliases(["kyc", "know your customer"], ["what is kyc banking"]),
    category: "Banking",
    answer: "KYC (Know Your Customer) refers to the identity verification and due diligence procedures banks must perform on customers when opening accounts or processing large transactions, required under anti-money-laundering regulations.",
  },
  {
    id: "banking-aml-what-is",
    aliases: buildAliases(["aml", "anti money laundering"], ["what is aml banking"]),
    category: "Banking",
    answer: "AML (Anti-Money Laundering) refers to the laws, regulations, and procedures designed to prevent criminally-obtained funds from being disguised as legitimate income through the financial system.",
  },
  {
    id: "finance-financial-intermediary-what-is",
    aliases: buildAliases(["financial intermediary"], ["what is a financial intermediary"]),
    category: "Banking",
    answer: "A financial intermediary (like a bank, mutual fund, or insurance company) connects savers/investors with borrowers/businesses needing capital, channeling funds through the economy more efficiently than direct lending between individuals.",
  },
  {
    id: "banking-shadow-banking-what-is",
    aliases: buildAliases(["shadow banking"], ["what is shadow banking"]),
    category: "Banking",
    answer: "Shadow banking refers to credit intermediation activities (like lending) conducted by non-bank entities outside traditional, heavily-regulated banking — it can fill credit gaps but is also less transparent and less subject to safety-net protections like deposit insurance.",
  },

  // ── Core economic principles ─────────────────────────────────────────────
  {
    id: "econ-comparative-advantage-what-is",
    aliases: buildAliases(["comparative advantage"], ["what is comparative advantage"]),
    category: "Macroeconomics",
    answer: "Comparative advantage is the ability to produce a good or service at a lower OPPORTUNITY cost than another producer — the foundational argument for why countries (or individuals) gain from specializing and trading, even if one party is better at producing everything in absolute terms.",
  },
  {
    id: "econ-absolute-advantage-what-is",
    aliases: buildAliases(["absolute advantage"], ["what is absolute advantage", "comparative advantage vs absolute advantage"]),
    category: "Macroeconomics",
    answer: "Absolute advantage means being able to produce more of a good using the same resources than another producer. Comparative advantage (opportunity cost-based) is what actually determines whether trade is mutually beneficial, not absolute advantage alone.",
  },
  {
    id: "econ-economies-of-scale-what-is",
    aliases: buildAliases(["economies of scale"], ["what are economies of scale"]),
    category: "Macroeconomics",
    answer: "Economies of scale occur when a company's average cost per unit falls as production volume increases, due to spreading fixed costs over more output, bulk purchasing power, and specialization — a key driver of why larger firms can often compete on price.",
  },
  {
    id: "econ-creative-destruction-what-is",
    aliases: buildAliases(["creative destruction"], ["what is creative destruction economics"]),
    category: "Macroeconomics",
    answer: "Creative destruction, a term from economist Joseph Schumpeter, describes how innovation continuously destroys older industries and business models while creating new ones — a core driver of long-run economic growth and productivity, despite short-term job and capital losses.",
  },
  {
    id: "econ-monopoly-what-is",
    aliases: buildAliases(["monopoly"], ["what is a monopoly economics"]),
    category: "Macroeconomics",
    answer: "A monopoly exists when a single firm dominates an entire market with no close competitors, giving it significant pricing power — often subject to special regulation since it can lead to higher prices and reduced output compared to competitive markets.",
  },
  {
    id: "econ-oligopoly-what-is",
    aliases: buildAliases(["oligopoly"], ["what is an oligopoly"]),
    category: "Macroeconomics",
    answer: "An oligopoly is a market dominated by a small number of large firms, where each firm's decisions (on price, output) significantly affect and are affected by its rivals' actions — common in capital-intensive industries like cement or telecom.",
  },
  {
    id: "econ-perfect-competition-what-is",
    aliases: buildAliases(["perfect competition"], ["what is perfect competition economics"]),
    category: "Macroeconomics",
    answer: "Perfect competition is a theoretical market structure with many small firms selling identical products, no single firm able to influence price, and free entry/exit — used mainly as an economic benchmark, since few real-world markets fully match it.",
  },
  {
    id: "econ-public-good-what-is",
    aliases: buildAliases(["public good"], ["what is a public good economics"]),
    category: "Macroeconomics",
    answer: "A public good (like national defense or street lighting) is non-excludable (can't stop people from using it) and non-rivalrous (one person's use doesn't reduce availability for others) — markets tend to under-provide public goods, which is why governments typically fund them.",
  },
  {
    id: "econ-externality-what-is",
    aliases: buildAliases(["externality", "negative externality"], ["what is an externality economics"]),
    category: "Macroeconomics",
    answer: "An externality is a cost or benefit affecting a third party not directly involved in a transaction — pollution from a factory (negative externality) is a classic example, often used to justify taxes, subsidies, or regulation to correct market outcomes.",
  },
  {
    id: "econ-moral-hazard-what-is",
    aliases: buildAliases(["moral hazard"], ["what is moral hazard economics"]),
    category: "Macroeconomics",
    answer: "Moral hazard occurs when a party takes on more risk because they don't bear the full consequences of that risk, often because someone else (like an insurer or the government) will absorb losses — a key concern behind 'too big to fail' bank bailouts.",
  },
  {
    id: "econ-adverse-selection-what-is",
    aliases: buildAliases(["adverse selection"], ["what is adverse selection economics"]),
    category: "Macroeconomics",
    answer: "Adverse selection occurs when one party in a transaction has more information than the other, leading to a market skewed toward higher-risk participants — classically seen in insurance, where people most likely to claim are also most likely to seek coverage.",
  },

  // ── Market cycles & sentiment ─────────────────────────────────────────────
  {
    id: "investing-bull-market-what-is",
    aliases: buildAliases(["bull market"], ["what is a bull market"]),
    category: "Investing Basics",
    answer: "A bull market describes a sustained period of rising prices across a market or index, typically accompanied by investor optimism and economic growth — there's no single official threshold, but a 20%+ rise from a recent low is a commonly cited rule of thumb.",
  },
  {
    id: "investing-bear-market-what-is",
    aliases: buildAliases(["bear market"], ["what is a bear market"]),
    category: "Investing Basics",
    answer: "A bear market describes a sustained period of falling prices, conventionally defined as a 20%+ decline from a recent peak, usually accompanied by pessimism and often (though not always) coinciding with a broader economic slowdown.",
  },
  {
    id: "investing-market-correction-what-is",
    aliases: buildAliases(["market correction"], ["what is a stock market correction"]),
    category: "Investing Basics",
    answer: "A market correction is a decline of roughly 10-20% from a recent high — smaller and typically shorter-lived than a bear market, often viewed as a normal, healthy pullback after a period of strong gains rather than a sign of deeper economic trouble.",
  },
  {
    id: "investing-market-crash-what-is",
    aliases: buildAliases(["market crash", "stock market crash"], ["what is a market crash"]),
    category: "Investing Basics",
    answer: "A market crash is a sudden, severe, and rapid decline in asset prices, typically over days rather than months, often triggered by panic selling, a major shock event, or the bursting of a speculative bubble.",
  },

  // ── Behavioral economics ─────────────────────────────────────────────────
  {
    id: "behavioral-loss-aversion-what-is",
    aliases: buildAliases(["loss aversion"], ["what is loss aversion behavioral economics"]),
    category: "Investing Basics",
    answer: "Loss aversion is the behavioral tendency to feel the pain of a loss roughly twice as strongly as the pleasure of an equivalent gain, which can lead investors to hold losing investments too long or sell winners too early.",
  },
  {
    id: "behavioral-anchoring-bias-what-is",
    aliases: buildAliases(["anchoring bias"], ["what is anchoring bias investing"]),
    category: "Investing Basics",
    answer: "Anchoring bias is the tendency to rely too heavily on an initial reference point (like a stock's purchase price or a past high) when making decisions, even when that reference point is no longer relevant to current value.",
  },
  {
    id: "behavioral-herd-behavior-what-is",
    aliases: buildAliases(["herd behavior", "herd mentality investing"], ["what is herd behavior in markets"]),
    category: "Investing Basics",
    answer: "Herd behavior describes investors following the crowd's actions rather than their own independent analysis, which can amplify market bubbles on the way up and panic selling on the way down.",
  },
  {
    id: "behavioral-confirmation-bias-what-is",
    aliases: buildAliases(["confirmation bias"], ["what is confirmation bias investing"]),
    category: "Investing Basics",
    answer: "Confirmation bias is the tendency to seek out and favor information that confirms existing beliefs while ignoring contradicting evidence — in investing, this can mean ignoring warning signs about a stock you already own or believe in.",
  },

  // ── Liquidity trap & unemployment types ──────────────────────────────────
  {
    id: "macro-liquidity-trap-what-is",
    aliases: buildAliases(["liquidity trap"], ["what is a liquidity trap economics"]),
    category: "Macroeconomics",
    answer: "A liquidity trap occurs when interest rates are already very low (near zero) but people still prefer holding cash over spending or investing, making further rate cuts ineffective at stimulating the economy — a scenario where unconventional tools like QE are often considered instead.",
  },
  {
    id: "macro-unemployment-structural-frictional-cyclical",
    aliases: ["structural unemployment vs frictional vs cyclical", "what is frictional unemployment", "what is structural unemployment", "what is cyclical unemployment"],
    category: "Macroeconomics",
    answer: "Frictional unemployment is short-term, from people between jobs. Structural unemployment arises from a mismatch between workers' skills and available jobs. Cyclical unemployment rises and falls with the business cycle, driven by overall demand in the economy.",
  },

  // ── Banking infrastructure ────────────────────────────────────────────────
  {
    id: "banking-clearing-house-what-is",
    aliases: buildAliases(["clearing house"], ["what is a clearing house finance"]),
    category: "Banking",
    answer: "A clearing house is an intermediary that settles transactions between buyers and sellers (or between banks), guaranteeing trades and reducing counterparty risk by acting as the central counterparty for all parties involved.",
  },

  // ── Investing strategy ────────────────────────────────────────────────────
  {
    id: "investing-lump-sum-vs-dca",
    aliases: ["lump sum investing vs dollar cost averaging", "is it better to invest lump sum or gradually"],
    category: "Investing Basics",
    answer: "Investing a lump sum immediately has historically outperformed dollar-cost averaging more often than not (since markets tend to rise over time), but DCA can reduce regret and the psychological impact of bad timing — the right choice depends on risk tolerance, not just expected returns.",
  },

  // ── Game theory ───────────────────────────────────────────────────────────
  {
    id: "econ-game-theory-what-is",
    aliases: buildAliases(["game theory"], ["what is game theory economics"]),
    category: "Macroeconomics",
    answer: "Game theory studies how rational decision-makers' choices affect and are affected by each other's strategies — used in economics to analyze competition between firms, central bank policy credibility, and trade negotiations.",
  },
  {
    id: "econ-nash-equilibrium-what-is",
    aliases: buildAliases(["nash equilibrium"], ["what is nash equilibrium"]),
    category: "Macroeconomics",
    answer: "A Nash equilibrium is a situation in game theory where no participant can improve their outcome by changing only their own strategy, given what everyone else is doing — each player's choice is already their best response to the others'.",
  },

  // ── Crypto: market manipulation ──────────────────────────────────────────
  {
    id: "crypto-wash-trading-what-is",
    aliases: buildAliases(["wash trading"], ["what is wash trading crypto"]),
    category: "Crypto",
    answer: "Wash trading is artificially inflating trading volume by simultaneously buying and selling the same asset (often through linked accounts) to create a false impression of demand or liquidity — illegal in regulated markets and a known issue on some crypto exchanges.",
  },

  // ── Historical monetary systems ──────────────────────────────────────────
  {
    id: "macro-gold-standard-what-is",
    aliases: buildAliases(["gold standard"], ["what is the gold standard monetary system"]),
    category: "Macroeconomics",
    answer: "The gold standard was a monetary system where a currency's value was directly linked to a fixed quantity of gold, limiting a government's ability to print money freely — most countries, including the US, abandoned it by the early 1970s in favor of fiat currency.",
  },
  {
    id: "macro-bretton-woods-what-is",
    aliases: buildAliases(["bretton woods system"], ["what was the bretton woods agreement"]),
    category: "Macroeconomics",
    answer: "The Bretton Woods system (1944-1971) pegged major currencies to the US Dollar, which was itself convertible to gold, and established the IMF and World Bank — it collapsed in 1971 when the US ended Dollar-gold convertibility, ushering in today's floating exchange rate era.",
  },

  // ── Personal finance: mortgages, annuities, insurance products ──────────
  {
    id: "finance-mortgage-what-is",
    aliases: buildAliases(["mortgage", "house finance pakistan"], ["what is a mortgage loan"]),
    category: "Banking",
    answer: "A mortgage (house finance) is a long-term loan secured against property, where the lender can repossess the property if the borrower fails to repay — in Pakistan, both conventional mortgages and Shariah-compliant Ijarah/Diminishing Musharakah-based house financing are available.",
  },
  {
    id: "finance-ijarah-housing-finance",
    aliases: buildAliases(["diminishing musharakah", "ijarah home financing"], ["what is diminishing musharakah house finance"]),
    category: "Banking",
    answer: "Diminishing Musharakah is a common Islamic home financing structure where the bank and customer jointly own the property, with the customer's ownership share gradually increasing through periodic payments until they own it outright, paying rent on the bank's remaining share rather than interest.",
  },
  {
    id: "finance-annuity-what-is",
    aliases: buildAliases(["annuity"], ["what is an annuity"]),
    category: "Investing Basics",
    answer: "An annuity is a financial product that pays out a regular income stream, typically in retirement, in exchange for an upfront lump sum or series of payments made earlier — designed to provide predictable income for a set period or for life.",
  },

  // ── Fiscal policy tools & taxes ───────────────────────────────────────────
  {
    id: "macro-laffer-curve-what-is",
    aliases: buildAliases(["laffer curve"], ["what is the laffer curve"]),
    category: "Macroeconomics",
    answer: "The Laffer Curve illustrates the theoretical relationship between tax rates and total tax revenue, suggesting that beyond a certain point, higher tax rates can actually reduce total revenue by discouraging economic activity — used to argue for and against tax cuts depending on where an economy sits on the curve.",
  },
  {
    id: "macro-balanced-budget-what-is",
    aliases: buildAliases(["balanced budget"], ["what is a balanced budget"]),
    category: "Fiscal Deficit",
    answer: "A balanced budget means government revenue exactly equals (or exceeds) government spending in a given period, with no fiscal deficit — relatively rare for Pakistan's federal budget historically, which has typically run a deficit.",
  },
  {
    id: "tax-windfall-tax-what-is",
    aliases: buildAliases(["windfall tax"], ["what is a windfall tax"]),
    category: "Pakistan Economy",
    answer: "A windfall tax is a one-off or temporary tax on companies that have earned unusually high, often externally-driven profits (such as banks benefiting from high interest rates or energy firms from price spikes), aimed at capturing some of that unearned gain for public revenue.",
  },
  {
    id: "tax-carbon-tax-what-is",
    aliases: buildAliases(["carbon tax"], ["what is a carbon tax"]),
    category: "Macroeconomics",
    answer: "A carbon tax charges businesses or consumers for the carbon emissions associated with fuel use or production, aiming to incentivize lower-emission choices by making polluting activities more expensive.",
  },
  {
    id: "tax-wealth-tax-what-is",
    aliases: buildAliases(["wealth tax"], ["what is a wealth tax"]),
    category: "Pakistan Economy",
    answer: "A wealth tax is levied on an individual's total net assets (rather than income), periodically proposed in Pakistan as a way to broaden the tax base toward asset-rich segments of the population, though never implemented at scale to date.",
  },
  {
    id: "tax-double-taxation-treaty",
    aliases: buildAliases(["double taxation treaty", "double taxation"], ["what is a double taxation avoidance agreement"]),
    category: "Pakistan Economy",
    answer: "A double taxation treaty is a bilateral agreement between two countries ensuring income isn't taxed twice — once in the country where it's earned and again in the taxpayer's home country — Pakistan has such treaties with numerous countries to support cross-border trade and investment.",
  },
  {
    id: "tax-transfer-pricing-what-is",
    aliases: buildAliases(["transfer pricing"], ["what is transfer pricing tax"]),
    category: "Pakistan Economy",
    answer: "Transfer pricing refers to the prices charged between related companies (like a multinational's local subsidiary and its foreign parent) for goods, services, or loans — tax authorities scrutinize these prices to prevent profit-shifting that artificially reduces taxable income in higher-tax jurisdictions.",
  },

  // ── Corporate finance metrics ────────────────────────────────────────────
  {
    id: "finance-free-cash-flow-what-is",
    aliases: buildAliases(["free cash flow", "fcf"], ["what is free cash flow"]),
    category: "Investing Basics",
    answer: "Free Cash Flow (FCF) is the cash a company generates from operations after subtracting capital expenditures — representing money genuinely available to pay dividends, reduce debt, or reinvest, often considered a cleaner profitability gauge than accounting net profit.",
  },
  {
    id: "finance-ebitda-what-is",
    aliases: buildAliases(["ebitda"], ["what is ebitda", "what does ebitda stand for"]),
    category: "Investing Basics",
    answer: "EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization) is a profitability measure that strips out financing and accounting decisions, often used to compare operating performance across companies with different debt levels or capital structures.",
  },
  {
    id: "finance-margins-gross-operating-net",
    aliases: ["gross margin vs operating margin vs net margin", "what is gross profit margin", "what is operating margin", "what is net profit margin"],
    category: "Investing Basics",
    answer: "Gross margin is revenue minus cost of goods sold, divided by revenue. Operating margin further subtracts operating expenses. Net margin subtracts everything, including interest and taxes — each progressively narrower measure of profitability per rupee of sales.",
  },
  {
    id: "finance-working-capital-cycle",
    aliases: buildAliases(["working capital cycle", "cash conversion cycle"], ["what is the cash conversion cycle"]),
    category: "Investing Basics",
    answer: "The working capital (cash conversion) cycle measures how long it takes a company to convert investments in inventory and other resources into cash from sales — a shorter cycle generally means more efficient use of capital.",
  },
  {
    id: "finance-inventory-turnover-what-is",
    aliases: buildAliases(["inventory turnover"], ["what is inventory turnover ratio"]),
    category: "Investing Basics",
    answer: "Inventory turnover measures how many times a company sells and replaces its inventory over a period — calculated as cost of goods sold divided by average inventory, with higher turnover generally indicating stronger sales or efficient inventory management.",
  },
  {
    id: "finance-receivables-payables-what-are",
    aliases: ["accounts receivable vs accounts payable", "what is accounts receivable", "what is accounts payable"],
    category: "Investing Basics",
    answer: "Accounts receivable is money owed TO a company by its customers for goods/services already delivered. Accounts payable is money a company owes TO its own suppliers — both are key working-capital management metrics.",
  },
  {
    id: "finance-swot-analysis-what-is",
    aliases: buildAliases(["swot analysis"], ["what is a swot analysis"]),
    category: "Investing Basics",
    answer: "A SWOT analysis evaluates a company's Strengths, Weaknesses, Opportunities, and Threats — a simple framework analysts and investors use alongside financial metrics to assess a business's competitive position.",
  },

  // ── Digital & gig economy ─────────────────────────────────────────────────
  {
    id: "pk-digital-economy-what-is",
    aliases: buildAliases(["digital economy pakistan"], ["what is the digital economy"]),
    category: "Pakistan Economy",
    answer: "The digital economy refers to economic activity built around digital technology — e-commerce, digital payments, IT services, and online freelancing — an increasingly significant and fast-growing component of Pakistan's broader economy and export earnings.",
  },
  {
    id: "pk-gig-economy-what-is",
    aliases: buildAliases(["gig economy"], ["what is the gig economy"]),
    category: "Pakistan Economy",
    answer: "The gig economy refers to short-term, flexible, often platform-based work (like ride-hailing, freelancing, or delivery services) rather than traditional permanent employment — a growing segment of Pakistan's urban labor market, particularly among younger workers.",
  },
  {
    id: "pk-ecommerce-growth-what-is",
    aliases: buildAliases(["e-commerce pakistan", "online shopping growth pakistan"], ["how big is pakistan e-commerce market"]),
    category: "Pakistan Economy",
    answer: "Pakistan's e-commerce sector has grown rapidly alongside rising smartphone and internet penetration, digital payment adoption, and platforms enabling small businesses to sell online — though cash-on-delivery still dominates many transactions relative to fully digital payment.",
  },
  {
    id: "pk-payment-gateway-what-is",
    aliases: buildAliases(["payment gateway"], ["what is a payment gateway"]),
    category: "Banking",
    answer: "A payment gateway is the technology that securely processes online card or digital payments between a customer, merchant, and their respective banks, authorizing and settling transactions for e-commerce and digital services.",
  },

  // ── Corporate structure & M&A ─────────────────────────────────────────────
  {
    id: "finance-merger-vs-acquisition",
    aliases: buildAliases(["merger", "acquisition"], ["what is a merger", "what is an acquisition", "merger vs acquisition difference"]),
    category: "Investing Basics",
    answer: "A merger combines two companies into a single new entity, typically by mutual agreement. An acquisition is when one company buys and absorbs another, which may continue operating under the acquirer or be fully integrated.",
  },
  {
    id: "finance-hostile-takeover-what-is",
    aliases: buildAliases(["hostile takeover"], ["what is a hostile takeover"]),
    category: "Investing Basics",
    answer: "A hostile takeover is an acquisition attempt that proceeds without the approval of the target company's board/management, often pursued by buying shares directly from shareholders or replacing the board through a proxy fight.",
  },
  {
    id: "finance-leveraged-buyout-what-is",
    aliases: buildAliases(["leveraged buyout", "lbo"], ["what is a leveraged buyout"]),
    category: "Investing Basics",
    answer: "A leveraged buyout (LBO) is an acquisition financed largely through borrowed money, using the acquired company's own assets and future cash flows as collateral — common in private equity deals, amplifying both potential returns and risk.",
  },
  {
    id: "finance-joint-venture-what-is",
    aliases: buildAliases(["joint venture"], ["what is a joint venture"]),
    category: "Investing Basics",
    answer: "A joint venture is a business arrangement where two or more companies pool resources to pursue a specific project or business activity, sharing ownership, risks, and profits, while remaining otherwise independent companies.",
  },
  {
    id: "finance-multinational-corporation-what-is",
    aliases: buildAliases(["multinational corporation", "mnc"], ["what is a multinational company"]),
    category: "FDI",
    answer: "A multinational corporation (MNC) operates production facilities, sales offices, or subsidiaries in multiple countries beyond its home market, often a major source of FDI and technology transfer for host countries like Pakistan.",
  },
  {
    id: "finance-conglomerate-what-is",
    aliases: buildAliases(["conglomerate"], ["what is a business conglomerate"]),
    category: "Investing Basics",
    answer: "A conglomerate is a large corporation made up of several distinct, often unrelated businesses operating under one corporate umbrella, aiming to diversify risk across different industries rather than specializing in one.",
  },
  {
    id: "finance-outsourcing-offshoring-what-are",
    aliases: ["outsourcing vs offshoring", "what is business process outsourcing"],
    category: "Pakistan Economy",
    answer: "Outsourcing means hiring an external company to perform a business function, which may or may not be in another country. Offshoring specifically means relocating that function abroad — Pakistan's growing BPO and IT-services exports are largely built on offshored work from foreign clients.",
  },
  {
    id: "finance-vertical-horizontal-integration",
    aliases: ["vertical integration vs horizontal integration", "what is vertical integration business", "what is horizontal integration business"],
    category: "Investing Basics",
    answer: "Vertical integration means a company expands into different stages of its own supply chain (like a textile firm also owning cotton farms). Horizontal integration means acquiring or merging with competitors at the same stage of production.",
  },
  {
    id: "finance-franchise-business-model",
    aliases: buildAliases(["franchise business model"], ["what is a franchise business"]),
    category: "Investing Basics",
    answer: "A franchise model lets an independent owner operate a business using an established company's brand, systems, and support, in exchange for franchise fees and ongoing royalties — a common way to scale retail and food businesses without the franchisor directly funding every new location.",
  },

  // ── Startup financing & private markets ──────────────────────────────────
  {
    id: "finance-startup-funding-stages",
    aliases: ["seed funding vs series a vs series b", "what is a seed funding round", "startup funding stages explained"],
    category: "Investing Basics",
    answer: "Startups typically raise capital in stages: pre-seed/seed (early validation), Series A (initial scaling, usually after product-market fit), and subsequent Series B/C rounds (further growth), each round generally at a higher valuation as the business de-risks.",
  },
  {
    id: "finance-bootstrapping-what-is",
    aliases: buildAliases(["bootstrapping a business"], ["what does bootstrapping mean startup"]),
    category: "Investing Basics",
    answer: "Bootstrapping means building and growing a business using personal savings and reinvested revenue rather than external investment, retaining full ownership and control at the cost of slower growth and limited capital.",
  },
  {
    id: "finance-venture-debt-what-is",
    aliases: buildAliases(["venture debt"], ["what is venture debt financing"]),
    category: "Investing Basics",
    answer: "Venture debt is loan financing extended to early-stage, venture-backed startups (often alongside equity rounds), letting founders raise growth capital without further diluting ownership as much as an additional equity round would.",
  },
  {
    id: "finance-unicorn-startup-what-is",
    aliases: buildAliases(["unicorn startup"], ["what is a unicorn company"]),
    category: "Investing Basics",
    answer: "A 'unicorn' is a privately-held startup valued at $1 billion or more — a term used to highlight how rare such high valuations are among early-stage companies.",
  },
  {
    id: "finance-incubator-accelerator-what-are",
    aliases: ["business incubator vs accelerator", "what is a startup incubator", "what is a startup accelerator"],
    category: "Investing Basics",
    answer: "An incubator supports early-stage startups over a longer, more open-ended period with mentorship, space, and resources. An accelerator runs a fixed-term, intensive program (often 3-6 months) culminating in a pitch event, usually in exchange for a small equity stake.",
  },
  {
    id: "finance-private-placement-what-is",
    aliases: buildAliases(["private placement"], ["what is a private placement shares"]),
    category: "PSX",
    answer: "A private placement is the sale of shares or debt directly to a select group of investors (rather than the general public), typically faster and less regulatory-intensive than a public offering like an IPO.",
  },
  {
    id: "finance-tender-offer-delisting",
    aliases: ["what is a tender offer for shares", "what is delisting from stock exchange"],
    category: "PSX",
    answer: "A tender offer is a public bid to buy a large block of a company's shares directly from shareholders, often at a premium, sometimes used to take a company private. Delisting removes a company's shares from exchange trading entirely, ending public trading in that stock.",
  },

  // ── Retail banking essentials ────────────────────────────────────────────
  {
    id: "banking-credit-debit-card-difference",
    aliases: ["credit card vs debit card", "what is a credit card", "what is a debit card", "what is a prepaid card"],
    category: "Banking",
    answer: "A debit card draws directly from your existing bank account balance. A credit card lets you borrow up to an approved limit, repaid later (with interest if not paid in full by the due date). A prepaid card is loaded with a fixed amount in advance and isn't linked to a bank account or credit line.",
  },
  {
    id: "banking-cheque-demand-draft-pay-order",
    aliases: ["what is a cheque", "what is a demand draft", "what is a pay order", "demand draft vs pay order difference"],
    category: "Banking",
    answer: "A cheque is a written instruction to pay from your own account, which can bounce if funds are insufficient. A demand draft and pay order are both bank-guaranteed instruments (pre-paid by the purchaser) used for secure payments, with a demand draft typically used for payments across different cities/branches and a pay order for local payments.",
  },
  {
    id: "banking-online-internet-banking",
    aliases: buildAliases(["online banking", "internet banking"], ["what is internet banking"]),
    category: "Banking",
    answer: "Online (internet) banking lets customers manage accounts, transfer funds, and pay bills through a bank's website or app rather than visiting a branch — a foundational layer that digital wallets and branchless banking have built upon in Pakistan.",
  },
  {
    id: "banking-loan-grace-period-what-is",
    aliases: buildAliases(["loan grace period"], ["what is a grace period on a loan"]),
    category: "Banking",
    answer: "A grace period is a set window after a payment due date during which a borrower can still pay without penalty or being reported as late — terms vary by lender and loan type.",
  },
  {
    id: "banking-guarantor-co-signer-what-is",
    aliases: buildAliases(["loan guarantor", "co-signer"], ["what is a guarantor for a loan"]),
    category: "Banking",
    answer: "A guarantor (or co-signer) agrees to repay a loan if the primary borrower defaults, providing the lender extra security — commonly required when a borrower has limited credit history or collateral.",
  },
  {
    id: "banking-debt-consolidation-what-is",
    aliases: buildAliases(["debt consolidation"], ["what is debt consolidation"]),
    category: "Banking",
    answer: "Debt consolidation combines multiple existing debts into a single new loan, ideally at a lower interest rate or with simpler, more manageable repayment terms.",
  },
  {
    id: "banking-credit-limit-what-is",
    aliases: buildAliases(["credit limit"], ["what is a credit limit"]),
    category: "Banking",
    answer: "A credit limit is the maximum amount a lender allows a borrower to use on a credit card or line of credit, based on factors like income, credit history, and existing debt obligations.",
  },
  {
    id: "banking-amortizing-loan-balloon-payment",
    aliases: ["amortizing loan vs balloon payment", "what is a balloon payment loan"],
    category: "Banking",
    answer: "An amortizing loan has equal periodic payments that gradually pay down both principal and interest until fully repaid. A balloon payment loan has smaller regular payments followed by one large lump-sum payment due at the end of the term.",
  },

  // ── Corporate actions & takeover defenses ────────────────────────────────
  {
    id: "psx-share-buyback-what-is",
    aliases: buildAliases(["share buyback", "stock buyback", "treasury stock"], ["what is a share buyback"]),
    category: "PSX",
    answer: "A share buyback is when a company repurchases its own shares from the market, reducing the number of shares outstanding (which can boost EPS) and returning cash to remaining shareholders. Repurchased shares held by the company (rather than retired) are called treasury stock.",
  },
  {
    id: "finance-spin-off-what-is",
    aliases: buildAliases(["corporate spin off"], ["what is a spin off company"]),
    category: "Investing Basics",
    answer: "A spin-off occurs when a company separates part of its business into a new, independent publicly-traded company, with existing shareholders typically receiving shares in the new entity — often done to let the market value a specific business unit more accurately.",
  },
  {
    id: "finance-takeover-defenses-what-are",
    aliases: ["what is a poison pill defense", "what is a white knight defense", "takeover defense tactics"],
    category: "Investing Basics",
    answer: "A 'poison pill' lets existing shareholders buy additional discounted shares to dilute a hostile acquirer's stake. A 'white knight' is a friendlier acquirer a target company seeks out as a preferable alternative to a hostile bidder.",
  },
  {
    id: "psx-investor-protection-fund",
    aliases: buildAliases(["investor protection fund psx"], ["what is the investor protection fund"]),
    category: "PSX",
    answer: "An Investor Protection Fund compensates retail investors for losses arising from a broker's default or failure (within defined limits), adding a layer of safety to the PSX trading and settlement system.",
  },

  // ── Trade policy & bond pricing extras ───────────────────────────────────
  {
    id: "trade-sanctions-embargo-what-are",
    aliases: buildAliases(["economic sanctions", "trade embargo"], ["what are economic sanctions"]),
    category: "Trade Balance",
    answer: "Economic sanctions are restrictions (like trade bans, asset freezes, or financial restrictions) imposed by one country or bloc on another, usually for political or security reasons. A trade embargo is a more complete ban on trade with a specific country.",
  },
  {
    id: "trade-protectionism-what-is",
    aliases: buildAliases(["protectionism", "trade protectionism"], ["what is protectionism economics"]),
    category: "Trade Balance",
    answer: "Protectionism refers to government policies — like tariffs, quotas, and subsidies — that shield domestic industries from foreign competition, often at the cost of higher prices for consumers and potential retaliation from trading partners.",
  },
  {
    id: "trade-bloc-what-is",
    aliases: buildAliases(["trade bloc"], ["what is a regional trade bloc"]),
    category: "Trade Balance",
    answer: "A trade bloc is a group of countries that agree to reduce trade barriers among themselves, ranging from simple free trade agreements to deeper customs unions or common markets with shared external trade policy.",
  },
  {
    id: "bonds-clean-vs-dirty-price",
    aliases: ["clean price vs dirty price bond", "what is accrued interest on a bond"],
    category: "Bonds",
    answer: "A bond's 'clean' price excludes accrued interest since the last coupon payment. The 'dirty' (or full) price includes that accrued interest — the dirty price is what a buyer actually pays when purchasing a bond between coupon dates.",
  },
  {
    id: "bonds-current-yield-what-is",
    aliases: buildAliases(["current yield bond"], ["what is current yield on a bond", "current yield vs yield to maturity"]),
    category: "Bonds",
    answer: "Current yield is a bond's annual coupon payment divided by its current market price — a simpler measure than yield to maturity, since it ignores the gain or loss from holding the bond until it matures at face value.",
  },
  {
    id: "finance-credit-default-swap-what-is",
    aliases: buildAliases(["credit default swap", "cds"], ["what is a credit default swap"]),
    category: "Bonds",
    answer: "A Credit Default Swap (CDS) is a derivative contract that acts like insurance against a bond issuer defaulting — the buyer pays a periodic premium, and the seller pays out if the underlying borrower defaults, used to hedge or speculate on credit risk.",
  },

  // ── Options pricing & macro aggregates ───────────────────────────────────
  {
    id: "finance-call-put-option-what-are",
    aliases: ["what is a call option", "what is a put option", "call option vs put option"],
    category: "Investing Basics",
    answer: "A call option gives the right to BUY an asset at a set price before expiration, profitable if the price rises above that level. A put option gives the right to SELL at a set price, profitable if the price falls below it.",
  },
  {
    id: "finance-options-premium-what-is",
    aliases: buildAliases(["options premium"], ["what is an option premium"]),
    category: "Investing Basics",
    answer: "An option's premium is the price paid by the buyer to the seller (writer) for the rights the option contract grants, influenced by factors like the underlying asset's price, volatility, and time remaining until expiration.",
  },
  {
    id: "macro-circular-flow-of-income",
    aliases: buildAliases(["circular flow of income"], ["what is the circular flow model economics"]),
    category: "Macroeconomics",
    answer: "The circular flow of income model illustrates how money moves through an economy between households, businesses, and government — households supply labor and receive wages, spending that income on goods/services, which generates revenue that flows back to businesses as costs and profits.",
  },

  // ── External buffers ──────────────────────────────────────────────────────
  {
    id: "pk-current-account-deficit-causes",
    aliases: ["main causes of current account deficit pakistan", "why does pakistan run a current account deficit"],
    category: "Current Account",
    answer: "Pakistan's current account deficit is typically driven by a structurally large energy import bill, a narrow export base unable to fully offset imports, and periods of strong domestic demand pulling in more imports — partly offset by remittance inflows.",
  },
  {
    id: "pk-fiscal-year-dates",
    aliases: buildAliases(["pakistan fiscal year"], ["when does pakistan fiscal year start and end"]),
    category: "Pakistan Economy",
    answer: "Pakistan's fiscal year runs from July 1 to June 30, the period covered by the annual federal budget, government revenue/expenditure reporting, and most official economic statistics.",
  },
  {
    id: "pk-tax-amnesty-scheme-what-is",
    aliases: buildAliases(["tax amnesty scheme pakistan"], ["what is a tax amnesty scheme"]),
    category: "Pakistan Economy",
    answer: "A tax amnesty scheme lets individuals or businesses declare previously undisclosed assets or income by paying a reduced penalty rate, aiming to broaden the formal tax base — Pakistan has periodically offered such schemes, though their long-term effectiveness at growing sustained tax revenue is debated among economists.",
  },
  {
    id: "pk-export-processing-zone-deep",
    aliases: buildAliases(["export processing zone", "epz pakistan"], ["what is an export processing zone"]),
    category: "Exports",
    answer: "An Export Processing Zone (EPZ) is a designated industrial area offering tax incentives and simplified customs procedures specifically for businesses producing goods for export, distinct from a broader Special Economic Zone which can also serve the domestic market.",
  },
];

// ── Collision-free alias merge ──────────────────────────────────────────────
// 1. Seed `claimed` with every alias already on every entry (hand-authored +
//    new), so generated aliases can never silently steal a phrase that
//    already canonically belongs to a different entry.
// 2. For hand-authored entries phrased as a plain definition, auto-expand
//    with the full template set, skipping any candidate already claimed.
const claimed = new Set<string>();
for (const entry of [...HAND_AUTHORED, ...NEW_ENTRIES]) {
  for (const alias of entry.aliases) claimed.add(normalizeForDedup(alias));
}

function expandHandAuthored(entries: KnowledgeEntry[]): KnowledgeEntry[] {
  return entries.map((entry) => {
    const core = extractCoreTerm(entry.aliases);
    if (!core) return entry;
    const added: string[] = [];
    for (const tmpl of DEFINITION_TEMPLATES) {
      const candidate = tmpl(core);
      const norm = normalizeForDedup(candidate);
      if (!claimed.has(norm)) {
        claimed.add(norm);
        added.push(candidate);
      }
    }
    return added.length > 0 ? { ...entry, aliases: [...entry.aliases, ...added] } : entry;
  });
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  ...expandHandAuthored(HAND_AUTHORED),
  ...NEW_ENTRIES,
];

/** Total number of curated knowledge base entries (for reporting/telemetry). */
export const KNOWLEDGE_BASE_COUNT = KNOWLEDGE_BASE.length;

/** Total number of aliases across all entries (for reporting/telemetry). */
export const KNOWLEDGE_BASE_ALIAS_COUNT = KNOWLEDGE_BASE.reduce((sum, e) => sum + e.aliases.length, 0);

/** Distinct categories covered, in first-seen order. */
export const KNOWLEDGE_BASE_CATEGORIES: string[] = Array.from(
  new Set(KNOWLEDGE_BASE.map((e) => e.category)),
);
