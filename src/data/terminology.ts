// Centralized Economic Knowledge Registry
//
// Every financial / economic term displayed anywhere in the dashboard has an
// entry here. InfoTooltip looks up terms by their exact KPI title string, stat
// label string, or an explicit termKey. Adding a new indicator only requires
// a new entry in this file — no UI changes needed.

export interface TermEntry {
  /** Display name (may differ slightly from the lookup key). */
  title: string;
  /** Plain-English definition of what the indicator is. */
  definition: string;
  /** Why it matters for Pakistan's economy. */
  whyItMatters: string;
  /** How to interpret high / low / rising / falling values. */
  interpretation: string;
}

export const TERMINOLOGY: Record<string, TermEntry> = {

  // ── Pakistan macro ──────────────────────────────────────────────────────────

  "GDP Growth": {
    title: "GDP Growth",
    definition:
      "The annual percentage change in Pakistan's total economic output (Gross Domestic Product), measured in real (inflation-adjusted) terms. Captures growth across agriculture, industry, and services.",
    whyItMatters:
      "The single broadest measure of economic health. Rising GDP means more jobs, higher incomes, and greater tax revenues. Pakistan needs sustained 6–7% growth to reduce poverty and service its debt.",
    interpretation:
      "Above 5% = strong expansion. 2–5% = moderate recovery. Below 2% = weak. Negative = recession. Compare to population growth (~2%) to assess per-capita income trends.",
  },

  "CPI Inflation": {
    title: "CPI Inflation",
    definition:
      "Consumer Price Index inflation — the year-on-year percentage change in prices of a representative basket of goods and services bought by households: food, housing, transport, healthcare, and clothing.",
    whyItMatters:
      "Directly erodes purchasing power. High inflation hurts lower-income households most, reduces real wages, forces SBP to raise interest rates, and increases government's debt-servicing costs. Pakistan's 2022–23 inflation peak above 38% was one of the worst episodes in its history.",
    interpretation:
      "SBP's medium-term target range is 5–7%. Below 7% = controlled. 7–12% = elevated. Above 15% = high. Above 25% = crisis. Trend direction matters: falling from a peak is more important than the absolute level.",
  },

  "Core Inflation": {
    title: "Core Inflation",
    definition:
      "CPI excluding volatile food and energy prices — the Non-Food, Non-Energy (NFNE) measure of underlying price pressure. Also called 'structural' or 'underlying' inflation.",
    whyItMatters:
      "Provides a cleaner signal of demand-side inflationary pressure, stripping out supply shocks (e.g., oil price spikes or crop failures) that monetary policy cannot directly address. SBP uses core inflation as its primary policy signal.",
    interpretation:
      "Core above headline CPI = inflation is broad-based and entrenched. Core well below headline = inflation is mainly a supply/food shock. Persistent high core signals that interest rates need to remain elevated.",
  },

  "WPI Inflation": {
    title: "WPI Inflation",
    definition:
      "Wholesale Price Index inflation — measures year-on-year price changes at the production and wholesale level: raw materials, intermediate goods, and manufactured items traded between businesses before reaching consumers.",
    whyItMatters:
      "A leading indicator of future consumer (CPI) inflation, since factory-gate price rises typically pass through to retail within 1–3 months. Also reflects cost pressures on Pakistan's industrial sector. Used as a PPI proxy.",
    interpretation:
      "WPI rising faster than CPI = consumer price hikes likely ahead. WPI falling while CPI stays high = margin compression at producer level. A WPI decline signals deflationary pressure in the pipeline.",
  },

  "Foreign Reserves": {
    title: "Foreign Reserves",
    definition:
      "Total liquid foreign-currency assets held by the State Bank of Pakistan: US dollars, euros, gold, and IMF Special Drawing Rights (SDRs). Commercial bank reserves are not included in the SBP figure shown here.",
    whyItMatters:
      "Pakistan's primary buffer against external shocks. Determines the ability to pay for imports, service external debt, and defend the exchange rate. IMF programs typically impose minimum reserve floors as performance criteria.",
    interpretation:
      "Above $15B ≈ comfortable. $8–12B = borderline. Below $8B = vulnerable. Below $4B = crisis territory (as seen in early 2023). The IMF 3-month import cover standard: below that threshold triggers urgent financing needs.",
  },

  "Policy Rate": {
    title: "Policy Rate",
    definition:
      "The SBP's target overnight repo rate — the interest rate at which the central bank lends to commercial banks. Formally called the SBP Target Rate. Set by the Monetary Policy Committee (MPC) approximately 6–8 times per year.",
    whyItMatters:
      "The primary tool of monetary policy. Higher rates raise borrowing costs economy-wide, curbing consumption and investment to fight inflation. Lower rates stimulate credit and growth. In Pakistan, each rate decision also affects government debt-servicing costs, as a large share of domestic debt is floating-rate.",
    interpretation:
      "Compare to CPI inflation: the 'real policy rate' (Policy Rate minus CPI) is what matters for monetary stance. A positive real rate = genuinely restrictive. Negative real rate = still accommodative despite nominal tightening. Rate cuts signal SBP's confidence that inflation is sustainably falling.",
  },

  "3M T-Bill Yield": {
    title: "3M T-Bill Yield",
    definition:
      "The weighted average yield on 3-month Pakistan Government Treasury Bills, auctioned fortnightly by SBP. Represents the risk-free short-term borrowing cost for the government and the benchmark for overnight lending rates.",
    whyItMatters:
      "The key short-term money-market rate. Banks price their deposit and lending products against it. The government must pay this yield to roll over its large short-term debt stock. A rising T-Bill yield ahead of policy decisions often signals that the market expects monetary tightening.",
    interpretation:
      "T-Bill yield closely tracks the SBP Policy Rate. A premium of T-Bill over Policy Rate = liquidity tightness or rate-hike expectations. A discount = ample liquidity or rate-cut expectations. Compare to 3Y PIB yield for the yield curve slope.",
  },

  "3Y PIB Yield": {
    title: "3Y PIB Yield",
    definition:
      "The weighted average yield on 3-year Pakistan Investment Bonds (PIBs), fixed-income government securities auctioned periodically. Represents the government's medium-term borrowing cost and a benchmark for medium-term lending rates.",
    whyItMatters:
      "Indicates market expectations of future inflation and monetary policy over a 3-year horizon. A rising PIB yield raises the cost of refinancing Pakistan's growing domestic debt. Also the reference rate for medium-term business loans.",
    interpretation:
      "Compare to 3M T-Bill for the yield curve slope (PIB yield minus T-Bill yield). A positive spread = normal upward-sloping curve. Inverted (PIB below T-Bill) = market expects rate cuts. Flat curve = uncertainty. A steep curve with high PIB yields often means fiscal risk premium is embedded.",
  },

  "Remittances": {
    title: "Remittances",
    definition:
      "Money transferred by overseas Pakistani workers to their families in Pakistan, primarily from the Gulf countries (Saudi Arabia, UAE, Qatar, Bahrain) and Western countries (UK, USA, Canada). Includes formal (banking) and informal (hawala) channels; SBP records only formal transfers.",
    whyItMatters:
      "Pakistan's single largest source of foreign exchange — consistently $2.5–4B per month, exceeding goods export earnings. Critical for funding the current account deficit, supporting the rupee, and providing direct income to millions of households. A sharp fall can trigger balance of payments stress.",
    interpretation:
      "Monthly above $3B = strong. $2–3B = normal. Below $2B = concerning. Seasonal peaks during Ramadan and Eid. Growth in formal-channel remittances (via banking) is tracked by SBP's Roshan Digital Account initiative.",
  },

  "Current Account": {
    title: "Current Account",
    definition:
      "The broadest measure of Pakistan's international transactions: net trade in goods and services, net primary income (remittances received minus investment income paid abroad), and net secondary income transfers.",
    whyItMatters:
      "A current account deficit means Pakistan is spending more abroad than it earns, requiring the gap to be financed by capital inflows, external borrowing, or reserve drawdowns. Chronic large deficits are the root cause of Pakistan's recurring balance of payments crises and IMF program triggers.",
    interpretation:
      "Surplus = external position strengthening. Deficit below 1% of GDP = manageable. Deficit 2–3% GDP = elevated. Above 4% GDP = high crisis risk (Pakistan hit ~4.8% in 2021–22). Narrowing deficit is one of the earliest signs of macroeconomic stabilization.",
  },

  "Trade Balance": {
    title: "Trade Balance",
    definition:
      "The difference between Pakistan's merchandise export receipts and import payments (goods only, not services), recorded on a Free-on-Board (FOB) basis in the Balance of Payments. Pakistan runs a structural trade deficit.",
    whyItMatters:
      "The largest single driver of the current account deficit. Pakistan consistently imports more than it exports — the gap has historically been $2–4B per month. Narrowing the trade deficit (by boosting exports or compressing imports) is central to external stability.",
    interpretation:
      "Closer to zero = better external position. A shrinking deficit due to import compression signals economic slowdown. Shrinking due to export growth = structurally positive. Widening deficit with surging energy/capital goods imports may indicate economic recovery (mixed signal).",
  },

  "Money Supply (M2)": {
    title: "Money Supply (M2)",
    definition:
      "The broad money supply — total liquid financial assets in the economy: physical currency in circulation, demand deposits, savings deposits, and short-term time deposits held by the public at commercial and specialized banks.",
    whyItMatters:
      "Rapid M2 growth in excess of economic output is a leading indicator of future inflation. SBP monitors M2 as part of its monetary framework. Excessive money creation, often driven by government borrowing from the central bank, has historically preceded Pakistan's high-inflation episodes by 6–12 months.",
    interpretation:
      "M2 growth well above nominal GDP growth = inflationary pressure building. M2 declining in real terms = monetary tightening working. In Pakistan, M2 growth of 10–15% is broadly in line with nominal GDP, while above 20% risks fueling inflation.",
  },

  "USD / PKR": {
    title: "USD / PKR",
    definition:
      "The exchange rate of the Pakistani Rupee against the US Dollar — how many rupees buy one US dollar in the interbank market. The most closely watched financial indicator in Pakistan.",
    whyItMatters:
      "Rupee depreciation raises the cost of all dollar-denominated imports (especially oil, machinery, and consumer goods), increases debt servicing on USD-denominated external loans, and fuels domestic inflation. The SBP occasionally intervenes to smooth volatility but generally allows market-determined rates.",
    interpretation:
      "A rising number = rupee weakening (depreciation). A falling number = rupee appreciating. Rapid depreciation often signals balance of payments stress. The SBP monthly average shown in historical trends reflects the average interbank closing rate, while the Live FX section shows the real-time market rate.",
  },

  "EUR / PKR": {
    title: "EUR / PKR",
    definition:
      "The live interbank exchange rate of the Pakistani Rupee against the Euro, computed as a cross-rate from the USD/EUR and USD/PKR rates. Updated hourly via ExchangeRate-API.",
    whyItMatters:
      "Relevant for trade with the European Union (a major destination for Pakistani exports, especially textiles), euro-denominated debt, and Pakistanis with expenses or income in euros.",
    interpretation:
      "Rising = PKR weakening against the euro. Movement is driven primarily by USD/PKR changes, with a secondary effect from the EUR/USD rate in global currency markets.",
  },

  "GBP / PKR": {
    title: "GBP / PKR",
    definition:
      "The live interbank exchange rate of the Pakistani Rupee against the British Pound Sterling, computed as a cross-rate. Updated hourly.",
    whyItMatters:
      "The UK hosts one of the world's largest Pakistani diaspora communities. The GBP/PKR rate directly determines the PKR value of remittances sent from the UK — a significant inflow corridor for Pakistan.",
    interpretation:
      "Rising = PKR weakening against sterling. Primarily tracks USD/PKR, with secondary influence from GBP/USD dynamics (UK economic conditions, Bank of England policy).",
  },

  "SAR / PKR": {
    title: "SAR / PKR",
    definition:
      "The live interbank exchange rate of the Pakistani Rupee against the Saudi Riyal. The SAR is pegged to the USD at a fixed rate of SAR 3.75 = USD 1, so SAR/PKR movements mirror USD/PKR almost exactly.",
    whyItMatters:
      "Saudi Arabia is Pakistan's single largest remittance corridor — over $0.7–0.9B per month. A weaker rupee means more PKR per riyal for overseas workers sending money home, increasing remittance incentives for formal channels.",
    interpretation:
      "Because of the SAR–USD peg, SAR/PKR is essentially a rescaled version of USD/PKR. Divergences would be very unusual and would signal either a broken peg or a data lag.",
  },

  "Exports": {
    title: "Exports",
    definition:
      "Total value of goods exported from Pakistan on a Free-on-Board (FOB) basis, as recorded in the BPM6 Balance of Payments framework. Dominated by textiles (~60%), leather, surgical instruments, sports goods, and food products. Does not include services exports.",
    whyItMatters:
      "Export earnings are the only sustainable source of foreign exchange. Pakistan's export base is narrow and concentrated in low-value-added textiles, leaving it exposed to global fashion cycles and competition. Diversifying and growing exports is a central structural reform priority.",
    interpretation:
      "Monthly above $3B = strong. $2–2.5B = typical range. Below $2B = weak. Compare to import levels for the trade balance. The government's $60B annual export target (vs current ~$30–35B) highlights the structural gap.",
  },

  "Imports": {
    title: "Imports",
    definition:
      "Total value of goods imported into Pakistan on a Free-on-Board (FOB) basis per the BPM6 framework. Dominated by energy (petroleum, LNG), machinery, chemicals, and food items.",
    whyItMatters:
      "Import compression (falling imports) is often the primary mechanism for narrowing the trade deficit — but it usually signals economic slowdown rather than structural improvement. Energy import costs are Pakistan's biggest vulnerability to global commodity price swings.",
    interpretation:
      "Rising imports of capital goods and industrial machinery = investment-led growth (positive). Rising consumer goods imports = domestic demand expansion. Rising energy imports = global oil/gas prices lifting the bill. Sudden sharp import falls often reflect SBP import restrictions or an economic contraction.",
  },

  "FDI Inflows": {
    title: "FDI Inflows",
    definition:
      "Net Foreign Direct Investment into Pakistan — equity capital inflows from foreign investors establishing new businesses, expanding existing operations, or acquiring Pakistani companies, net of any capital repatriated abroad.",
    whyItMatters:
      "FDI brings long-term productive capital, technology transfer, and job creation without creating debt. Pakistan's FDI has been chronically low versus regional peers (India, Bangladesh), limiting industrial capacity and export diversification. CPEC (China-Pakistan Economic Corridor) is the largest single source in recent years.",
    interpretation:
      "Monthly net inflows above $200M = healthy. Below $100M = weak. Negative = capital withdrawal. China (CPEC infrastructure), UAE, and the UK are historically the top sources. Trend direction over 3–6 months matters more than monthly volatility.",
  },

  "REER": {
    title: "REER",
    definition:
      "Real Effective Exchange Rate — Pakistan's exchange rate against a trade-weighted basket of partner-country currencies, adjusted for inflation differentials between Pakistan and its trading partners. Indexed to base year 2010 = 100.",
    whyItMatters:
      "The most comprehensive measure of Pakistan's external price competitiveness. An appreciated REER means Pakistani goods are becoming more expensive than competitors' goods even if the nominal PKR is stable, eroding export competitiveness. Pakistan's REER overvaluation in 2021–22 contributed to the balance of payments crisis.",
    interpretation:
      "Below 100 = PKR is competitively priced relative to the 2010 base. Above 100 = relatively more expensive (less competitive). Rising REER = competitiveness deteriorating. Falling REER = improving competitiveness. Compare to trade balance trends to assess impact on exports.",
  },

  "LSM": {
    title: "LSM (Large-Scale Manufacturing)",
    definition:
      "Large-Scale Manufacturing Index — measures the quantum (physical volume) of output from Pakistan's formal large industrial sector: textiles, food processing, chemicals, rubber, paper, metals, and engineering goods. Base year 2015–16 = 100.",
    whyItMatters:
      "A high-frequency (monthly) proxy for industrial and overall economic activity. LSM typically leads broader GDP trends by 1–2 months and reflects supply-side conditions: energy availability, input costs, domestic demand, and export orders. Persistent LSM weakness signals industrial stress.",
    interpretation:
      "Above 100 = output above base year level. Rising index = industrial expansion. Falling = contraction. Sharp drops often correlate with energy crises, import restrictions on raw materials, or monetary tightening squeezing working capital. LSM is one of SBP's primary activity indicators.",
  },

  "Private Credit Growth": {
    title: "Private Credit Growth",
    definition:
      "Year-on-year percentage change in outstanding credit extended by commercial banks to the private sector — businesses, households, and non-bank financial institutions. Excludes government borrowing from banks.",
    whyItMatters:
      "Private credit growth drives business investment, working capital financing, housing, and consumer spending. Pakistan's private sector has historically been 'crowded out' by heavy government borrowing from the banking system, leaving businesses starved of affordable credit. Healthy credit growth is a prerequisite for investment-led recovery.",
    interpretation:
      "Nominal growth above CPI inflation = real credit expansion (positive). Growth equal to CPI = flat real credit. Negative real growth = credit squeeze. A meaningful uptick in private credit (while government borrowing stabilizes) is one of the clearest signals of economic normalization.",
  },

  "Fiscal Balance": {
    title: "Fiscal Balance",
    definition:
      "The difference between total government revenues and total expenditures on a consolidated basis (federal + all provincial governments) for a fiscal year (July 1 – June 30). A negative number indicates a deficit.",
    whyItMatters:
      "Pakistan's persistent large fiscal deficit is the root cause of its recurring debt cycles. Deficits are financed by borrowing from domestic banks (monetization), domestic bond markets, or external creditors. Chronic deficits accumulate debt, crowd out private investment, and create vulnerability to rollover crises.",
    interpretation:
      "Surplus = government saving (rare for Pakistan). Deficit below 3% GDP = manageable for emerging markets. 4–6% = elevated. Pakistan's structural deficit has been 6–8% of GDP historically. IMF programs typically target deficit below 5% of GDP as a condition for program compliance.",
  },

  // ── Global Markets ───────────────────────────────────────────────────────────

  "Gold": {
    title: "Gold",
    definition:
      "Spot price of gold per troy ounce in US dollars (XAU/USD), typically referencing the COMEX front-month gold futures contract. Gold is held as a reserve asset, inflation hedge, and safe-haven investment by central banks and individuals globally.",
    whyItMatters:
      "For Pakistan, rising gold prices directly increase the import bill (Pakistan is a significant consumer of gold jewelry and investment gold). They also affect SBP's gold reserves valuation and the massive informal household gold holdings. Globally, gold prices reflect risk sentiment: rising gold = risk-off.",
    interpretation:
      "Rising gold = risk aversion, dollar weakness, or inflation expectations increasing. Falling gold = risk-on sentiment, stronger dollar, or falling inflation expectations. Gold is also a long-term store of value; short-term moves are noise.",
  },

  "Silver": {
    title: "Silver",
    definition:
      "Spot price of silver per troy ounce in US dollars (XAG/USD). Silver has dual roles: a monetary/precious metal (inflation hedge, safe-haven) and an industrial metal (electronics, solar panels, medical devices).",
    whyItMatters:
      "Tracks gold as a precious metals sentiment indicator but with higher volatility. The industrial demand component makes silver sensitive to global manufacturing expectations. Pakistan's solar panel import drive and industrial sector indirectly link to global silver pricing.",
    interpretation:
      "Rising with gold = risk-off, monetary demand. Rising faster than gold = industrial demand pickup. The Gold/Silver ratio (gold price ÷ silver price) above 80 historically indicates silver is 'cheap' relative to gold. Silver amplifies gold's moves — higher beta to gold.",
  },

  "WTI Crude": {
    title: "WTI Crude",
    definition:
      "West Texas Intermediate crude oil spot price in US dollars per barrel — the benchmark for North American crude, traded on the NYMEX. Slightly lighter and sweeter than Brent; typically a few dollars below Brent.",
    whyItMatters:
      "Pakistan imports nearly all its petroleum needs (~$1.5–2B/month at recent prices). Oil price swings directly impact Pakistan's import bill, trade deficit, fiscal balance (petroleum subsidies), and domestic fuel prices (petrol, diesel, kerosene). Oil is typically Pakistan's single largest import item.",
    interpretation:
      "Below $60/bbl = favorable for Pakistan. $60–80 = manageable. Above $90 = stress. Above $100 = significant fiscal and external pressure. For every $10 increase in oil price, Pakistan's annual import bill rises by roughly $1.5–2B.",
  },

  "Brent Crude": {
    title: "Brent Crude",
    definition:
      "Brent crude oil price in US dollars per barrel, set in the North Sea and traded on the ICE (Intercontinental Exchange). The global benchmark: most of the world's oil contracts — including Pakistan's oil import pricing — reference Brent.",
    whyItMatters:
      "Pakistan's petroleum imports are primarily priced against Brent. Every rise in Brent directly increases Pakistan's monthly oil import costs. LNG (liquefied natural gas) import contracts are also indirectly linked to Brent via oil-indexed pricing formulas.",
    interpretation:
      "Brent is typically $2–5/bbl above WTI. The same Pakistan impact thresholds apply: below $60 = favorable; above $90 = significant stress. Brent is the more relevant benchmark for Pakistani import costs.",
  },

  "Natural Gas": {
    title: "Natural Gas",
    definition:
      "Henry Hub natural gas spot price in US dollars per million British thermal units (MMBtu) — the North American benchmark for natural gas, traded at a Louisiana pipeline hub. Used as a global reference for LNG pricing.",
    whyItMatters:
      "Pakistan imports liquefied natural gas (LNG) to supplement declining domestic gas production. LNG import contracts increasingly reference Henry Hub or JKM (Japan-Korea Marker). High global gas prices dramatically raise Pakistan's LNG costs, which ripple through to industrial energy costs and the circular debt problem.",
    interpretation:
      "Below $3/MMBtu = cheap (as in 2020). $3–5 = moderate. Above $5 = elevated. The 2022 European gas crisis spiked Henry Hub to $10+. Pakistan's domestic gas is priced below market cost, creating large circular debt for gas utilities.",
  },

  "US Dollar Index": {
    title: "US Dollar Index (DXY)",
    definition:
      "The DXY index measures the value of the US dollar against a basket of 6 major currencies: Euro (57.6%), Japanese Yen (13.6%), British Pound (11.9%), Canadian Dollar (9.1%), Swedish Krona (4.2%), and Swiss Franc (3.6%).",
    whyItMatters:
      "A stronger dollar makes commodity imports (oil, metals, food) more expensive for all countries, including Pakistan. It also tightens global financial conditions, making it harder for Pakistan to attract capital or refinance external debt. Emerging market currencies including PKR tend to weaken when DXY rises.",
    interpretation:
      "Below 95 = weak dollar (favorable for EMs). 95–100 = neutral. Above 100 = strong dollar (pressure on EMs). Above 106 = very strong (as in late 2022), creating significant stress for Pakistan's external accounts and debt. Dollar strength correlates inversely with PKR stability.",
  },

  "US 10Y Treasury": {
    title: "US 10Y Treasury Yield",
    definition:
      "The annualized yield on 10-year US Government Treasury notes — the world's benchmark risk-free rate and the reference rate for pricing global capital flows, corporate bonds, and sovereign debt.",
    whyItMatters:
      "Rising US 10Y yields attract global capital away from emerging markets like Pakistan, weakening the rupee and raising Pakistan's sovereign borrowing costs. They also increase the cost of IMF and World Bank financing (which is tied to international rates) and compress the spread Pakistan must offer to attract investors.",
    interpretation:
      "Below 2.5% = very low (favorable for EMs, capital flows into high-yield markets). 3–4% = moderate. Above 4.5% = elevated, creating significant headwinds for Pakistan's external financing. The 2022–23 surge to 5% was the most challenging environment in 15 years for EM borrowers.",
  },

  "Fed Funds Rate": {
    title: "Fed Funds Rate",
    definition:
      "The US Federal Reserve's target overnight interest rate between banks — the primary instrument of US monetary policy. Set by the Federal Open Market Committee (FOMC) at meetings approximately 8 times per year.",
    whyItMatters:
      "The most influential interest rate in the world. High Fed rates attract capital to the US, weaken emerging market currencies and bonds, raise the cost of US-dollar borrowing for Pakistan, and tighten global credit conditions. When the Fed cuts, financial conditions ease globally and EM assets benefit.",
    interpretation:
      "When Fed Funds rate is high (above 4%) and rising, Pakistan faces capital outflows, weaker PKR, and higher refinancing costs. When Fed cuts rates, global conditions ease, PKR typically stabilizes or strengthens, and Pakistan's bond spreads compress. Fed policy is one of the most important external drivers of Pakistan's financial conditions.",
  },

  // ── Financial Markets ────────────────────────────────────────────────────────

  "Pakistan ETF (NYSE: PAK)": {
    title: "Pakistan ETF (NYSE: PAK)",
    definition:
      "The Global X MSCI Pakistan ETF (ticker: PAK) — a US-listed exchange-traded fund that tracked the MSCI Pakistan Index, providing international investors with exposure to Pakistan's top publicly listed companies on the PSX.",
    whyItMatters:
      "Served as a proxy for foreign investor sentiment toward Pakistani equities and overall country risk. Capital flows into/out of this fund reflected global risk appetite for Pakistan. The fund has been unavailable or delisted since mid-2025.",
    interpretation:
      "When active: rising price = positive foreign sentiment toward Pakistani equities. Discount to NAV = foreign investors selling. Data shown may be stale if the fund is suspended or delisted.",
  },

  // ── News Intelligence ─────────────────────────────────────────────────────────

  "Bullish": {
    title: "Bullish Sentiment",
    definition:
      "An AI-generated sentiment tag applied to a news article when its content is likely to have positive economic implications — suggesting improvement, growth, risk reduction, or a favorable policy development.",
    whyItMatters:
      "Quickly signals the direction of news flow. Aggregated bullish sentiment across Pakistan-related headlines can indicate improving conditions before they show up in hard data.",
    interpretation:
      "Many bullish articles = positive news cycle (e.g., IMF tranche released, inflation falling, reserves rising, exports growing). Use as a rough directional signal, not a precise forecast.",
  },

  "Bearish": {
    title: "Bearish Sentiment",
    definition:
      "An AI-generated sentiment tag applied to a news article when its content is likely to have negative economic implications — suggesting deterioration, increased risk, policy failure, or stress in a key sector.",
    whyItMatters:
      "Identifies negative news quickly for risk monitoring. Persistent bearish sentiment in Pakistan-focused news often precedes PKR weakness, rating downgrades, or market stress.",
    interpretation:
      "Predominantly bearish news = potential for PKR weakness, rate hikes, or capital outflows. Most concerning when concentrated in fiscal, external, or banking sector categories.",
  },

  "Neutral": {
    title: "Neutral Sentiment",
    definition:
      "An AI-generated sentiment tag applied when a news article is informational, data-reporting, or mixed — without a clear positive or negative economic implication.",
    whyItMatters:
      "Provides the baseline against which bullish and bearish proportions are judged. A neutral-heavy news cycle suggests a stable, unremarkable environment.",
    interpretation:
      "High proportion of neutral articles = calm, data-driven news cycle. Shifts from neutral toward bullish or bearish can signal an emerging trend change worth monitoring.",
  },

  "Risk Level": {
    title: "Risk Level",
    definition:
      "An AI-assessed classification of how much economic risk a news article poses for Pakistan: Low = informational or minor impact; Medium = meaningful but manageable; High = significant downside risk requiring attention.",
    whyItMatters:
      "Quickly surfaces the articles most worth reading for risk monitoring. Multiple concurrent high-risk tags can be an early warning signal before hard data confirms a deterioration.",
    interpretation:
      "Low = routine news, limited economic consequence. Medium = notable development that bears watching. High = significant risk event: IMF program uncertainty, a large FX move, a geopolitical escalation, or a policy failure with measurable economic impact.",
  },

  // ── DashboardSection stat labels that are financial terms ──────────────────

  "Import Cover": {
    title: "Import Cover",
    definition:
      "The number of months of Pakistan's total import bill that can be paid by current foreign exchange reserves. Calculated as: Total FX Reserves ÷ (Annual Import Bill ÷ 12).",
    whyItMatters:
      "The standard international metric for assessing external liquidity adequacy. IMF guidelines consider 3 months the minimum safe level. Pakistan's reserves fell below 1 month of import cover in early 2023, triggering urgent IMF emergency financing.",
    interpretation:
      "Above 3 months = adequate. 2–3 months = borderline. Below 2 months = vulnerable. Below 1 month = crisis territory. Trend direction is critical: falling rapidly is an early warning signal.",
  },

  "3Y - 3M Spread": {
    title: "Yield Curve Spread (3Y − 3M)",
    definition:
      "The difference between the 3-year Pakistan Investment Bond (PIB) yield and the 3-month Treasury Bill yield — the slope of the short end of Pakistan's yield curve.",
    whyItMatters:
      "A leading indicator of monetary policy expectations and economic outlook. An inverted curve (short-term yields above long-term) has historically preceded recessions and rate-cutting cycles in many markets.",
    interpretation:
      "Positive spread = normal upward curve; market expects stable or rising rates. Flat = uncertainty. Negative (inverted) = market expects significant rate cuts. In Pakistan's context, a steep positive curve with falling headline inflation often signals imminent SBP rate cuts.",
  },

  "SBP Policy Rate": {
    title: "SBP Policy Rate",
    definition:
      "The State Bank of Pakistan's target overnight repo rate — the key interest rate set by the Monetary Policy Committee (MPC). Same indicator as 'Policy Rate' in the KPI grid, referenced here in section breakdowns.",
    whyItMatters:
      "Anchors all interest rates in Pakistan's financial system. Commercial banks price deposits and loans relative to it. Government borrowing costs and corporate credit costs all follow the policy rate direction.",
    interpretation:
      "Decreasing = monetary easing (favorable for growth, borrowing). Increasing = monetary tightening (fighting inflation). The real rate (Policy Rate minus CPI) determines whether policy is actually restrictive or still accommodative.",
  },

  "CPI Inflation (YoY)": {
    title: "CPI Inflation (YoY)",
    definition:
      "Year-on-year Consumer Price Index inflation — identical to the 'CPI Inflation' headline KPI. Shown here as a breakdown stat for the price indices section.",
    whyItMatters: "The primary measure of consumer price pressures faced by Pakistani households.",
    interpretation: "Below 7% = controlled per SBP target. Above 15% = high. See 'CPI Inflation' for full interpretation.",
  },

  "Core Inflation (Urban NFNE)": {
    title: "Core Inflation (Urban NFNE)",
    definition:
      "Urban Non-Food Non-Energy inflation — the core CPI measure SBP uses as its primary policy signal, stripping out food and energy price volatility from urban areas.",
    whyItMatters: "SBP's key operational target for monetary policy. Persistent high urban NFNE signals entrenched demand-side inflation requiring sustained tight monetary policy.",
    interpretation: "Declining core is the primary indicator that monetary easing is justified. Rising core = policy must stay tight. See 'Core Inflation' for full detail.",
  },

  "WPI Inflation (YoY)": {
    title: "WPI Inflation (YoY)",
    definition: "Year-on-year Wholesale Price Index inflation — same as the 'WPI Inflation' headline KPI, shown as a breakout stat.",
    whyItMatters: "Leading indicator of future CPI moves. Rising WPI means businesses are paying more for inputs, which typically passes through to consumer prices.",
    interpretation: "WPI above CPI = inflationary pipeline building. WPI below CPI = pipeline pressure easing. See 'WPI Inflation' for full interpretation.",
  },

  "Trade Balance (Goods)": {
    title: "Trade Balance (Goods)",
    definition: "Same as the 'Trade Balance' KPI — the net of goods exports minus goods imports. Shown here in the external sector breakdown.",
    whyItMatters: "The largest single contributor to Pakistan's current account deficit. Persistent large goods trade deficits require external financing.",
    interpretation: "Narrowing = improving external position. See 'Trade Balance' for full context.",
  },

  "Foreign Reserves (SBP)": {
    title: "Foreign Reserves (SBP)",
    definition: "SBP-held foreign exchange reserves only — the liquid assets directly controlled by the central bank. Excludes reserves held by commercial banks.",
    whyItMatters: "The most relevant reserve figure for assessing Pakistan's true external liquidity buffer. Commercial bank reserves are less reliable as a policy backstop.",
    interpretation: "This is the subset of total reserves most closely watched by the IMF and international markets. See 'Foreign Reserves' for full interpretation.",
  },

  "Agriculture": {
    title: "Agriculture Sector",
    definition: "Pakistan's agriculture sector GDP contribution — covering crop production (wheat, cotton, sugarcane, rice), livestock, fishing, and forestry.",
    whyItMatters: "Agriculture employs ~38% of Pakistan's workforce and accounts for ~23% of GDP. Good harvests support rural incomes, food prices, and cotton supply for the textile export sector. Monsoon variability makes agriculture Pakistan's most weather-sensitive sector.",
    interpretation: "Strong agriculture growth (5%+) supports rural demand, cotton exports, and lower food prices. Weak agriculture (crop failures, floods) spikes food inflation and textile input costs.",
  },

  "Industry": {
    title: "Industry Sector",
    definition: "Pakistan's industrial sector GDP — comprising manufacturing (LSM + small-scale), construction, and mining & quarrying.",
    whyItMatters: "Industry's performance, particularly LSM, is the primary driver of formal employment, export capacity (especially textiles), and fiscal revenue. Industrial contraction is quickly felt in trade deficits and unemployment.",
    interpretation: "Positive growth = economic momentum. Contraction = capacity underutilization, which signals energy shortages, credit squeeze, or demand weakness.",
  },

  "Services": {
    title: "Services Sector",
    definition: "Pakistan's services sector GDP — the largest economic segment, covering wholesale and retail trade, transport, communications, finance, real estate, and public administration.",
    whyItMatters: "Services represent ~60% of Pakistan's GDP. Growth here reflects domestic consumption strength, financial sector health, and increasingly digital economy activity. Unlike goods, services exports (IT, freelancing) are hard to measure but growing fast.",
    interpretation: "Sustained services growth above 3% supports overall GDP even during industrial downturns. Weak services growth signals broad consumer demand compression.",
  },

};
