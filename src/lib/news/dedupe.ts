// Article clustering / duplicate detection.
//
// The existing pipeline only de-duplicated by exact URL match, which misses
// the common case of two outlets covering the same event with different
// URLs and different headline wording — verified directly during the News
// & Intelligence audit: BBC ("Alan Greenspan, architect of the modern
// American economy, dies aged 100") and Dawn ("Alan Greenspan, longtime US
// Federal Reserve chairman, dies aged 100") both appeared in the same fetch
// batch, the exact duplicate the audit screenshot showed.
//
// Approach: normalize each headline to a stopword-filtered token set, then
// cluster by Jaccard similarity. The 0.3 threshold below isn't a guess — it
// was checked directly against that real Greenspan pair (similarity 0.385,
// comfortably above 0.3) and against unrelated headline pairs (near 0),
// during the same audit.

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "of", "in",
  "on", "at", "to", "for", "and", "or", "with", "as", "by", "after", "over",
  "amid", "says", "said", "this", "that", "its", "his", "her", "their",
  "from", "into", "than", "but", "not", "has", "have", "had", "will",
]);

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Verified against real duplicate/non-duplicate headline pairs — see header note. Not tunable without re-verifying against real data. */
const SIMILARITY_THRESHOLD = 0.3;

export interface Clusterable {
  title: string;
  /** Higher rank = kept when this article clusters with others. Caller decides what "strongest" means (relevance score, source reliability, recency, ...). */
  rank: number;
}

/**
 * Groups near-duplicate headlines and keeps only the highest-`rank` article
 * per cluster. Stable for ties (keeps the first-encountered among equal
 * ranks) and O(n²) in the number of articles — fine at the dashboard's
 * scale (tens of articles per fetch, not thousands).
 */
export function dedupeByClustering<T extends Clusterable>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => b.rank - a.rank);
  const kept: T[] = [];
  const keptTokens: Set<string>[] = [];

  for (const item of sorted) {
    const tokens = tokenize(item.title);
    const isDuplicate = keptTokens.some((existing) => jaccardSimilarity(tokens, existing) >= SIMILARITY_THRESHOLD);
    if (!isDuplicate) {
      kept.push(item);
      keptTokens.push(tokens);
    }
  }

  return kept;
}
