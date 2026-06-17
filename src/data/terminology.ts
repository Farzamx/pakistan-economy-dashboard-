// Centralized Economic Knowledge Registry
//
// Every term has three plain-English sections rendered by InfoTooltip:
//   what  — 1–2 sentences explaining the indicator
//   why   — 1–2 sentences on why it matters for Pakistan
//   how   — 2–4 bullet strings (no leading "•"; UI adds them)
//
// Target audience: students, retail investors, general public.
// Word limit: ~120 words per entry.

export interface TermEntry {
  title: string;
  what: string;
  why: string;
  how: string[];
}

export const TERMINOLOGY: Record<string, TermEntry> = {

  // ── Pakistan macro ──────────────────────────────────────────────────────

  "GDP Growth": {
    title: "GDP Growth",
    what: "Shows how fast Pakistan's total economy grew compared to last year, covering agriculture, industry, and services combined.",
    why: "Faster growth means more jobs, higher wages, and better living standards. Pakistan needs sustained 5%+ growth to reduce poverty and manage its rising debts.",
    how: [
      "Above 5% = Strong expansion",
      "2–5% = Moderate recovery",
      "Below 2% = Weak economy",
      "Negative = Recession (economy shrinking)",
    ],
  },

  "CPI Inflation": {
    title: "CPI Inflation",
    what: "Measures how quickly prices of everyday items — food, rent, transport, medicine — are rising. If CPI is 12%, prices rose 12% over the past year.",
    why: "High inflation makes life more expensive and erodes your savings. It also forces the SBP to raise interest rates, making loans costlier for everyone.",
    how: [
      "5–7% = Healthy (SBP's target range)",
      "7–12% = Elevated inflation",
      "Above 15% = High — urgent action needed",
      "Falling trend = Generally a positive sign",
    ],
  },

  "Core Inflation": {
    title: "Core Inflation",
    what: "CPI inflation with food and energy removed — shows price pressure across clothing, furniture, services, and other everyday items that aren't affected by weather or oil shocks.",
    why: "Food and energy prices swing wildly due to weather and global events. Core inflation reveals whether inflation is truly widespread, which is harder to fix.",
    how: [
      "Core above CPI = Inflation is broad-based and entrenched",
      "Core below CPI = Mainly a food or fuel spike (often temporary)",
      "Falling core = SBP more likely to start cutting interest rates",
    ],
  },

  "WPI Inflation": {
    title: "WPI Inflation",
    what: "Measures price changes at the factory and wholesale level — what businesses pay for raw materials before goods reach shops. Think of it as inflation 'in the pipeline.'",
    why: "When wholesale prices rise, businesses pass those costs to consumers within a few months. Rising WPI today often means higher retail prices soon.",
    how: [
      "WPI rising faster than CPI = Consumer price hikes likely ahead",
      "WPI falling while CPI is high = Relief for consumers coming soon",
      "Declining WPI = Deflationary pressure building in the production chain",
    ],
  },

  "Foreign Reserves": {
    title: "Foreign Reserves",
    what: "The US dollars and other hard currencies held by the State Bank of Pakistan (SBP). Used to pay for imports and repay foreign debt.",
    why: "Pakistan's financial safety net. When reserves fall too low, the country cannot pay for imports or service its foreign debts — exactly the crisis seen in early 2023.",
    how: [
      "Above $15B = Comfortable buffer",
      "$8–12B = Borderline safe",
      "Below $8B = Vulnerable to shocks",
      "Below $4B = Crisis territory (as in Feb 2023)",
    ],
  },

  "Policy Rate": {
    title: "Policy Rate",
    what: "The interest rate set by Pakistan's central bank (SBP) — the rate at which banks borrow from SBP. All commercial lending and deposit rates follow this number.",
    why: "Raising the rate makes borrowing more expensive, slowing spending and fighting inflation. Cutting it makes credit cheaper, stimulating economic activity and investment.",
    how: [
      "Rate hikes = SBP fighting high inflation",
      "Rate cuts = SBP confident inflation is sustainably falling",
      "Real rate = Policy Rate minus CPI; negative real rate = still stimulating",
      "Compare to CPI: if Policy Rate > CPI, monetary policy is genuinely tight",
    ],
  },

  "3M T-Bill Yield": {
    title: "3M T-Bill Yield",
    what: "The interest rate the Pakistani government pays to borrow for 3 months via Treasury Bill auctions. It closely mirrors the SBP Policy Rate.",
    why: "The benchmark short-term money-market rate in Pakistan. Banks price deposits and loans against it. The government must pay this yield to roll over its massive short-term debt.",
    how: [
      "Tracks SBP Policy Rate closely (usually within 0.5%)",
      "Rising ahead of MPC meeting = Market expects rate hike",
      "Falling = Market expects rate cut",
      "Compare to 3Y PIB yield to see yield curve direction",
    ],
  },

  "3Y PIB Yield": {
    title: "3Y PIB Yield",
    what: "The interest rate the government pays to borrow for 3 years via Pakistan Investment Bonds (PIBs). Shows medium-term borrowing costs.",
    why: "Reveals what markets expect for interest rates and inflation over the next 3 years. Rising PIB yields increase government debt costs and signal fiscal stress.",
    how: [
      "PIB above T-Bill = Normal upward-sloping curve",
      "PIB below T-Bill = Inverted; market expects rate cuts ahead",
      "High PIB yield + falling inflation = Rate cuts likely coming",
      "Wide spread = Market expects rates to stay elevated longer",
    ],
  },

  "Remittances": {
    title: "Remittances",
    what: "Money sent home by Pakistanis working abroad — primarily from Saudi Arabia, UAE, UK, and USA — through banks and formal transfer channels.",
    why: "Pakistan's single largest source of foreign currency, consistently exceeding goods export earnings. Remittances support millions of families and help fund the entire import bill.",
    how: [
      "Above $3B/month = Strong",
      "$2–3B/month = Normal range",
      "Below $2B/month = Concerning — pressure on PKR",
      "Spikes seasonally during Ramadan and Eid",
    ],
  },

  "Current Account": {
    title: "Current Account",
    what: "A summary of all money flowing in and out of Pakistan internationally — exports minus imports of goods and services, plus remittances and other transfers.",
    why: "A persistent deficit means Pakistan spends more abroad than it earns, forcing the country to borrow externally. Large deficits are the main trigger for Pakistan's IMF program cycles.",
    how: [
      "Surplus = Pakistan earning more than spending abroad (positive)",
      "Deficit below 1% of GDP = Manageable",
      "Deficit 2–3% of GDP = Elevated concern",
      "Above 4% of GDP = High crisis risk",
    ],
  },

  "Trade Balance": {
    title: "Trade Balance",
    what: "The difference between Pakistan's export earnings and import payments for physical goods. Pakistan consistently imports more than it exports.",
    why: "The largest driver of Pakistan's current account deficit. Narrowing this gap — through higher exports or lower imports — is critical for external stability.",
    how: [
      "Closer to zero = Better external position",
      "Narrowing from export growth = Structurally positive",
      "Narrowing from import compression = Usually means economic slowdown",
      "Widening gap = Rising import demand or falling exports",
    ],
  },

  "Money Supply (M2)": {
    title: "Money Supply (M2)",
    what: "The total amount of money in Pakistan's economy — physical cash plus all bank deposits people can easily access.",
    why: "When money supply grows much faster than the economy, it fuels inflation. The SBP monitors M2 to ensure money creation stays in line with actual economic output.",
    how: [
      "M2 growing > nominal GDP growth = Inflation risk building",
      "M2 growth 10–15% = Broadly normal",
      "Above 20% = High risk of fueling inflation",
      "Falling real M2 = Monetary tightening working",
    ],
  },

  "USD / PKR": {
    title: "USD / PKR",
    what: "How many Pakistani Rupees it takes to buy one US Dollar. The most closely watched financial number in Pakistan.",
    why: "A weaker Rupee makes oil, machinery, and imported goods more expensive, fuels domestic inflation, and increases the cost of repaying Pakistan's foreign debts.",
    how: [
      "Rising number = Rupee weakening (depreciation)",
      "Falling number = Rupee strengthening (appreciation)",
      "Rapid rise = Signals balance of payments stress",
      "Live FX shows real-time rate; history section shows monthly average",
    ],
  },

  "EUR / PKR": {
    title: "EUR / PKR",
    what: "How many Rupees it takes to buy one Euro. Updated hourly from live market data.",
    why: "Relevant for trade with European countries (a major buyer of Pakistani textiles) and for Pakistanis with income or expenses in euros.",
    how: [
      "Rising = Rupee weakening against the Euro",
      "Primarily tracks USD/PKR movements",
      "Also influenced by EUR/USD rate in global markets",
    ],
  },

  "GBP / PKR": {
    title: "GBP / PKR",
    what: "How many Rupees it takes to buy one British Pound. Updated hourly from live market data.",
    why: "The UK hosts one of the world's largest Pakistani diaspora communities. This rate directly determines the PKR value of remittances sent from the UK.",
    how: [
      "Rising = Rupee weakening against Sterling",
      "Primarily tracks USD/PKR",
      "Bank of England policy decisions can affect GBP/PKR independently",
    ],
  },

  "SAR / PKR": {
    title: "SAR / PKR",
    what: "How many Rupees buy one Saudi Riyal. Updated hourly. The SAR is fixed to the USD at 3.75 SAR = 1 USD, so it mirrors USD/PKR almost exactly.",
    why: "Saudi Arabia is Pakistan's top remittance corridor — over $0.7–0.9B per month. A weaker Rupee increases the PKR value received by families from Saudi-based workers.",
    how: [
      "Rising = Rupee weakening (same direction as USD/PKR)",
      "SAR/PKR ≈ USD/PKR ÷ 3.75",
      "Any divergence from USD/PKR would be very unusual",
    ],
  },

  "Exports": {
    title: "Exports",
    what: "Total value of goods Pakistan sells to other countries each month — mainly textiles, leather, surgical instruments, sports goods, and food.",
    why: "Export earnings are Pakistan's primary sustainable source of foreign currency. The export base is narrow and heavily concentrated in low-value textiles.",
    how: [
      "Above $3B/month = Strong",
      "$2–2.5B/month = Typical range",
      "Below $2B/month = Weak — pressure on trade balance",
      "Long-term goal: diversify beyond textiles to higher-value products",
    ],
  },

  "Imports": {
    title: "Imports",
    what: "Total value of goods Pakistan buys from other countries each month — mostly oil and energy, machinery, chemicals, and food.",
    why: "High imports widen the trade deficit. Energy imports are the biggest vulnerability — global oil price spikes directly hit Pakistan's import bill.",
    how: [
      "Rising capital goods = Investment and industrial growth (positive)",
      "Rising energy imports = High global oil prices hurting Pakistan",
      "Sharp import drop = Economic slowdown or import restrictions",
      "Compare to exports to see the trade gap",
    ],
  },

  "FDI Inflows": {
    title: "FDI Inflows",
    what: "Net investment from foreign companies and investors buying stakes in Pakistani businesses, minus any capital they withdraw.",
    why: "FDI brings productive capital without creating debt. Pakistan's FDI is historically low versus regional peers, limiting industrial growth and job creation.",
    how: [
      "Above $200M/month = Healthy",
      "Below $100M/month = Weak",
      "Negative = Foreign capital leaving the country",
      "CPEC (China-Pakistan Economic Corridor) is the largest single source",
    ],
  },

  "REER": {
    title: "REER (Real Effective Exchange Rate)",
    what: "Pakistan's exchange rate adjusted for inflation differences with trading partners. It shows how expensive Pakistani goods are versus competitors — regardless of the Rupee's nominal level.",
    why: "The truest measure of export competitiveness. An overvalued REER means Pakistani goods are too expensive globally and contributed to the 2021–22 balance of payments crisis.",
    how: [
      "Below 100 = Rupee competitively priced vs 2010 baseline",
      "Above 100 = Relatively expensive (less competitive exports)",
      "Falling REER = Improving competitiveness",
      "Rising REER = Exports becoming harder to sell globally",
    ],
  },

  "LSM": {
    title: "LSM (Large-Scale Manufacturing)",
    what: "Measures the physical output of Pakistan's large factories — textiles, chemicals, food processing, steel, and other heavy industries. Base year 2015–16 = 100.",
    why: "A monthly snapshot of industrial health, available faster than quarterly GDP data. LSM reflects energy availability, credit access, and manufacturing demand.",
    how: [
      "Rising index = Industrial expansion",
      "Falling = Factories cutting output",
      "Sharp drop = Energy shortage, import restrictions, or credit squeeze",
      "Leads GDP by 1–2 months — a reliable early warning indicator",
    ],
  },

  "Private Credit Growth": {
    title: "Private Credit Growth",
    what: "How fast bank lending to businesses and households is growing year-on-year. Does not include government borrowing from banks.",
    why: "Credit growth fuels investment and consumer spending. When the government borrows too much from banks, less credit is available for businesses — this is called 'crowding out.'",
    how: [
      "Growing faster than CPI = Real credit expansion (positive)",
      "Growing at same rate as CPI = Flat in real terms",
      "Negative = Credit is actually shrinking after inflation",
      "Rebound in private credit = Economy normalizing",
    ],
  },

  "Fiscal Balance": {
    title: "Fiscal Balance",
    what: "The difference between total government income (taxes, fees) and spending (salaries, subsidies, development). A negative number means the government is running a deficit.",
    why: "Pakistan's persistent budget deficit is the root cause of its debt cycle. Deficits are funded by borrowing, piling up interest costs and leaving less for development.",
    how: [
      "Surplus = Government saving (rare for Pakistan)",
      "Below 3% of GDP = Manageable",
      "4–6% of GDP = Elevated — borrowing is rising",
      "Pakistan's historical range: 6–8% of GDP (high)",
    ],
  },

  // ── Global Markets ────────────────────────────────────────────────────────

  "Gold": {
    title: "Gold",
    what: "Spot price of gold per troy ounce in US dollars. Gold is held globally as a savings asset, inflation hedge, and safe haven during economic uncertainty.",
    why: "Rising gold prices increase Pakistan's import costs (Pakistan is a large gold consumer) and signal global risk aversion. Falling gold signals improving investor confidence.",
    how: [
      "Rising gold = Global uncertainty or inflation fears",
      "Falling gold = Risk appetite improving, stronger dollar",
      "Pakistan's informal household gold holdings are massive",
      "Long-term uptrend reflects declining trust in paper currencies",
    ],
  },

  "Silver": {
    title: "Silver",
    what: "Spot price of silver per troy ounce in US dollars. Silver plays a dual role: precious metal (inflation hedge) and industrial material (electronics, solar panels).",
    why: "Tracks gold as a market sentiment indicator but with higher volatility. The industrial demand component links it to global manufacturing health.",
    how: [
      "Rising with gold = Safe-haven demand",
      "Rising faster than gold = Industrial demand pickup",
      "Gold/Silver ratio above 80 = Silver historically cheap vs. gold",
      "Higher volatility than gold — bigger moves in both directions",
    ],
  },

  "WTI Crude": {
    title: "WTI Crude",
    what: "West Texas Intermediate crude oil price per barrel — the US benchmark for oil prices. Very similar to Brent, the global benchmark Pakistan uses for imports.",
    why: "Oil is Pakistan's biggest import by value. Every $10 rise in oil prices adds roughly $1.5–2B to Pakistan's annual import bill, widening the trade deficit.",
    how: [
      "Below $60/bbl = Favorable for Pakistan",
      "$60–80 = Manageable",
      "Above $90 = Significant pressure on trade balance",
      "Above $100 = Crisis-level costs for Pakistan's external accounts",
    ],
  },

  "Brent Crude": {
    title: "Brent Crude",
    what: "Brent crude oil price per barrel — the global oil benchmark used to price most international contracts, including Pakistan's petroleum imports.",
    why: "Pakistan's oil and LNG import costs are directly tied to Brent prices. This is the most relevant oil price for Pakistan's economy.",
    how: [
      "Below $60/bbl = Low import costs — favorable",
      "$60–80 = Moderate",
      "Above $90 = Elevated import bill stress",
      "Typically $2–5/bbl above WTI (US benchmark)",
    ],
  },

  "Natural Gas": {
    title: "Natural Gas",
    what: "Henry Hub natural gas price per million BTU — the US benchmark widely used as a reference for global LNG contracts.",
    why: "Pakistan imports LNG to supplement declining domestic gas production. High global gas prices increase industrial energy costs and widen Pakistan's import bill.",
    how: [
      "Below $3/MMBtu = Cheap",
      "$3–5 = Moderate",
      "Above $5 = Elevated — LNG costs rising for Pakistan",
      "2022 European gas crisis spiked above $10, severely hurting Pakistan",
    ],
  },

  "US Dollar Index": {
    title: "US Dollar Index (DXY)",
    what: "Measures the strength of the US Dollar against 6 major currencies — mainly Euro, Japanese Yen, and British Pound. A rising DXY means the dollar is getting stronger.",
    why: "A stronger dollar makes commodities like oil more expensive for everyone and puts pressure on emerging market currencies like the Rupee. Pakistan struggles most when DXY is high.",
    how: [
      "Below 95 = Weak dollar (favorable for Pakistan)",
      "95–100 = Neutral",
      "Above 100 = Strong dollar (pressure on PKR)",
      "Above 106 = Very strong — significant stress for Pakistan",
    ],
  },

  "US 10Y Treasury": {
    title: "US 10Y Treasury Yield",
    what: "The interest rate on 10-year US government bonds — the world's most important benchmark rate, influencing global capital flows and sovereign borrowing costs.",
    why: "Rising US yields pull investment capital away from emerging markets like Pakistan, weakening the Rupee and raising Pakistan's international borrowing costs.",
    how: [
      "Below 2.5% = Low — favorable for Pakistan (capital flows to EM)",
      "3–4% = Moderate",
      "Above 4.5% = Elevated — significant headwind for Pakistan",
      "2022–23 surge to 5% = Hardest EM environment in 15 years",
    ],
  },

  "Fed Funds Rate": {
    title: "Fed Funds Rate",
    what: "The US Federal Reserve's key interest rate — the most powerful interest rate in the world. When the Fed raises rates, it tightens money globally, not just in the US.",
    why: "High US rates attract capital to America, weakening the Rupee and making it more expensive for Pakistan to borrow in dollars or attract foreign investment.",
    how: [
      "High Fed rate (above 4%) = Pressure on PKR and Pakistan's borrowing costs",
      "Fed cutting rates = Relief for Pakistan — capital flows back to EMs",
      "Fed policy is the single biggest external driver of Pakistan's finances",
      "Watch for Fed cut signals to anticipate PKR stabilization",
    ],
  },

  // ── Financial Markets ─────────────────────────────────────────────────────

  "Bank Reserves": {
    title: "Commercial Bank FX Reserves",
    what: "Foreign currency held by Pakistan's commercial banks — separate from SBP's reserves. Combined with SBP reserves, it gives Total Liquid FX Reserves.",
    why: "Adds to the country's total foreign currency buffer. This combined figure is what most media reports refer to when citing 'Pakistan's FX Reserves.'",
    how: [
      "Add to SBP reserves for Total Liquid Reserves",
      "Higher is better — more buffer for payments",
      "SBP monthly data lags weekly press releases by 4–6 weeks",
    ],
  },

  "Pakistan ETF (NYSE: PAK)": {
    title: "Pakistan ETF (NYSE: PAK)",
    what: "A US-listed fund that tracked Pakistan's top publicly listed companies on the PSX, allowing international investors to buy into Pakistan's stock market.",
    why: "Served as a proxy for foreign investor sentiment toward Pakistan. Capital flows showed international risk appetite. The fund has been unavailable or delisted since mid-2025.",
    how: [
      "Rising price = Positive foreign sentiment toward Pakistan",
      "Falling price = Foreign investors reducing Pakistan exposure",
      "Data may be stale if fund is suspended or delisted",
    ],
  },

  // ── News Intelligence ──────────────────────────────────────────────────────

  "Bullish": {
    title: "Bullish Sentiment",
    what: "An AI tag applied to news articles when the content is likely to have positive effects on Pakistan's economy — inflation falling, reserves rising, IMF funds arriving.",
    why: "Quickly shows whether recent news is good for Pakistan. A cluster of bullish headlines often signals improving conditions before hard data catches up.",
    how: [
      "Many bullish = Positive news cycle",
      "Mixed = Unclear direction",
      "Use as a directional signal, not a precise forecast",
    ],
  },

  "Bearish": {
    title: "Bearish Sentiment",
    what: "An AI tag applied to news articles when the content signals potential economic trouble — IMF program delays, fiscal stress, currency pressure, or rising risks.",
    why: "Quickly identifies negative news for risk monitoring. Persistent bearish headlines often precede PKR weakness or market stress.",
    how: [
      "Mostly bearish = Watch for PKR pressure or policy tightening",
      "Concentrated in fiscal/external = Especially concerning",
      "Early warning signal before hard data confirms deterioration",
    ],
  },

  "Neutral": {
    title: "Neutral Sentiment",
    what: "An AI tag for news articles that are informational or data-reporting — without a clear positive or negative economic implication.",
    why: "The baseline against which bullish and bearish signals are measured. A mostly neutral news cycle means things are calm and routine.",
    how: [
      "High neutral proportion = Stable, routine news environment",
      "Shift toward bearish = Emerging risk worth monitoring",
      "Shift toward bullish = Conditions improving",
    ],
  },

  "Risk Level": {
    title: "Risk Level",
    what: "An AI assessment of how much economic risk a news article poses for Pakistan — Low, Medium, or High.",
    why: "Helps you quickly spot the most important articles. Multiple concurrent High-risk tags are an early warning of a potential emerging crisis.",
    how: [
      "Low = Routine news, limited economic impact",
      "Medium = Notable development worth watching",
      "High = Significant risk: IMF issues, large FX move, or policy failure",
    ],
  },

  // ── DashboardSection stat labels ──────────────────────────────────────────

  "Import Cover": {
    title: "Import Cover",
    what: "How many months of imports Pakistan can pay for using its current foreign reserves. Calculated as: Total FX Reserves ÷ Monthly Import Cost.",
    why: "The standard international measure of whether a country has enough foreign currency. Pakistan fell below 1 month of cover in early 2023, requiring emergency IMF help.",
    how: [
      "Above 3 months = Adequate (IMF minimum benchmark)",
      "2–3 months = Borderline",
      "Below 2 months = Vulnerable",
      "Below 1 month = Crisis territory",
    ],
  },

  "3Y - 3M Spread": {
    title: "Yield Curve Spread (3Y − 3M)",
    what: "The difference between 3-year government bond yields and 3-month T-Bill yields. Positive means longer-term bonds pay more — the normal situation.",
    why: "When this spread turns negative (inverted), it signals the market expects interest rate cuts ahead. A reliable leading indicator of monetary policy direction.",
    how: [
      "Positive = Normal yield curve; stable or rising rate outlook",
      "Near zero = Flat; market uncertain about direction",
      "Negative = Market expects rate cuts — often follows peak inflation",
      "Wide positive = Market expects rates to stay high longer",
    ],
  },

  "SBP Policy Rate": {
    title: "SBP Policy Rate",
    what: "The State Bank of Pakistan's key interest rate — same as the 'Policy Rate' KPI card, shown here as a reference stat in the monetary policy section.",
    why: "Anchors all lending and deposit rates in Pakistan. The direction of change matters as much as the level itself.",
    how: [
      "Decreasing = Monetary easing (supports growth and borrowing)",
      "Increasing = Monetary tightening (fighting inflation)",
      "Real rate = Policy Rate minus CPI",
    ],
  },

  "CPI Inflation (YoY)": {
    title: "CPI Inflation (YoY)",
    what: "Year-on-year Consumer Price Index inflation — the same as the CPI Inflation headline KPI, shown here as a breakdown stat.",
    why: "The primary measure of price pressure on Pakistani households.",
    how: [
      "Below 7% = Controlled; SBP target range",
      "7–12% = Elevated",
      "Above 15% = High inflation requiring action",
    ],
  },

  "Core Inflation (Urban NFNE)": {
    title: "Core Inflation (Urban NFNE)",
    what: "Urban Non-Food Non-Energy inflation — the core CPI measure SBP uses as its primary policy signal, showing underlying price pressure in cities.",
    why: "SBP's operational target for monetary policy. Declining core is the main indicator that interest rate cuts are justified.",
    how: [
      "Falling core = Rate cuts becoming possible",
      "Rising core = Policy must stay tight",
      "Core above headline CPI = Inflation is broad-based",
    ],
  },

  "WPI Inflation (YoY)": {
    title: "WPI Inflation (YoY)",
    what: "Year-on-year Wholesale Price Index inflation — same as the WPI Inflation headline KPI, shown as a breakdown stat.",
    why: "Leading indicator of future consumer prices. Rising WPI means businesses are paying more, which passes through to shops within 1–3 months.",
    how: [
      "WPI above CPI = Consumer price hikes coming soon",
      "WPI below CPI = Pipeline pressure easing",
    ],
  },

  "Trade Balance (Goods)": {
    title: "Trade Balance (Goods)",
    what: "Net of goods exports minus goods imports — the same as the Trade Balance KPI, shown here in the external sector section.",
    why: "The largest single contributor to Pakistan's current account deficit.",
    how: [
      "Narrowing = Improving external position",
      "Widening = Growing pressure on foreign reserves",
    ],
  },

  "Foreign Reserves (SBP)": {
    title: "Foreign Reserves (SBP)",
    what: "SBP-held foreign exchange reserves only — liquid assets directly controlled by the central bank, excluding reserves held by commercial banks.",
    why: "The subset of reserves most closely watched by the IMF and international markets. More reliable as a policy backstop than commercial bank reserves.",
    how: [
      "Above $12B = Comfortable",
      "$8–12B = Borderline",
      "Below $4B = Crisis territory",
    ],
  },

  "Agriculture": {
    title: "Agriculture Sector",
    what: "Pakistan's agriculture GDP — covering crop production (wheat, cotton, rice, sugarcane), livestock, fishing, and forestry.",
    why: "Agriculture employs ~38% of Pakistan's workforce and contributes ~23% of GDP. Good harvests support rural incomes, food prices, and cotton supply for textile exports.",
    how: [
      "Strong growth (5%+) = Lower food prices, higher rural incomes",
      "Weak growth (floods, droughts) = Food inflation spikes",
      "Cotton harvest quality directly affects textile export capacity",
    ],
  },

  "Industry": {
    title: "Industry Sector",
    what: "Pakistan's industrial GDP — manufacturing (large and small scale), construction, and mining.",
    why: "Industry drives formal employment, export capacity (especially textiles), and fiscal revenue. Industrial contraction quickly shows up in the trade deficit.",
    how: [
      "Positive growth = Economic momentum building",
      "Contraction = Capacity underutilization — often from energy shortages",
      "LSM is the monthly indicator that tracks this in real time",
    ],
  },

  "Services": {
    title: "Services Sector",
    what: "Pakistan's services GDP — the largest sector, covering trade, transport, finance, real estate, IT, and public administration.",
    why: "Services represent ~60% of Pakistan's GDP. Growth here reflects domestic consumption strength, financial sector health, and a rapidly growing IT and freelancing sector.",
    how: [
      "Above 3% growth = Supports GDP even during industrial weakness",
      "Weak services = Broad consumer demand compression",
      "IT and digital exports are a fast-growing component to watch",
    ],
  },

};
