// Single source of truth for "which homepage sections can be pinned or
// hidden" — every id here is a real anchor id already rendered in
// src/app/page.tsx and already used by Sidebar.tsx's NAV_ITEMS /
// GlobalSearch.tsx's SEARCH_INDEX, so there's no risk of a preference
// pointing at a destination that doesn't exist. Deliberately excludes
// "overview" (the Hero/top-of-page chrome) — that's not a widget a user
// would hide, it's the page itself.

export interface DashboardWidget {
  id: string;
  label: string;
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: "risk-intelligence", label: "Risk Intelligence" },
  { id: "gdp", label: "GDP" },
  { id: "inflation", label: "Inflation" },
  { id: "price-indices", label: "Prices" },
  { id: "monetary-policy", label: "Monetary Policy" },
  { id: "global-markets", label: "Global Markets" },
  { id: "real-economy", label: "Real Economy" },
  { id: "reserves", label: "Reserves" },
  { id: "live-fx", label: "Live FX" },
  { id: "exchange-rate", label: "Exchange Rate" },
  { id: "remittances", label: "Remittances" },
  { id: "external-sector", label: "External Sector" },
  { id: "news-intelligence", label: "News" },
];

export function getWidgetLabel(id: string): string {
  return DASHBOARD_WIDGETS.find((w) => w.id === id)?.label ?? id;
}
