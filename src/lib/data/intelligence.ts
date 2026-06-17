// AI News Intelligence layer — enriches raw NewsItem objects with sentiment,
// risk level, impact score, and a one-sentence reason using OpenRouter.
//
// Calls are batched (one API call for up to 10 articles) on every ISR cycle.
// Uses the shared failover client — if the primary model fails, it cascades
// through FALLBACK_CHAIN automatically.
//
// getTaggedNews returns TaggedNewsResult (items + model metadata) instead of
// a plain array so callers can surface which model tagged the articles.

import type { NewsItem } from "./news";
import { callOpenRouter } from "@/lib/openRouterClient";

export type Sentiment = "Bullish" | "Neutral" | "Bearish";
export type RiskLevel = "Low" | "Moderate" | "High";

export interface IntelligenceTag {
  sentiment: Sentiment;
  riskLevel: RiskLevel;
  impactScore: number;   // -10 to +10
  reason: string;
}

export interface TaggedNewsItem extends NewsItem {
  intelligence: IntelligenceTag;
}

export interface TaggedNewsResult {
  items: TaggedNewsItem[];
  modelUsed: string;
  modelDisplayName: string;
}

const NEUTRAL_TAG: IntelligenceTag = {
  sentiment: "Neutral",
  riskLevel: "Low",
  impactScore: 0,
  reason: "Economic impact analysis unavailable.",
};

const PROMPT_SCORING = `
Scoring guide:
+10: Extremely positive (major reserve surge, IMF program secured, debt restructuring success)
+7:  Strongly positive  (significant FDI, remittances rise sharply, inflation falls fast)
+5:  Moderately positive (mild growth signal, credit upgrade, positive investor sentiment)
0:   Neutral            (no direct Pakistan economic impact, mixed effects)
-5:  Moderately negative (currency pressure, moderate inflation rise, trade deficit widening)
-7:  Strongly negative  (significant reserve drain, credit downgrade, capital outflows)
-10: Extremely negative  (sovereign default risk, currency collapse, systemic banking stress)`.trim();

function buildBatchPrompt(items: NewsItem[]): string {
  const headlines = items
    .map((item, i) => `${i + 1}. [${item.category}] ${item.title} (${item.source})`)
    .join("\n");

  return `You are a senior financial analyst specializing in Pakistan's macroeconomic conditions.

For each headline below, analyze its economic impact on Pakistan and return a JSON array with exactly one object per article:
- "sentiment": "Bullish", "Neutral", or "Bearish" (from Pakistan's economic perspective)
- "riskLevel": "Low", "Moderate", or "High" (macroeconomic risk level for Pakistan)
- "impactScore": integer from -10 to +10 (positive = beneficial, negative = harmful to Pakistan's economy)
- "reason": one clear sentence explaining the specific economic impact on Pakistan

${PROMPT_SCORING}

Headlines:
${headlines}

Return ONLY a valid JSON array with ${items.length} objects. No markdown, no code fences, no explanation outside the JSON.`;
}

interface RawArticleTag {
  sentiment?: unknown;
  riskLevel?: unknown;
  impactScore?: unknown;
  reason?: unknown;
}

const SENTIMENTS: Sentiment[] = ["Bullish", "Neutral", "Bearish"];
const RISK_LEVELS: RiskLevel[] = ["Low", "Moderate", "High"];

function parseTag(raw: RawArticleTag): IntelligenceTag {
  const sentiment = SENTIMENTS.includes(raw.sentiment as Sentiment)
    ? (raw.sentiment as Sentiment)
    : "Neutral";

  const riskLevel = RISK_LEVELS.includes(raw.riskLevel as RiskLevel)
    ? (raw.riskLevel as RiskLevel)
    : "Low";

  const rawScore = typeof raw.impactScore === "number" ? raw.impactScore : 0;
  const impactScore = Math.min(10, Math.max(-10, Math.round(rawScore)));

  const reason =
    typeof raw.reason === "string" && raw.reason.trim().length > 0
      ? raw.reason.trim()
      : NEUTRAL_TAG.reason;

  return { sentiment, riskLevel, impactScore, reason };
}

function parseBatchContent(items: NewsItem[]): (content: string) => IntelligenceTag[] {
  return (content: string) => {
    // Strip markdown code fences if the model wrapped the output
    const stripped = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    // Extract the JSON array even if there is surrounding text
    const match = stripped.match(/\[[\s\S]*\]/);
    const jsonStr = match ? match[0] : stripped;

    const parsed = JSON.parse(jsonStr) as RawArticleTag[];
    return items.map((_, i) =>
      parsed[i] !== undefined ? parseTag(parsed[i]) : NEUTRAL_TAG,
    );
  };
}

async function tagBatchWithOpenRouter(
  items: NewsItem[],
): Promise<{ tags: IntelligenceTag[]; modelUsed: string; modelDisplayName: string }> {
  const BATCH_FALLBACK = {
    tags: items.map(() => NEUTRAL_TAG),
    modelUsed: "fallback",
    modelDisplayName: "Offline",
  };

  const aiResult = await callOpenRouter<IntelligenceTag[]>(
    buildBatchPrompt(items),
    parseBatchContent(items),
    { revalidate: 60 * 60 * 2, taskLabel: "News Intelligence" }, // 2h cadence
  );

  if (!aiResult) return BATCH_FALLBACK;

  return {
    tags: aiResult.result,
    modelUsed: aiResult.modelUsed,
    modelDisplayName: aiResult.modelDisplayName,
  };
}

export async function getTaggedNews(items: NewsItem[]): Promise<TaggedNewsResult> {
  const fallbackResult: TaggedNewsResult = {
    items: items.map((item) => ({ ...item, intelligence: NEUTRAL_TAG })),
    modelUsed: "fallback",
    modelDisplayName: "Offline",
  };

  if (items.length === 0) {
    return { items: [], modelUsed: "fallback", modelDisplayName: "Offline" };
  }

  try {
    const batch = items.slice(0, 10);
    const { tags, modelUsed, modelDisplayName } = await tagBatchWithOpenRouter(batch);
    return {
      items: items.map((item, i) => ({
        ...item,
        intelligence: tags[i] ?? NEUTRAL_TAG,
      })),
      modelUsed,
      modelDisplayName,
    };
  } catch {
    return fallbackResult;
  }
}
