// Tavily web search client for the Pakistan Economic Intelligence Assistant.
// Searches only within a curated list of trusted economic sources.
// Hard 4s timeout — if Tavily is slow, the request continues without results
// rather than failing the whole assistant response.

export interface SearchResult {
  title: string;
  url: string;
  content: string;     // cleaned text snippet (max 500 chars)
  domain: string;      // e.g. "imf.org"
  tier: "A" | "B" | "C";
  publishedDate?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  latencyMs: number;
  queryUsed: string;
  totalRaw: number;    // total Tavily results before filtering
}

// Trusted domain registry — Tier A = central banks / IFIs, B = statistical agencies, C = market data
const TRUSTED_DOMAINS: Record<string, "A" | "B" | "C"> = {
  // Tier A — highest authority
  "sbp.org.pk": "A",
  "imf.org": "A",
  "worldbank.org": "A",
  "federalreserve.gov": "A",
  "ecb.europa.eu": "A",
  "bis.org": "A",
  "oecd.org": "A",
  "unctad.org": "A",
  // Tier B — government statistical agencies
  "pbs.gov.pk": "B",
  "finance.gov.pk": "B",
  "fred.stlouisfed.org": "B",
  // Tier C — market data providers
  "finance.yahoo.com": "C",
  "tradingeconomics.com": "C",
  "cmegroup.com": "C",
  "psx.com.pk": "C",
};

export const SEARCH_DOMAIN_LIST = Object.keys(TRUSTED_DOMAINS);

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

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    // Check for exact match or subdomain match
    for (const domain of Object.keys(TRUSTED_DOMAINS)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return domain;
      }
    }
    return hostname;
  } catch {
    return "";
  }
}

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
        include_domains: SEARCH_DOMAIN_LIST,
        max_results: 6,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[Tavily] HTTP ${res.status} — "${query.slice(0, 60)}" — ${errText.slice(0, 100)}`);
      return null;
    }

    const data = (await res.json()) as TavilyResponse;
    const latencyMs = Date.now() - start;
    const totalRaw = data.results?.length ?? 0;

    // Filter to trusted domains, enrich with tier info
    const results: SearchResult[] = (data.results ?? [])
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
      .slice(0, 4); // max 4 in context to control token count

    const tierCounts = { A: 0, B: 0, C: 0 };
    for (const r of results) tierCounts[r.tier]++;

    console.log(
      `[Tavily] latency: ${latencyMs}ms | raw: ${totalRaw} | trusted: ${results.length} ` +
      `(A:${tierCounts.A} B:${tierCounts.B} C:${tierCounts.C}) | query: "${query.slice(0, 60)}"`,
    );

    return { results, latencyMs, queryUsed: query, totalRaw };
  } catch (err) {
    clearTimeout(timer);
    const reason = err instanceof Error ? err.message : String(err);
    if (reason.includes("abort") || reason.includes("AbortError")) {
      console.warn(`[Tavily] Timeout (${timeoutMs}ms exceeded) — "${query.slice(0, 60)}"`);
    } else {
      console.warn(`[Tavily] Error — ${reason}`);
    }
    return null;
  }
}
