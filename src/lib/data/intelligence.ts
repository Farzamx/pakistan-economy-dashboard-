// AI News Intelligence layer — enriches raw NewsItem objects with sentiment,
// risk level, impact score, and a one-sentence reason using OpenRouter.
//
// Calls are batched (one API call for up to 10 articles) on every ISR cycle.
// Uses the shared failover client — if the primary model fails, it cascades
// through FALLBACK_CHAIN automatically.
//
// Market impact (Phase 6 of the News & Intelligence audit): the AI's
// free-text "reason" can degrade to generic phrasing ("no direct impact on
// Pakistan") for well-understood macro events that actually have clear,
// known transmission channels. For those, getMarketImpact() (deterministic,
// keyword-based, no AI call) supplies a fixed set of impact bullets instead
// — checked first; the AI reason is the fallback for headlines that match
// no known rule, not a competing source of truth for the ones that do.
//
// getTaggedNews returns TaggedNewsResult (items + model metadata) instead of
// a plain array so callers can surface which model tagged the articles.

import type { NewsItem } from "./news";
import { callOpenRouter } from "@/lib/openRouterClient";
import { getMarketImpact, type MarketImpact } from "@/lib/news/marketImpact";
import { getSourceReliability } from "@/lib/news/relevanceEngine";

export type Sentiment = "Bullish" | "Neutral" | "Bearish";
export type RiskLevel = "Low" | "Moderate" | "High";
export type Freshness = "Fresh" | "Recent" | "Aging";

export interface IntelligenceTag {
  sentiment: Sentiment;
  riskLevel: RiskLevel;
  impactScore: number;   // -10 to +10
  reason: string;
  /** Deterministic market-impact bullets (Phase 6) — null when no known rule matches this headline; callers should display `reason` instead in that case. */
  marketImpact: MarketImpact | null;
}

export interface TaggedNewsItem extends NewsItem {
  intelligence: IntelligenceTag;
  sourceReliability: number; // 0-10, see relevanceEngine.ts
  freshness: Freshness;
}

/** Fresh < 2h old, Recent < 12h, Aging beyond that — same age math as the card's own "Xh ago" display, just bucketed for the Phase 8 quality-score badge. */
function getFreshness(publishedAt: string): Freshness {
  const ageH = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  if (ageH < 2) return "Fresh";
  if (ageH < 12) return "Recent";
  return "Aging";
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
  marketImpact: null,
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

  // marketImpact is attached separately in getTaggedNews (deterministic,
  // doesn't depend on the AI call at all) and merged in afterward.
  return { sentiment, riskLevel, impactScore, reason, marketImpact: null };
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

  // 30 min — down from the previous 2h. News itself now refreshes every
  // 10-25 min (see news.ts's tiered revalidate); leaving AI tags cached for
  // 2h would mean serving stale sentiment/risk against fresh headlines for
  // up to four refresh cycles. The model used (see FALLBACK_CHAIN) is a
  // free OpenRouter tier, so the ~4x call-frequency increase has no direct
  // cost, only a bounded latency/rate-limit consideration.
  const aiResult = await callOpenRouter<IntelligenceTag[]>(
    buildBatchPrompt(items),
    parseBatchContent(items),
    { revalidate: 60 * 30, taskLabel: "News Intelligence" },
  );

  if (!aiResult) return BATCH_FALLBACK;

  return {
    tags: aiResult.result,
    modelUsed: aiResult.modelUsed,
    modelDisplayName: aiResult.modelDisplayName,
  };
}

/** Decorates a base IntelligenceTag with this article's deterministic market impact, source reliability, and freshness — applied uniformly whether the tag came from the AI or NEUTRAL_TAG, since none of these three depend on the AI call succeeding. */
function decorate(item: NewsItem, tag: IntelligenceTag): TaggedNewsItem {
  return {
    ...item,
    intelligence: { ...tag, marketImpact: getMarketImpact(item.title) },
    sourceReliability: getSourceReliability(item.source),
    freshness: getFreshness(item.publishedAt),
  };
}

export async function getTaggedNews(items: NewsItem[]): Promise<TaggedNewsResult> {
  if (items.length === 0) {
    return { items: [], modelUsed: "fallback", modelDisplayName: "Offline" };
  }

  const fallbackResult: TaggedNewsResult = {
    items: items.map((item) => decorate(item, NEUTRAL_TAG)),
    modelUsed: "fallback",
    modelDisplayName: "Offline",
  };

  try {
    const batch = items.slice(0, 10);
    const { tags, modelUsed, modelDisplayName } = await tagBatchWithOpenRouter(batch);
    return {
      items: items.map((item, i) => decorate(item, tags[i] ?? NEUTRAL_TAG)),
      modelUsed,
      modelDisplayName,
    };
  } catch (err) {
    console.error("[News] AI intelligence tagging failed:", err instanceof Error ? err.message : String(err));
    return fallbackResult;
  }
}
