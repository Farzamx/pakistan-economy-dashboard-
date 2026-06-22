// Pakistan Relevance Engine — deterministic, keyword-based. No AI call: this
// runs on every article on every fetch, so it has to be free and instant,
// and "relevance to Pakistan's economy" is a classification problem simple
// keyword rules handle well (verified against real headlines pulled during
// the News & Intelligence audit, not just designed in the abstract).
//
// Also doubles as the category classifier for the 7 homepage tabs — a
// category is just "which keyword group scored highest," so keeping both
// concerns in one pass avoids scanning every headline's text twice.

export type NewsCategory =
  | "Pakistan Economy"
  | "Global Macro"
  | "Markets"
  | "Central Banks"
  | "Energy"
  | "Geopolitics"
  | "IMF & Debt";

export const NEWS_CATEGORIES: NewsCategory[] = [
  "Pakistan Economy",
  "IMF & Debt",
  "Central Banks",
  "Energy",
  "Geopolitics",
  "Global Macro",
  "Markets",
];

interface KeywordGroup {
  category: NewsCategory;
  score: number;
  keywords: string[];
  /**
   * If true, this group's score only applies when "pakistan" (or another
   * Pakistan Economy keyword) ALSO appears in the title — otherwise the
   * match downgrades to Global Macro at score 5 instead of 10. Added after
   * live verification caught a real false positive: "Top 10 African
   * countries with the lowest debt to the IMF" matched the bare "imf"
   * keyword and scored 10/10 Pakistan-relevant, which it plainly isn't.
   * "IMF" is too generic a word to assume Pakistan context on its own.
   */
  requiresPakistanContext?: boolean;
}

const PAKISTAN_CONTEXT_KEYWORDS = [
  "pakistan", "sbp", "state bank of pakistan", "rupee", "pkr", "psx",
  "islamabad", "karachi", "lahore",
];

function hasPakistanContext(text: string): boolean {
  return PAKISTAN_CONTEXT_KEYWORDS.some((kw) => text.includes(kw));
}

// Checked in order; an article's relevance score is the MAX across every
// group it matches (so a headline matching both a score-10 Pakistan term and
// a score-8 Fed term scores 10), but its category is the group that
// produced that max score, with ties broken by list order (Pakistan-specific
// categories listed first, since a Pakistan+Fed headline is more usefully
// filed under Pakistan Economy than Central Banks).
const GROUPS: KeywordGroup[] = [
  {
    category: "Pakistan Economy",
    score: 10,
    keywords: [
      "pakistan", "sbp", "state bank of pakistan", "rupee", "pkr", "psx",
      "kse-100", "kse100", "karachi stock exchange", "islamabad", "karachi",
      "lahore", "budget", "remittance", "fbr", "current account deficit",
      "balance of payments", "circular debt", "shehbaz", "ishaq dar",
      "aurangzeb", "nfc award", "psdp",
    ],
  },
  {
    category: "IMF & Debt",
    score: 10,
    requiresPakistanContext: true,
    keywords: [
      "imf", "international monetary fund", "bailout", "extended fund facility",
      "staff-level agreement", "debt restructuring", "sovereign debt",
      "default risk", "paris club", "world bank loan", "adb loan",
    ],
  },
  {
    category: "Energy",
    score: 10,
    keywords: [
      "energy crisis", "electricity tariff", "gas tariff", "power sector",
      "lng import", "capacity payment",
    ],
  },
  {
    // Same false-positive risk as the IMF group above: "inflation" or
    // "exports" alone describes any country's economy, not specifically
    // Pakistan's — verified by testing "The Fed will bring down the hammer
    // on inflation..." (a US Fed story) against this rule before adding the
    // guard, which incorrectly filed it under Pakistan Economy at score 10.
    category: "Pakistan Economy",
    score: 10,
    requiresPakistanContext: true,
    keywords: ["inflation", "export", "import", "exports", "imports"],
  },
  {
    category: "Central Banks",
    score: 8,
    keywords: [
      "federal reserve", "fomc", "rate hike", "rate cut", "jerome powell",
      "fed funds", "ecb", "european central bank", "bank of england",
      "dollar index", "dxy",
    ],
  },
  {
    category: "Energy",
    score: 8,
    keywords: ["oil", "opec", "crude", "brent", "wti", "petrol price", "diesel price", "fuel cost"],
  },
  {
    category: "Geopolitics",
    score: 8,
    keywords: [
      "china", "cpec", "beijing", "middle east", "iran", "israel", "gaza",
      "gulf", "saudi arabia", "uae", "sanctions", "trade war", "tariffs",
    ],
  },
  {
    category: "Global Macro",
    score: 5,
    keywords: [
      "gdp", "recession", "global economy", "world bank", "unemployment",
      "stock market", "wall street", "trade deficit", "supply chain",
      "emerging markets", "g7", "g20",
    ],
  },
];

// A small bonus over 0 for headlines that are at least generically
// finance/economy-shaped even if they matched no specific group above —
// keeps purely unrelated corporate news (a water company's CEO appointment,
// a restaurant chain closing stores) pinned at 0-1, exactly the "rarely
// appears" tier the relevance engine is meant to produce.
const GENERIC_FINANCE_WORDS = ["market", "economy", "bank", "price", "trade", "growth", "investor"];

export interface RelevanceResult {
  relevanceScore: number; // 0-10
  category: NewsCategory;
}

// Source Reliability (Phase 8 quality score) — a simple static tier, not a
// live reputation system. "Google News" is an aggregator surfacing many
// underlying outlets of varying quality, so it sits in the middle rather
// than at either extreme.
const SOURCE_RELIABILITY: Record<string, number> = {
  "BBC Business": 9,
  "Dawn Business": 8,
  "Express Tribune": 7,
  "Google News": 7,
};
const DEFAULT_SOURCE_RELIABILITY = 6;

export function getSourceReliability(source: string): number {
  return SOURCE_RELIABILITY[source] ?? DEFAULT_SOURCE_RELIABILITY;
}

export function scoreRelevance(title: string): RelevanceResult {
  const text = title.toLowerCase();
  const pakistanContext = hasPakistanContext(text);

  let bestScore = 0;
  let bestCategory: NewsCategory | null = null;

  for (const group of GROUPS) {
    const effectiveScore = group.requiresPakistanContext && !pakistanContext ? 5 : group.score;
    const effectiveCategory = group.requiresPakistanContext && !pakistanContext ? "Global Macro" : group.category;
    if (bestScore >= effectiveScore) continue; // already have an equal-or-better match
    if (group.keywords.some((kw) => text.includes(kw))) {
      bestScore = effectiveScore;
      bestCategory = effectiveCategory;
    }
  }

  if (bestCategory) return { relevanceScore: bestScore, category: bestCategory };

  const hasGenericFinanceWord = GENERIC_FINANCE_WORDS.some((w) => text.includes(w));
  return { relevanceScore: hasGenericFinanceWord ? 1 : 0, category: "Markets" };
}
