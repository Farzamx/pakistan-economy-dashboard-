// News & Intelligence data layer — aggregates Pakistan economy and global
// market headlines from GNews API and open RSS feeds.
//
// Source hierarchy (most → least preferred):
//   1. GNews API keyword search (requires GNEWS_API_KEY — free, 100 req/day)
//   2. BBC Business RSS — global market news, no key, reliable
//   3. Dawn Business RSS — Pakistan economy news, no key
//   4. Express Tribune Business RSS — Pakistan business news, no key
//
// All fetches use Next.js ISR (next.revalidate) so the page always renders
// from cache; re-fetches happen in the background without blocking users.

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: "pakistan" | "global" | "markets" | "energy";
}

const REVALIDATE_NEWS = 60 * 60 * 2; // 2h

// fetch() has no default timeout — without this, a stalled connection hangs
// for undici's ~5 minute default (or blocks `next build` static generation)
// instead of falling into the existing try/catch error handling.
const FETCH_TIMEOUT_MS = 10_000;

// ---- GNews -------------------------------------------------------------------

interface GNewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}

interface GNewsResponse {
  articles?: GNewsArticle[];
}

async function fetchGNews(
  query: string,
  category: NewsItem["category"],
  maxResults = 5,
): Promise<NewsItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    q: query,
    lang: "en",
    max: String(maxResults),
    apikey: apiKey,
  });

  const res = await fetch(`https://gnews.io/api/v4/search?${params.toString()}`, {
    next: { revalidate: REVALIDATE_NEWS },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) return [];

  const json = (await res.json()) as GNewsResponse;
  return (json.articles ?? []).map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source.name,
    publishedAt: a.publishedAt,
    category,
  }));
}

// ---- RSS parser --------------------------------------------------------------

// Decode common XML/HTML entities so stored URLs and titles are clean strings.
// Without this, BBC RSS URLs contain literal "&amp;" which causes React key
// mismatches when the same URL appears decoded elsewhere, collapsing cards.
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseRssItems(
  xml: string,
  source: string,
  category: NewsItem["category"],
): NewsItem[] {
  const items: NewsItem[] = [];
  // Use [^>]* to match namespaced items like <item xmlns:default="...">
  const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const block = match[1];

    const titleMatch =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ??
      block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch =
      block.match(/<link>(.*?)<\/link>/) ??
      block.match(/<guid[^>]*>(https?[^<]+)<\/guid>/);
    const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);

    if (!titleMatch || !linkMatch) continue;

    const title = decodeEntities(titleMatch[1].trim());
    if (!title) continue;

    items.push({
      title,
      url: decodeEntities(linkMatch[1].trim()),
      source,
      publishedAt: pubDateMatch
        ? pubDateMatch[1].trim()
        : new Date().toISOString(),
      category,
    });
  }

  return items;
}

async function fetchRss(
  url: string,
  source: string,
  category: NewsItem["category"],
  max = 6,
): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
      next: { revalidate: REVALIDATE_NEWS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, source, category).slice(0, max);
  } catch {
    return [];
  }
}

// ---- Aggregation ------------------------------------------------------------

export async function getNews(): Promise<NewsItem[]> {
  const [
    pakistanGNews,
    marketsGNews,
    energyGNews,
    globalGNews,
    bbcRss,
    dawnRss,
    tribuneRss,
  ] = await Promise.all([
    fetchGNews("Pakistan economy OR Pakistan rupee OR SBP OR IMF Pakistan", "pakistan", 4),
    fetchGNews("KSE-100 OR Pakistan stock market OR PSX", "markets", 3),
    fetchGNews("oil price OPEC crude Brent WTI", "energy", 3),
    fetchGNews("US Federal Reserve interest rate global economy", "global", 3),
    fetchRss(
      "https://feeds.bbci.co.uk/news/business/rss.xml",
      "BBC Business",
      "global",
      8,
    ),
    fetchRss(
      "https://www.dawn.com/feeds/business",
      "Dawn Business",
      "pakistan",
      8,
    ),
    fetchRss(
      "https://tribune.com.pk/feed/business",
      "Express Tribune",
      "pakistan",
      8,
    ),
  ]);

  const all = [
    ...pakistanGNews,
    ...marketsGNews,
    ...energyGNews,
    ...globalGNews,
    ...bbcRss,
    ...dawnRss,
    ...tribuneRss,
  ];

  if (all.length === 0) return [];

  // De-duplicate by URL and sort newest-first.
  const seen = new Set<string>();
  return all
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 24);
}
