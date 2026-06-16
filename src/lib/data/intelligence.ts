// AI Intelligence layer — enriches raw NewsItem objects with sentiment,
// risk level, and related indicator tags using Claude Haiku.
//
// Calls are batched (one API call for up to 10 articles) and cached via
// Next.js ISR at the same cadence as the news feed (2h), so this runs
// at most ~12 times/day — well within free-tier budgets.
//
// ANTHROPIC_API_KEY must be set in .env.local. Without it the layer falls
// back to returning items with neutral/untagged metadata.

import type { NewsItem } from "./news";

export type Sentiment = "bullish" | "bearish" | "neutral";
export type RiskLevel = "low" | "medium" | "high";

export interface IntelligenceTag {
  sentiment: Sentiment;
  risk: RiskLevel;
  relatedIndicators: string[];
}

export interface TaggedNewsItem extends NewsItem {
  intelligence: IntelligenceTag;
}

const NEUTRAL_TAG: IntelligenceTag = {
  sentiment: "neutral",
  risk: "low",
  relatedIndicators: [],
};

const REVALIDATE_INTELLIGENCE = 60 * 60 * 2; // 2h — same cadence as news

interface AnthropicMessage {
  content: Array<{ type: string; text: string }>;
}

interface AnthropicResponse {
  content?: Array<{ type: string; text: string }>;
  error?: { message: string };
}

interface ArticleTag {
  sentiment?: string;
  risk?: string;
  relatedIndicators?: string[];
}

async function tagArticlesWithClaude(items: NewsItem[]): Promise<IntelligenceTag[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return items.map(() => NEUTRAL_TAG);

  const articleList = items
    .map((item, i) => `${i + 1}. [${item.category}] ${item.title} (${item.source})`)
    .join("\n");

  const prompt = `You are an economic analyst specializing in Pakistan and emerging markets.

For each headline below, provide a JSON array with one object per article containing:
- "sentiment": "bullish", "bearish", or "neutral" (from Pakistan's economic perspective)
- "risk": "low", "medium", or "high" (systemic risk implied)
- "relatedIndicators": array of up to 3 indicator names from: ["CPI Inflation", "Policy Rate", "USD/PKR", "Foreign Reserves", "Remittances", "Trade Balance", "Current Account", "GDP Growth", "Exports", "Imports", "FDI Inflows", "REER", "LSM", "Private Credit Growth", "Fiscal Balance", "KSE-100", "Gold", "Brent Crude", "WTI Crude", "Natural Gas", "US 10Y Treasury", "Fed Funds Rate"]

Headlines:
${articleList}

Return ONLY a valid JSON array, no markdown, no explanation.`;

  const message: AnthropicMessage = {
    content: [{ type: "text", text: prompt }],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: message.content }],
    }),
    next: { revalidate: REVALIDATE_INTELLIGENCE },
  });

  if (!res.ok) return items.map(() => NEUTRAL_TAG);

  const json = (await res.json()) as AnthropicResponse;
  const text = json.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(text) as ArticleTag[];
    return parsed.map((tag) => ({
      sentiment: (["bullish", "bearish", "neutral"].includes(tag.sentiment ?? "")
        ? tag.sentiment
        : "neutral") as Sentiment,
      risk: (["low", "medium", "high"].includes(tag.risk ?? "")
        ? tag.risk
        : "low") as RiskLevel,
      relatedIndicators: Array.isArray(tag.relatedIndicators)
        ? tag.relatedIndicators.slice(0, 3)
        : [],
    }));
  } catch {
    return items.map(() => NEUTRAL_TAG);
  }
}

export async function getTaggedNews(items: NewsItem[]): Promise<TaggedNewsItem[]> {
  if (items.length === 0) return [];

  try {
    const batch = items.slice(0, 10);
    const tags = await tagArticlesWithClaude(batch);

    return items.map((item, i) => ({
      ...item,
      intelligence: tags[i] ?? NEUTRAL_TAG,
    }));
  } catch {
    return items.map((item) => ({ ...item, intelligence: NEUTRAL_TAG }));
  }
}
