export interface SectionStat {
  label: string;
  value: string;
}

export interface SectionContent {
  id: string;
  title: string;
  description: string;
  stats: SectionStat[];
}

// Mock data for Phase 1.5 — replaced by live API data in a later phase.
export const sectionData: SectionContent[] = [
  {
    id: "gdp",
    title: "GDP Growth",
    description:
      "Pakistan's overall GDP growth is driven by three core sectors. FY24 estimates show a moderate recovery led by agriculture, while industry remains under pressure from high input costs.",
    stats: [
      { label: "Agriculture", value: "6.0%" },
      { label: "Industry", value: "-0.2%" },
      { label: "Services", value: "2.2%" },
      { label: "Overall (FY24)", value: "2.5%" },
    ],
  },
  {
    id: "inflation",
    title: "Inflation (CPI)",
    description:
      "Consumer price inflation has eased from last year's peak but remains elevated, driven mainly by food, housing and transport costs.",
    stats: [
      { label: "Food", value: "12.4%" },
      { label: "Housing & Utilities", value: "10.8%" },
      { label: "Transport", value: "9.6%" },
      { label: "Core Inflation", value: "9.1%" },
    ],
  },
  {
    id: "reserves",
    title: "Foreign Exchange Reserves",
    description:
      "Total liquid foreign reserves are split between the State Bank of Pakistan and commercial banks, providing a buffer for import payments.",
    // Stats are overridden in page.tsx with live SBP EasyData values
    // (TS_GP_EXT_PAKRES_M.Z00020 for SBP + Z00050 for commercial banks).
    // These placeholders are never rendered.
    stats: [
      { label: "SBP Reserves", value: "—" },
      { label: "Commercial Banks", value: "—" },
      { label: "Total Reserves", value: "—" },
      { label: "Import Cover", value: "—" },
    ],
  },
  {
    id: "price-indices",
    title: "Core & Wholesale Prices",
    description:
      "Beyond the headline CPI, core (non-food, non-energy) and wholesale price measures show how broad-based inflationary pressure is across the economy.",
    stats: [
      { label: "CPI Inflation (YoY)", value: "11.7%" },
      { label: "Core Inflation (Urban NFNE)", value: "9.0%" },
      { label: "WPI Inflation (YoY)", value: "12.7%" },
      { label: "SBP Policy Rate", value: "11.50%" },
    ],
  },
  {
    id: "monetary-policy",
    title: "Monetary Policy & Money Markets",
    description:
      "The State Bank's policy rate anchors short-term borrowing costs, reflected in Treasury Bill and Pakistan Investment Bond auction yields.",
    stats: [
      { label: "SBP Policy Rate", value: "11.50%" },
      { label: "3M T-Bill Yield", value: "12.31%" },
      { label: "3Y PIB Yield", value: "13.25%" },
      { label: "3Y - 3M Spread", value: "+0.94 pp" },
    ],
  },
  {
    id: "exchange-rate",
    title: "Exchange Rate (PKR)",
    description:
      "The Pakistani Rupee's performance against major trading-partner currencies, based on interbank closing rates.",
    stats: [
      { label: "USD / PKR", value: "278.50" },
      { label: "EUR / PKR", value: "301.20" },
      { label: "GBP / PKR", value: "352.80" },
      { label: "SAR / PKR", value: "74.30" },
    ],
  },
  {
    id: "remittances",
    title: "Worker Remittances",
    description:
      "Remittances from overseas Pakistani workers remain a key source of foreign exchange, led by the Gulf region (top corridors shown).",
    stats: [
      { label: "Saudi Arabia", value: "$0.78B" },
      { label: "UAE", value: "$0.62B" },
      { label: "United Kingdom", value: "$0.45B" },
      { label: "United States", value: "$0.41B" },
    ],
  },
  {
    id: "external-sector",
    title: "External Sector & Money Supply",
    description:
      "The current account and trade balance track Pakistan's external financing needs, while M2 growth reflects domestic liquidity conditions.",
    stats: [
      { label: "Current Account", value: "-$0.32B" },
      { label: "Trade Balance (Goods)", value: "-$3.41B" },
      { label: "Foreign Reserves (SBP)", value: "$16.0B" },
      { label: "Money Supply (M2)", value: "Rs 44.04T" },
    ],
  },
];
