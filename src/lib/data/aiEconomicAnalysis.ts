// AI Economic Intelligence Engine
// Calls OpenRouter (nex-agi/nex-n2-pro:free) with live indicator data and
// news headlines, returns a structured economic health assessment.
//
// OPENROUTER_API_KEY must be set in .env.local. Without it the function
// returns safe fallback values so the dashboard never breaks.
//
// The fetch is tagged with next.revalidate so Next.js caches the response
// for 1 hour — the AI is called at most once per revalidation window, not
// on every page request.

import type { NewsItem } from "./news";

// Plain-string snapshot of each indicator — easy to serialize for the API route.
export interface IndicatorSnapshot {
  gdpGrowth: string;
  cpiInflation: string;
  coreInflation: string;
  policyRate: string;
  foreignReserves: string;
  tradeBalance: string;
  currentAccount: string;
  remittances: string;
  usdPkr: string;
  kse100: string;
  brentOil: string;
  wtiOil: string;
  gold: string;
  dxy: string;
  us10y: string;
  fedFunds: string;
}

export interface AiEconomicAnalysis {
  economicHealthScore: number;
  sentiment: "Bullish" | "Neutral" | "Bearish";
  riskLevel: "Low" | "Moderate" | "High";
  summary: string;
  topDrivers: string[];
}

const FALLBACK: AiEconomicAnalysis = {
  economicHealthScore: 55,
  sentiment: "Neutral",
  riskLevel: "Moderate",
  summary:
    "Pakistan's economy is showing moderate stability. Rising remittances and a recovering agriculture sector are encouraging, but persistent inflation and a fragile exchange rate keep reserves at a thin import-cover buffer.",
  topDrivers: [
    "Inflation remains elevated, constraining real incomes and consumption",
    "Foreign reserves provide limited import cover amid external pressures",
    "Remittances continue to support the external account balance",
  ],
};

const REVALIDATE = 60 * 60; // 1h

function buildPrompt(indicators: IndicatorSnapshot, news: NewsItem[]): string {
  const lines = [
    `GDP Growth: ${indicators.gdpGrowth}`,
    `CPI Inflation: ${indicators.cpiInflation}`,
    `Core Inflation: ${indicators.coreInflation}`,
    `Policy Rate (SBP): ${indicators.policyRate}`,
    `Foreign Reserves: ${indicators.foreignReserves}`,
    `Trade Balance: ${indicators.tradeBalance}`,
    `Current Account: ${indicators.currentAccount}`,
    `Remittances: ${indicators.remittances}`,
    `USD/PKR Exchange Rate: ${indicators.usdPkr}`,
    `KSE-100 Proxy (PAK ETF): ${indicators.kse100}`,
    `Brent Crude Oil: ${indicators.brentOil}`,
    `WTI Crude Oil: ${indicators.wtiOil}`,
    `Gold: ${indicators.gold}`,
    `US Dollar Index (DXY): ${indicators.dxy}`,
    `US 10Y Treasury Yield: ${indicators.us10y}`,
    `Fed Funds Rate: ${indicators.fedFunds}`,
  ].join("\n");

  const headlines = news
    .slice(0, 10)
    .map((n, i) => `${i + 1}. [${n.category}] ${n.title}`)
    .join("\n");

  return `You are a senior economist specializing in Pakistan and emerging markets.

LIVE ECONOMIC INDICATORS:
${lines}

LATEST NEWS HEADLINES:
${headlines}

Analyze Pakistan's current macroeconomic health based on all the data above. Consider the IMF program context, currency pressures, inflation trajectory, external financing needs, and global commodity impacts on Pakistan's import bill.

Respond ONLY with this JSON (no markdown, no code fences, no explanation):
{
  "economicHealthScore": <integer 0-100>,
  "sentiment": "<Bullish|Neutral|Bearish>",
  "riskLevel": "<Low|Moderate|High>",
  "summary": "<2-3 sentence economic assessment>",
  "topDrivers": ["<driver 1>", "<driver 2>", "<driver 3>"]
}`;
}

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
}

interface RawAnalysis {
  economicHealthScore?: unknown;
  sentiment?: unknown;
  riskLevel?: unknown;
  summary?: unknown;
  topDrivers?: unknown;
}

function parseResponse(content: string): AiEconomicAnalysis {
  // Strip markdown code fences if the model wrapped the output
  const stripped = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Extract the JSON object even if there is surrounding text
  const match = stripped.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : stripped;

  const raw = JSON.parse(jsonStr) as RawAnalysis;

  const score =
    typeof raw.economicHealthScore === "number"
      ? Math.min(100, Math.max(0, Math.round(raw.economicHealthScore)))
      : FALLBACK.economicHealthScore;

  const SENTIMENTS = ["Bullish", "Neutral", "Bearish"] as const;
  const sentiment = SENTIMENTS.includes(raw.sentiment as (typeof SENTIMENTS)[number])
    ? (raw.sentiment as AiEconomicAnalysis["sentiment"])
    : FALLBACK.sentiment;

  const RISKS = ["Low", "Moderate", "High"] as const;
  const riskLevel = RISKS.includes(raw.riskLevel as (typeof RISKS)[number])
    ? (raw.riskLevel as AiEconomicAnalysis["riskLevel"])
    : FALLBACK.riskLevel;

  const summary =
    typeof raw.summary === "string" && raw.summary.trim().length > 0
      ? raw.summary.trim()
      : FALLBACK.summary;

  const topDrivers =
    Array.isArray(raw.topDrivers) && raw.topDrivers.length > 0
      ? (raw.topDrivers as unknown[]).slice(0, 3).map(String)
      : FALLBACK.topDrivers;

  return { economicHealthScore: score, sentiment, riskLevel, summary, topDrivers };
}

export async function getAiEconomicAnalysis(
  indicators: IndicatorSnapshot,
  news: NewsItem[],
): Promise<AiEconomicAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return FALLBACK;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nex-agi/nex-n2-pro:free",
        messages: [{ role: "user", content: buildPrompt(indicators, news) }],
        temperature: 0.2,
      }),
      next: { revalidate: REVALIDATE },
    });

    if (!res.ok) return FALLBACK;

    const data = (await res.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) return FALLBACK;

    return parseResponse(content);
  } catch {
    return FALLBACK;
  }
}
