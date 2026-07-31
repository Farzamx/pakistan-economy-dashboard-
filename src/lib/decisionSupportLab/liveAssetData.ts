// Investment Intelligence — shared live asset data fetcher (Phase 5).
//
// Every tool that needs real nominal-return figures for Gold, USD/PKR,
// PSX, T-Bills, PIBs or the Policy Rate (Asset Comparison Lab, Portfolio
// Purchasing Power, and any future portfolio tool) calls THIS ONE
// function rather than each re-fetching and re-computing trailing returns
// itself — the exact "avoid duplicate fetchers" instruction applied to
// our own code, not just to reusing PEIC's existing accessors.
//
// Reuses existing PEIC data accessors as-is (sbpServer.ts, yfinance.ts) —
// no new fetchers were added. Gold/USD/PSX get a real trailing-12-month
// return and volatility computed from raw history; T-Bills/PIBs/Policy
// Rate use their currently quoted yield directly, since those are already
// annualized rates, not price series requiring a trailing-return
// calculation. Money Market Fund and Property have no PEIC data source
// and stay manual-entry in every tool's own client Calculator.
import "server-only";
import { getSbpIndicator, getSbpIndicatorHistory } from "@/lib/data/sbpServer";
import { getGoldHistory, fetchYfHistory } from "@/lib/data/yfinance";
import { calculateTrailingReturn, calculateVolatility } from "@/lib/decisionSupportLab/investmentEngine";

export interface LiveAssetDataPoint {
  nominalReturnPct: number | null;
  volatilityPct: number | null;
}

export interface LiveAssetData {
  gold: LiveAssetDataPoint;
  usd: LiveAssetDataPoint;
  savings: LiveAssetDataPoint;
  tbill: LiveAssetDataPoint;
  pib: LiveAssetDataPoint;
  psx: LiveAssetDataPoint;
  asOfDate: string;
}

export async function getLiveAssetData(): Promise<LiveAssetData> {
  const [goldHistory, usdHistory, pakHistory, tbill, pib, policyRate] = await Promise.all([
    getGoldHistory(),
    getSbpIndicatorHistory("usdPkr"),
    fetchYfHistory("PAK", "1y", "1wk").catch(() => null),
    getSbpIndicator("tbillYield3m"),
    getSbpIndicator("pibYield3y"),
    getSbpIndicator("policyRate"),
  ]);

  const goldPoints = goldHistory?.map((p) => ({ date: p.date, value: p.close })) ?? [];
  const psxPoints = pakHistory?.map((p) => ({ date: p.date, value: p.close })) ?? [];

  return {
    gold: { nominalReturnPct: goldPoints.length > 0 ? calculateTrailingReturn(goldPoints, 365) : null, volatilityPct: goldPoints.length > 0 ? calculateVolatility(goldPoints, 52) : null },
    usd: { nominalReturnPct: usdHistory.points.length > 0 ? calculateTrailingReturn(usdHistory.points, 365) : null, volatilityPct: usdHistory.points.length > 0 ? calculateVolatility(usdHistory.points, 12) : null },
    psx: { nominalReturnPct: psxPoints.length > 0 ? calculateTrailingReturn(psxPoints, 365) : null, volatilityPct: psxPoints.length > 0 ? calculateVolatility(psxPoints, 52) : null },
    savings: { nominalReturnPct: parseFloat(policyRate.kpi.value) || null, volatilityPct: null },
    tbill: { nominalReturnPct: parseFloat(tbill.kpi.value) || null, volatilityPct: null },
    pib: { nominalReturnPct: parseFloat(pib.kpi.value) || null, volatilityPct: null },
    asOfDate: new Date().toISOString().slice(0, 10),
  };
}
