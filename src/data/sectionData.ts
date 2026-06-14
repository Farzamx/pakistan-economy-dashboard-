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
    stats: [
      { label: "SBP Reserves", value: "$8.1B" },
      { label: "Commercial Banks", value: "$1.3B" },
      { label: "Total Reserves", value: "$9.4B" },
      { label: "Import Cover", value: "1.8 months" },
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
];
