// AI Risk Intelligence — OpenRouter explanation layer for quantitative risk models.
//
// The quantitative models in riskModels.ts calculate probabilities deterministically.
// This module sends those results to OpenRouter and asks the AI to explain them.
// The AI is explicitly instructed NOT to modify or generate probabilities.
//
// Uses res.text() + JSON.parse() because the nex-agi/nex-n2-pro model prepends
// leading whitespace before JSON, which breaks Next.js's patched Response.json().

import type { RiskModelResult } from "@/lib/riskModels";

export interface AiRiskExplanation {
  explanation: string;  // 2-3 sentence narrative explanation
  keyRisks: string[];   // 2-3 concrete risk bullet points
  keyPositives: string[]; // 2-3 stabilizing factors
}

export interface AiRiskIntelligence {
  recession: AiRiskExplanation;
  default: AiRiskExplanation;
}

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
};

const REVALIDATE = 60 * 60; // 1h

function formatFactors(factors: RiskModelResult["topRiskFactors"]): string {
  return factors.map((f) => `${f.label}: ${f.formattedValue} (pressure ${f.pressureScore}/100)`).join(", ");
}

function buildPrompt(recession: RiskModelResult, defaultRisk: RiskModelResult): string {
  return `You are a senior economist specializing in Pakistan and emerging markets.

A deterministic quantitative model has calculated the following risk probabilities for Pakistan.
Your role is ONLY to explain these pre-calculated values — do NOT modify, recalculate, or contradict them.

RECESSION PROBABILITY: ${recession.probability}% (${recession.riskCategory} risk)
Model score: ${recession.modelScore}/100
Top pressure factors: ${formatFactors(recession.topRiskFactors)}
Strongest cushions: ${formatFactors(recession.topCushionFactors)}

SOVEREIGN DEFAULT PROBABILITY: ${defaultRisk.probability}% (${defaultRisk.riskCategory} risk)
Model score: ${defaultRisk.modelScore}/100
Top pressure factors: ${formatFactors(defaultRisk.topRiskFactors)}
Strongest cushions: ${formatFactors(defaultRisk.topCushionFactors)}

Provide a brief expert explanation of these model outputs. Ground your language in the specific factors listed.

Respond ONLY with this JSON (no markdown, no code fences, no explanation outside JSON):
{
  "recession": {
    "explanation": "<2-3 sentence narrative grounded in the factor data above>",
    "keyRisks": ["<specific risk 1>", "<specific risk 2>", "<specific risk 3>"],
    "keyPositives": ["<stabilizing factor 1>", "<stabilizing factor 2>"]
  },
  "default": {
    "explanation": "<2-3 sentence narrative grounded in the factor data above>",
    "keyRisks": ["<specific risk 1>", "<specific risk 2>", "<specific risk 3>"],
    "keyPositives": ["<stabilizing factor 1>", "<stabilizing factor 2>"]
  }
}`;
}

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
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

function parseResponse(content: string): AiRiskIntelligence {
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
        messages: [{ role: "user", content: buildPrompt(recession, defaultRisk) }],
        temperature: 0.2,
      }),
      next: { revalidate: REVALIDATE },
    });

    if (!res.ok) return FALLBACK;

    // Must use res.text() + JSON.parse() — this model prepends whitespace before JSON
    // which breaks Next.js's patched Response.json() with a SyntaxError.
    const text = await res.text();
    const data = JSON.parse(text) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) return FALLBACK;

    return parseResponse(content);
  } catch {
    return FALLBACK;
  }
}
