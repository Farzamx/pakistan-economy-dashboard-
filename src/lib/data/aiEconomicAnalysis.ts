// AI Economic Intelligence Engine — OpenRouter explanation layer for the
// deterministic Economic Health Score.
//
// Production Audit Part 1/Part 9 fix: economicHealthScore now comes
// entirely from calculateEconomicHealth() (economicHealth.ts) — a 9-factor
// weighted model, same deterministic shape as Recession/Default
// (riskModels.ts). This module's only job is the same one
// aiRiskIntelligence.ts already does for those two scores: explain an
// already-computed result, never invent it. The AI is explicitly
// instructed not to quote the score's exact number, for the same reason
// aiRiskIntelligence.ts gives — the narrative is cached for 6h while the
// live score itself isn't, so probability-specific language would quickly
// read as stale/wrong even when the number it described hasn't moved much.
//
// riskLevel is also no longer part of the AI's contract — it was a second,
// AI-invented classification that could silently contradict the
// deterministic health label (Strong/Moderate/Weak) it was standing next
// to. It's now derived directly from that label (see page.tsx) instead.
// sentiment remains AI-judged: unlike a score or a risk tier, "does this
// data read as broadly encouraging or concerning" is a genuinely
// qualitative call, not a duplicate of something already computed.
//
// OPENROUTER_API_KEY/GROQ_API_KEY must be set in .env.local. Without them
// callOpenRouter() returns null and this falls back to FALLBACK below, so
// the dashboard never breaks.

import type { NewsItem } from "./news";
import type { HealthModelResult } from "@/lib/economicHealth";
import { callOpenRouter } from "@/lib/openRouterClient";

export interface AiEconomicAnalysis {
  sentiment: "Bullish" | "Neutral" | "Bearish";
  summary: string;
  topDrivers: string[];
  modelUsed: string;
  modelDisplayName: string;
}

type AnalysisContent = Omit<AiEconomicAnalysis, "modelUsed" | "modelDisplayName">;

const FALLBACK: AiEconomicAnalysis = {
  sentiment: "Neutral",
  summary:
    "Pakistan's economy is showing moderate stability. Rising remittances and a recovering agriculture sector are encouraging, but persistent inflation and a fragile exchange rate keep reserves at a thin import-cover buffer.",
  topDrivers: [
    "Inflation remains elevated, constraining real incomes and consumption",
    "Foreign reserves provide limited import cover amid external pressures",
    "Remittances continue to support the external account balance",
  ],
  modelUsed: "fallback",
  modelDisplayName: "Offline",
};

const REVALIDATE = 6 * 60 * 60; // 6h — aligns with unstable_cache bucket in page.tsx

function formatFactors(factors: HealthModelResult["topStrengthFactors"]): string {
  return factors.map((f) => `${f.label}: ${f.formattedValue}`).join(", ");
}

function buildPrompt(health: HealthModelResult, news: NewsItem[]): string {
  const headlines = news
    .slice(0, 10)
    .map((n, i) => `${i + 1}. [${n.category}] ${n.title}`)
    .join("\n");

  return `You are a senior economist specializing in Pakistan and emerging markets.

A deterministic quantitative model has assessed Pakistan's overall economic health.
Your role is ONLY to explain this output — do NOT modify, recalculate, or contradict it.

CRITICAL STYLE RULE: Do NOT quote or embed the exact health score number in your response.
The live gauge already displays it. Your explanation is cached and served alongside an
updated live score, so a quoted number would quickly become inconsistent. Use the health
label and directional language only.
  Incorrect: "With a health score of 58..."
  Correct:   "Economic health sits in the ${health.status.label.toLowerCase()} range, driven by..."

ECONOMIC HEALTH: ${health.status.label}
Key strength factors: ${formatFactors(health.topStrengthFactors)}
Key weakness factors: ${formatFactors(health.topWeaknessFactors)}

LATEST NEWS HEADLINES:
${headlines}

Analyze Pakistan's current macroeconomic health based on the factor data above and the news
context. Consider the IMF program context, currency pressures, inflation trajectory, external
financing needs, and global commodity impacts on Pakistan's import bill. Ground your language
in the specific factor data listed above. Avoid quoting the exact score.

Respond ONLY with this JSON (no markdown, no code fences, no explanation):
{
  "sentiment": "<Bullish|Neutral|Bearish>",
  "summary": "<2-3 sentence economic assessment>",
  "topDrivers": ["<driver 1>", "<driver 2>", "<driver 3>"]
}`;
}

interface RawAnalysis {
  sentiment?: unknown;
  summary?: unknown;
  topDrivers?: unknown;
}

function parseResponse(content: string): AnalysisContent {
  // Strip markdown code fences if the model wrapped the output
  const stripped = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Extract the JSON object even if there is surrounding text
  const match = stripped.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : stripped;

  const raw = JSON.parse(jsonStr) as RawAnalysis;

  const SENTIMENTS = ["Bullish", "Neutral", "Bearish"] as const;
  const sentiment = SENTIMENTS.includes(raw.sentiment as (typeof SENTIMENTS)[number])
    ? (raw.sentiment as AiEconomicAnalysis["sentiment"])
    : FALLBACK.sentiment;

  const summary =
    typeof raw.summary === "string" && raw.summary.trim().length > 0
      ? raw.summary.trim()
      : FALLBACK.summary;

  const topDrivers =
    Array.isArray(raw.topDrivers) && raw.topDrivers.length > 0
      ? (raw.topDrivers as unknown[]).slice(0, 3).map(String)
      : FALLBACK.topDrivers;

  return { sentiment, summary, topDrivers };
}

export async function getAiEconomicAnalysis(
  health: HealthModelResult,
  news: NewsItem[],
): Promise<AiEconomicAnalysis> {
  try {
    const aiResult = await callOpenRouter<AnalysisContent>(
      buildPrompt(health, news),
      parseResponse,
      { revalidate: REVALIDATE, taskLabel: "Economic Health Score" },
    );

    if (!aiResult) return FALLBACK;

    return {
      ...aiResult.result,
      modelUsed: aiResult.modelUsed,
      modelDisplayName: aiResult.modelDisplayName,
    };
  } catch {
    return FALLBACK;
  }
}
