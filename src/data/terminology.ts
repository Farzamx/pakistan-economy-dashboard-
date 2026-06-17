// Centralized Economic Knowledge Registry
//
// Structure per entry:
//   what  — 1 sentence (max ~20 words)
//   why   — 1 sentence (max ~20 words)
//   how   — max 3 bullet strings (UI adds "•" prefix)
//
// Target natural tooltip height: ~200–240px (no scrollbar on any desktop)

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
    what: "How fast Pakistan's total economy grew this year, across agriculture, industry, and services.",
    why: "Higher growth means more jobs and better living standards — Pakistan needs 5%+ to reduce poverty.",
    how: [
      "Above 5% = Strong | 2–5% = Moderate",
      "Below 2% = Weak economy",
      "Negative = Recession",
    ],
  },

  "CPI Inflation": {
    title: "CPI Inflation",
    what: "How fast prices of everyday items — food, rent, transport, medicine — rose compared to last year.",
    why: "High inflation makes life more expensive and forces SBP to raise interest rates, slowing the economy.",
    how: [
      "5–7% = Healthy (SBP target) | 7–12% = Elevated",
      "Above 15% = Crisis level",
      "Falling trend = Positive sign",
    ],
  },

  "Core Inflation": {
    title: "Core Inflation",
    what: "CPI inflation with food and energy removed — shows the underlying price pressure across the broader economy.",
    why: "It tells SBP whether inflation is truly widespread or just a temporary food/fuel spike.",
    how: [
      "Core above CPI = Inflation is broad-based and hard to fix",
      "Core below CPI = Mainly a supply shock (often temporary)",
      "Falling core = Rate cuts becoming likely",
    ],
  },

  "WPI Inflation": {
    title: "WPI Inflation",
    what: "Prices at the factory/wholesale level — what businesses pay before goods reach shops.",
    why: "A leading signal: rising wholesale prices typically pass through to consumers within 1–3 months.",
    how: [
      "WPI rising faster than CPI = Consumer hikes coming soon",
      "WPI falling = Pipeline pressure easing",
      "Watch for 3-month lag to CPI",
    ],
  },

  "Foreign Reserves": {
    title: "Foreign Reserves",
    what: "Hard currency (mainly US dollars) held by SBP to pay for imports and foreign debt.",
    why: "Pakistan's financial safety net — when reserves fall too low, the country can't pay its bills.",
    how: [
      "Above $12B = Comfortable | $8–12B = Borderline",
      "Below $8B = Vulnerable",
      "Below $4B = Crisis (as in Feb 2023)",
    ],
  },

  "Policy Rate": {
    title: "Policy Rate",
    what: "The interest rate SBP sets for banks — all lending and deposit rates in Pakistan follow it.",
    why: "Higher rate = fighting inflation; lower rate = stimulating growth and investment.",
    how: [
      "Rate hikes = SBP fighting inflation",
      "Rate cuts = SBP confident inflation is falling",
      "Real rate = Policy Rate minus CPI (negative = still stimulating)",
    ],
  },

  "3M T-Bill Yield": {
    title: "3M T-Bill Yield",
    what: "The interest rate the government pays to borrow money for 3 months at auction.",
    why: "Pakistan's benchmark short-term rate — banks price all lending and deposits against it.",
    how: [
      "Tracks SBP Policy Rate closely",
      "Rising before MPC meeting = Rate hike expected",
      "Falling = Rate cut expected",
    ],
  },

  "3Y PIB Yield": {
    title: "3Y PIB Yield",
    what: "The interest rate the government pays to borrow for 3 years via Pakistan Investment Bonds.",
    why: "Shows what markets expect for interest rates and inflation over the next 3 years.",
    how: [
      "PIB above T-Bill = Normal yield curve",
      "PIB below T-Bill = Market expects rate cuts",
      "Rising PIB = Higher government debt costs ahead",
    ],
  },

  "Remittances": {
    title: "Remittances",
    what: "Money sent home by Pakistanis working abroad — mainly from Saudi Arabia, UAE, UK, and USA.",
    why: "Pakistan's biggest source of foreign currency, consistently exceeding all goods exports combined.",
    how: [
      "Above $3B/month = Strong",
      "$2–3B = Normal | Below $2B = Concerning",
      "Peaks seasonally during Ramadan and Eid",
    ],
  },

  "Current Account": {
    title: "Current Account",
    what: "All money flowing in and out of Pakistan internationally — exports, imports, remittances, and transfers.",
    why: "A persistent deficit means Pakistan borrows to fund its lifestyle, triggering recurring IMF programs.",
    how: [
      "Surplus = Earning more than spending abroad",
      "Deficit below 1% of GDP = Manageable",
      "Above 4% of GDP = High crisis risk",
    ],
  },

  "Trade Balance": {
    title: "Trade Balance",
    what: "Pakistan's export earnings minus import payments for physical goods — Pakistan always imports more than it exports.",
    why: "The biggest driver of the current account deficit; narrowing it is critical for stability.",
    how: [
      "Closer to zero = Better",
      "Narrowing from export growth = Positive",
      "Narrowing from import compression = Usually means slowdown",
    ],
  },

  "Money Supply (M2)": {
    title: "Money Supply (M2)",
    what: "Total money in the economy — physical cash plus all bank deposits people can easily access.",
    why: "When M2 grows much faster than the economy, it fuels inflation.",
    how: [
      "M2 growth 10–15% = Normal range",
      "Above 20% = Inflation risk building",
      "Falling real M2 = Monetary tightening working",
    ],
  },

  "USD / PKR": {
    title: "USD / PKR",
    what: "How many Rupees it takes to buy one US Dollar — the most watched financial indicator in Pakistan.",
    why: "A weaker Rupee makes all imports more expensive and inflates the cost of foreign debt repayments.",
    how: [
      "Rising = Rupee weakening (depreciation)",
      "Falling = Rupee strengthening",
      "Rapid rise = Balance of payments stress",
    ],
  },

  "EUR / PKR": {
    title: "EUR / PKR",
    what: "How many Rupees buy one Euro — updated hourly from live market data.",
    why: "Relevant for Pakistan's trade with the EU (a major textile buyer) and euro-denominated obligations.",
    how: [
      "Rising = Rupee weakening vs Euro",
      "Primarily mirrors USD/PKR movements",
      "Secondary influence from EUR/USD in global markets",
    ],
  },

  "GBP / PKR": {
    title: "GBP / PKR",
    what: "How many Rupees buy one British Pound — updated hourly.",
    why: "The UK hosts a large Pakistani diaspora; this rate determines the PKR value of remittances from the UK.",
    how: [
      "Rising = Rupee weakening vs Pound",
      "Primarily tracks USD/PKR",
      "Bank of England decisions can shift GBP independently",
    ],
  },

  "SAR / PKR": {
    title: "SAR / PKR",
    what: "How many Rupees buy one Saudi Riyal — updated hourly. The SAR is pegged to the USD at 3.75.",
    why: "Saudi Arabia is Pakistan's top remittance corridor; a weaker Rupee boosts PKR received by workers' families.",
    how: [
      "Rising = Rupee weakening (mirrors USD/PKR)",
      "SAR/PKR ≈ USD/PKR ÷ 3.75",
      "SAR peg to USD is very stable",
    ],
  },

  "Exports": {
    title: "Exports",
    what: "Total value of goods Pakistan sells abroad — mainly textiles, leather, surgical goods, and food.",
    why: "The only sustainable source of foreign currency; Pakistan's narrow export base is a chronic weakness.",
    how: [
      "Above $3B/month = Strong",
      "$2–2.5B = Typical | Below $2B = Weak",
      "Goal: diversify beyond textiles",
    ],
  },

  "Imports": {
    title: "Imports",
    what: "Total value of goods Pakistan buys from abroad — mainly oil, machinery, chemicals, and food.",
    why: "High energy imports are the biggest vulnerability; oil price spikes directly hit Pakistan's trade deficit.",
    how: [
      "Rising capital goods = Investment growth (positive)",
      "Rising energy imports = Oil prices hurting Pakistan",
      "Sharp drop = Economic slowdown or import curbs",
    ],
  },

  "FDI Inflows": {
    title: "FDI Inflows",
    what: "Net foreign investment into Pakistani businesses — money coming in minus money being withdrawn.",
    why: "FDI brings productive capital without debt; Pakistan's FDI is chronically low vs regional peers.",
    how: [
      "Above $200M/month = Healthy",
      "Below $100M = Weak | Negative = Capital leaving",
      "CPEC (China) is the largest single source",
    ],
  },

  "REER": {
    title: "REER",
    what: "The Rupee's value adjusted for Pakistan's higher inflation vs trading partners — measures true competitiveness.",
    why: "An overvalued REER makes Pakistani exports too expensive globally, contributing to trade deficits.",
    how: [
      "Below 100 = Competitively priced (vs 2010 base)",
      "Above 100 = Relatively expensive exports",
      "Falling REER = Competitiveness improving",
    ],
  },

  "LSM": {
    title: "LSM (Large-Scale Manufacturing)",
    what: "Monthly output of Pakistan's large factories — textiles, chemicals, food, steel, and engineering goods.",
    why: "A real-time proxy for industrial health; typically leads GDP by 1–2 months.",
    how: [
      "Rising = Industrial expansion",
      "Falling = Factory output contracting",
      "Sharp drop = Energy shortages or credit squeeze",
    ],
  },

  "Private Credit Growth": {
    title: "Private Credit Growth",
    what: "How fast banks are lending to businesses and households (excludes government borrowing).",
    why: "Low private credit means businesses can't invest or grow — often caused by government 'crowding out' banks.",
    how: [
      "Growing faster than CPI = Real credit expansion",
      "Negative real growth = Credit is shrinking",
      "Rebound = Economy beginning to normalize",
    ],
  },

  "Fiscal Balance": {
    title: "Fiscal Balance",
    what: "Government income minus spending — a negative number means a deficit (spending more than it earns).",
    why: "Pakistan's chronic deficit is the root cause of its debt cycle and dependency on IMF bailouts.",
    how: [
      "Below 3% of GDP = Manageable",
      "4–6% = Elevated | Above 6% = Pakistan's historical norm",
      "Surplus = Extremely rare for Pakistan",
    ],
  },

  // ── Global Markets ────────────────────────────────────────────────────────

  "Gold": {
    title: "Gold",
    what: "Spot price of gold per ounce in USD — a global safe-haven and inflation hedge.",
    why: "Rising gold signals global uncertainty and increases Pakistan's import costs (Pakistan is a large gold consumer).",
    how: [
      "Rising = Global risk aversion or inflation fears",
      "Falling = Investor confidence improving",
      "Pakistan's household gold holdings are very large",
    ],
  },

  "Silver": {
    title: "Silver",
    what: "Spot price of silver per ounce — both a precious metal and industrial material (electronics, solar).",
    why: "Tracks gold as a sentiment signal but is more volatile and sensitive to manufacturing trends.",
    how: [
      "Rising with gold = Safe-haven demand",
      "Rising faster than gold = Industrial demand pickup",
      "Gold/Silver ratio above 80 = Silver historically cheap",
    ],
  },

  "WTI Crude": {
    title: "WTI Crude",
    what: "West Texas Intermediate crude oil per barrel — the US oil benchmark, very similar to Brent.",
    why: "Every $10 rise adds roughly $1.5–2B to Pakistan's annual import bill.",
    how: [
      "Below $60 = Favorable | $60–80 = Manageable",
      "Above $90 = Significant import stress",
      "Above $100 = Crisis-level costs for Pakistan",
    ],
  },

  "Brent Crude": {
    title: "Brent Crude",
    what: "The global oil benchmark per barrel — Pakistan's petroleum imports are directly priced against Brent.",
    why: "The most relevant oil price for Pakistan; LNG import contracts are also linked to Brent.",
    how: [
      "Below $60 = Low import costs (favorable)",
      "Above $90 = Significant trade balance pressure",
      "Typically $2–5/bbl above WTI",
    ],
  },

  "Natural Gas": {
    title: "Natural Gas",
    what: "Henry Hub gas price per MMBtu — the US benchmark, widely used to price global LNG contracts.",
    why: "Pakistan imports LNG to supplement declining domestic gas; high prices ripple through industrial energy costs.",
    how: [
      "Below $3 = Cheap | $3–5 = Moderate",
      "Above $5 = Elevated LNG costs for Pakistan",
      "2022 European crisis spiked above $10",
    ],
  },

  "US Dollar Index": {
    title: "US Dollar Index (DXY)",
    what: "Strength of the USD against 6 major currencies — mainly Euro, Yen, and Pound.",
    why: "A strong dollar makes commodities more expensive globally and pressures the Rupee.",
    how: [
      "Below 95 = Weak dollar (good for Pakistan)",
      "Above 100 = Strong dollar (pressure on PKR)",
      "Above 106 = Very strong — significant EM stress",
    ],
  },

  "US 10Y Treasury": {
    title: "US 10Y Treasury Yield",
    what: "Interest rate on 10-year US government bonds — the world's most important benchmark rate.",
    why: "Rising yields pull capital out of emerging markets like Pakistan, weakening the Rupee.",
    how: [
      "Below 2.5% = Favorable for Pakistan",
      "Above 4.5% = Significant headwind",
      "2022–23 surge to 5% = Hardest EM environment in 15 years",
    ],
  },

  "Fed Funds Rate": {
    title: "Fed Funds Rate",
    what: "The US Federal Reserve's key interest rate — the most powerful rate in the world.",
    why: "High US rates attract capital to America, weakening the Rupee and raising Pakistan's borrowing costs.",
    how: [
      "High rate (above 4%) = Pressure on PKR",
      "Fed cuts = Relief for Pakistan (capital returns to EMs)",
      "Single biggest external driver of Pakistan's finances",
    ],
  },

  // ── Financial Markets ─────────────────────────────────────────────────────

  "Bank Reserves": {
    title: "Commercial Bank FX Reserves",
    what: "Foreign currency held by Pakistani commercial banks — separate from SBP's own reserves.",
    why: "Add to SBP reserves for Total Liquid Reserves — the figure most cited in financial media.",
    how: [
      "SBP + Bank reserves = Total system FX buffer",
      "Higher is better",
      "SBP monthly data lags weekly press releases by 4–6 weeks",
    ],
  },

  "Pakistan ETF (NYSE: PAK)": {
    title: "Pakistan ETF (NYSE: PAK)",
    what: "A US-listed fund that tracked Pakistan's top listed companies — a proxy for foreign investor sentiment.",
    why: "Capital flows into/out of this fund showed international risk appetite for Pakistan. Delisted since mid-2025.",
    how: [
      "Rising = Positive foreign sentiment",
      "Falling = Foreign investors reducing exposure",
      "Data may be stale if fund is suspended",
    ],
  },

  // ── News Intelligence ──────────────────────────────────────────────────────

  "Bullish": {
    title: "Bullish Sentiment",
    what: "AI tag for news articles likely to have positive economic effects — inflation falling, reserves rising, IMF funds arriving.",
    why: "A cluster of bullish headlines often signals improving conditions before hard data confirms it.",
    how: [
      "Many bullish = Positive news cycle",
      "Use as directional signal, not forecast",
    ],
  },

  "Bearish": {
    title: "Bearish Sentiment",
    what: "AI tag for news signalling potential trouble — IMF delays, fiscal stress, or currency pressure.",
    why: "Persistent bearish headlines often precede PKR weakness or market stress by several weeks.",
    how: [
      "Mostly bearish = Watch for PKR pressure",
      "Concentrated in fiscal/external = Most concerning",
    ],
  },

  "Neutral": {
    title: "Neutral Sentiment",
    what: "AI tag for informational or data-reporting articles without a clear positive or negative economic implication.",
    why: "The baseline signal — a neutral-heavy cycle means things are stable and unremarkable.",
    how: [
      "High neutral = Calm news environment",
      "Shift toward bearish = Risk emerging",
    ],
  },

  "Risk Level": {
    title: "Risk Level",
    what: "AI rating of how much economic risk a news article poses for Pakistan — Low, Medium, or High.",
    why: "Multiple concurrent High-risk tags are an early warning of a potential crisis forming.",
    how: [
      "Low = Routine news | Medium = Worth watching",
      "High = Significant risk event (IMF, FX move, policy failure)",
    ],
  },

  // ── DashboardSection stat labels ──────────────────────────────────────────

  "Import Cover": {
    title: "Import Cover",
    what: "How many months of imports Pakistan can pay for using current foreign reserves.",
    why: "The IMF's standard measure of external liquidity — Pakistan fell below 1 month in early 2023.",
    how: [
      "Above 3 months = Adequate (IMF minimum)",
      "Below 2 months = Vulnerable",
      "Below 1 month = Crisis territory",
    ],
  },

  "3Y - 3M Spread": {
    title: "Yield Curve Spread (3Y − 3M)",
    what: "Difference between 3-year PIB yields and 3-month T-Bill yields — the slope of the yield curve.",
    why: "When this turns negative (inverted), markets expect rate cuts — a reliable leading indicator.",
    how: [
      "Positive = Normal curve (stable outlook)",
      "Near zero = Uncertainty about direction",
      "Negative = Rate cuts expected ahead",
    ],
  },

  "SBP Policy Rate": {
    title: "SBP Policy Rate",
    what: "SBP's key interest rate — same as the Policy Rate KPI, shown here as a section reference.",
    why: "Anchors all lending and deposit rates; direction of change matters as much as the level.",
    how: [
      "Decreasing = Monetary easing",
      "Increasing = Monetary tightening",
      "Real rate = Policy Rate minus CPI",
    ],
  },

  "CPI Inflation (YoY)": {
    title: "CPI Inflation (YoY)",
    what: "Year-on-year consumer price inflation — same indicator as the CPI Inflation headline KPI.",
    why: "Primary measure of price pressure on Pakistani households.",
    how: [
      "Below 7% = Controlled | 7–12% = Elevated",
      "Above 15% = High",
    ],
  },

  "Core Inflation (Urban NFNE)": {
    title: "Core Inflation (Urban NFNE)",
    what: "Urban Non-Food Non-Energy inflation — SBP's primary policy signal for underlying price pressure.",
    why: "Declining core is the key condition SBP looks for before cutting interest rates.",
    how: [
      "Falling = Rate cuts becoming justified",
      "Rising = Policy must stay tight",
    ],
  },

  "WPI Inflation (YoY)": {
    title: "WPI Inflation (YoY)",
    what: "Year-on-year wholesale price inflation — same as the WPI Inflation headline KPI.",
    why: "Leading indicator of future CPI — wholesale cost rises pass through to consumers in 1–3 months.",
    how: [
      "WPI above CPI = Consumer hikes coming",
      "WPI below CPI = Pipeline easing",
    ],
  },

  "Trade Balance (Goods)": {
    title: "Trade Balance (Goods)",
    what: "Net of goods exports minus imports — same as the Trade Balance KPI.",
    why: "The largest contributor to Pakistan's current account deficit.",
    how: [
      "Narrowing = External position improving",
      "Widening = Growing pressure on reserves",
    ],
  },

  "Foreign Reserves (SBP)": {
    title: "Foreign Reserves (SBP)",
    what: "SBP-held foreign currency only — excludes reserves at commercial banks.",
    why: "The most closely watched reserve figure by the IMF and international markets.",
    how: [
      "Above $12B = Comfortable",
      "Below $8B = Vulnerable | Below $4B = Crisis",
    ],
  },

  "Agriculture": {
    title: "Agriculture Sector",
    what: "Pakistan's agriculture GDP — crops, livestock, fishing, and forestry.",
    why: "Employs ~38% of the workforce; good harvests lower food prices and support textile exports.",
    how: [
      "Strong harvest = Lower food inflation",
      "Floods or drought = Immediate food price spike",
      "Cotton crop directly affects textile export capacity",
    ],
  },

  "Industry": {
    title: "Industry Sector",
    what: "Pakistan's industrial GDP — manufacturing, construction, and mining.",
    why: "Drives formal employment and export capacity; contraction quickly shows in the trade deficit.",
    how: [
      "Positive = Economic momentum building",
      "Contraction = Often signals energy shortages",
      "LSM is the monthly real-time proxy",
    ],
  },

  "Services": {
    title: "Services Sector",
    what: "Pakistan's largest sector (~60% of GDP) — trade, finance, IT, transport, and public services.",
    why: "Sustained services growth supports GDP even during industrial weakness; IT exports are fast-growing.",
    how: [
      "Above 3% growth = Broad economic support",
      "Weak services = Consumer demand compressing",
      "IT and freelancing are a rising component",
    ],
  },

};
