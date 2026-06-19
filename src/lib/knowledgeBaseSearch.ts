// Matches a user's free-text question against src/data/knowledgeBase.ts.
// Pure, synchronous, no IO — safe to call on every assistant request before
// any network call (Tavily/OpenRouter).

import { KNOWLEDGE_BASE, type KnowledgeEntry } from "@/data/knowledgeBase";

export type KnowledgeMatchType = "exact" | "contains" | "acronym" | "keyword";

export interface KnowledgeMatch {
  entry: KnowledgeEntry;
  matchType: KnowledgeMatchType;
  score: number; // 0-1, higher = more confident
}

// ── Normalization ────────────────────────────────────────────────────────────
// lowercase, strip punctuation, collapse whitespace.

export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Acronym expansion ────────────────────────────────────────────────────────
// Lets "what is fdi" match aliases phrased as "foreign direct investment".

const ACRONYM_EXPANSIONS: Record<string, string> = {
  gdp: "gross domestic product",
  cpi: "consumer price index",
  wpi: "wholesale price index",
  sbp: "state bank of pakistan",
  kibor: "karachi interbank offered rate",
  psx: "pakistan stock exchange",
  imf: "international monetary fund",
  fdi: "foreign direct investment",
  pib: "pakistan investment bond",
  pibs: "pakistan investment bonds",
  etf: "exchange traded fund",
  etfs: "exchange traded funds",
  reer: "real effective exchange rate",
  lsm: "large scale manufacturing",
  fbr: "federal board of revenue",
  cpec: "china pakistan economic corridor",
  secp: "securities and exchange commission of pakistan",
  npl: "non performing loan",
  npls: "non performing loans",
  car: "capital adequacy ratio",
  adr: "advances to deposit ratio",
  bisp: "benazir income support programme",
  sdr: "special drawing rights",
  eff: "extended fund facility",
  nfc: "national finance commission",
  sez: "special economic zone",
  sezs: "special economic zones",
  epz: "export processing zone",
  ida: "international development association",
  ifc: "international finance corporation",
  nfne: "non food non energy",
  kse: "karachi stock exchange",
  kmi: "kse meezan index",
  mpc: "monetary policy committee",
  rda: "roshan digital account",
  vps: "voluntary pension scheme",
  spi: "sensitive price indicator",
  nccpl: "national clearing company",
};

function expandAcronyms(normalized: string): string {
  const words = normalized.split(" ");
  let changed = false;
  const expanded = words.map((w) => {
    const exp = ACRONYM_EXPANSIONS[w];
    if (exp) {
      changed = true;
      return exp;
    }
    return w;
  });
  return changed ? expanded.join(" ") : normalized;
}

// ── Matching ─────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "what", "is", "a", "an", "the", "are", "does", "do", "did", "how",
  "why", "explain", "define", "tell", "me", "about", "you", "can",
  "of", "in", "to", "for", "and", "or", "mean", "meaning", "i", "want",
  "know", "please", "could", "would",
]);

function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * Search the knowledge base for a free-text query. Returns the single best
 * match, or null if nothing clears the confidence threshold.
 *
 * Match precedence: exact alias equality > alias contained in query >
 * acronym-expanded containment > keyword/token overlap.
 */
export function searchKnowledgeBase(query: string): KnowledgeMatch | null {
  const q = normalizeQuery(query);
  if (!q) return null;

  // 1. Exact alias match
  for (const entry of KNOWLEDGE_BASE) {
    for (const alias of entry.aliases) {
      if (normalizeQuery(alias) === q) {
        return { entry, matchType: "exact", score: 1 };
      }
    }
  }

  // 2. Alias contained within the (possibly longer/conversational) query —
  // pick the longest matching alias to avoid short, overly-generic matches.
  let bestContains: { entry: KnowledgeEntry; aliasLen: number } | null = null;
  for (const entry of KNOWLEDGE_BASE) {
    for (const alias of entry.aliases) {
      const normAlias = normalizeQuery(alias);
      if (normAlias.length >= 4 && q.includes(normAlias)) {
        if (!bestContains || normAlias.length > bestContains.aliasLen) {
          bestContains = { entry, aliasLen: normAlias.length };
        }
      }
    }
  }
  if (bestContains) {
    return { entry: bestContains.entry, matchType: "contains", score: 0.92 };
  }

  // 3. Acronym-expanded containment — "what is fdi" -> "what is foreign direct investment"
  const expanded = expandAcronyms(q);
  if (expanded !== q) {
    let bestAcronym: { entry: KnowledgeEntry; aliasLen: number } | null = null;
    for (const entry of KNOWLEDGE_BASE) {
      for (const alias of entry.aliases) {
        const normAlias = normalizeQuery(alias);
        if (normAlias.length >= 4 && expanded.includes(normAlias)) {
          if (!bestAcronym || normAlias.length > bestAcronym.aliasLen) {
            bestAcronym = { entry, aliasLen: normAlias.length };
          }
        }
      }
    }
    if (bestAcronym) {
      return { entry: bestAcronym.entry, matchType: "acronym", score: 0.85 };
    }
  }

  // 4. Keyword/token overlap — catches paraphrased questions that share most
  // of an alias's meaningful words but not in the same order/phrasing.
  const qTokens = new Set(tokenize(q));
  if (qTokens.size === 0) return null;

  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const entry of KNOWLEDGE_BASE) {
    for (const alias of entry.aliases) {
      const aliasTokens = tokenize(normalizeQuery(alias));
      if (aliasTokens.length === 0) continue;
      const overlap = aliasTokens.filter((t) => qTokens.has(t)).length;
      const score = overlap / aliasTokens.length;
      // Many aliases reduce to a single meaningful token after stopword
      // removal (e.g. "what is sukuk" -> "sukuk") — for those, an exact
      // match on that one specific word is sufficient. Multi-token aliases
      // need near-complete coverage AND at least 2 overlapping words, to
      // avoid a single generic word (e.g. a stray "inflation") matching
      // every entry that happens to mention it once.
      const passes = aliasTokens.length === 1 ? overlap === 1 : score >= 0.75 && overlap >= 2;
      if (passes && (!best || score > best.score)) {
        best = { entry, score };
      }
    }
  }
  if (best) {
    return { entry: best.entry, matchType: "keyword", score: best.score };
  }

  return null;
}
