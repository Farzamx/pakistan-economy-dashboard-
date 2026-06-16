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
| AI Provider | **OpenRouter** (`nex-agi/nex-n2-pro:free` model) |
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
│   ├── ai-test/page.tsx        # Dev-only test page for OpenRouter connectivity
│   └── api/
│       ├── ai/test/route.ts                   # POST endpoint for OpenRouter smoke test
│       └── ai/economic-intelligence/route.ts  # POST endpoint (currently unused by UI)
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
├── Promise.all([          ← PARALLEL (both call OpenRouter)
│   getTaggedNews(newsItems)       → OpenRouter → TaggedNewsItem[] (first 10 tagged, rest NEUTRAL)
│   getAiEconomicAnalysis(snapshot, newsItems)  → OpenRouter → AiEconomicAnalysis
│ ])
│
└── JSX assembly
    ├── <Sidebar>          ← nav links, sticky
    ├── <Hero>
    ├── <MarketTicker items={tickerItems}>   ← 14 live values in scrolling bar
    ├── <KpiGrid items={headlineKpis}>       ← GDP, CPI, Reserves, USD/PKR, Remittances
    ├── <HealthScoreCard {...aiAnalysis}>    ← AI score + sentiment + summary
    ├── <KpiGrid items={secondaryKpis}>      ← 8 monetary/external indicators
    ├── <KpiGrid items={globalMarketsKpis}> ← Gold, Silver, Brent, WTI, NatGas, DXY, US10Y, Fed Funds
    ├── <KpiGrid items={[pakEtfKpi]}>        ← PAK ETF (conditional on freshness)
    ├── KSE-100 unavailability notice + TradingView link
    ├── T-Bill 3M trend chart
    ├── <KpiGrid items={realEconomyKpis}>   ← Exports, Imports, FDI, REER, LSM, Private Credit, Fiscal Balance
    ├── <DashboardSection> blocks (GDP, Inflation, Core, Monetary Policy, Reserves, FX, Remittances, External)
    ├── <KpiGrid items={liveFxKpis}>         ← USD/EUR/GBP/SAR vs PKR (ExchangeRate-API)
    ├── <NewsIntelligenceSection items={taggedNews.slice(0,5)}>
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

### ExchangeRate-API (`src/lib/data/fxRates.ts`)
- **URL**: `https://api.exchangerate-api.com/v4/latest/USD`
- **Auth**: None (free tier, keyless)
- **Rates**: USD/PKR direct; EUR/PKR, GBP/PKR, SAR/PKR as cross-rates
- **Note**: Live interbank rate, updated multiple times/day. Distinct from SBP monthly average.

### GNews API (`src/lib/data/news.ts`)
- **URL**: `https://gnews.io/api/v4/search`
- **Auth**: `GNEWS_API_KEY` env var (optional — returns empty if missing)
- **Queries**: Pakistan economy, KSE-100, oil/energy, US Fed/global economy
- **Free tier**: 100 req/day, 1 req/sec
- **Current status**: Returns 0 results if key not configured

### RSS Feeds (`src/lib/data/news.ts`)
- **BBC Business**: `https://feeds.bbci.co.uk/news/business/rss.xml` (8 articles)
- **Dawn Business**: `https://www.dawn.com/feeds/business` (8 articles)
- **Express Tribune Business**: `https://tribune.com.pk/feed/business` (8 articles)
- **HTML entity decoding**: `decodeEntities()` strips `&amp;`, `&lt;`, etc. from URLs/titles before storage (critical — avoids React key mismatches and broken hrefs)

---

## 5. AI Integrations

### OpenRouter Setup
- **Base URL**: `https://openrouter.ai/api/v1/chat/completions`
- **Auth**: `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}`
- **Model**: `nex-agi/nex-n2-pro:free`
- **Both AI functions are called in parallel** via `Promise.all` in `page.tsx`

### CRITICAL: Response Parsing Bug
The `nex-agi/nex-n2-pro` model prepends hundreds of whitespace/newline characters (streaming reasoning tokens) before its JSON payload. Next.js's patched `Response.json()` throws a `SyntaxError` on this leading whitespace. The fix (applied everywhere):
```typescript
// WRONG — fails silently on nex-agi/nex-n2-pro:
const data = await res.json();

// CORRECT — handles leading whitespace:
const rawText = await res.text();
const data = JSON.parse(rawText);
```
Never revert to `res.json()` for OpenRouter calls.

### AI Economic Health Score (`src/lib/data/aiEconomicAnalysis.ts`)
- **Input**: `IndicatorSnapshot` (16 indicator values as formatted strings) + 10 news headlines
- **Output**: `AiEconomicAnalysis { economicHealthScore: number, sentiment, riskLevel, summary, topDrivers }`
- **Prompt**: Asks model to act as senior Pakistan economist; return strict JSON
- **Revalidation**: 1 hour (`REVALIDATE = 60 * 60`)
- **Fallback**: Returns hardcoded neutral analysis (score 55, Neutral, Moderate) if API key missing or any error
- **Display**: `<HealthScoreCard>` — SVG arc gauge + 3 badges (Strong/Moderate/Weak, Bullish/Neutral/Bearish, Low/Moderate/High Risk) + summary + bullet drivers
- **API route**: `POST /api/ai/economic-intelligence` also exists but is not called by the UI (was created for testing)

### AI News Intelligence (`src/lib/data/intelligence.ts`)
- **Input**: Up to 10 `NewsItem` objects (the first 10 of the 24 aggregated)
- **Output**: `IntelligenceTag { sentiment: "Bullish"|"Neutral"|"Bearish", riskLevel: "Low"|"Moderate"|"High", impactScore: -10..+10, reason: string }` per article
- **Strategy**: Single batch OpenRouter call for all 10 articles (one prompt, one JSON array response)
- **Articles 11–24**: Get `NEUTRAL_TAG` (no AI call — avoids excess API usage)
- **Page display**: Only `.slice(0, 5)` of tagged articles shown in `<NewsIntelligenceSection>`
- **Revalidation**: 2 hours
- **Fallback**: All articles get `NEUTRAL_TAG` if API key missing or any error
- **Display**: Each news card shows category badge, age, headline, sentiment badge, risk label, impact score badge (green/red), and a one-sentence reason

### Error Handling
- Every AI function has a try/catch returning safe fallback values
- OpenRouter returning non-200: returns fallback
- JSON parse failure: returns fallback
- Missing API key: returns fallback immediately (no network call)
- The page never crashes due to AI failures

---

## 6. Completed Features

### Data & Analytics
- **35 live indicators** across 8 categories: GDP (annual), CPI/Core/WPI inflation, Policy Rate, SBP Reserves, USD/PKR, Remittances, Current Account, Trade Balance, M2 Money Supply, T-Bill & PIB yields, Exports, Imports, FDI, REER, LSM, Private Credit Growth, Fiscal Balance, 8 Global Markets (Gold, Silver, Brent, WTI, Nat Gas, DXY, US10Y, Fed Funds), 4 Live FX rates, PAK ETF
- **24-month trend sparklines** for CPI, Core Inflation, Policy Rate, SBP Reserves, USD/PKR, Remittances, Trade Balance, T-Bill 3M yield
- **Data freshness system**: every KPI card shows Current/Delayed/Stale badge with colored dot, source name, latest date, and data frequency
- **Data Sources audit modal**: floating modal listing all KPIs with source/series ID/date/freshness
- **Fallback chain**: every indicator has a hardcoded static snapshot so the dashboard always renders even if all APIs fail

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
- **AI Economic Health Score**: 0–100 score with arc gauge, sentiment badge, risk badge, 2–3 sentence summary, and bullet list of top 3 economic drivers — all generated fresh by OpenRouter each ISR cycle
- **AI News Intelligence**: 5 economy-relevant news cards, each with Bullish/Neutral/Bearish sentiment, Low/Moderate/High risk, impact score (-10 to +10), and one-sentence reason — all generated by a single batch OpenRouter call

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
| `OPENROUTER_API_KEY` | Yes (AI features) | OpenRouter — AI Health Score + News Intelligence |
| `FRED_API_KEY` | Recommended | FRED — US 10Y Treasury yield, Fed Funds Rate (Yahoo Finance fallback works without it) |
| `TWELVEDATA_API_KEY` | Recommended | Twelve Data — Gold, Silver, DXY spot prices (Yahoo Finance fallback works without it) |
| `GNEWS_API_KEY` | Optional | GNews — Pakistan/global economy news search (RSS-only mode if missing) |

**Example `.env.local`**:
```
SBP_EASYDATA_API_KEY=your_sbp_key_here
OPENROUTER_API_KEY=sk-or-v1-...
FRED_API_KEY=your_fred_key_here
TWELVEDATA_API_KEY=your_twelvedata_key_here
GNEWS_API_KEY=your_gnews_key_here
```

Keys are read **only** on the server side via `process.env.XXX`. Never pass them to client components or hardcode them in source files.

---

## 8. Known Issues

### Active Bugs / Limitations

1. **GNews returning 0 results**: If `GNEWS_API_KEY` is not set (or quota exceeded), the news aggregator falls back to RSS-only. 22 articles still come from BBC/Dawn/Tribune, so the News section still works. Set the key to unlock keyword-filtered Pakistan economy news.

2. **Dawn Business feed unreliability**: `https://www.dawn.com/feeds/business` may return non-business articles or fail silently (returns `[]`). If it fails, Tribune + BBC cover the gap. Monitor the top 5 article quality — if non-economy articles dominate, consider adding a relevance filter or switching to a confirmed economy-specific feed URL.

3. **OpenRouter build timeout**: The `nex-agi/nex-n2-pro:free` model can be slow (reasoning tokens + latency). During `next build`, the page has 60 seconds per attempt (3 attempts). The two OpenRouter calls now run in parallel, which helps, but slow model responses can still cause the build to fall through to attempt 2 or 3. Consider switching to a faster model if build timeouts become frequent.

4. **PAK ETF potentially delisted**: `getPakEtfKpi()` returns `null` if Yahoo Finance data is >30 days old. The Financial Markets section gracefully hides the KPI card in that case. The Global X MSCI Pakistan ETF (NYSE: PAK) has had liquidity concerns — if it delist fully, this KPI card disappears permanently.

5. **SBP Fiscal Balance is annual, 1-year lag**: `TS_GP_PF_SPF_Y.SPF370000` is an annual series with ~12-month publication lag. The displayed value may be from the prior fiscal year. Expected — annual series with that series key.

6. **US10Y and Fed Funds freshness shows "Delayed"**: FRED publishes with ~2-business-day lag. The freshness system marks these as Delayed after 3 days, which is correct behavior, not a bug.

### Technical Debt

- `src/app/ai-test/page.tsx` and `src/app/api/ai/test/route.ts` are development-only pages left in the codebase. They should be removed before any public deployment.
- `src/lib/economicHealth.ts` contains `getHealthStatus()` and `calculateHealthScore()`. The latter is no longer called (replaced by AI), but both functions remain. `getHealthStatus()` is still used by `HealthScoreCard.tsx`.
- `src/data/healthScoreData.ts` contains hardcoded health factor weights from the pre-AI era. Unused but not deleted.
- The Sidebar's "Settings" nav item (`href="#"`) is a placeholder with no target section.

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
- [ ] Add `GNEWS_API_KEY` to get Pakistan-specific keyword-filtered news (currently RSS-only)
- [ ] Verify Dawn business feed URL and add a fallback if it returns non-economy content
- [ ] Consider adding a content-relevance filter on aggregated articles before AI tagging
- [ ] Switch from `nex-agi/nex-n2-pro:free` to a more reliable/faster OpenRouter model (the free model's reasoning tokens and latency cause intermittent build timeouts)
- [ ] Remove dev-only endpoints: `/ai-test` page and `/api/ai/test` route

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

**AI layer** (`src/lib/data/`):
- `aiEconomicAnalysis.ts` → OpenRouter → Economic Health Score (0-100) + sentiment/risk/summary/drivers; 1h ISR
- `intelligence.ts` → OpenRouter → batch news tagging (sentiment/risk/impactScore/reason per article); 2h ISR
- Both called in parallel via `Promise.all` in `page.tsx`
- Model: `nex-agi/nex-n2-pro:free`
- OpenRouter endpoint: `https://openrouter.ai/api/v1/chat/completions`

**Data sources**: SBP EasyData (20 series), World Bank (GDP), FRED (US10Y/FedFunds/Oil), Twelve Data (Gold/Silver/DXY), Yahoo Finance (fallback + PAK ETF), ExchangeRate-API (live PKR FX), BBC/Dawn/Tribune RSS (news), GNews API (news, optional)

**ISR caching**: `next: { revalidate: N }` on every `fetch()` call. Monthly data = 24h, intraday = 1h, news = 2h.

**Build command**: `npm run build` (clean first: `Remove-Item ".next" -Recurse -Force`)

**Current open issues**: (1) GNews returns 0 results without an API key — news falls back to RSS only, which works fine. (2) Dawn business feed may return non-economy articles — monitor top-5 card quality. (3) OpenRouter build timeouts are intermittent — the two AI calls are now parallelized but the free model is sometimes slow.

For full context including all data source series keys, component responsibilities, and the complete development history, read `PROJECT_CONTEXT.md` in the project root.
