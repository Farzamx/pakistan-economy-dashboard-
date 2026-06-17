// Serializable snapshot of dashboard data passed from server page.tsx
// to the client-side FloatingAssistant. Keeps the component prop-driven
// rather than requiring a context provider.

export interface DashboardSnapshot {
  // AI Economic Health Score
  economicHealthScore: number;
  sentiment: string;
  riskLevel: string;
  summary: string;
  topDrivers: string[];

  // Quantitative risk models
  recessionProbability: number;
  recessionCategory: string;
  recessionModelScore: number;
  defaultProbability: number;
  defaultCategory: string;
  defaultModelScore: number;

  // Core economic indicators (pre-formatted strings)
  gdpGrowth: string;
  quarterlyGdpGrowth: string;
  cpiInflation: string;
  policyRate: string;
  foreignReserves: string;
  usdPkr: string;
  tradeBalance: string;
  currentAccount: string;
  remittances: string;
  exports: string;
  imports: string;
  fiscalBalance: string;
  lsm: string;
  privateCreditGrowth: string;

  // Global markets
  brentOil: string;
  gold: string;
  dxy: string;
  us10y: string;
  fedFunds: string;

  // Recent news (top 5 headlines)
  recentHeadlines: string[];

  asOf: string; // YYYY-MM-DD
}
