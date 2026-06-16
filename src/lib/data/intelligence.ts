// AI News Intelligence layer — enriches raw NewsItem objects with sentiment,
// risk level, impact score, and a one-sentence reason using OpenRouter.
//
// Calls are batched (one API call for up to 10 articles) on every ISR cycle.
// The page itself is cached (1h ISR), so OpenRouter is called at most once/hour.
//
// Uses OPENROUTER_API_KEY (same key as the Economic Health Score engine).
// Without it the layer falls back to neutral/zero-impact metadata.
//
// NOTE: res.text() + JSON.parse() is used deliberately instead of res.json().
// The nex-agi/nex-n2-pro model returns hundreds of leading whitespace/newline
// characters before the JSON (streaming reasoning tokens), which causes
// Next.js's patched Response.json() to throw a SyntaxError silently caught
// by the outer catch block. res.text() + explicit JSON.parse() handles the
// leading whitespace correctly.

import type { NewsItem } from "./news";

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

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
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

async function tagBatchWithOpenRouter(items: NewsItem[]): Promise<IntelligenceTag[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return items.map(() => NEUTRAL_TAG);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nex-agi/nex-n2-pro:free",
        messages: [{ role: "user", content: buildBatchPrompt(items) }],
        temperature: 0.2,
      }),
      next: { revalidate: 60 * 60 * 2 }, // 2h — same cadence as news feed
    });

    if (!res.ok) return items.map(() => NEUTRAL_TAG);

    // Use res.text() + explicit JSON.parse rather than res.json().
    // This model prepends reasoning tokens as leading whitespace before
    // the JSON payload. Next.js's patched Response.json() fails on this;
    // JSON.parse() handles leading whitespace correctly.
    const rawText = await res.text();
    if (!rawText.trim()) return items.map(() => NEUTRAL_TAG);

    const data = JSON.parse(rawText) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) return items.map(() => NEUTRAL_TAG);

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
  } catch {
    return items.map(() => NEUTRAL_TAG);
  }
}

export async function getTaggedNews(items: NewsItem[]): Promise<TaggedNewsItem[]> {
  if (items.length === 0) return [];

  try {
    const batch = items.slice(0, 10);
    const tags = await tagBatchWithOpenRouter(batch);
    return items.map((item, i) => ({
      ...item,
      intelligence: tags[i] ?? NEUTRAL_TAG,
    }));
  } catch {
    return items.map((item) => ({ ...item, intelligence: NEUTRAL_TAG }));
  }
}
