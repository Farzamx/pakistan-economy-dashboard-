import { FALLBACK_CHAIN, getModelDisplayName, MODEL_TIMEOUT_MS } from "@/lib/openRouterClient";
import type { DashboardSnapshot } from "@/lib/assistantContext";
import { classifyQuery, type QueryCategory, type RouterResult } from "@/lib/queryRouter";
import {
  searchTavily,
  searchTavilyFocused,
  type SearchResult,
  type SearchResponse,
} from "@/lib/webSearch";
import { getFresh, getStale, setCache } from "@/lib/memoryCache";
import { getPakEtfKpi } from "@/lib/data/yfinance";
import type { Kpi } from "@/data/kpiData";
import { searchKnowledgeBase } from "@/lib/knowledgeBaseSearch";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ── Performance configuration ──────────────────────────────────────────────
// Search results are cached so repeat/similar queries within the TTL skip
// Tavily entirely, and so a failed/timed-out live search can still fall back
// to the last good result instead of failing outright (configurable via env).
const SEARCH_CACHE_TTL_MS = Number(process.env.ASSISTANT_SEARCH_CACHE_TTL_MS ?? 5 * 60 * 1000);
// Timeout is only increased when there's no cached fallback to lean on — if a
// stale cache entry exists, fail fast (we have a safety net); if not, this is
// the only chance to get a real answer, so allow more time.
const SEARCH_TIMEOUT_WITH_FALLBACK_MS = 2500;
const SEARCH_TIMEOUT_NO_FALLBACK_MS = 5500;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConvMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  message: string;
  context: DashboardSnapshot;
  history: ConvMessage[];
}

interface OpenRouterApiResponse {
  choices?: { message?: { content?: string } }[];
}

export type SourceType =
  | "Dashboard Data"
  | "Official Source"     // Tier A Pakistani official or IFI source
  | "Financial Media"     // Tier B Pakistani financial press
  | "External Sources"    // Tier C / mixed external
  | "AI Knowledge"
  | "Hybrid Analysis";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface CitationItem {
  title: string;
  url: string;
  domain: string;
  tier: string;
  publishedDate?: string;
}

interface ParsedResponse {
  reply: string;
  source: SourceType;
  citationUrls: string[];
}

// ── Confidence (deterministic — computed before AI call) ──────────────────────

function computeConfidence(
  routerResult: RouterResult,
  search: SearchResponse | null,
): { level: ConfidenceLevel; reason: string } {
  const tierA = search?.results.filter((r) => r.tier === "A") ?? [];
  const total = search?.results.length ?? 0;

  if (routerResult.needsDashboard && tierA.length > 0) {
    const domains = tierA.map((r) => r.domain).join(", ");
    return {
      level: "High",
      reason: `Live dashboard + ${tierA.length} authoritative source${tierA.length > 1 ? "s" : ""} (${domains})`,
    };
  }

  // Dashboard-only query — dashboard data is authoritative
  if (routerResult.needsDashboard && !routerResult.needsSearch) {
    return { level: "High", reason: "Based on live dashboard indicators" };
  }

  // Dashboard + search attempted but search found Tier A
  if (tierA.length > 0) {
    const domains = tierA.map((r) => r.domain).join(", ");
    return {
      level: "High",
      reason: `${tierA.length} authoritative source${tierA.length > 1 ? "s" : ""} (${domains})`,
    };
  }

  // Search ran but only found Tier B/C sources
  if (total > 0) {
    return {
      level: "Medium",
      reason: `${total} external source${total > 1 ? "s" : ""} — no Tier A authority found`,
    };
  }

  // Had dashboard but search was needed and returned nothing
  if (routerResult.needsDashboard && routerResult.needsSearch) {
    return { level: "Medium", reason: "Dashboard data — external search returned no sources" };
  }

  // Dashboard only, no search needed
  if (routerResult.needsDashboard) {
    return { level: "Medium", reason: "Dashboard data — no external corroboration" };
  }

  return { level: "Low", reason: "AI training knowledge — no live data for this topic" };
}

// ── Source type (computed from actual search results) ─────────────────────────

const PK_OFFICIAL = new Set([
  "psx.com.pk", "secp.gov.pk", "sbp.org.pk",
  "easydata.sbp.org.pk", "pbs.gov.pk", "finance.gov.pk",
]);
const IFI_DOMAINS = new Set(["imf.org", "worldbank.org", "oecd.org", "bis.org"]);
const PK_MEDIA = new Set(["brecorder.com", "dawn.com", "thenews.com.pk", "tribune.com.pk"]);

function computeSourceType(
  routerResult: RouterResult,
  search: SearchResponse | null,
): SourceType {
  if (!routerResult.needsSearch) {
    return routerResult.needsDashboard ? "Dashboard Data" : "AI Knowledge";
  }
  if (routerResult.needsDashboard && (!search || search.results.length === 0)) {
    return "Dashboard Data";
  }
  if (routerResult.needsDashboard && search && search.results.length > 0) {
    return "Hybrid Analysis";
  }
  const results = search?.results ?? [];
  const tierA = results.filter((r) => r.tier === "A");
  const tierB = results.filter((r) => r.tier === "B");
  if (tierA.some((r) => PK_OFFICIAL.has(r.domain)) || tierA.some((r) => IFI_DOMAINS.has(r.domain))) {
    return "Official Source";
  }
  if (tierB.some((r) => PK_MEDIA.has(r.domain)) && tierA.length === 0) return "Financial Media";
  return "External Sources";
}

// Human-readable data source label for the transparency footer.
const DATA_SOURCE_LABELS: Record<string, string> = {
  "psx.com.pk": "PSX",
  "secp.gov.pk": "SECP",
  "sbp.org.pk": "SBP",
  "easydata.sbp.org.pk": "SBP EasyData",
  "pbs.gov.pk": "PBS",
  "finance.gov.pk": "Ministry of Finance",
  "imf.org": "IMF",
  "worldbank.org": "World Bank",
  "oecd.org": "OECD",
  "bis.org": "BIS",
  "federalreserve.gov": "Federal Reserve",
};

function computeDataSource(search: SearchResponse | null): string | null {
  const tierA = search?.results.filter((r) => r.tier === "A") ?? [];
  for (const r of tierA) {
    const label = DATA_SOURCE_LABELS[r.domain];
    if (label) return label;
  }
  return null;
}

// ── Prompt Blocks ─────────────────────────────────────────────────────────────

function buildDashboardBlock(ctx: DashboardSnapshot): string {
  const headlines = ctx.recentHeadlines
    .slice(0, 5)
    .map((h, i) => `${i + 1}. ${h}`)
    .join("\n");

  return `LIVE DASHBOARD DATA (as of ${ctx.asOf}):
Economic Health Score: ${ctx.economicHealthScore}/100 (${ctx.sentiment}, ${ctx.riskLevel} Risk)
Summary: ${ctx.summary}
Key Drivers: ${ctx.topDrivers.join(" | ")}

Risk Models (quantitative, deterministic — never AI-generated):
  Recession Probability: ${ctx.recessionProbability}% — ${ctx.recessionCategory} Risk (model score ${ctx.recessionModelScore}/100)
  Sovereign Default Probability: ${ctx.defaultProbability}% — ${ctx.defaultCategory} Risk (model score ${ctx.defaultModelScore}/100)

Economic Indicators:
  GDP Growth: ${ctx.gdpGrowth}
  CPI Inflation: ${ctx.cpiInflation}
  Policy Rate (SBP): ${ctx.policyRate}
  Foreign Reserves: ${ctx.foreignReserves}
  USD/PKR: ${ctx.usdPkr}
  Trade Balance: ${ctx.tradeBalance} (Exports: ${ctx.exports} | Imports: ${ctx.imports})
  Current Account: ${ctx.currentAccount}
  Remittances: ${ctx.remittances}
  Fiscal Balance: ${ctx.fiscalBalance}
  LSM: ${ctx.lsm}
  Private Credit Growth: ${ctx.privateCreditGrowth}

Global Markets:
  Brent Oil: ${ctx.brentOil} | Gold: ${ctx.gold}
  DXY: ${ctx.dxy} | US 10Y: ${ctx.us10y} | Fed Funds: ${ctx.fedFunds}

Recent Headlines:
${headlines}`;
}

function buildDashboardMiniBlock(ctx: DashboardSnapshot): string {
  return (
    `PAKISTAN CONTEXT (reference for grounding):\n` +
    `Health Score: ${ctx.economicHealthScore}/100 (${ctx.sentiment}) | ` +
    `Recession: ${ctx.recessionProbability}% | Default: ${ctx.defaultProbability}%\n` +
    `CPI: ${ctx.cpiInflation} | Policy Rate: ${ctx.policyRate} | USD/PKR: ${ctx.usdPkr} | ` +
    `Reserves: ${ctx.foreignReserves}`
  );
}

function buildSearchBlock(results: SearchResult[]): string {
  if (results.length === 0) return "";
  const items = results
    .map(
      (r, i) =>
        `[${i + 1}] "${r.title}" — ${r.domain} (Tier ${r.tier})${r.publishedDate ? ` — ${r.publishedDate}` : ""}\n${r.content.slice(0, 400)}\nURL: ${r.url}`,
    )
    .join("\n\n");
  return `RETRIEVED EXTERNAL CONTEXT (from trusted sources):\n${items}`;
}

// ── Mode detection ────────────────────────────────────────────────────────────

const DETAILED_TRIGGERS = [
  /explain\s+in\s+detail/i,
  /give\s+(me\s+)?(full|detailed|thorough|complete|in.?depth)\s+analysis/i,
  /provide\s+(a\s+)?(research\s+report|full\s+report|detailed\s+report)/i,
  /detailed\s+mode/i,
  /full\s+analysis/i,
  /in.?depth\s+(analysis|explanation|breakdown)/i,
  /comprehensive\s+(analysis|breakdown|report)/i,
  /break\s+it\s+down\s+(fully|completely|in\s+detail)/i,
];

function detectDetailedMode(message: string): boolean {
  return DETAILED_TRIGGERS.some((re) => re.test(message));
}

// ── Style block (injected after persona, before data blocks) ─────────────────

function buildStyleBlock(isDetailedMode: boolean): string {
  if (isDetailedMode) {
    return (
      "RESPONSE MODE: Detailed (user requested full analysis)\n" +
      "Write a thorough response. Still use plain English and prefer bullet points over dense prose.\n" +
      "Maximum ~600 words. Explain technical terms as you use them."
    );
  }
  return (
    "RESPONSE MODE: Simple (default)\n" +
    "CRITICAL STYLE RULES:\n" +
    "- Plain English only. No jargon without a one-sentence explanation.\n" +
    "- Use short paragraphs or bullet points. No essay-style blocks of text.\n" +
    "- Answer structure: (1) Simple Answer — 1-3 sentences. (2) Why It Matters — 1-2 sentences. (3) Key Numbers — 2-3 bullets ONLY if relevant.\n" +
    "- Length limits: Dashboard = 1-3 sentences | Concept = 3-5 sentences | News/Events = max 5 bullets | Hybrid = max 8 bullets.\n" +
    "- If the question is short and simple, the answer must also be short and simple.\n" +
    "- Never write multi-paragraph academic analysis unless the user explicitly asked for it."
  );
}

// ── Task Instructions per category ───────────────────────────────────────────

const INSTRUCTIONS: Record<QueryCategory, string> = {
  dashboard: `TASK: Answer using ONLY the live dashboard data above.
- Give a direct, plain-English answer. Use exact numbers from the dashboard.
- Do not use external knowledge for factual claims about Pakistan.
- If data is not in the dashboard, say so — do not invent anything.
End with: SOURCE: Dashboard Data`,

  concept: `TASK: Explain this economic concept in simple, plain English.
- Define the concept in 1-2 clear sentences anyone can understand.
- Briefly apply it to Pakistan's current situation using the context above.
- Do not claim live data accuracy — this is general economic knowledge.
End with: SOURCE: AI Knowledge`,

  current_events: `TASK: Answer based on the retrieved external sources above.
- Bullet points preferred. Name the source in parentheses: (imf.org).
- Do not fabricate statistics, dates, or quotes not in the sources.
- If sources are insufficient, acknowledge the gap honestly.
End with: SOURCE: External Sources
CITATIONS: [comma-separated URLs of sources you actually cited — leave blank if none]`,

  market_news: `TASK: Explain this market development based on retrieved sources.
- Bullet points preferred. State what sources say caused the move.
- If sources don't explain the cause, say so — do not speculate.
- Note any direct relevance to Pakistan using the dashboard mini-context.
End with: SOURCE: External Sources
CITATIONS: [comma-separated URLs of sources you cited — leave blank if none]`,

  hybrid: `TASK: Integrated analysis using BOTH dashboard data and external sources.
- Bullet points preferred.
- Dashboard data is the primary source of truth — overrides external sources on specific Pakistan values.
- Label sources clearly: "Dashboard: X" vs "IMF: Y".
- Never fabricate statistics. If sources conflict, explain in plain English.
End with: SOURCE: Hybrid Analysis
CITATIONS: [comma-separated URLs of external sources you cited — leave blank if none]`,
};

interface PromptFreshness {
  searchIsStale: boolean;
  searchAgeMs: number | null;
  pakEtfFallback: Kpi | null;
}

function formatAge(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "under a minute";
  if (minutes === 1) return "1 minute";
  if (minutes < 60) return `${minutes} minutes`;
  return `${Math.round(minutes / 60)} hour(s)`;
}

function buildSystemPrompt(
  ctx: DashboardSnapshot,
  routerResult: RouterResult,
  search: SearchResponse | null,
  isDetailedMode: boolean,
  freshness: PromptFreshness,
): string {
  const blocks: string[] = [
    "You are the Pakistan Economic Intelligence Assistant — a friendly, plain-English guide to Pakistan's economy.",
    "Your audience is retail investors, students, and the general public — many with little economics background.",
    "Always explain things simply. Define any jargon the first time you use it.",
    "Distinguish clearly: facts, estimates, opinions. Never fabricate statistics.",
    "",
    buildStyleBlock(isDetailedMode),
    "",
  ];

  if (routerResult.needsDashboard) {
    blocks.push(buildDashboardBlock(ctx));
    blocks.push("");
  } else {
    // Even for non-dashboard categories, provide a slim Pakistan context for grounding
    blocks.push(buildDashboardMiniBlock(ctx));
    blocks.push("");
  }

  if (search && search.results.length > 0) {
    blocks.push(buildSearchBlock(search.results));
    if (freshness.searchIsStale && freshness.searchAgeMs !== null) {
      blocks.push(
        `NOTE: A live search just failed or timed out. The sources above are from a cached search ` +
        `result, ${formatAge(freshness.searchAgeMs)} old. Mention briefly that this data may be a few ` +
        `minutes old rather than presenting it as this instant's live quote.`,
      );
    }
    blocks.push("");
  } else if (freshness.pakEtfFallback) {
    const etf = freshness.pakEtfFallback;
    blocks.push(
      `NOTE: A live KSE-100 index quote is not available (PSX requires a commercial data license that ` +
      `this assistant does not have). As a correlated proxy, the Global X MSCI Pakistan ETF (NYSE: PAK) ` +
      `is currently ${etf.value} ${etf.unit} (${etf.change}). Present this clearly AS A PROXY, not as the ` +
      `KSE-100 value itself — explain that it tracks the same index and moves similarly, but is not the ` +
      `index itself.`,
    );
    blocks.push("");
  } else if (routerResult.needsSearch) {
    blocks.push(
      "NOTE: External search returned no results from trusted sources for this query. " +
      "Answer from dashboard data and AI knowledge, and acknowledge the limitation.",
    );
    blocks.push("");
  }

  // For PSX / live market queries, add specific formatting and fallback message
  if (routerResult.isLiveMarket) {
    blocks.push(
      "LIVE MARKET FORMAT: Structure market answers as:\n" +
      "- Current Value (only if found in sources, or the PAK ETF proxy noted above — exact figure, not estimate)\n" +
      "- Daily Change\n" +
      "- Why It Moved\n" +
      "- Source\n" +
      "Maximum 6 bullet points.\n" +
      "CRITICAL: If NEITHER a search result NOR the PAK ETF proxy is available above, say exactly:\n" +
      "\"I couldn't retrieve the latest market quote at the moment. Please try again in a few minutes.\"\n" +
      "Do NOT say 'I don't have access to live data.' — use the exact phrase above."
    );
    blocks.push("");
  }

  blocks.push(INSTRUCTIONS[routerResult.category]);
  return blocks.join("\n");
}

// ── Response Parser ────────────────────────────────────────────────────────────

function parseResponse(content: string): ParsedResponse {
  // Extract CITATIONS line (optional — not all categories produce it)
  const citMatch = content.match(/\nCITATIONS:\s*([^\n]*)/i);
  const citationsRaw = citMatch?.[1]?.trim() ?? "";
  const citationUrls = citationsRaw
    .split(/[,|]/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http"));

  // Extract SOURCE line — new values added alongside legacy ones
  const sourceMatch = content.match(
    /\nSOURCE:\s*(Dashboard Data|Official Source|Financial Media|External Sources|AI Knowledge|Hybrid Analysis)/i,
  );
  const source = (sourceMatch?.[1] as SourceType) ?? "Hybrid Analysis";

  // Strip SOURCE and CITATIONS markers from reply
  const reply = content
    .replace(/\nCITATIONS:.*?(\n|$)/gi, "")
    .replace(/\nSOURCE:.*?(\n|$)/gi, "")
    .trim();

  return { reply, source, citationUrls };
}

function buildCitationItems(
  citationUrls: string[],
  search: SearchResponse | null,
): CitationItem[] {
  return citationUrls
    .map((url): CitationItem | null => {
      try {
        const domain = new URL(url).hostname.replace(/^www\./, "");
        const searchMatch = search?.results.find(
          (r) => r.url === url || r.domain === domain,
        );
        return {
          title: searchMatch?.title ?? domain,
          url,
          domain,
          tier: searchMatch?.tier ?? "C",
          publishedDate: searchMatch?.publishedDate,
        };
      } catch {
        return null;
      }
    })
    .filter((c): c is CitationItem => c !== null);
}

// ── Main Handler ───────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const requestStart = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({
      reply: "The AI assistant is temporarily unavailable (API key not configured).",
      confidence: "Low" as ConfidenceLevel,
      confidenceReason: "API key not configured",
      source: "AI Knowledge" as SourceType,
      queryCategory: "Unknown",
      citations: [],
      searchPerformed: false,
      searchLatencyMs: null,
      sourcesFound: 0,
      modelUsed: "fallback",
      modelDisplayName: "Offline",
    });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { message, context, history } = body;
  if (!message?.trim()) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  // ── Step 1: Classify ──────────────────────────────────────────────────────
  const routerResult = classifyQuery(message);
  console.log(
    `[AI/Assistant/Router] category: ${routerResult.category} | ` +
    `search: ${routerResult.needsSearch} | ` +
    `"${message.slice(0, 70)}${message.length > 70 ? "..." : ""}"`,
  );

  // ── Step 1.5: Local knowledge base — checked before any network call. ────
  // A hit answers instantly with zero Tavily/OpenRouter cost. Only queries
  // that don't need live dashboard data are eligible — dashboard/hybrid
  // categories must still reflect current indicator values, never a static
  // canned answer.
  if (!routerResult.needsDashboard) {
    const kbMatch = searchKnowledgeBase(message);
    if (kbMatch) {
      console.log(
        `[Knowledge Base] HIT — id: ${kbMatch.entry.id} | type: ${kbMatch.matchType} | ` +
        `score: ${kbMatch.score.toFixed(2)} | total: ${Date.now() - requestStart}ms`,
      );
      return Response.json({
        reply: kbMatch.entry.answer,
        confidence: "High" as ConfidenceLevel,
        confidenceReason: `Answered from local knowledge base (${kbMatch.entry.category})`,
        source: "AI Knowledge" as SourceType,
        dataSource: null,
        queryCategory: "Knowledge Base",
        citations: [],
        searchPerformed: false,
        searchLatencyMs: null,
        sourcesFound: 0,
        modelUsed: "knowledge-base",
        modelDisplayName: "Knowledge Base",
      });
    }
    console.log(`[Knowledge Base] MISS — "${message.slice(0, 70)}${message.length > 70 ? "..." : ""}"`);
  }

  // ── Step 2: Search (cache-aware) + PAK ETF fallback fetch — run in parallel ──
  // The PAK ETF quote (free Yahoo Finance call, not rate-limited) is fetched
  // concurrently with the Tavily search for live-market queries, rather than
  // sequentially after search fails — cuts latency on the worst-case path
  // (KSE-100/PSX queries, which previously chained two slow I/O calls).
  let search: SearchResponse | null = null;
  let searchIsStale = false;
  let searchAgeMs: number | null = null;
  let pakEtfFallback: Kpi | null = null;

  const searchStart = Date.now();
  if (routerResult.needsSearch && routerResult.searchQuery) {
    const cacheKey = `${routerResult.focusDomains?.join(",") ?? "general"}::${routerResult.searchQuery.toLowerCase()}`;
    const cached = getFresh<SearchResponse>(cacheKey, SEARCH_CACHE_TTL_MS);

    if (cached) {
      search = cached.data;
      searchAgeMs = cached.ageMs;
      console.log(`[Timing] search: 0ms (cache hit, ${cached.ageMs}ms old)`);
      if (routerResult.isLiveMarket && search.results.length === 0) {
        pakEtfFallback = await getPakEtfKpi();
      }
    } else {
      const hasFallback = getStale<SearchResponse>(cacheKey) !== null;
      const timeoutMs = hasFallback ? SEARCH_TIMEOUT_WITH_FALLBACK_MS : SEARCH_TIMEOUT_NO_FALLBACK_MS;

      const [freshSearch, pakEtfResult] = await Promise.all([
        routerResult.focusDomains?.length
          ? searchTavilyFocused(routerResult.searchQuery, routerResult.focusDomains, timeoutMs)
          : searchTavily(routerResult.searchQuery, timeoutMs),
        routerResult.isLiveMarket ? getPakEtfKpi() : Promise.resolve<Kpi | null>(null),
      ]);
      console.log(`[Timing] search: ${Date.now() - searchStart}ms (budget ${timeoutMs}ms, hadFallback: ${hasFallback})`);

      if (freshSearch && freshSearch.results.length > 0) {
        search = freshSearch;
        setCache(cacheKey, freshSearch);
      } else {
        const stale = getStale<SearchResponse>(cacheKey);
        if (stale) {
          search = stale.data;
          searchIsStale = true;
          searchAgeMs = stale.ageMs;
          console.log(`[Assistant/Cache] search empty/failed — using stale cache (${stale.ageMs}ms old)`);
        }
        // Only matters if the cache fallback also came up empty/missing.
        if (!search || search.results.length === 0) {
          pakEtfFallback = pakEtfResult;
        }
      }
    }
  }

  // ── Step 3: Confidence + source type (deterministic, before AI) ──────────
  const { level: confidence, reason: confidenceReason } = computeConfidence(routerResult, search);
  const source = computeSourceType(routerResult, search);
  const dataSource = computeDataSource(search);

  // ── Step 4: Build augmented system prompt ─────────────────────────────────
  const isDetailedMode = detectDetailedMode(message);
  const systemPrompt = buildSystemPrompt(context, routerResult, search, isDetailedMode, {
    searchIsStale,
    searchAgeMs,
    pakEtfFallback,
  });

  const messages = [
    { role: "system" as const, content: systemPrompt },
    // Keep last 6 turns (3 exchanges) to control token usage on smaller models
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message.trim() },
  ];

  // ── Step 5: AI generation via FALLBACK_CHAIN — timeout-protected ─────────
  const modelStart = Date.now();
  for (const model of FALLBACK_CHAIN) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
    const callStart = Date.now();
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: isDetailedMode ? 900 : 550,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[AI/Assistant] ${model} — HTTP ${res.status} ${res.statusText} (${Date.now() - callStart}ms)`);
        continue;
      }

      const rawText = await res.text();
      if (!rawText.trim()) {
        console.warn(`[AI/Assistant] ${model} — empty body`);
        continue;
      }

      const apiData = JSON.parse(rawText) as OpenRouterApiResponse;
      const rawContent = apiData.choices?.[0]?.message?.content ?? "";
      if (!rawContent.trim()) {
        console.warn(`[AI/Assistant] ${model} — empty content`);
        continue;
      }

      // source is computed server-side (computeSourceType); ignore the AI-written tag
      const { reply, citationUrls } = parseResponse(rawContent);
      const citations = buildCitationItems(citationUrls, search);

      const modelMs = Date.now() - modelStart;
      const totalMs = Date.now() - requestStart;
      console.log(`[Timing] model response: ${modelMs}ms | total request: ${totalMs}ms`);
      console.log(
        `[AI/Assistant] Succeeded — model: ${model} | source: ${source} | ` +
        `confidence: ${confidence} | ` +
        `sources: ${search?.results.length ?? 0} | ` +
        `focus: ${routerResult.focusDomains?.join(",") ?? "none"}`,
      );

      return Response.json({
        reply,
        confidence,
        confidenceReason,
        source,
        dataSource,
        queryCategory: routerResult.label,
        citations,
        searchPerformed: routerResult.needsSearch,
        searchLatencyMs: search?.latencyMs ?? null,
        sourcesFound: search?.results.length ?? 0,
        modelUsed: model,
        modelDisplayName: getModelDisplayName(model),
      });
    } catch (err) {
      clearTimeout(timer);
      const aborted = err instanceof Error && err.name === "AbortError";
      const reason = aborted ? `timeout after ${MODEL_TIMEOUT_MS}ms` : err instanceof Error ? err.message : String(err);
      console.warn(`[AI/Assistant] ${model} — ${reason} (${Date.now() - callStart}ms)`);
    }
  }

  // All models failed
  console.error(`[AI/Assistant] All models failed (total: ${Date.now() - requestStart}ms)`);
  return Response.json({
    reply: "I'm having trouble connecting right now. Please try again in a moment.",
    confidence: "Low" as ConfidenceLevel,
    confidenceReason: "All AI models failed",
    source: "AI Knowledge" as SourceType,
    dataSource: null,
    queryCategory: routerResult.label,
    citations: [],
    searchPerformed: routerResult.needsSearch,
    searchLatencyMs: search?.latencyMs ?? null,
    sourcesFound: 0,
    modelUsed: "fallback",
    modelDisplayName: "Offline",
  });
}
