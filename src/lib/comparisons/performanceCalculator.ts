// "If PKR 100,000 had been invested on [date], what would it be worth today?"
// Limited to assets with a real historical data source in this project:
// Gold (Yahoo Finance), USD/PKR (SBP), and 3-month T-Bills (SBP yield
// series, compounded). KSE-100 is deliberately excluded — there is no real
// historical series for it in this project, and simulating one from the
// PAK ETF proxy and presenting it as "Pakistan stock market return" would
// misrepresent a different asset as the index itself.

export interface AssetTimelinePoint {
  key: string; // "YYYY-MM"
  gold: number | null;
  usdPkr: number | null;
  tbillYieldPct: number | null;
}

function toMonthKey(date: string): string {
  return date.length === 4 ? `${date}-01` : date.slice(0, 7);
}

export function buildAssetTimeline(
  goldPoints: { date: string; value: number }[],
  usdPkrPoints: { date: string; value: number }[],
  tbillPoints: { date: string; value: number }[],
): AssetTimelinePoint[] {
  const goldMap = new Map<string, number>();
  for (const p of goldPoints) goldMap.set(toMonthKey(p.date), p.value);
  const usdPkrMap = new Map<string, number>();
  for (const p of usdPkrPoints) usdPkrMap.set(toMonthKey(p.date), p.value);
  const tbillMap = new Map<string, number>();
  for (const p of tbillPoints) tbillMap.set(toMonthKey(p.date), p.value);

  const allKeys = Array.from(new Set([...goldMap.keys(), ...usdPkrMap.keys(), ...tbillMap.keys()])).sort();

  let lastGold: number | null = null;
  let lastUsdPkr: number | null = null;
  let lastTbill: number | null = null;
  return allKeys.map((key) => {
    if (goldMap.has(key)) lastGold = goldMap.get(key)!;
    if (usdPkrMap.has(key)) lastUsdPkr = usdPkrMap.get(key)!;
    if (tbillMap.has(key)) lastTbill = tbillMap.get(key)!;
    return { key, gold: lastGold, usdPkr: lastUsdPkr, tbillYieldPct: lastTbill };
  });
}

export interface PerformanceResult {
  asset: "gold" | "usdPkr" | "tbill";
  label: string;
  methodology: string;
  startValue: number;
  endValue: number;
  returnPct: number;
}

export function calculatePerformance(
  timeline: AssetTimelinePoint[],
  startKey: string,
  principal = 100_000,
): PerformanceResult[] {
  const startIdx = timeline.findIndex((p) => p.key === startKey);
  if (startIdx === -1) return [];
  const start = timeline[startIdx];
  const end = timeline[timeline.length - 1];
  const results: PerformanceResult[] = [];

  // Gold: PKR value of a Dollar-priced asset depends on both the USD gold
  // price change AND the USD/PKR exchange rate change over the period.
  if (start.gold !== null && end.gold !== null && start.usdPkr !== null && end.usdPkr !== null) {
    const goldUsdReturn = end.gold / start.gold;
    const fxReturn = end.usdPkr / start.usdPkr;
    const endValue = principal * goldUsdReturn * fxReturn;
    results.push({
      asset: "gold",
      label: "Gold",
      methodology: "USD gold price change × USD/PKR exchange rate change",
      startValue: principal,
      endValue,
      returnPct: (endValue / principal - 1) * 100,
    });
  }

  // USD/PKR: converting to Dollars and holding them, then converting back.
  if (start.usdPkr !== null && end.usdPkr !== null) {
    const endValue = principal * (end.usdPkr / start.usdPkr);
    results.push({
      asset: "usdPkr",
      label: "US Dollars (held, converted back to PKR)",
      methodology: "USD/PKR exchange rate change only — no interest earned",
      startValue: principal,
      endValue,
      returnPct: (endValue / principal - 1) * 100,
    });
  }

  // T-Bills: compound monthly using each period's then-prevailing 3-month
  // T-Bill yield (real historical values, standard compounding math — not
  // a precise replica of actual auction mechanics, which roll over
  // quarterly rather than monthly, but a reasonable, disclosed approximation).
  if (start.tbillYieldPct !== null) {
    let balance = principal;
    for (let i = startIdx; i < timeline.length; i++) {
      const yieldPct = timeline[i].tbillYieldPct;
      if (yieldPct !== null) balance *= 1 + yieldPct / 100 / 12;
    }
    results.push({
      asset: "tbill",
      label: "3-Month T-Bills (reinvested)",
      methodology: "Compounded monthly at each period's then-prevailing 3M T-Bill yield",
      startValue: principal,
      endValue: balance,
      returnPct: (balance / principal - 1) * 100,
    });
  }

  return results;
}
