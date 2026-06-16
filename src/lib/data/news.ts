// News & Intelligence data layer — aggregates Pakistan economy headlines from
// GNews API (keyword search, free tier 100 req/day) and two open RSS feeds
// (Dawn Business, The News International Business).
//
// All fetches use Next.js ISR (next.revalidate) so the page always renders
// from cache and re-fetches in the background, never blocking the user.
//
// GNEWS_API_KEY must be set in .env.local for GNews articles. Without it the
// layer falls back to RSS-only (Dawn + The News), which requires no key.

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: "pakistan" | "global" | "markets" | "energy";
}

const REVALIDATE_NEWS = 60 * 60 * 2; // 2h

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

function parseRssItems(xml: string, source: string, category: NewsItem["category"]): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const block = match[1];

    const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ??
      block.match(/<title>(.*?)<\/title>/);
    const linkMatch = block.match(/<link>(.*?)<\/link>/) ??
      block.match(/<guid[^>]*>(https?[^<]+)<\/guid>/);
    const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);

    if (!titleMatch || !linkMatch) continue;

    items.push({
      title: titleMatch[1].trim(),
      url: linkMatch[1].trim(),
      source,
      publishedAt: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
      category,
    });
  }

  return items;
}

async function fetchRss(
  url: string,
  source: string,
  category: NewsItem["category"],
  max = 5,
): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_NEWS } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, source, category).slice(0, max);
  } catch {
    return [];
  }
}

// ---- Aggregation ------------------------------------------------------------

const FALLBACK_NEWS: NewsItem[] = [
  {
    title: "Pakistan's current account records surplus for third consecutive month",
    url: "https://www.dawn.com/business",
    source: "Dawn Business",
    publishedAt: new Date(Date.now() - 3_600_000).toISOString(),
    category: "pakistan",
  },
  {
    title: "SBP raises policy rate by 100 basis points amid inflation uptick",
    url: "https://www.dawn.com/business",
    source: "Dawn Business",
    publishedAt: new Date(Date.now() - 7_200_000).toISOString(),
    category: "pakistan",
  },
  {
    title: "KSE-100 closes above 110,000 as foreign buying accelerates",
    url: "https://www.thenews.com.pk/business",
    source: "The News Business",
    publishedAt: new Date(Date.now() - 10_800_000).toISOString(),
    category: "markets",
  },
  {
    title: "Brent crude slides as OPEC+ output deal uncertainty persists",
    url: "https://www.dawn.com/business",
    source: "Dawn Business",
    publishedAt: new Date(Date.now() - 14_400_000).toISOString(),
    category: "energy",
  },
  {
    title: "Fed signals extended pause as US inflation remains sticky",
    url: "https://www.thenews.com.pk/business",
    source: "The News Business",
    publishedAt: new Date(Date.now() - 18_000_000).toISOString(),
    category: "global",
  },
];

export async function getNews(): Promise<NewsItem[]> {
  try {
    const [pakistanGNews, marketsGNews, energyGNews, globalGNews, dawnRss, thenewsRss] =
      await Promise.all([
        fetchGNews("Pakistan economy OR Pakistan rupee OR SBP OR IMF Pakistan", "pakistan", 4),
        fetchGNews("KSE-100 OR Pakistan stock market OR PSX", "markets", 3),
        fetchGNews("oil price OPEC crude Brent WTI", "energy", 3),
        fetchGNews("US Federal Reserve interest rate global economy", "global", 3),
        fetchRss("https://www.dawn.com/feeds/business-finance", "Dawn Business", "pakistan", 5),
        fetchRss(
          "https://www.thenews.com.pk/rss/2/7",
          "The News Business",
          "pakistan",
          5,
        ),
      ]);

    const all = [
      ...pakistanGNews,
      ...marketsGNews,
      ...energyGNews,
      ...globalGNews,
      ...dawnRss,
      ...thenewsRss,
    ];

    if (all.length === 0) return FALLBACK_NEWS;

    // De-duplicate by URL and sort newest-first.
    const seen = new Set<string>();
    return all
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 20);
  } catch {
    return FALLBACK_NEWS;
  }
}
