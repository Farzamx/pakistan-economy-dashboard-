// News & Intelligence data layer — aggregates Pakistan economy and global
// market headlines.
//
// Source hierarchy (verified live during the 2026-06 News & Intelligence
// audit, not assumed):
//   1. Google News RSS, topic-targeted queries — free, no key, no ToS
//      commercial-use restriction (it's public RSS — the same legal basis
//      this project already relies on for Yahoo Finance quotes/news),
//      verified live at hours-old freshness for Pakistan-economy-specific
//      queries (e.g. a "Pakistan budget" piece returned 1-2h old).
//   2. BBC Business RSS — global market news, no key, reliable.
//   3. Dawn Business RSS — Pakistan economy news, no key.
//   4. Express Tribune Business RSS — Pakistan business news, no key.
//   5. PBS Official Releases — direct polling of Pakistan Bureau of
//      Statistics' own WordPress feed (Production Audit Part 9), not
//      journalism about it. Highest source-reliability score on this
//      dashboard (relevanceEngine.ts) since it's a primary source.
//
// GNews (the previous primary source) was removed after the audit found
// three separate, independently disqualifying problems: (a) its free tier's
// terms explicitly prohibit commercial/production use, (b) its free tier
// carries a 12-hour data delay — incompatible with a "near real-time" goal
// regardless of paying for a key, and (c) GNEWS_API_KEY was not even
// configured in this deployment, so it was silently contributing zero
// articles every single fetch with nothing in any log to reveal that.
// Google News RSS replaces its role with equal-or-better topic targeting
// and none of these three problems.
//
// Pipeline: fetch all sources in parallel -> score Pakistan relevance +
// classify into one of 7 categories (relevanceEngine.ts) -> cluster-dedupe
// near-duplicate coverage of the same event (dedupe.ts) -> sort by
// relevance then recency -> cap.

import { dedupeByClustering } from "@/lib/news/dedupe";
import { getSourceReliability, scoreRelevance, type NewsCategory } from "@/lib/news/relevanceEngine";

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: NewsCategory;
  /** 0-10, see relevanceEngine.ts — how relevant this article is to Pakistan's economy. */
  relevanceScore: number;
}

// Tiered revalidation (Phase 3 of the audit): the previous design used one
// blanket 2h window for every source regardless of how time-sensitive it
// was. Narrowly-targeted, high-relevance queries (Pakistan, IMF, Fed) are
// now checked far more often than broad general-business feeds.
const REVALIDATE_BREAKING = 60 * 10; // 10 min — Pakistan/IMF/Fed-specific queries
const REVALIDATE_GENERAL = 60 * 25; // 25 min — broad business RSS feeds

const MAX_ITEMS = 40;

// fetch() has no default timeout — without this, a stalled connection hangs
// for undici's ~5 minute default (or blocks `next build` static generation)
// instead of falling into the existing try/catch error handling.
const FETCH_TIMEOUT_MS = 10_000;

interface RawItem {
  title: string;
  url: string;
  publishedAt: string;
}

// ---- RSS parsing (shared by Google News RSS and the fixed-source feeds) ---

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

function parseRssItemsRaw(xml: string): RawItem[] {
  const items: RawItem[] = [];
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
      publishedAt: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
    });
  }

  return items;
}

async function fetchRss(
  url: string,
  source: string,
  revalidateSeconds: number,
  max = 6,
): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[News] ${source} RSS failed: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseRssItemsRaw(xml)
      .slice(0, max)
      .map((item) => withRelevance(item, source));
  } catch (err) {
    console.error(`[News] ${source} RSS error:`, err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ---- Google News RSS -------------------------------------------------------
// Google News RSS titles are formatted "<headline> - <Outlet Name>" — split
// that out so the displayed source is the real publisher (better for the
// source-reliability score and for users), not a generic "Google News" tag.

function splitGoogleNewsTitle(rawTitle: string): { title: string; source: string } {
  const idx = rawTitle.lastIndexOf(" - ");
  if (idx === -1) return { title: rawTitle, source: "Google News" };
  return { title: rawTitle.slice(0, idx).trim(), source: rawTitle.slice(idx + 3).trim() };
}

function googleNewsRssUrl(query: string): string {
  const params = new URLSearchParams({ q: `${query} when:2d`, hl: "en-PK", gl: "PK", ceid: "PK:en" });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

async function fetchGoogleNewsRss(
  query: string,
  revalidateSeconds: number,
  max = 6,
): Promise<NewsItem[]> {
  try {
    const res = await fetch(googleNewsRssUrl(query), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[News] Google News RSS failed for "${query}": HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseRssItemsRaw(xml)
      .slice(0, max)
      .map((item) => {
        const { title, source } = splitGoogleNewsTitle(item.title);
        return withRelevance({ title, url: item.url, publishedAt: item.publishedAt }, source);
      });
  } catch (err) {
    console.error(`[News] Google News RSS error for "${query}":`, err instanceof Error ? err.message : String(err));
    return [];
  }
}

function withRelevance(item: RawItem, source: string): NewsItem {
  const { relevanceScore, category } = scoreRelevance(item.title);
  return { ...item, source, category, relevanceScore };
}

// ---- Official sources (Production Audit Part 9) ---------------------------
// Direct polling of an official institution's own releases, not journalism
// about them. PBS's WordPress REST API is the same one src/lib/data/spi.ts
// already uses successfully (verified live) — this just removes the
// "Sensitive Price Indicator" search filter to pick up every post, not only
// SPI ones. SBP and the Ministry of Finance were evaluated and deliberately
// NOT added here: SBP's RSS feeds sit behind Cloudflare bot protection that
// returns 403 regardless of caller (confirmed directly, not assumed — this
// would silently contribute zero articles forever in production, which is
// the exact failure mode this audit exists to eliminate, not introduce).
// The Ministry of Finance's press-releases page is a legacy, table-based
// static HTML page with no API/RSS and no stable structure to parse
// reliably without dedicated scraper development and testing — flagged as
// a Phase 2 recommendation rather than shipped untested.
const PBS_POSTS_API = "https://www.pbs.gov.pk/wp-json/wp/v2/posts";

interface PbsPost {
  title: { rendered: string };
  link: string;
  date: string;
}

function decodePbsTitle(rendered: string): string {
  return decodeEntities(rendered.replace(/<[^>]+>/g, "").trim());
}

async function fetchPbsOfficialReleases(revalidateSeconds: number, max = 8): Promise<NewsItem[]> {
  try {
    const params = new URLSearchParams({ per_page: String(max), orderby: "date", order: "desc" });
    const res = await fetch(`${PBS_POSTS_API}?${params.toString()}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[News] PBS Official Releases failed: HTTP ${res.status}`);
      return [];
    }
    const posts = (await res.json()) as PbsPost[];
    // Not run through the shared withRelevance()/scoreRelevance() — that
    // heuristic gates most keyword groups on an explicit "Pakistan" context
    // word appearing in the title (hasPakistanContext), which terse
    // statistical-bulletin titles like "Monthly Inflation Report for May
    // 2026" never contain despite being maximally relevant in substance —
    // confirmed live: every one of PBS's actual recent titles (SPI, Foreign
    // Trade Statistics, LSM, Inflation Report) scored only 5/10 and got
    // crowded out of the top-40 pool by less relevant but more
    // keyword-matching stories. Every post from this source is, by
    // construction, Pakistan's own official economic statistics — the
    // maximum relevance score is the accurate one, not a heuristic guess.
    return posts.map((post) => ({
      title: decodePbsTitle(post.title.rendered),
      url: post.link,
      source: "PBS Official Releases",
      publishedAt: post.date,
      category: "Pakistan Economy" as const,
      relevanceScore: 10,
    }));
  } catch (err) {
    console.error("[News] PBS Official Releases error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ---- Aggregation ------------------------------------------------------------

// Topic-targeted queries replacing the old GNews keyword searches, extended
// to cover the categories Phase 7 needs that GNews never targeted (IMF
// specifically, China, Middle East) — see header note for why Google News
// RSS replaces GNews entirely rather than running alongside it.
const GOOGLE_NEWS_QUERIES: { query: string; revalidate: number }[] = [
  { query: "Pakistan economy SBP OR rupee OR PSX", revalidate: REVALIDATE_BREAKING },
  { query: "IMF Pakistan OR IMF bailout OR IMF programme", revalidate: REVALIDATE_BREAKING },
  { query: "Federal Reserve interest rate OR FOMC", revalidate: REVALIDATE_BREAKING },
  { query: "oil price OPEC Brent WTI", revalidate: REVALIDATE_GENERAL },
  { query: "China economy OR CPEC", revalidate: REVALIDATE_GENERAL },
  { query: "Middle East economy OR Gulf economy", revalidate: REVALIDATE_GENERAL },
];

export async function getNews(): Promise<NewsItem[]> {
  const [googleNewsResults, bbcRss, dawnRss, tribuneRss, pbsReleases] = await Promise.all([
    Promise.all(GOOGLE_NEWS_QUERIES.map((q) => fetchGoogleNewsRss(q.query, q.revalidate, 6))),
    fetchRss("https://feeds.bbci.co.uk/news/business/rss.xml", "BBC Business", REVALIDATE_GENERAL, 8),
    // Dawn/Tribune are general-outlet feeds, same as BBC — moved off the
    // "breaking" tier they were previously (inconsistently) wired to, per
    // this file's own stated design intent above.
    fetchRss("https://www.dawn.com/feeds/business", "Dawn Business", REVALIDATE_GENERAL, 8),
    fetchRss("https://tribune.com.pk/feed/business", "Express Tribune", REVALIDATE_GENERAL, 8),
    fetchPbsOfficialReleases(REVALIDATE_BREAKING, 8),
  ]);

  const all = [...googleNewsResults.flat(), ...bbcRss, ...dawnRss, ...tribuneRss, ...pbsReleases];

  if (all.length === 0) {
    console.error("[News] All sources returned zero articles — check network access and source availability.");
    return [];
  }

  // Cluster-dedupe near-duplicate coverage of the same event (Phase 4) —
  // rank combines relevance and source reliability so the "strongest"
  // article in each cluster survives, not just whichever happened first.
  const ranked = all.map((item) => ({ ...item, rank: item.relevanceScore * 10 + getSourceReliability(item.source) }));
  const deduped = dedupeByClustering(ranked);

  const sorted = deduped
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .slice(0, MAX_ITEMS);

  console.log(
    `[News] fetched=${all.length} afterDedup=${deduped.length} duplicatesRemoved=${all.length - deduped.length} returned=${sorted.length}`,
  );

  // Strip the internal dedup-ranking field before returning — callers only
  // see the public NewsItem shape.
  return sorted.map((item): NewsItem => ({
    title: item.title,
    url: item.url,
    source: item.source,
    publishedAt: item.publishedAt,
    category: item.category,
    relevanceScore: item.relevanceScore,
  }));
}
