// AI Risk Intelligence — OpenRouter explanation layer for quantitative risk models.
//
// The quantitative models in riskModels.ts calculate probabilities deterministically.
// This module sends those results to OpenRouter and asks the AI to explain them.
// The AI is explicitly instructed NOT to modify or generate probabilities.
//
// Uses the shared failover client — if the primary model fails, it cascades
// through FALLBACK_CHAIN automatically.

import type { RiskModelResult } from "@/lib/riskModels";
import { callOpenRouter } from "@/lib/openRouterClient";

export interface AiRiskExplanation {
  explanation: string;  // 2-3 sentence narrative explanation
  keyRisks: string[];   // 2-3 concrete risk bullet points
  keyPositives: string[]; // 2-3 stabilizing factors
}

export interface AiRiskIntelligence {
  recession: AiRiskExplanation;
  default: AiRiskExplanation;
  modelUsed: string;
  modelDisplayName: string;
}

type RiskContent = Omit<AiRiskIntelligence, "modelUsed" | "modelDisplayName">;

const FALLBACK_RECESSION: AiRiskExplanation = {
  explanation:
    "Pakistan's recession risk reflects structural pressures from elevated inflation, tight monetary policy, and constrained external financing. While reserves have stabilized, slow GDP growth and industrial contraction point to continued demand compression.",
  keyRisks: [
    "Persistent double-digit inflation eroding real consumer purchasing power",
    "High real policy rate suppressing private sector credit and investment",
    "LSM output contraction signalling weakness in the industrial base",
  ],
  keyPositives: [
    "IMF program providing a credible anchor for external financing",
    "Remittances continuing to support household incomes and FX inflows",
  ],
};

const FALLBACK_DEFAULT: AiRiskExplanation = {
  explanation:
    "Sovereign default risk remains contained by Pakistan's active IMF program and bilateral support from Gulf partners. Foreign reserves provide limited but improving import cover, and the current account deficit has narrowed. Fiscal consolidation remains the key medium-term challenge.",
  keyRisks: [
    "Structural fiscal deficit requiring ongoing external financing",
    "External debt rollover risk if IMF program stalls or bilateral support wanes",
    "Limited reserve buffer against external shocks or sudden capital outflows",
  ],
  keyPositives: [
    "IMF Extended Fund Facility providing liquidity backstop and policy credibility",
    "Gulf bilateral deposits and rollovers reducing near-term rollover pressure",
  ],
};

const FALLBACK: AiRiskIntelligence = {
  recession: FALLBACK_RECESSION,
  default: FALLBACK_DEFAULT,
  modelUsed: "fallback",
  modelDisplayName: "Offline",
};

const REVALIDATE = 6 * 60 * 60; // 6h — aligns with unstable_cache bucket in page.tsx

// Only factor labels and formatted indicator values are passed — no probability
// percentages or model scores. This keeps the narrative timeless within the 6h
// cache window: probabilities update live on the gauges while the AI text
// remains accurate regardless of small quantitative shifts.
function formatFactors(factors: RiskModelResult["topRiskFactors"]): string {
  return factors.map((f) => `${f.label}: ${f.formattedValue}`).join(", ");
}

function buildPrompt(recession: RiskModelResult, defaultRisk: RiskModelResult): string {
  return `You are a senior economist specializing in Pakistan and emerging markets.

A deterministic quantitative model has assessed the following risk levels for Pakistan.
Your role is ONLY to explain these outputs — do NOT modify, recalculate, or contradict them.

CRITICAL STYLE RULE: Do NOT quote or embed any numerical probability percentages or model scores
in your response. The live gauges already display exact numbers. Your explanation will be cached
and served alongside updated live figures, so probability-specific language would quickly become
inconsistent. Instead, use the risk category label and directional language only.
  Incorrect: "The 28% recession probability reflects..."
  Incorrect: "With a model score of 42..."
  Correct:   "Recession risk sits in the ${recession.riskCategory.toLowerCase()} range, driven by..."
  Correct:   "Default risk remains relatively contained, supported by..."

RECESSION RISK LEVEL: ${recession.riskCategory}
Key pressure factors: ${formatFactors(recession.topRiskFactors)}
Key cushion factors: ${formatFactors(recession.topCushionFactors)}

SOVEREIGN DEFAULT RISK LEVEL: ${defaultRisk.riskCategory}
Key pressure factors: ${formatFactors(defaultRisk.topRiskFactors)}
Key cushion factors: ${formatFactors(defaultRisk.topCushionFactors)}

Describe the direction, trend, structural drivers, and stabilizing factors for each risk category.
Ground your language in the specific factor data listed above. Avoid all numerical probability quotes.

Respond ONLY with this JSON (no markdown, no code fences, no explanation outside JSON):
{
  "recession": {
    "explanation": "<2-3 sentence narrative using direction/trend language, grounded in the factors>",
    "keyRisks": ["<specific risk 1>", "<specific risk 2>", "<specific risk 3>"],
    "keyPositives": ["<stabilizing factor 1>", "<stabilizing factor 2>"]
  },
  "default": {
    "explanation": "<2-3 sentence narrative using direction/trend language, grounded in the factors>",
    "keyRisks": ["<specific risk 1>", "<specific risk 2>", "<specific risk 3>"],
    "keyPositives": ["<stabilizing factor 1>", "<stabilizing factor 2>"]
  }
}`;
}

interface RawExplanation {
  explanation?: unknown;
  keyRisks?: unknown;
  keyPositives?: unknown;
}

interface RawResponse {
  recession?: RawExplanation;
  default?: RawExplanation;
}

function parseExplanation(raw: RawExplanation, fallback: AiRiskExplanation): AiRiskExplanation {
  const explanation =
    typeof raw.explanation === "string" && raw.explanation.trim().length > 10
      ? raw.explanation.trim()
      : fallback.explanation;

  const keyRisks =
    Array.isArray(raw.keyRisks) && raw.keyRisks.length > 0
      ? (raw.keyRisks as unknown[]).slice(0, 3).map(String)
      : fallback.keyRisks;

  const keyPositives =
    Array.isArray(raw.keyPositives) && raw.keyPositives.length > 0
      ? (raw.keyPositives as unknown[]).slice(0, 3).map(String)
      : fallback.keyPositives;

  return { explanation, keyRisks, keyPositives };
}

function parseResponse(content: string): RiskContent {
  const stripped = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  const match = stripped.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : stripped;

  const raw = JSON.parse(jsonStr) as RawResponse;

  return {
    recession: parseExplanation(raw.recession ?? {}, FALLBACK_RECESSION),
    default: parseExplanation(raw.default ?? {}, FALLBACK_DEFAULT),
  };
}

export async function getAiRiskIntelligence(
  recession: RiskModelResult,
  defaultRisk: RiskModelResult,
): Promise<AiRiskIntelligence> {
  try {
    const aiResult = await callOpenRouter<RiskContent>(
      buildPrompt(recession, defaultRisk),
      parseResponse,
      { revalidate: REVALIDATE, taskLabel: "Risk Intelligence" },
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
