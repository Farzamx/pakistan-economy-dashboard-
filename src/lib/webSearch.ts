// Tavily web search client for the Pakistan Economic Intelligence Assistant.
// Searches a curated list of trusted economic sources, prioritising Pakistani
// official sources (PSX, SECP, SBP, PBS, MoF) before international IFIs and media.
//
// Two public functions:
//   searchTavily()        — full domain list (general queries)
//   searchTavilyFocused() — primary domains first, falls back to full list
//                           (used for PSX / SECP / SBP / PBS targeted queries)

export interface SearchResult {
  title: string;
  url: string;
  content: string;     // cleaned text snippet (max 500 chars)
  domain: string;
  tier: "A" | "B" | "C";
  publishedDate?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  latencyMs: number;
  queryUsed: string;
  totalRaw: number;
}

// ── Trusted domain registry ───────────────────────────────────────────────────
//
// Tier A: Pakistani official sources + international IFIs (highest authority)
// Tier B: Pakistani financial media + international statistical agencies
// Tier C: Market data aggregators

const TRUSTED_DOMAINS: Record<string, "A" | "B" | "C"> = {
  // ── Tier A: Pakistani official ───────────────────────────────────────────
  "psx.com.pk":             "A",   // PSX: KSE100, company data, announcements
  "secp.gov.pk":            "A",   // SECP: regulations, circulars, licensing
  "sbp.org.pk":             "A",   // SBP: monetary policy, reserves, banking
  "easydata.sbp.org.pk":    "A",   // SBP EasyData: time series portal
  "pbs.gov.pk":             "A",   // PBS: inflation, trade, LSM, national accounts
  "finance.gov.pk":         "A",   // Ministry of Finance: fiscal data, outlook
  // ── Tier A: International IFIs ──────────────────────────────────────────
  "imf.org":                "A",
  "worldbank.org":          "A",
  "federalreserve.gov":     "A",
  "ecb.europa.eu":          "A",
  "bis.org":                "A",
  "oecd.org":               "A",
  "unctad.org":             "A",
  // ── Tier B: Pakistani financial media ───────────────────────────────────
  "brecorder.com":          "B",
  "dawn.com":               "B",
  "thenews.com.pk":         "B",
  "tribune.com.pk":         "B",
  // ── Tier B: International financial data ────────────────────────────────
  "fred.stlouisfed.org":    "B",
  // ── Tier C: Market data aggregators ─────────────────────────────────────
  "finance.yahoo.com":      "C",
  "tradingeconomics.com":   "C",
  "cmegroup.com":           "C",
};

export const SEARCH_DOMAIN_LIST = Object.keys(TRUSTED_DOMAINS);

// ── Focused domain groups (imported by queryRouter) ───────────────────────────
// Each group lists the most relevant domains for that query type, ordered by
// priority. Used as `primaryDomains` in searchTavilyFocused().

export const PSX_DOMAINS = [
  "psx.com.pk",
  "brecorder.com",
  "dawn.com",
  "thenews.com.pk",
  "tribune.com.pk",
  "tradingeconomics.com",
];

export const SECP_DOMAINS = [
  "secp.gov.pk",
  "brecorder.com",
  "dawn.com",
  "thenews.com.pk",
];

export const SBP_DOMAINS = [
  "sbp.org.pk",
  "easydata.sbp.org.pk",
  "brecorder.com",
  "dawn.com",
];

export const PBS_DOMAINS = [
  "pbs.gov.pk",
  "finance.gov.pk",
  "brecorder.com",
];

export const IMF_WB_DOMAINS = [
  "imf.org",
  "worldbank.org",
  "brecorder.com",
];

// ── Internal types ────────────────────────────────────────────────────────────

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  query: string;
  results: TavilyResult[];
}

// ── Domain resolution ─────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    for (const domain of Object.keys(TRUSTED_DOMAINS)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) return domain;
    }
    return hostname;
  } catch {
    return "";
  }
}

function filterAndEnrich(raw: TavilyResult[]): SearchResult[] {
  return (raw ?? [])
    .map((r): SearchResult | null => {
      const domain = extractDomain(r.url);
      const tier = TRUSTED_DOMAINS[domain];
      if (!tier) return null;
      return {
        title: r.title,
        url: r.url,
        content: r.content.slice(0, 500),
        domain,
        tier,
        publishedDate: r.published_date,
      };
    })
    .filter((r): r is SearchResult => r !== null)
    .slice(0, 4);
}

// ── Core Tavily request (private) ─────────────────────────────────────────────

async function tavilyRequest(
  apiKey: string,
  query: string,
  domains: string[],
  timeoutMs: number,
): Promise<{ raw: TavilyResult[]; totalRaw: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_domains: domains,
        max_results: 6,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.warn(`[Tavily] HTTP ${res.status} — "${query.slice(0, 60)}" — ${err.slice(0, 80)}`);
      return null;
    }

    const data = (await res.json()) as TavilyResponse;
    return { raw: data.results ?? [], totalRaw: data.results?.length ?? 0 };
  } catch (err) {
    clearTimeout(timer);
    const reason = err instanceof Error ? err.message : String(err);
    if (reason.includes("abort") || reason.includes("AbortError")) {
      console.warn(`[Tavily] Timeout (${timeoutMs}ms) — "${query.slice(0, 60)}"`);
    } else {
      console.warn(`[Tavily] Error — ${reason}`);
    }
    return null;
  }
}

function logResult(results: SearchResult[], latencyMs: number, totalRaw: number, query: string) {
  const tierCounts = { A: 0, B: 0, C: 0 };
  for (const r of results) tierCounts[r.tier]++;
  console.log(
    `[Tavily] ${latencyMs}ms | raw: ${totalRaw} | trusted: ${results.length} ` +
    `(A:${tierCounts.A} B:${tierCounts.B} C:${tierCounts.C}) | "${query.slice(0, 60)}"`,
  );
}

// ── Public: standard search (full domain list) ────────────────────────────────

export async function searchTavily(
  query: string,
  timeoutMs = 4000,
): Promise<SearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[Tavily] TAVILY_API_KEY not set — skipping search");
    return null;
  }

  const start = Date.now();
  const data = await tavilyRequest(apiKey, query, SEARCH_DOMAIN_LIST, timeoutMs);
  if (!data) return null;

  const latencyMs = Date.now() - start;
  const results = filterAndEnrich(data.raw);
  logResult(results, latencyMs, data.totalRaw, query);
  return { results, latencyMs, queryUsed: query, totalRaw: data.totalRaw };
}

// ── Public: focused search with fallback ──────────────────────────────────────
// Call 1: search only primaryDomains (fast, targeted).
// Call 2: if call 1 returns 0 results, expand to full domain list with remaining budget.
// Results from both calls are merged, deduplicated, and sorted Tier A → B → C.

export async function searchTavilyFocused(
  query: string,
  primaryDomains: string[],
  timeoutMs = 4500,
): Promise<SearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[Tavily] TAVILY_API_KEY not set — skipping search");
    return null;
  }

  const start = Date.now();

  // Call 1: focused on primary domains (max 3s)
  const focusedTimeout = Math.min(3000, timeoutMs);
  const focused = await tavilyRequest(apiKey, query, primaryDomains, focusedTimeout);
  const focusedResults = focused ? filterAndEnrich(focused.raw) : [];

  if (focusedResults.length > 0) {
    const latencyMs = Date.now() - start;
    logResult(focusedResults, latencyMs, focused?.totalRaw ?? 0, `[focused] ${query}`);
    return {
      results: focusedResults,
      latencyMs,
      queryUsed: query,
      totalRaw: focused?.totalRaw ?? 0,
    };
  }

  // Call 2: fallback — expand to full domain list
  const remaining = timeoutMs - (Date.now() - start);
  if (remaining < 400) {
    console.log("[Tavily] focused returned 0 — no time for fallback");
    return null;
  }

  console.log(`[Tavily] focused returned 0 — expanding to full list (${remaining}ms budget)`);
  const fallback = await tavilyRequest(
    apiKey,
    query,
    SEARCH_DOMAIN_LIST,
    Math.min(2000, remaining),
  );

  if (!fallback) return null;

  const latencyMs = Date.now() - start;
  const fallbackResults = filterAndEnrich(fallback.raw);
  logResult(fallbackResults, latencyMs, fallback.totalRaw, `[fallback] ${query}`);
  return {
    results: fallbackResults,
    latencyMs,
    queryUsed: query,
    totalRaw: (focused?.totalRaw ?? 0) + fallback.totalRaw,
  };
}
