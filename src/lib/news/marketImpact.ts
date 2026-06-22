// Deterministic Market Impact Engine.
//
// The AI intelligence layer's free-text "reason" field can degrade to
// generic phrasing like "no direct impact on Pakistan" for well-understood
// macro events that actually have clear, well-known transmission channels
// into Pakistan's economy. For those known patterns, generate the impact
// bullets from fixed rules instead of asking a model to reinvent them every
// time — deterministic, free, instant, and never hallucinated. The AI
// "reason" field remains the fallback for headlines that don't match any
// rule here, not a competing source of truth for the ones that do.

export interface MarketImpact {
  label: string;
  bullets: string[];
}

interface ImpactRule {
  label: string;
  keywords: string[];
  bullets: string[];
  /**
   * If true, only fires when "pakistan" (or another Pakistan-specific term)
   * also appears in the title. Added after live verification caught a real
   * false positive: "Top 10 African countries with the lowest debt to the
   * IMF" matched the bare "imf" keyword and produced bullets about
   * "Pakistan's perceived default risk" on a story that has nothing to do
   * with Pakistan. "IMF" alone isn't enough to assume Pakistan is the
   * subject — China/Middle East rules below don't need this guard since
   * their bullets are true in general (China genuinely is a major Pakistan
   * trade partner regardless of which specific China story this is), but
   * the IMF bullets assert something about Pakistan specifically.
   */
  requiresPakistanContext?: boolean;
}

const PAKISTAN_CONTEXT_KEYWORDS = ["pakistan", "sbp", "rupee", "pkr", "islamabad", "karachi"];

function hasPakistanContext(text: string): boolean {
  return PAKISTAN_CONTEXT_KEYWORDS.some((kw) => text.includes(kw));
}

const IMPACT_RULES: ImpactRule[] = [
  {
    label: "Oil & Energy Prices",
    keywords: ["oil price", " oil ", "opec", "crude", "brent", "wti", "petrol price", "diesel price", "fuel cost", "fuel price"],
    bullets: [
      "Inflation risk — Pakistan imports nearly all of its crude oil",
      "Current account risk — a wider energy import bill",
      "FX pressure — more Dollars needed to pay for energy imports",
    ],
  },
  {
    label: "US Federal Reserve / Interest Rates",
    keywords: ["federal reserve", "fomc", "rate hike", "rate cut", "jerome powell", "fed funds", " fed "],
    bullets: [
      "Dollar strength — a hawkish Fed typically strengthens the Dollar globally",
      "Capital flows — higher US yields can pull portfolio capital away from emerging markets like Pakistan",
      "PKR pressure — a stronger Dollar and tighter global liquidity add to Rupee depreciation pressure",
    ],
  },
  {
    label: "IMF / Multilateral Lending",
    keywords: ["imf", "international monetary fund", "bailout", "extended fund facility", "staff-level agreement", "loan program"],
    requiresPakistanContext: true,
    bullets: [
      "Reserves — IMF disbursements directly affect SBP's foreign exchange reserves",
      "Confidence — IMF programme news strongly influences investor and rating-agency sentiment toward Pakistan",
      "Sovereign risk — programme delays or reviews affect Pakistan's perceived default risk",
    ],
  },
  {
    label: "China / Regional Trade",
    keywords: ["china", "cpec", "beijing"],
    bullets: [
      "Trade ties — China is one of Pakistan's largest trading and lending partners",
      "Investment flows — CPEC-related developments affect FDI and infrastructure financing",
    ],
  },
  {
    label: "Middle East / Geopolitical Risk",
    keywords: ["middle east", "iran", "israel", "gaza", "gulf", "saudi arabia", "uae"],
    bullets: [
      "Remittance exposure — the Gulf hosts millions of overseas Pakistani workers",
      "Oil supply risk — regional instability can spike global oil prices",
    ],
  },
  {
    label: "Currency / Dollar Markets",
    keywords: ["dollar index", "dxy", "exchange rate"],
    bullets: [
      "Direct read-through to USD/PKR and other PKR cross-rates",
      "Affects the local-currency cost of Pakistan's Dollar-denominated debt",
    ],
  },
];

/** Returns the first matching deterministic rule, or null if no known pattern applies — callers should fall back to the AI-generated reason in that case, not invent their own text. */
export function getMarketImpact(title: string): MarketImpact | null {
  const text = ` ${title.toLowerCase()} `;
  const pakistanContext = hasPakistanContext(text);
  for (const rule of IMPACT_RULES) {
    if (rule.requiresPakistanContext && !pakistanContext) continue;
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return { label: rule.label, bullets: rule.bullets };
    }
  }
  return null;
}
