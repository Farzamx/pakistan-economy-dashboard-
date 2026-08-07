export interface SectionStat {
  label: string;
  value: string;
  /**
   * The canonical Kpi.title this stat tile represents, when its display
   * `label` differs from that title (e.g. label "Commercial Banks" for the
   * "Bank Reserves" indicator) — looked up in KPI_SEO_SLUG so the tile can
   * link to its detail page. Omit when there's no corresponding standalone
   * indicator page (e.g. a computed ratio like "Import Cover", or a
   * sub-sector breakdown like "Agriculture") — DashboardSection falls back
   * to `label` itself when this is unset, which already matches for stats
   * whose label IS the real title (e.g. "USD / PKR").
   */
  kpiTitle?: string;
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
      "Pakistan's economy is composed of three core sectors, each contributing a different share of overall output. Services dominates, followed by agriculture and industry.",
    // Live-overridden in page.tsx with World Bank sector-composition data
    // (share of GDP, not growth rate — see getGdpSectorComposition in
    // worldBank.ts) plus the live annual GDP growth KPI for "Overall".
    // These placeholders are never rendered.
    stats: [
      { label: "Agriculture (% of GDP)", value: "—" },
      { label: "Industry (% of GDP)", value: "—" },
      { label: "Services (% of GDP)", value: "—" },
      { label: "Overall Growth", value: "—" },
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
    // Stats are overridden in page.tsx with live weekly net-liquid reserves
    // values from SBP's Forex_Arch.xlsx (fxReserves.ts), plus the separate
    // monthly Total SBP Reserves (EasyData Z00020) as an explicitly labeled
    // reference figure. These placeholders are never rendered.
    stats: [
      { label: "Net Liquid (SBP)", value: "—" },
      { label: "Commercial Banks", value: "—" },
      { label: "Total Liquid Reserves", value: "—" },
      { label: "Import Cover", value: "—" },
      { label: "Total SBP Reserves (Monthly, incl. gold/SDR)", value: "—" },
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
      "Historical average interbank exchange rates published by SBP. Values represent monthly average or previous closing rates and are not live market quotes.",
    // Overridden in page.tsx with the live sbp.usdPkr.kpi value. SBP EasyData
    // only publishes a USD/PKR series — no EUR/GBP/SAR — so this placeholder
    // is never rendered as-is.
    stats: [
      { label: "USD / PKR", value: "—" },
    ],
  },
  {
    id: "remittances",
    title: "Worker Remittances",
    description:
      "Remittances from overseas Pakistani workers remain a key source of foreign exchange, led by the Gulf region.",
    // Live-overridden in page.tsx (total, change, latest release date).
    // A prior version of this section fabricated a per-country corridor
    // breakdown (Saudi Arabia/UAE/UK/US) as static "Phase 1.5" mock
    // numbers that were never live — no per-country remittance data
    // source exists in this codebase — and they were never migrated,
    // silently contradicting the live total shown elsewhere on the same
    // page (Phase 6A.2 consistency audit). Removed rather than faked.
    // This placeholder is never rendered.
    stats: [
      { label: "Total Remittances", value: "—" },
      { label: "vs Prior Month", value: "—" },
      { label: "Latest Release", value: "—" },
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
