# Pakistan Economic Intelligence Center — Project Context

Complete handoff document for continuing development in a new Claude conversation.
Generated: 2026-06-17.

---

## 1. Project Overview

**Pakistan Economic Intelligence Center (Pakistan EIC)** is a real-time macroeconomic dashboard tracking Pakistan's key economic indicators, global market benchmarks, and AI-enriched news intelligence.

**Purpose**: Give investors, economists, journalists, and policy-interested readers a single-page view of Pakistan's economic health — live data, trend charts, AI analysis, and curated news — without needing to cross-reference SBP, IMF, FBR, and Bloomberg separately.

**Target Users**: Finance professionals, academic economists, journalists covering Pakistan's economy, Pakistani diaspora tracking the rupee and reserves, and general public interested in economic policy.

**Main Objectives**:
- Surface ~35 live economic indicators from authoritative free sources (SBP, World Bank, FRED, Yahoo Finance)
- Provide an AI-generated Economic Health Score (0–100) with sentiment and risk assessment, powered by OpenRouter
- Show AI-enriched news (sentiment, risk, impact score, reason) for 5 most recent economy-relevant headlines
- All data cached via Next.js ISR so the page is always fast and the AI APIs are called at most once per revalidation window (not per page request)
- Never expose API keys to the browser; all fetches are server-side

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2.9** (Turbopack), App Router |
| Language | TypeScript (strict) |
| Styling | **Tailwind CSS v4** + custom CSS variables in `globals.css` |
| Animations | **Framer Motion v12** (`useReducedMotion`-aware) |
| Fonts | Geist Sans + Geist Mono (via `next/font/google`) |
| AI Provider | **OpenRouter** — centralized failover client (`src/lib/openRouterClient.ts`) |
| Runtime | Node.js (server components + server-side fetch) |
| Build | `next build` → static export with ISR; `next dev --turbo` for development |

**Key libraries**:
- `framer-motion` — all page animations, stagger reveals, hover effects
- No database, no ORM, no auth — pure data-fetching static site

**APIs used** (details in Section 4):
- SBP EasyData (requires key)
- World Bank (keyless)
- FRED / St. Louis Fed (requires key)
- Twelve Data (requires key)
- Yahoo Finance v8 (keyless)
- ExchangeRate-API v4 (keyless)
- GNews (requires key, optional)
- BBC / Dawn / Tribune RSS (keyless)
- OpenRouter (requires key)

---

## 3. Architecture

### Folder Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout: GalaxyBackground, fonts, metadata
│   ├── page.tsx                # THE page — server component, fetches all data, composes UI
│   ├── globals.css             # Tailwind imports, CSS variables (glass-card, glow-*, neon-*)
│   └── api/
│
├── components/
│   ├── AnimatedValue.tsx       # Count-up animation for KPI numbers
│   ├── CreatorBadge.tsx        # Floating "built by" badge (bottom-right corner)
│   ├── DashboardSection.tsx    # Reusable section: heading, description, optional stats grid
│   ├── DataSourcesModal.tsx    # "Data Sources" audit table, lists all KPIs with source/date/freshness
│   ├── GalaxyBackground.tsx    # Full-page animated star-field canvas background
│   ├── HealthScoreCard.tsx     # AI Economic Health Score panel (gauge + badges + summary)
│   ├── HealthScoreGauge.tsx    # SVG arc gauge used inside HealthScoreCard
│   ├── Hero.tsx                # Page header ("Pakistan Economic Intelligence Center")
│   ├── InfoTooltip.tsx         # Hover tooltip for economic terms (reads from terminology.ts)
│   ├── KpiCard.tsx             # Individual KPI tile: value, unit, change, freshness badge
│   ├── KpiGrid.tsx             # Responsive grid wrapper for KpiCard children
│   ├── MarketTicker.tsx        # Horizontal scrolling live ticker bar (below Hero)
│   ├── MotionProvider.tsx      # LazyMotion provider for Framer Motion
│   ├── NewsIntelligenceSection.tsx  # 5-card AI-enriched news grid
│   ├── Sidebar.tsx             # Left nav sidebar with section links (sticky)
│   ├── ViewportFadeIn.tsx      # Wrapper that fades children in on scroll
│   └── charts/
│       └── TrendLineChart.tsx  # SVG sparkline with gradient fill
│
├── data/
│   ├── globalMarketsFallbackData.ts  # Static fallback Kpi objects for FRED / Twelve Data
│   ├── healthScoreData.ts            # Legacy (now unused — health score is AI-generated)
│   ├── kpiData.ts                    # Kpi type definition + GDP fallback constant
│   ├── sbpFallbackData.ts            # Static fallback SbpIndicatorResult objects for all 20 SBP series
│   ├── sectionData.ts                # Dashboard section metadata (title, description, source)
│   └── terminology.ts               # Economic term definitions for InfoTooltip
│
├── hooks/
│   └── useCountUp.ts           # Animates numeric strings on mount (used by AnimatedValue)
│
└── lib/
    ├── dataFreshness.ts         # getFreshnessStatus(), FRESHNESS_DOT/LABEL/BADGE constants
    ├── economicHealth.ts        # getHealthStatus(score) → { label, badgeClass, ringColor }
    └── data/
        ├── aiEconomicAnalysis.ts  # OpenRouter: 16-indicator + news → health score + sentiment
        ├── fred.ts               # FRED API: WTI, Brent, Nat Gas (Yahoo primary, FRED fallback), US10Y, Fed Funds
        ├── fxRates.ts            # ExchangeRate-API: USD/PKR, EUR/PKR, GBP/PKR, SAR/PKR (live)
        ├── intelligence.ts       # OpenRouter: batch news tagging → sentiment/risk/impact/reason
        ├── metals.ts             # Twelve Data: Gold (XAU/USD), Silver (XAG/USD), DXY (Yahoo fallback)
        ├── news.ts               # GNews + BBC/Dawn/Tribune RSS aggregator → NewsItem[]
        ├── sbp.ts                # SBP EasyData: 20 indicators → SbpIndicatorResult (kpi + trend + meta)
        ├── worldBank.ts          # World Bank: GDP growth rate (annual)
        └── yfinance.ts           # Yahoo Finance v8: Gold, Silver, WTI, Brent, NatGas, DXY, US10Y, PAK ETF
```

### Data Flow (from APIs to UI)

```
page.tsx (Server Component)
│
├── Promise.all([
│   getGdpKpi()           → World Bank API     → Kpi
│   getAllSbpIndicators()  → SBP EasyData (20x) → Record<key, SbpIndicatorResult>
│   getGoldKpi()          → Twelve Data → Yahoo Finance fallback → Kpi
│   getSilverKpi()        → (same pattern)
│   getBrentKpi()         → Yahoo Finance primary → FRED fallback → Kpi
│   getWtiKpi()           → (same pattern)
│   getNaturalGasKpi()    → (same pattern)
│   getDxyKpi()           → Twelve Data → Yahoo Finance fallback → Kpi
│   getUs10yKpi()         → FRED primary → Yahoo Finance fallback → Kpi
│   getFedFundsKpi()      → FRED → static fallback → Kpi
│   getNews()             → GNews + BBC/Dawn/Tribune RSS → NewsItem[]
│   getFxRates()          → ExchangeRate-API → static fallback → FxRateKpis
│   getPakEtfKpi()        → Yahoo Finance → null (if delisted/stale)
│ ])
│
├── Promise.all([          ← PARALLEL (all three call OpenRouter via shared failover client)
│   getTaggedNews(newsItems)                      → OpenRouter → TaggedNewsResult { items, modelUsed, modelDisplayName }
│   getAiEconomicAnalysis(snapshot, newsItems)    → OpenRouter → AiEconomicAnalysis (+ modelUsed, modelDisplayName)
│   getAiRiskIntelligence(recessionResult, defaultResult) → OpenRouter → AiRiskIntelligence (+ modelUsed, modelDisplayName)
│ ])
│
└── JSX assembly
    ├── <Sidebar>          ← nav links, sticky
    ├── <Hero>
    ├── <MarketTicker items={tickerItems}>   ← 14 live values in scrolling bar
    ├── <KpiGrid items={headlineKpis}>       ← GDP, CPI, Reserves, USD/PKR, Remittances
    ├── <HealthScoreCard {...aiAnalysis}>    ← AI score + sentiment + summary + model badge
    ├── <RiskIntelligenceSection ...>        ← Recession % + Sovereign Default % + AI explanation + model badge
    ├── <KpiGrid items={secondaryKpis}>      ← 8 monetary/external indicators
    ├── <KpiGrid items={globalMarketsKpis}> ← Gold, Silver, Brent, WTI, NatGas, DXY, US10Y, Fed Funds
    ├── <KpiGrid items={[pakEtfKpi]}>        ← PAK ETF (conditional on freshness)
    ├── KSE-100 unavailability notice + TradingView link
    ├── T-Bill 3M trend chart
    ├── <KpiGrid items={realEconomyKpis}>   ← Exports, Imports, FDI, REER, LSM, Private Credit, Fiscal Balance
    ├── <DashboardSection> blocks (GDP, Inflation, Core, Monetary Policy, Reserves, FX, Remittances, External)
    ├── <KpiGrid items={liveFxKpis}>         ← USD/EUR/GBP/SAR vs PKR (ExchangeRate-API)
    ├── <NewsIntelligenceSection items={taggedNewsResult.items.slice(0,5)} modelDisplayName={...}>
    └── <DataSourcesModal kpis={allKpis}>   ← floating modal with full audit table
```

### ISR Caching Strategy

All external fetches use `next: { revalidate: N }` — Next.js caches responses and regenerates the static page in the background. This means:
- Page always serves from cache (fast)
- OpenRouter is called at most once per ISR window (not per user request)
- Each data provider has its own revalidation window based on how often it publishes

| Provider | Revalidation |
|---|---|
| SBP EasyData (monthly series) | 24h |
| SBP EasyData (as-needed: policy rate, T-bills) | 6h |
| World Bank | 24h |
| FRED | 24h |
| Twelve Data | 6h |
| Yahoo Finance | 1h |
| ExchangeRate-API | 1h |
| GNews + RSS | 2h |
| OpenRouter (news tagging) | 2h |
| OpenRouter (health score) | 1h |

**IMPORTANT for POST requests**: `next: { revalidate: N }` on a POST fetch does not cache the response, but it signals to Next.js that the *page* should use ISR with that window. Without it, any POST in a server component makes the page `ƒ Dynamic` (runs on every request). This pattern is used on the two OpenRouter POST calls.

---

## 4. Data Sources

### SBP EasyData (`src/lib/data/sbp.ts`)
- **URL**: `https://easydata.sbp.org.pk/api/v1/series/{series_key}/data`
- **Auth**: `SBP_EASYDATA_API_KEY` env var (query param `api_key=...`)
- **History start**: 2016-01-01 (gives ~10 years for trend charts)
- **Display window**: Last 24 observations per trend chart
- **Fallback**: `src/data/sbpFallbackData.ts` — hardcoded snapshots for every series

**20 active series**:

| Indicator | Series Key | Unit | Frequency |
|---|---|---|---|
| Foreign Reserves (SBP) | `TS_GP_EXT_PAKRES_M.Z00020` | Million USD | Monthly |
| Net Bank Reserves | `TS_GP_EXT_PAKRES_M.Z00050` | Million USD | Monthly |
| USD/PKR (monthly avg) | `TS_GP_ER_FAERPKR_M.E00220` | PKR per USD | Monthly |
| Policy Rate | `TS_GP_IR_SIRPR_AH.SBPOL0030` | % | As-Needed |
| CPI Inflation (YoY) | `TS_GP_PT_CPI_M.P00011516` | % | Monthly |
| Core Inflation (Urban NFNE) | `TS_GP_PT_CPI_M.P00121516` | % | Monthly |
| WPI Inflation | `TS_GP_PT_CPI_M.P00081516` | % | Monthly |
| 3M T-Bill Yield | `TS_GP_BAM_SIRTBIL_AH.TB0040` | % | As-Needed |
| 3Y PIB Yield | `TS_GP_BAM_SIRPIBS_AH.PIB0080` | % | As-Needed |
| Remittances | `TS_GP_BOP_WR_M.WR0010` | Million USD | Monthly |
| Current Account | `TS_GP_BOP_BPM6SUM_M.P00010` | Million USD | Monthly |
| Trade Balance | `TS_GP_BOP_BPM6SUM_M.P00050` | Million USD | Monthly |
| Money Supply M2 | `TS_GP_BAM_M3_M.MA3001700` | Million PKR | Monthly |
| Exports (goods FOB) | `TS_GP_BOP_BPM6SUM_M.P00030` | Million USD | Monthly |
| Imports (goods FOB) | `TS_GP_BOP_BPM6SUM_M.P00040` | Million USD | Monthly |
| FDI Inflows | `TS_GP_FI_SUMFIPK_M.FI00030` | Million USD | Monthly |
| REER (2010=100) | `TS_GP_ER_REERNEER_M.R00010` | Index | Monthly |
| LSM Index (2015-16=100) | `TS_GP_RL_LSM1516_M.LSM000160000` | Index | Monthly |
| Private Credit Growth | `TS_GP_BAM_M2_W.M000480` | % YoY | Weekly |
| Fiscal Balance | `TS_GP_PF_SPF_Y.SPF370000` | Million PKR | Annual |

### World Bank (`src/lib/data/worldBank.ts`)
- **URL**: `https://api.worldbank.org/v2/country/PAK/indicator/NY.GDP.MKTP.KD.ZG`
- **Auth**: None (free, keyless)
- **Indicator**: GDP growth rate (annual %, constant prices)
- **Fallback**: `fallbackGdpKpi` in `src/data/kpiData.ts`
- Also fetches population (`SP.POP.TOTL`) but not yet displayed

### FRED — St. Louis Fed (`src/lib/data/fred.ts`)
- **URL**: `https://api.stlouisfed.org/fred/series/observations`
- **Auth**: `FRED_API_KEY` env var
- **Series**: WTI (`DCOILWTICO`), Brent (`DCOILBRENTEU`), Natural Gas (`DHHNGSP`), US 10Y (`DGS10`), Fed Funds (`DFF`)
- **Fallback chain**: Yahoo Finance primary → FRED secondary → static fallback (for Oil, NatGas); FRED primary → Yahoo Finance fallback (for US10Y); FRED only → static fallback (for Fed Funds)

### Twelve Data (`src/lib/data/metals.ts`)
- **URL**: `https://api.twelvedata.com/time_series`
- **Auth**: `TWELVEDATA_API_KEY` env var
- **Symbols**: Gold (`XAU/USD`), Silver (`XAG/USD`), DXY (`DXY`)
- **Fallback**: Yahoo Finance (`getYfGoldKpi`, etc.) → static fallback

### Yahoo Finance (`src/lib/data/yfinance.ts`)
- **URL**: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- **Auth**: None (keyless, uses User-Agent spoofing)
- **Symbols**: `GC=F` (Gold), `SI=F` (Silver), `CL=F` (WTI), `BZ=F` (Brent), `NG=F` (Nat Gas), `DX-Y.NYB` (DXY), `^TNX` (US10Y), `PAK` (Pakistan ETF)
- **PAK ETF**: Returns `null` if data is >30 days old (indicates delisting)
- **Role**: Primary for Oil/NatGas/Metals; secondary fallback for everything else

### Yahoo Finance — Live FX (`src/lib/data/fxRates.ts`)
- **URL**: `https://query1.finance.yahoo.com/v8/finance/chart/{USDPKR=X|EURPKR=X|GBPPKR=X|SARPKR=X}`
- **Auth**: None (keyless)
- **Migrated 2026-06-22** from ExchangeRate-API — that source updated only once/day despite "Live FX" branding (verified by polling); Yahoo's PKR cross-pair quotes were independently confirmed advancing every ~10-30 min during active trading hours
- **Rates**: USD/PKR, EUR/PKR, GBP/PKR, SAR/PKR — each a direct Yahoo quote, not a derived USD-base cross-rate
- **Caching**: L1 in-memory (3min) → L2 `unstable_cache` tagged `"fx-rates"` (15min) → daily Vercel Cron freshness floor (`/api/revalidate-fx`)
- **Fallback**: `FALLBACK_RATES` in `fxRates.ts` — correctly labeled `"Yahoo Finance (fallback)"` in `source`
- **Note**: distinct from SBP's monthly-average USD/PKR series shown in the historical trend chart — intentionally a different, slower-moving vintage of the same underlying rate, not a bug (see Section 8's audit notes on this if displayed side-by-side).

### News Sources (`src/lib/data/news.ts`)
GNews was removed (2026-06) — its free tier prohibited commercial use, carried a 12h data delay, and `GNEWS_API_KEY` was never even configured in this deployment (silently zero articles, nothing in logs to reveal it). Current sources, all free and keyless:
- **Google News RSS** — 6 topic-targeted queries (Pakistan/SBP/PSX, IMF, Fed, Oil/OPEC, China/CPEC, Middle East), `news.google.com/rss/search`
- **BBC Business**, **Dawn Business**, **Express Tribune Business** — direct outlet RSS feeds
- **PBS Official Releases** (added 2026-06-29) — direct polling of Pakistan Bureau of Statistics' own WordPress REST API (`https://www.pbs.gov.pk/wp-json/wp/v2/posts`), the same endpoint `spi.ts` already uses for SPI specifically, here unfiltered to surface every official release (Foreign Trade Statistics, LSM, Inflation Report, etc.). Given a flat relevance score of 10 and "Pakistan Economy" category directly — bypasses the keyword-based `scoreRelevance()` heuristic, which gates most categories on an explicit "Pakistan" keyword that terse statistical-bulletin titles never contain despite being maximally relevant. Highest source-reliability score on the dashboard (10, `relevanceEngine.ts`) since it's a primary source, not journalism about one.
- **Evaluated and rejected**: SBP's own RSS feeds (Cloudflare bot-protected, 403 regardless of caller) and the Ministry of Finance's press-releases page (legacy static HTML, no API/RSS, no stable structure to scrape reliably) — see Section 8.
- **HTML entity decoding**: `decodeEntities()` strips `&amp;`, `&lt;`, etc. from URLs/titles before storage (critical — avoids React key mismatches and broken hrefs)
- **AI tagging batch size**: `NEWS_DISPLAY_LIMIT` (24, exported from `intelligence.ts`) — matches the homepage's own display cap exactly; was a hardcoded 10 until 2026-06-29 (see Section 5).

---

## 5. AI Integrations

> Rewritten 2026-06-29 (Production Reliability & Institutional Upgrade) — the previous version of this section described a 4-model OpenRouter-only chain with no health tracking and an AI-generated Health Score. Both have changed; see below.

### Centralized Failover Client (`src/lib/openRouterClient.ts`)

Every AI feature on this dashboard — Economic Health Score, Risk Intelligence, News Intelligence, and the chat Assistant — routes through this one function. Provider logic exists in exactly one place; no caller talks to OpenRouter or Groq directly.

**Provider chain** (tried in order, dynamically reordered — see below):
| Priority | Provider | Model | Tier |
|---|---|---|---|
| 1 | OpenRouter | `openai/gpt-oss-20b:free` | Free — fastest confirmed (~2.7s) |
| 2 | OpenRouter | `openai/gpt-oss-120b:free` | Free — large reasoning, ~3.9s |
| 3 | OpenRouter | `nousresearch/hermes-3-llama-3.1-405b:free` | Free — 405B, slowest, last OpenRouter resort |
| 4 | Groq | `openai/gpt-oss-120b` | **Paid** — independent infrastructure/key/billing, the resilient backstop |

`nex-agi/nex-n2-pro:free` (the former priority-1 model) was removed in 2026-06 for frequent 429s. Groq was added the same month after a real incident where an account-wide OpenRouter rate limit failed all 3 free models simultaneously — Groq stays up independently since it's a separate provider, not just a different model on the same backend.

**Provider health tracking (added 2026-06-29)** — a process-local in-memory map tracks, per model: consecutive failures, last success/failure timestamps, last failure reason, a rolling window of recent latencies, and a cooldown timestamp.
- An HTTP 429 puts that model into cooldown **immediately** (an authoritative "stop hitting me" signal), starting at 30s and doubling on repeated 429s up to a 5-minute cap.
- Other failure types (timeout, 5xx, parse failure) trigger a cooldown after 2 consecutive failures (15s).
- Models currently in cooldown are skipped entirely on the next call — not retried — and the remaining models are tried in ascending order of recent failure count, so a chain that's "learned" one model is unhealthy converges on a working one faster than always trying in the fixed static order.
- **Limitation**: this is process-local. On Vercel's multi-instance serverless model it reflects only the instance handling a given request, not a global view — still meaningfully reduces repeat-hammering within one warm instance, which is the exact pattern that motivated it.
- Inspect current health at `/admin/system-health` (gated — see Section 3) or via `getProviderHealthSnapshot()`.

**Task-specific routing**: `OpenRouterCallConfig.preferProvider` lets a caller try a specific provider's step(s) first (the rest of the chain still runs as fallback). No current caller sets this — health tracking already deprioritizes unhealthy providers dynamically, which the project judged more robust than a fixed task→provider mandate. The capability exists for a future workload that should default to paid/less-rate-limited Groq.

**Retry triggers** — a model is skipped and the next is tried on any of: HTTP error (429/500/502/503/504 get one bounded retry with backoff first; other statuses fail immediately), empty response body, empty message content, `parseContent()` throwing, or a timeout/network exception.

**Multi-message support**: `callOpenRouter()`'s first argument accepts either a single prompt string (wrapped as one user message) or a full `ChatMessage[]` array (system + history + user) — added so the chat Assistant (previously its own separate retry loop) could share this client too.

**Console logging**: `console.warn` per-attempt failure, `console.log` on success (provider/model/latency), `console.error` if every step fails (then the caller's hardcoded `FALLBACK` activates, `modelDisplayName: "Offline"`).

### CRITICAL: Response Parsing Pattern
Some models prepend whitespace/reasoning tokens before their JSON payload, breaking Next.js's patched `Response.json()`. Always use:
```typescript
const rawText = await res.text();
const apiData = JSON.parse(rawText); // outer chat-completions wrapper
const content = apiData.choices[0].message.content; // inner AI response string
// parseContent(content) then handles the domain-specific JSON
```
Never revert to `res.json()` for these calls.

### Deterministic Economic Health Score (`src/lib/economicHealth.ts`)
**The AI no longer generates this number.** It's a 9-factor weighted composite — the same deterministic pattern as Recession/Default below — covering growth, inflation, monetary, external, and fiscal dimensions. See Section 3's "Risk & Health Scoring Methodology" for the full factor/weight table and the reasoning behind each inclusion/exclusion. `calculateEconomicHealth(inputs): HealthModelResult` returns `{ score, status: {label, ringColor, badgeClass}, factors, topStrengthFactors, topWeaknessFactors }`.

### AI Economic Health Narration (`src/lib/data/aiEconomicAnalysis.ts`)
- **Input**: the already-computed `HealthModelResult` (factor labels/values only — never the raw indicator snapshot, and the prompt forbids quoting the exact score) + 10 news headlines
- **Output**: `AiEconomicAnalysis { sentiment, summary, topDrivers, modelUsed, modelDisplayName }` — `economicHealthScore`/`riskLevel` are **not** part of this contract anymore. `riskLevel` is derived deterministically from the health label (`healthLabelToRiskLevel()`) so it can't silently contradict it.
- **Fallback**: hardcoded neutral narration, `modelDisplayName: "Offline"`, if every provider fails

### AI Risk Intelligence (`src/lib/data/aiRiskIntelligence.ts`)
- **Input**: pre-calculated `RiskModelResult` for recession and sovereign default (`src/lib/riskModels.ts`) — factor labels/values only, never probability numbers
- **Output**: `AiRiskIntelligence { recession: AiRiskExplanation, default: AiRiskExplanation, modelUsed, modelDisplayName }`
- **AI role**: narration only — explicitly instructed not to quote the probability or model score
- **Display**: `<RiskIntelligenceSection>` — two `RiskCard`s side by side

### AI News Intelligence (`src/lib/data/intelligence.ts`)
- **Input**: up to `NEWS_DISPLAY_LIMIT` (24) `NewsItem` objects — **was 10** until 2026-06-29; the page displays up to 24, so roughly 14 of 24 visible cards previously got the generic `NEUTRAL_TAG` fallback on every successful render, indistinguishable from a real outage. The cap now matches the page's own display limit via one shared exported constant so the two can't drift apart again.
- **Output**: `TaggedNewsResult { items: TaggedNewsItem[], modelUsed, modelDisplayName }`
- **Strategy**: single batched call for all 24 articles (one prompt, one JSON array response)
- **Cache**: 30 min in-memory (process-local) + matching ISR window
- **Fallback**: all articles get `NEUTRAL_TAG` if every provider fails

### Chat Assistant (`src/app/api/assistant/route.ts`)
Previously reimplemented its own OpenRouter-only retry loop, bypassing the shared client entirely — meaning it had no Groq fallback, no health-aware ordering, and no structured `[AI/...]` logging that every other AI feature got. As of 2026-06-29 it calls `callOpenRouter()` with a full `ChatMessage[]` array (system prompt + last 6 turns + user message) like everything else, gated on either `OPENROUTER_API_KEY` or `GROQ_API_KEY` being set (previously gated on OpenRouter's key specifically, which would have refused to even try Groq-only configurations).

### Model Badge UI
Each AI-powered section shows the active model/provider in a badge: `<HealthScoreCard>`, `<RiskCard>` (×2), `<NewsIntelligenceSection>`. Shows "Offline" when every provider has failed and a hardcoded fallback is active.

---

## 5a. Weekly Intelligence Engine (added 2026-06-29)

Health Score and Recession/Default Probability used to recompute on every homepage render (the deterministic math) with AI narration cached for 6h. Both now update **once a week, every Monday**, via a cron-and-store architecture instead:

```
Vercel Cron (Mondays, 06:00 UTC, /api/cron/weekly-intelligence)
  → computeWeeklyIntelligence() [src/lib/weeklyIntelligenceCompute.ts]
      → fetch live indicators (SBP, World Bank, quarterly GDP, news)
      → calculateEconomicHealth() / calculateRecessionRisk() / calculateDefaultRisk()  [deterministic — see Section 5d]
      → getAiEconomicAnalysis() / getAiRiskIntelligence()  [AI narration only]
  → storeWeeklyIntelligenceSnapshot()  [src/lib/data/weeklyIntelligence.ts]
      → store_weekly_intelligence_snapshot RPC  [0017 migration]
      → INSERT into weekly_intelligence_snapshots (one row per run, history kept)

Homepage render
  → getLatestWeeklyIntelligenceSnapshot()  [get_latest_weekly_intelligence_snapshot RPC]
  → reads the most recent row — computes nothing itself
```

- Reuses the existing notification-worker cron pattern exactly: same `CRON_SECRET` auth on the route, same `internal_secrets`/`check_internal_secret('notification_worker', ...)` gate on the write RPC — this is just another trusted server-side job under the same threat model, not a new secret to provision.
- If the cron has never run (e.g. immediately after this shipped), `getLatestWeeklyIntelligenceSnapshot()` returns `null` and the homepage shows an explicit "Weekly intelligence snapshot not yet available" message — never a fabricated or stale-looking number.
- `RiskIntelligenceSection`'s UI copy was updated from "recalculated... on every page load" to "Last computed: [date] · Next update: [date+7d] · Updated weekly, every Monday."
- The Data Confidence panel (fallback/stale indicator counts) is **not** part of this snapshot — it still recomputes live on every render, since it reflects right-now SBP data quality, a genuinely different signal from the weekly score itself.

## 5b. Data Quality Layer (added 2026-06-29)

One shared module — `src/lib/dataQuality.ts` + `<DataQualityBadge>` — is now the only place that decides which of five states a KPI is in. Previously, `KpiCard.tsx` rendered its own inline freshness badge, and a real bug meant a KPI silently serving a hardcoded fallback could still show a plain "SBP EasyData" source label with no fallback indication anywhere (see Section 8 — fixed; root cause was `sbp.ts`'s catch block unconditionally overwriting `kpi.source` back to a live-looking string).

**States** (precedence order, most concerning first):
| State | Meaning |
|---|---|
| `Unavailable` | No data could be produced at all (e.g. SPI fetch/parse failed — it has no fallback by design) |
| `Fallback` | Serving the hardcoded last-resort snapshot — always shown regardless of how old that snapshot is |
| `Cached` | Live refresh just failed; serving the last-known-good cached value (genuinely degraded, distinct from a normal cache hit) |
| `Delayed` | Live data, but past its expected-freshness window (age-based, `dataFreshness.ts`, or a known Economic Calendar release date has passed) |
| `Verified` | Live data, confirmed current |

**`SourceStatus`** (`"live" | "cache-fresh" | "cache-stale" | "fallback" | "unavailable"`) is the input signal every fetcher now stamps onto its `Kpi.sourceStatus` field. `cache-fresh` (a normal, healthy in-memory cache hit within TTL) and `cache-stale` (the live call just failed; serving an aged last-known-good value regardless) used to be conflated as one "cache" status — they're now distinguished because only the latter is actually a degraded state worth disclosing.

### Fallback architecture
- **SBP EasyData (20 indicators)**: L1 in-memory (10min) → live fetch → L1 stale-on-error → static snapshot (`sbpFallbackData.ts`). Fix applied 2026-06-29: `withSourceStatus()` now stamps `kpi.source`/`kpi.sourceStatus`/`kpi.snapshotDate` correctly on every branch instead of the fallback branch overwriting the label.
- **SPI**: no fallback by design — returns `null` on failure, callers render an honest "unavailable" state. L1 TTL was shortened from 12h (mirroring L2) to 10 minutes (2026-06-29) to bound how long a quiet-traffic period can serve a stale cached value after a real PBS release — see the push-based invalidation note below.
- **Global Markets (Gold/Silver/DXY/Brent/WTI/NatGas/US10Y/FedFunds/PAK-ETF)**: now **auto-regenerating** (`src/lib/marketFallbackSnapshot.ts`, 0018 migration) — every successful live fetch persists its result to `market_fallback_snapshots` (Supabase). If both primary and secondary sources fail, the most recent *persisted* snapshot is used first (always more current than the static file), falling back to the hardcoded file in `globalMarketsFallbackData.ts` only if nothing has ever been persisted. Previously these static snapshots were captured once and never updated — a symbol whose live sources both failed was mathematically guaranteed to read "Stale" almost immediately, forever.

### Push-based cache invalidation
SBP and SPI fetches are now tagged (`next.tags`) so a successful calendar-sync cron write can force an immediate cache bust via `revalidateTag()` — `invalidateSbpIndicatorCache(key)` / `invalidateSpiCache()`, called right after `sync_event_actual` confirms a new value. This closes the original SPI staleness incident's root cause: the cron (push, proactive, runs daily regardless of traffic) and the Overview KPI (pull, lazy, only refreshes on the next request after its own TTL expires) could previously diverge by a full cache window; now the cron actively invalidates the Overview's cache the moment it writes new data, and L1's now-short TTL bounds the remaining worst case to minutes.

### Calendar-aware freshness
`dataFreshness.ts`'s `expectedReleaseDate`/`releaseAlreadyReflected` override (originally built only for Policy Rate/T-Bill 3M/PIB) now also covers SPI, CPI, Core Inflation, Current Account, Trade Balance, Remittances, FX Reserves, and LSM — every series with a known Economic Calendar due date. A pre-existing latent bug was fixed in the same change: the Rolling Calendar refactor split Treasury Bill auctions into 3M/6M/12M series under titles like "Treasury Bill Auction (3M)", but the title-prefix match used to look for the bare "Treasury Bill Auction" — matching all three tenors indiscriminately and risking pairing the wrong tenor's actual value against the 3M yield KPI specifically. Now matches "Treasury Bill Auction (3M)" exactly.

## 5c. Cron Schedules

| Path | Schedule | Purpose |
|---|---|---|
| `/api/revalidate-fx` | Daily, 03:00 UTC | Freshness floor for the FX rate cache (the 15min L2 window does most of the work) |
| `/api/cron/sync-economic-calendar` | Daily, 18:00 UTC | Syncs SBP/PBS actuals into the Economic Calendar; drains pending notification jobs inline |
| `/api/cron/process-notification-jobs` | Daily, 20:00 UTC | Safety-net sweep for any notification job the calendar sync's inline drain missed |
| `/api/cron/weekly-intelligence` | Mondays, 06:00 UTC | Computes Health Score + Recession/Default once, stores the snapshot the homepage reads |

All four are Vercel Cron-invoked, authenticated via `Authorization: Bearer ${CRON_SECRET}` (Vercel sends this automatically for scheduled invocations). Vercel's Hobby plan caps cron *frequency* at once/day per job — the weekly schedule is well within that (less frequent than daily, not more). No run-history log is persisted for any of these; check Vercel's own cron execution logs, or `/admin/system-health` for current-state checks of what each job's most recent successful output looks like (where derivable).

## 5d. Risk & Health Scoring Methodology

All three scores are deterministic, weighted-factor composites — pure synchronous functions, zero AI involvement in the number itself (Section 5d exists specifically so this is documented in one place per the "AI explains, never invents" principle). Thresholds are hardcoded literals, never AI-influenceable.

### Recession Probability (`calculateRecessionRisk`, `src/lib/riskModels.ts`)
8 factors, weights sum to 1.00. Each factor is banded into a 0-100 "pressure score" (higher = more recession pressure); `modelScore = round(Σ pressureScore × weight)`; `probability = round(clamp(4 + modelScore × 0.70, 0, 100))` (floor 4%, ceiling ~74%).

| Factor | Weight |
|---|---|
| GDP Growth (Quarterly YoY) | 0.18 |
| LSM Output (MoM) | 0.18 |
| PKR Depreciation (YoY) | 0.12 |
| Private Credit Growth (YoY) | 0.12 |
| CPI Inflation | 0.10 |
| Real Policy Rate (policy rate − CPI) | 0.10 |
| Import Cover (months) | 0.10 |
| Current Account | 0.10 |

### Sovereign Default Probability (`calculateDefaultRisk`, `src/lib/riskModels.ts`)
5 factors, weights sum to 1.00. `probability = round(clamp(2 + modelScore × 0.60, 0, 100))` (floor 2%, ceiling ~62% — Pakistan's IMF program + bilateral support are a structural near-term backstop).

| Factor | Weight |
|---|---|
| Import Cover (months) | 0.32 |
| Fiscal Balance | 0.23 |
| Current Account | 0.20 |
| PKR Depreciation (YoY) | 0.15 |
| Policy Rate | 0.10 |

SBP Reserves is deliberately *not* a separate factor — it's Import Cover's own numerator; including both was an earlier version's double-counting bug (fixed, see Section 9).

**Risk category bands** (shared by both models): `<20 Low`, `<40 Elevated`, `<60 High`, `≥60 Severe`.

### Economic Health Score (`calculateEconomicHealth`, `src/lib/economicHealth.ts`, added 2026-06-29)
9 factors across 5 dimensions, weights sum to 1.00. Each factor is a 0-100 "how healthy does this look" component score (higher = healthier — opposite polarity from the two risk models above); `score = round(Σ componentScore × weight)` directly (no extra linear transform needed, since it's already meant to span 0-100).

| Factor | Weight | Dimension |
|---|---|---|
| GDP Growth (Quarterly YoY) | 0.20 | Growth |
| CPI Inflation | 0.15 | Inflation |
| Import Cover (months) | 0.15 | External |
| Real Policy Rate | 0.10 | Monetary |
| Current Account | 0.10 | External |
| Fiscal Balance | 0.10 | Fiscal |
| REER (deviation from 100 = equilibrium) | 0.08 | External |
| Excess Money Growth (M2 YoY − [Real GDP Growth + CPI]) | 0.07 | Monetary |
| LSM Output (MoM) | 0.05 | Industrial momentum |

**Label bands**: `≥70 Strong`, `≥40 Moderate`, else `Weak`. `riskLevel` (Low/Moderate/High, shown alongside) is derived 1:1 from this label (`healthLabelToRiskLevel()`), not separately AI-classified.

**Deliberately excluded, each for a specific documented reason** (no unjustified omissions):
- **Trade Balance, FDI, Remittances** — each is already a component flow *of* Current Account, the factor actually used; including them separately would double-count the same underlying external position.
- **Global Financial Conditions (Fed Funds/US10Y), Commodity Exposure (oil prices)** — their effect on Pakistan transmits through, and is therefore already reflected in, Current Account/Import Cover. Global Financial Conditions was judged a *stronger* candidate as a future Default-model enhancement instead (external borrowing-cost sensitivity) — not added there yet either, just identified as the better fit if/when added.
- **Government Debt** — no live series for this is currently fetched anywhere on this dashboard; revisit if one is added.
- **Yield curve spread (PIB − T-Bill)** — identified as a reasonable future addition to Recession specifically (adds market-implied forward risk pricing, distinct from the trailing macro data both models currently use exclusively) — not implemented, flagged for a future pass.

---

## 6. Completed Features

### Data & Analytics
- **35 live indicators** across 8 categories: GDP (annual), CPI/Core/WPI inflation, Policy Rate, SBP Reserves, USD/PKR, Remittances, Current Account, Trade Balance, M2 Money Supply, T-Bill & PIB yields, Exports, Imports, FDI, REER, LSM, Private Credit Growth, Fiscal Balance, 8 Global Markets (Gold, Silver, Brent, WTI, Nat Gas, DXY, US10Y, Fed Funds), 4 Live FX rates, PAK ETF
- **24-month trend sparklines** for CPI, Core Inflation, Policy Rate, SBP Reserves, USD/PKR, Remittances, Trade Balance, T-Bill 3M yield
- **Data Quality badge** (`<DataQualityBadge>`, replaces the old inline freshness badge 2026-06-29): every KPI shows one of 5 states — Verified/Delayed/Cached/Fallback/Unavailable — colored dot, source name, latest date, frequency. See Section 5b.
- **Data Sources audit modal**: floating modal listing all KPIs with source/series ID/date/freshness
- **Fallback chain**: every SBP/Global-Market indicator has a fallback path; Global Markets' is now auto-regenerating (persisted to Supabase on every successful live fetch, Section 5b) rather than a frozen-forever static snapshot

### UI/UX
- **Galaxy background**: animated star-field canvas (`GalaxyBackground.tsx`)
- **Glassmorphism design**: `glass-card` class with backdrop-blur, subtle borders, dark overlay
- **Live market ticker**: horizontal auto-scrolling bar below Hero with 14 live values (USD, EUR, GBP, SAR vs PKR, Gold, Silver, WTI, Brent, NatGas, DXY, US10Y, Fed Funds, SBP Reserves, Policy Rate)
- **Sticky sidebar**: left navigation with 14 section anchors, hidden scrollbar, persistent across scroll
- **Scroll-based animations**: `whileInView` fade-in-up with stagger for KPI grids and news cards (respects `prefers-reduced-motion`)
- **KPI count-up animation**: numeric values animate from 0 to their target on first mount
- **Hover effects**: KPI cards scale up with stronger glow on hover (Spring animation)
- **InfoTooltip**: hover popover explaining each economic term (terminology defined in `src/data/terminology.ts`)
- **Creator badge**: "Built by Farzam" badge fixed to bottom-right corner

### AI Features
- **Economic Health Score**: 0–100 *deterministic* composite (9 weighted factors, Section 3) with arc gauge, sentiment badge, risk badge, 2–3 sentence AI summary, and bullet list of top 3 drivers. Updated weekly (Section 5a) — AI narrates, never invents the number.
- **Risk Intelligence**: Recession/Sovereign Default probabilities, deterministic, also updated weekly.
- **AI News Intelligence**: up to 24 economy-relevant news cards (matches the display cap exactly, Section 5), each with Bullish/Neutral/Bearish sentiment, Low/Moderate/High risk, impact score (-10 to +10), and one-sentence reason — one batched call across providers with health-aware failover (Section 5).
- **System Health diagnostics** (`/admin/system-health`, gated, not public): live status of every external data source, AI provider health/cooldown state, Weekly Intelligence Engine status, and configured cron schedules.

### KSE-100 / Financial Markets
- PAK ETF (NYSE: PAK) as a free KSE-100 proxy via Yahoo Finance — shown when data is fresh
- T-Bill 3M yield trend chart under Financial Markets section
- Explanation notice for why live KSE-100 index is unavailable (PSX commercial data license)
- Link to TradingView for users who want a chart

---

## 7. Environment Variables

All keys live in `.env.local` at the project root. **Never commit this file** — it is gitignored.

| Variable | Required | Used For |
|---|---|---|
| `SBP_EASYDATA_API_KEY` | Yes (core data) | SBP EasyData API — 20 Pakistan economic indicators |
| `OPENROUTER_API_KEY` | Yes (AI features)* | OpenRouter — 3 free-tier models in the failover chain |
| `GROQ_API_KEY` | Yes (AI features)* | Groq — paid backstop, independent of OpenRouter's rate limits |
| `FRED_API_KEY` | Recommended | FRED — US 10Y Treasury yield, Fed Funds Rate (Yahoo Finance fallback works without it) |
| `TWELVEDATA_API_KEY` | Recommended | Twelve Data — Gold, Silver, DXY spot prices (Yahoo Finance fallback works without it) |
| `CRON_SECRET` | Yes (automation) | Authenticates all Vercel Cron-invoked routes (`/api/cron/*`, `/api/revalidate-fx`) |
| `NOTIFICATION_WORKER_SECRET` | Yes (automation) | Trusted-server-only RPCs (notification worker, weekly intelligence storage) — checked against the `internal_secrets` table, key `'notification_worker'` |
| `ADMIN_EMAIL` | Recommended | Gates `/admin/system-health` — unset means that page 404s for everyone, including the owner |

*At least one of `OPENROUTER_API_KEY`/`GROQ_API_KEY` must be set for any AI feature to produce a real (non-fallback) result; both is strongly recommended for genuine provider-level resilience.

`GNEWS_API_KEY` was **removed** (2026-06) — GNews's free tier prohibited commercial use, carried a 12h data delay, and was never even configured in this deployment (silently contributing zero articles with nothing in logs to reveal it). Google News RSS replaced it with equal-or-better topic targeting and none of those three problems; see Section 4.

**Example `.env.local`**:
```
SBP_EASYDATA_API_KEY=your_sbp_key_here
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
FRED_API_KEY=your_fred_key_here
TWELVEDATA_API_KEY=your_twelvedata_key_here
CRON_SECRET=a_long_random_string
NOTIFICATION_WORKER_SECRET=a_long_random_string
ADMIN_EMAIL=you@example.com
```

Keys are read **only** on the server side via `process.env.XXX`. Never pass them to client components or hardcode them in source files.

---

## 8. Known Issues

### Active Bugs / Limitations

1. **PAK ETF liquidity risk**: `getPakEtfKpi()` treats Yahoo Finance data >30 days old as a fetch failure (the fund may be delisted), falling through to the persisted/static fallback rather than showing a stale quote as current. The Global X MSCI Pakistan ETF (NYSE: PAK) has had liquidity concerns — if it delists fully, this symbol permanently rides on its fallback snapshot.

2. **SBP Fiscal Balance is annual, 1-year lag**: `TS_GP_PF_SPF_Y.SPF370000` is an annual series with ~12-month publication lag. The displayed value may be from the prior fiscal year. Expected — annual series with that series key.

3. **US10Y and Fed Funds freshness shows "Delayed" near the threshold edge**: FRED publishes with ~2-business-day lag; the freshness system marks these Delayed past 3 days. Correct behavior, not a bug.

4. **AI provider health tracking is process-local**: `getProviderHealthSnapshot()` (and the cooldown logic that consumes it) only reflects the serverless instance handling the current request, not a global view across Vercel's multi-instance deployment. A model that's healthy on one instance and cooling down on another is expected, not a bug — see Section 5.

5. **Ministry of Finance press releases not polled**: evaluated for direct official-source news polling (2026-06-29) and deliberately not implemented — the page is a legacy, table-based static HTML site with no API/RSS and no stable structure to scrape reliably without dedicated development and testing. SBP's press-release RSS was also evaluated and rejected — it sits behind Cloudflare bot protection that returns 403 regardless of caller IP (confirmed directly). PBS *is* polled directly (see Section 4) since its WordPress REST API is reliable and already proven via the SPI integration.

### Technical Debt

- The Sidebar's "Settings" nav item (`href="#"`) is a placeholder with no target section.
- `marketDataSources.ts`'s `SOURCE_CHAINS` table (consumed by `KpiCard`'s source-chain tooltip) has no entries for any SBP-sourced indicator — only Global Markets symbols. Low-priority gap, not a correctness issue.
- `email_log` has no retention/archival policy and is the only table in the schema with genuine unbounded long-term growth — it logs one row per (subscriber × economic event × email type), so it scales with subscriber_count × release_count indefinitely (e.g. ~150K rows/year at 1,000 subscribers × ~150 releases/year). Reviewed deliberately (2026-06-30) and **not implemented yet**: historical operational data (delivery status, attempt counts) is being preserved on purpose until real production growth actually justifies the complexity of an archival strategy, rather than guessing at a retention window now. Revisit once subscriber count or row count makes it worth the design effort.

---

## 9. Development History

### Initial Build
- Single-page Next.js dashboard with hardcoded economic data
- Custom galaxy background, glassmorphism cards, animated count-up values
- Static fallback data defined in `sbpFallbackData.ts`

### Live Data Integration (Phase 1–3)
- Wired SBP EasyData for ~12 indicators (CPI, reserves, USD/PKR, policy rate, etc.)
- Added World Bank for GDP growth
- Added sticky sidebar with section anchors
- Added `DataSourcesModal` with data freshness tracking per KPI
- Market ticker bar (14 live values scrolling)

### Global Markets (Phase 4a)
- Added FRED for WTI, Brent, Natural Gas, US 10Y, Fed Funds
- Added Twelve Data for Gold, Silver, DXY
- Added Yahoo Finance as universal fallback layer (`yfinance.ts`)
- Added ExchangeRate-API for live PKR cross-rates
- Added PAK ETF (NYSE: PAK) as KSE-100 proxy

### Real Economy & Fiscal (Phase 4b)
- Extended SBP EasyData with 8 more series: Exports, Imports, FDI, REER, LSM, Private Credit Growth, Fiscal Balance
- New "Real Economy & Fiscal" KPI grid section

### News & Intelligence (Phase 4d–4e)
- Initially built with Anthropic Claude API (Haiku)
- **Migrated to OpenRouter** (`nex-agi/nex-n2-pro:free`) to reduce cost
- Created `news.ts` aggregating GNews + 3 RSS feeds
- Created `intelligence.ts` for batch AI news tagging
- Discovered `Response.json()` bug with nex-agi model's leading-whitespace reasoning tokens — fixed with `res.text()` + `JSON.parse()`
- RSS HTML entity decoding fix (`&amp;` → `&`) to prevent React key collisions
- Switched Dawn feed from `/feeds/home` to `/feeds/business` for economy-relevant articles
- Added `decodeEntities()` helper for all RSS text fields

### AI Economic Health Score
- Replaced hardcoded `calculateHealthScore()` with live AI call to OpenRouter
- `getAiEconomicAnalysis()` takes 16 indicator strings + news headlines, returns score/sentiment/risk/summary/drivers
- `HealthScoreCard` updated to display AI badges and AI-chip label
- Parallelized with `getTaggedNews()` in `page.tsx` to cut build time

### Performance
- All API fetches use `next: { revalidate: N }` — page is `○ Static` with ISR
- The two OpenRouter calls (health score + news tagging) run in `Promise.all` — combined latency is max(t1, t2), not t1+t2
- Fixed `cache: 'no-store'` regression that was making the page `ƒ Dynamic`

---

## 10. Future Roadmap

### Reliability / Quality
- [x] AI failover: centralized `openRouterClient.ts`, 3 OpenRouter free models → Groq paid backstop, with health tracking/cooldowns (completed 2026-06-29)
- [x] Deterministic Economic Health Score, replacing AI-generated number (completed 2026-06-29, Section 5d)
- [x] Weekly Intelligence Engine — Health/Recession/Default update once a week instead of every page load (completed 2026-06-29, Section 5a)
- [x] Auto-regenerating Global Markets fallback snapshots instead of a frozen-forever static file (completed 2026-06-29, Section 5b)
- [x] Direct official-source news polling — PBS Official Releases (completed 2026-06-29, Section 4)
- [ ] Ministry of Finance press releases — evaluated, needs dedicated scraper development against its legacy static HTML page (no API/RSS exists); not implemented (Section 8)
- [ ] Yield curve spread (PIB − T-Bill) as a Recession model factor — identified as well-justified, not yet implemented (Section 5d)
- [ ] External debt coverage ratio as a Default model factor — needs a new SBP series not currently fetched (Section 5d)
- [ ] Broader rate-limit-aware handling (Yahoo/Twelve Data/FRED currently treat HTTP 429 the same as a total outage — only the AI provider client has real 429-specific cooldown logic)
- [x] Extend the Data Quality badge to the standalone SEO landing pages (completed 2026-06-30, Final Production Hardening) — 17 of 21 now show it; the remaining 4 (SPI/food-inflation/external-debt-derived) have no underlying `Kpi`-shaped object to attach it to

### New Data / Features
- [ ] **KSE-100 live index**: Either negotiate a PSX data license (`marketdatarequest@psx.com.pk`) or find an alternative free source. TradingView widget was attempted but PSX blocks the `PSX:KSE100` symbol embed for unlicensed domains.
- [ ] **FBR Tax Collection**: No API exists; FBR publishes monthly via PDF. Options: manual monthly update to `sbpFallbackData.ts`, or scrape the PDF.
- [ ] **External Debt**: SBP "Pakistan's Debt Profile" category — series key not yet confirmed. Add to `sbp.ts` once the series code is found.
- [ ] **Inflation trend chart**: Add a multi-series chart overlaying CPI + Core + WPI on one chart (currently separate sparklines)
- [ ] **Per-capita GDP**: World Bank population + GDP data both fetched; just need a card and section
- [ ] **Current Account trend chart**: Monthly data is fetched but no chart is displayed yet
- [ ] **IMF program tracker**: Show current IMF program tranche status, quota, and review dates (manual, updated quarterly)

### Deployment
- [ ] Deploy to Vercel (free tier works for this traffic profile — Next.js ISR is first-class there)
- [ ] Move project off OneDrive to a local or GitHub path to avoid OneDrive EPERM file-lock errors during builds
- [ ] Set all env vars in Vercel dashboard (never commit `.env.local`)
- [ ] Configure custom domain (e.g. `pakeconomy.io` or `pakdata.io`)
- [ ] Add `robots.txt` and `sitemap.xml` for SEO

### Monetization Ideas
- [ ] **Sponsored "data partner" badge** from a Pakistani fintech, bank, or media outlet
- [ ] **Premium alerts** (email/WhatsApp when SBP Reserves change by >$500M, or AI risk level shifts to High)
- [ ] **API tier**: License the aggregated + AI-enriched indicator data to researchers or platforms
- [ ] **White-label**: Sell the dashboard template to other emerging-market tracking efforts

---

## 11. Quick Start for Future Claude Sessions

Paste the following as the first message in a new Claude conversation:

---

**Pakistan Economic Intelligence Center — Handoff Brief**

Working directory: `c:\Users\farza\OneDrive\pakistan-economy-dashboard`

This is a Next.js 16.2.9 (Turbopack, App Router) dashboard tracking Pakistan's macroeconomic indicators. The page at `src/app/page.tsx` is a server component that fetches from ~13 sources in parallel and renders a single-page dashboard.

**Rules (non-negotiable)**:
- All API keys read via `process.env.XXX` only — never hardcoded, never client-side
- Keys live in `.env.local` (gitignored)
- Page must stay `○ Static` with ISR — never `ƒ Dynamic`
- Use `res.text()` + `JSON.parse()` for ALL OpenRouter calls — never `res.json()` (the `nex-agi/nex-n2-pro` model prepends whitespace before JSON, which breaks `Response.json()` in Next.js's patched fetch)

**Key env vars**: `SBP_EASYDATA_API_KEY`, `OPENROUTER_API_KEY`, `FRED_API_KEY`, `TWELVEDATA_API_KEY`, `GNEWS_API_KEY` (optional)

**AI layer** (`src/lib/` + `src/lib/data/`):
- `openRouterClient.ts` → shared failover client; model chain: nex-agi → gpt-oss-120b → hermes-3-405b → gpt-oss-20b
- `aiEconomicAnalysis.ts` → Economic Health Score (0-100) + sentiment/risk/summary/drivers; 1h ISR
- `aiRiskIntelligence.ts` → explains pre-calculated recession + default probabilities; 1h ISR
- `intelligence.ts` → batch news tagging (sentiment/risk/impactScore/reason per article); 2h ISR
- All three called in parallel via `Promise.all` in `page.tsx`
- All return `{ ...result, modelUsed: string, modelDisplayName: string }` (shown as badge in UI)
- OpenRouter endpoint: `https://openrouter.ai/api/v1/chat/completions`

**Data sources**: SBP EasyData (20 series), World Bank (GDP), FRED (US10Y/FedFunds/Oil), Twelve Data (Gold/Silver/DXY), Yahoo Finance (fallback + PAK ETF), ExchangeRate-API (live PKR FX), BBC/Dawn/Tribune RSS (news), GNews API (news, optional)

**ISR caching**: `next: { revalidate: N }` on every `fetch()` call. Monthly data = 24h, intraday = 1h, news = 2h.

**Build command**: `npm run build` (clean first: `Remove-Item ".next" -Recurse -Force`)

**Current open issues**: (1) GNews returns 0 results without an API key — news falls back to RSS only, which works fine. (2) Dawn business feed may return non-economy articles — monitor top-5 card quality. (3) AI model failures are now handled by the 4-model failover chain — check server logs for `[AI/...]` entries to see which model served each feature.

For full context including all data source series keys, component responsibilities, and the complete development history, read `PROJECT_CONTEXT.md` in the project root.
