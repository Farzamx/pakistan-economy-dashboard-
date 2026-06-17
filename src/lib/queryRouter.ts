// Query router for the Pakistan Economic Intelligence Assistant.
// Classifies every user message into one of 5 categories, determining
// whether to use DashboardSnapshot, Tavily search, or both.
// Pure function — no I/O, no side effects.

export type QueryCategory =
  | "dashboard"       // DashboardSnapshot only, no search
  | "concept"         // AI knowledge only, no search
  | "current_events"  // Tavily search (institution news + time signals)
  | "market_news"     // Tavily search (asset price movements)
  | "hybrid";         // DashboardSnapshot + Tavily search

export interface RouterResult {
  category: QueryCategory;
  needsDashboard: boolean;
  needsSearch: boolean;
  searchQuery: string | null;
  label: string; // human-readable label shown in the UI
}

// ── Signal lists ────────────────────────────────────────────────────────────

// Specific dashboard indicator names — these refer to live data, not concepts
const DASHBOARD_TERMS: string[] = [
  "health score", "economic health score",
  "recession probability", "recession risk", "recession model",
  "default probability", "default risk", "sovereign default probability",
  "pakistan inflation", "pakistan's inflation", "current inflation",
  "pakistan gdp", "pakistan's gdp", "gdp growth", "gdp rate",
  "cpi inflation", "core inflation", "wpi inflation",
  "policy rate", "sbp rate", "interest rate",
  "foreign reserves", "sbp reserves", "reserve cover",
  "usd/pkr", "dollar rupee", "exchange rate", "pkr rate", "rupee rate",
  "trade balance", "pakistan's trade", "trade deficit",
  "current account balance", "pakistan's current account", "current account deficit",
  "remittances", "worker remittances",
  "lsm", "large-scale manufacturing",
  "private credit", "credit growth",
  "fiscal balance", "fiscal deficit", "fiscal position",
  "brent oil", "brent crude", "wti crude",
  "gold price", "dxy", "us 10y", "fed funds rate", "treasury yield",
  "our dashboard", "the dashboard", "the score", "the model",
  "the probability", "dashboard data", "the indicators",
];

// "What is A/AN X?" — definitional questions about economic concepts (not live data)
const CONCEPT_PATTERNS: RegExp[] = [
  /^what is (a |an )/i,
  /^what are (the |some |a few |different )?types/i,
  /^explain (the concept|what|how|why)/i,
  /^explain [a-z]/i,
  /^what causes /i,
  /^what does .+ mean/i,
  /^define /i,
  /^how does .+ work/i,
  /^why does .+ (happen|occur|cause|lead)/i,
  /^what.s the difference between/i,
  /^can you explain /i,
  /^could you explain /i,
];

// Institution news + event signals
const INSTITUTION_SIGNALS: string[] = [
  "imf said", "imf announced", "imf report", "imf review", "imf forecast",
  "imf program", "imf bailout", "imf statement", "imf article iv",
  "imf press", "imf loan", "imf tranche",
  "world bank said", "world bank report", "world bank forecast", "world bank data",
  "federal reserve", "fomc meeting", "fomc decision", "fed meeting", "fed decision",
  "fed rate", "fed hike", "fed cut", "powell said", "fed statement",
  "ecb meeting", "ecb decision", "ecb said", "lagarde",
  "bis report", "oecd report", "oecd forecast", "oecd data",
  "unctad report", "unctad data",
  "sbp announcement", "sbp statement", "sbp governor", "sbp decision",
  "sbp meeting", "sbp monetary policy",
  "finance minister said", "finance ministry announced", "finance ministry",
  "mofep", "ministry of finance",
  "pbs data release", "pbs report",
  "psx announcement", "pakistan stock exchange",
];

// Time-sensitivity signals
const TIME_SIGNALS: string[] = [
  "today", "yesterday", "this week", "last week", "this month",
  "last month", "recently", "latest news", "recent news",
  "just announced", "breaking", "just released", "new data",
  "this quarter", "q1", "q2", "q3", "q4",
];

// Asset price movement signals — market news category
const MARKET_MOVEMENT_SIGNALS: string[] = [
  "oil falling", "oil rising", "oil drops", "oil jumps", "oil surges", "oil crashed",
  "why is oil", "oil price today", "crude today", "crude is",
  "dollar weakening", "dollar strengthening", "dollar falls", "dollar rallies",
  "why is the dollar", "dollar today", "dxy today", "dollar index",
  "gold falling", "gold rising", "gold today", "why is gold", "gold is at",
  "why are emerging markets", "em markets today", "emerging market selloff",
  "why are markets", "market selloff", "market rally", "stocks today",
  "commodity prices today", "commodities today",
  "yen weakening", "yen strengthening", "euro weakening",
];

// Hybrid comparison / integration signals
const HYBRID_SIGNALS: string[] = [
  "compare", "comparison",
  "versus", " vs ", "vs.",
  "relative to imf", "compared to imf", "vs imf", "against imf forecasts",
  "does our dashboard", "does the dashboard", "does pakistan's data",
  "how does today", "how would today", "impact on pakistan",
  "effect on pakistan", "affect pakistan",
  "consistent with", "support the view", "in line with",
  "given that the dashboard", "given our data",
  "what does the dashboard say about",
  "how does the current", "given current dashboard",
  "dashboard vs", "data vs",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalize(q: string): string {
  return q.toLowerCase().trim();
}

function hasAny(q: string, signals: string[]): boolean {
  return signals.some((s) => q.includes(s.toLowerCase()));
}

function matchesAny(q: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(q));
}

// ── Classifier ───────────────────────────────────────────────────────────────

export function classifyQuery(message: string): RouterResult {
  const q = normalize(message);

  const hasDashboardTerm = hasAny(q, DASHBOARD_TERMS);
  const isConceptPattern = matchesAny(q, CONCEPT_PATTERNS);
  const hasTimeSignal = hasAny(q, TIME_SIGNALS);
  const hasInstitution = hasAny(q, INSTITUTION_SIGNALS);
  const hasMarketMove = hasAny(q, MARKET_MOVEMENT_SIGNALS);
  const hasHybridSignal = hasAny(q, HYBRID_SIGNALS);
  const hasPakistanContext = q.includes("pakistan");

  // ── 1. Hybrid: explicit comparison or cross-source analysis ──────────────
  if (
    hasHybridSignal ||
    (hasDashboardTerm && hasInstitution) ||
    (hasDashboardTerm && hasMarketMove && hasPakistanContext) ||
    (hasDashboardTerm && hasTimeSignal && hasInstitution)
  ) {
    return {
      category: "hybrid",
      needsDashboard: true,
      needsSearch: true,
      searchQuery: buildSearchQuery(message, "hybrid"),
      label: "Hybrid Analysis",
    };
  }

  // ── 2. Market news: live price move question ─────────────────────────────
  if (hasMarketMove) {
    return {
      category: "market_news",
      needsDashboard: false,
      needsSearch: true,
      searchQuery: buildSearchQuery(message, "market_news"),
      label: "Market News",
    };
  }

  // ── 3. Current events: institution news or time-gated query ─────────────
  if (hasInstitution || (hasTimeSignal && !hasDashboardTerm)) {
    return {
      category: "current_events",
      needsDashboard: false,
      needsSearch: true,
      searchQuery: buildSearchQuery(message, "current_events"),
      label: "Current Events",
    };
  }

  // ── 4. Dashboard: specific live indicator question ───────────────────────
  //    "What is inflation?" (no indefinite article) → dashboard
  //    "What is a current account deficit?" → captured by concept patterns
  if (hasDashboardTerm) {
    return {
      category: "dashboard",
      needsDashboard: true,
      needsSearch: false,
      searchQuery: null,
      label: "Dashboard Data",
    };
  }

  // ── 5. Concept: definitional / explanatory question ──────────────────────
  if (isConceptPattern) {
    return {
      category: "concept",
      needsDashboard: false,
      needsSearch: false,
      searchQuery: null,
      label: "Economic Concept",
    };
  }

  // ── 6. Default: Pakistan context → dashboard; generic → concept ──────────
  if (hasPakistanContext) {
    return {
      category: "dashboard",
      needsDashboard: true,
      needsSearch: false,
      searchQuery: null,
      label: "Dashboard Data",
    };
  }

  return {
    category: "concept",
    needsDashboard: false,
    needsSearch: false,
    searchQuery: null,
    label: "General",
  };
}

// ── Search query builder ─────────────────────────────────────────────────────

function buildSearchQuery(message: string, category: QueryCategory): string {
  let q = message.trim();

  // Strip common question prefixes that add no search value
  q = q.replace(
    /^(tell me about|can you tell me|i want to know about|what about|how about|do you know)\s+/i,
    "",
  );
  q = q.replace(/\?+$/, "").trim();

  // Add Pakistan context for non-global queries
  if (
    category !== "market_news" &&
    !q.toLowerCase().includes("pakistan") &&
    !isGlobalQuery(q)
  ) {
    q = `Pakistan economy ${q}`;
  }

  // Add current year to boost recency in results
  const year = new Date().getFullYear();
  if (!q.includes(String(year)) && !q.includes(String(year - 1))) {
    q = `${q} ${year}`;
  }

  return q.slice(0, 150);
}

function isGlobalQuery(q: string): boolean {
  return [
    "imf", "world bank", "federal reserve", "fomc", "ecb",
    "oil price", "brent", "wti", "gold price", "dollar index",
    "us 10y", "fed funds", "treasury",
  ].some((t) => q.toLowerCase().includes(t));
}
