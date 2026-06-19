// Matches a user's free-text question against src/data/knowledgeBase.ts.
// Pure, synchronous, no IO — safe to call on every assistant request before
// any network call (Tavily/OpenRouter).
//
// Performance note: with 1,000+ entries and ~20,000 aliases, a naive
// per-query linear scan that re-normalizes every alias from scratch costs
// ~100ms/call (measured). Every alias is normalized and tokenized exactly
// once, at module load, into the index structures below — each query then
// only does cheap Map lookups / array scans over pre-computed strings.

import { KNOWLEDGE_BASE, type KnowledgeEntry } from "@/data/knowledgeBase";

export type KnowledgeMatchType = "exact" | "contains" | "acronym" | "keyword" | "fuzzy";

export interface KnowledgeMatch {
  entry: KnowledgeEntry;
  matchType: KnowledgeMatchType;
  score: number; // 0-1, higher = more confident
}

// ── Normalization ────────────────────────────────────────────────────────────
// lowercase, split letter/digit boundaries (so "kse100" tokenizes the same
// way as "kse 100" / "kse-100"), strip punctuation, collapse whitespace.

export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
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
  emh: "efficient market hypothesis",
  esg: "environmental social governance",
  reit: "real estate investment trust",
  ico: "initial coin offering",
  defi: "decentralized finance",
  dao: "decentralized autonomous organization",
  vasp: "virtual asset service provider",
  cbdc: "central bank digital currency",
  pe: "price to earnings",
  eps: "earnings per share",
  roe: "return on equity",
  roa: "return on assets",
  dcf: "discounted cash flow",
  npv: "net present value",
  irr: "internal rate of return",
  ebitda: "earnings before interest taxes depreciation and amortization",
  fcf: "free cash flow",
  cagr: "compound annual growth rate",
  aum: "assets under management",
  ipo: "initial public offering",
  mts: "margin trading system",
  scra: "special convertible rupee account",
  nbfc: "non bank financial company",
  crr: "cash reserve requirement",
  slr: "statutory liquidity requirement",
  omo: "open market operations",
  lcr: "liquidity coverage ratio",
  bps: "basis points",
  cds: "credit default swap",
  kyc: "know your customer",
  aml: "anti money laundering",
  gst: "general sales tax",
  cgt: "capital gains tax",
  frdl: "fiscal responsibility and debt limitation",
  adb: "asian development bank",
  pforr: "program for results",
  ppp: "purchasing power parity",
  gni: "gross national income",
  gnp: "gross national product",
  hdi: "human development index",
  bop: "balance of payments",
  qe: "quantitative easing",
  lbo: "leveraged buyout",
  mnc: "multinational corporation",
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

// ── Stopwords & tokenization ─────────────────────────────────────────────────

const STOPWORDS = new Set([
  "what", "is", "a", "an", "the", "are", "does", "do", "did", "how",
  "why", "explain", "define", "tell", "me", "about", "you", "can",
  "of", "in", "to", "for", "and", "or", "mean", "meaning", "i", "want",
  "know", "please", "could", "would", "give", "simple", "words", "terms",
  "basics", "understanding", "beginners", "dummies", "quick", "explanation",
  "explained", "simply", "definition", "economists", "define",
]);

function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

// ── Precomputed index (built once at module load, not per-query) ──────────────

interface IndexedAlias {
  normalized: string;
  tokens: string[];
  entry: KnowledgeEntry;
}

const EXACT_INDEX = new Map<string, KnowledgeEntry>();
const ALIAS_INDEX: IndexedAlias[] = [];
const VOCABULARY = new Set<string>();

for (const entry of KNOWLEDGE_BASE) {
  for (const alias of entry.aliases) {
    const normalized = normalizeQuery(alias);
    if (!normalized) continue;
    if (!EXACT_INDEX.has(normalized)) EXACT_INDEX.set(normalized, entry);
    const tokens = tokenize(normalized);
    ALIAS_INDEX.push({ normalized, tokens, entry });
    for (const t of tokens) {
      if (t.length >= 3) VOCABULARY.add(t);
    }
  }
}

// Longest-normalized-first, so "contains" matching always prefers the most
// specific (longest) alias over a short generic substring of it.
const ALIAS_INDEX_BY_LENGTH = [...ALIAS_INDEX].sort(
  (a, b) => b.normalized.length - a.normalized.length,
);

// ── Lightweight fuzzy correction (edit distance, no embeddings) ─────────────
// Only runs as a last-resort fallback on tokens that don't already match the
// vocabulary, and only against vocabulary words of similar length — keeps it
// fast even with a multi-thousand-word vocabulary.

function levenshtein(a: string, b: string, maxDist: number): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  let prevRow = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prevRow[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const currRow = new Array(b.length + 1);
    currRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      currRow[j] =
        a[i - 1] === b[j - 1]
          ? prevRow[j - 1]
          : 1 + Math.min(prevRow[j - 1], prevRow[j], currRow[j - 1]);
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
}

/** Corrects a likely-misspelled token to a known vocabulary word if exactly one is within edit distance 1. Ambiguous or already-known tokens are returned unchanged. */
function correctToken(token: string): string {
  if (token.length < 3 || VOCABULARY.has(token)) return token;
  let bestWord: string | null = null;
  for (const word of VOCABULARY) {
    if (Math.abs(word.length - token.length) > 1) continue;
    if (levenshtein(token, word, 1) <= 1) {
      if (bestWord !== null) return token; // ambiguous — don't guess
      bestWord = word;
    }
  }
  return bestWord ?? token;
}

// ── Core matching passes (operate on the precomputed index) ─────────────────

function findContains(normalizedQuery: string): KnowledgeEntry | null {
  for (const indexed of ALIAS_INDEX_BY_LENGTH) {
    if (indexed.normalized.length >= 4 && normalizedQuery.includes(indexed.normalized)) {
      return indexed.entry;
    }
  }
  return null;
}

function findKeywordMatch(queryTokens: Set<string>): { entry: KnowledgeEntry; score: number } | null {
  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const indexed of ALIAS_INDEX) {
    const { tokens: aliasTokens } = indexed;
    if (aliasTokens.length === 0) continue;
    let overlap = 0;
    for (const t of aliasTokens) if (queryTokens.has(t)) overlap++;
    const score = overlap / aliasTokens.length;
    // Single-token aliases (most common after stopword removal, e.g. "sukuk")
    // need only that one word present. Multi-token aliases need near-complete
    // coverage AND at least 2 overlapping words, so one generic shared word
    // can't falsely match every entry that happens to mention it.
    const passes = aliasTokens.length === 1 ? overlap === 1 : score >= 0.75 && overlap >= 2;
    if (passes && (!best || score > best.score)) {
      best = { entry: indexed.entry, score };
    }
  }
  return best;
}

/**
 * Search the knowledge base for a free-text query. Returns the single best
 * match, or null if nothing clears the confidence threshold.
 *
 * Match precedence: exact alias equality > alias contained in query >
 * acronym-expanded containment > keyword/token overlap > fuzzy-corrected
 * keyword overlap (typo fallback). All passes after exact-match run against
 * a precomputed index, not raw re-normalization, so this stays fast even at
 * tens of thousands of aliases.
 */
export function searchKnowledgeBase(query: string): KnowledgeMatch | null {
  const q = normalizeQuery(query);
  if (!q) return null;

  // 1. Exact alias match — O(1) Map lookup.
  const exact = EXACT_INDEX.get(q);
  if (exact) return { entry: exact, matchType: "exact", score: 1 };

  // 2. Alias contained within the (possibly longer/conversational) query.
  const contains = findContains(q);
  if (contains) return { entry: contains, matchType: "contains", score: 0.92 };

  // 3. Acronym-expanded containment — "what is fdi" -> "...foreign direct investment"
  const expanded = expandAcronyms(q);
  if (expanded !== q) {
    const acronymMatch = findContains(expanded);
    if (acronymMatch) return { entry: acronymMatch, matchType: "acronym", score: 0.85 };
  }

  // 4. Keyword/token overlap — catches paraphrased questions that share most
  // of an alias's meaningful words but not in the same order/phrasing.
  const qTokens = tokenize(q);
  if (qTokens.length === 0) return null;

  const keywordMatch = findKeywordMatch(new Set(qTokens));
  if (keywordMatch) {
    return { entry: keywordMatch.entry, matchType: "keyword", score: keywordMatch.score };
  }

  // 5. Fuzzy fallback — only reached on a miss. Corrects small spelling
  // mistakes on meaningful (non-stopword) tokens against the known
  // vocabulary, then retries the keyword pass once with corrections applied.
  const correctedTokens = qTokens.map(correctToken);
  if (correctedTokens.some((t, i) => t !== qTokens[i])) {
    const fuzzyMatch = findKeywordMatch(new Set(correctedTokens));
    if (fuzzyMatch) {
      return { entry: fuzzyMatch.entry, matchType: "fuzzy", score: fuzzyMatch.score * 0.9 };
    }
  }

  return null;
}
