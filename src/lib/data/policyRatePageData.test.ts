// The Interest Rate page, end to end: the REAL page component, the REAL loader, the real view-model, the real shared failure policy.
// Controlled: only the two data modules the loader reads through (the SBP/ledger history and the US federal funds history), plus the clock.
// Nothing here can reach a database or the network: the test workers hold no credentials and both data modules are mocked.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";
import { ProviderUnavailableError } from "./providerFailurePolicy";
import { REAL_POLICY_RATE, monthEndRaw } from "@/lib/policyRate/__fixtures__/policyRateHistory";

type Point = { date: string; value: number };
type History = { points: Point[]; displayUnit: string; meta: Record<string, unknown> };

const SERIES_KEY = "TS_GP_IR_SIRPR_AH.SBPOL0030";
const liveMeta = (obs: string) => ({ sourceStatus: "live", seriesKey: SERIES_KEY, seriesName: "SBP Policy (Target) Rate", observationDate: obs, lastUpdated: "2026-10-29T03:22:25+00:00" });
const history = (points: Point[], meta: Record<string, unknown> = liveMeta(points.at(-1)?.date ?? "")): History => ({ points, displayUnit: "%", meta });

const HEADLINE = monthEndRaw("2026-01", [5.9, 6.4, 7.0, 8.0, 9.1, 9.4, 9.0, 10.0, 10.3, 9.6]);
const CORE = monthEndRaw("2026-01", [6.5, 7.0, 7.4, 8.0, 8.4, 8.6, 8.7, 8.6, 8.6, 7.8]);
const TBILL: Point[] = [{ date: "2026-09-30", value: 11.7 }, { date: "2026-10-14", value: 11.89 }];
const PIB: Point[] = [{ date: "2026-10-07", value: 12.74 }];
const FED = monthEndRaw("2026-08", [4.1, 4.0, 3.88]);

const KPI = { kpi: { title: "Policy Rate", value: "12", unit: "%", change: "+0.50 pp vs 28 Apr 2026", trend: "up", glow: "purple", latestDate: "26 Oct 2026", source: "SBP EasyData" }, trend: [], meta: {} };

const scenario: { hist: Record<string, () => Promise<History>>; fed: () => Promise<Point[] | null> } = { hist: {}, fed: async () => FED };
function healthy() {
  scenario.hist = {
    policyRate: async () => history(REAL_POLICY_RATE),
    cpiInflation: async () => history(HEADLINE),
    coreInflation: async () => history(CORE),
    tbillYield3m: async () => history(TBILL),
    pibYield3y: async () => history(PIB),
  };
  scenario.fed = async () => FED;
}

vi.mock("@/lib/data/sbpServer", () => ({
  getSbpIndicator: async () => KPI,
  getSbpIndicatorHistory: (key: string) => scenario.hist[key](),
}));
vi.mock("@/lib/data/fred", () => ({ getFedFundsHistory: () => scenario.fed() }));

import InterestRatePage from "@/app/pakistan-interest-rate/page";
import { loadPolicyRatePageData, sourceInfoFrom } from "./policyRatePageData";

const SECTION_IDS = ["overview", "history", "changes", "cycles", "real", "inflation", "market", "international", "findings", "meaning", "methodology", "faq"];
const sectionsIn = (html: string) => SECTION_IDS.filter((id) => html.includes(`id="${id}"`));
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&rsquo;/g, "’").replace(/\s+/g, " ");
const render = async () => renderToStaticMarkup(await InterestRatePage());

const savedPhase = process.env.NEXT_PHASE;
const setPhase = (p: string | undefined) => (p === undefined ? delete process.env.NEXT_PHASE : (process.env.NEXT_PHASE = p));
let spies: ReturnType<typeof vi.spyOn>[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T08:00:00Z"));
  healthy();
  spies = (["error", "warn", "info"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  setPhase(PHASE_PRODUCTION_SERVER);
});
afterEach(() => {
  vi.useRealTimers();
  spies.forEach((s) => s.mockRestore());
  setPhase(savedPhase);
});

describe("healthy: the ledger supplies the history", () => {
  it("the loader analyses the real history: 35 changes, 5 cycles, current 12% since 26 Oct 2026", async () => {
    const { model, kpi, generatedAt } = await loadPolicyRatePageData();
    expect(model.decisions).toHaveLength(38);
    expect(model.changes).toHaveLength(35);
    expect(model.cycles).toHaveLength(5);
    expect(model.stats?.current).toEqual({ value: 12, since: "2026-10-26" });
    expect(model.stats?.asOf).toBe("2026-11-11"); // the generation date, from the (fixed) clock
    expect(generatedAt).toBe("2026-11-11T08:00:00.000Z");
    expect(kpi.kpi.value).toBe("12"); // the existing canonical KPI passes through untouched
  });

  it("the source is reported as the ledger, with the series id and when it was stored", async () => {
    const { model } = await loadPolicyRatePageData();
    expect(model.source).toEqual({ status: "ledger", seriesKey: SERIES_KEY, seriesName: "SBP Policy (Target) Rate", latestObservation: "2026-10-26", lastStoredAt: "2026-10-29T03:22:25+00:00", observations: 38 });
  });

  it("the page renders all 12 sections and the facts the data supports", async () => {
    const html = await render();
    expect(sectionsIn(html)).toEqual(SECTION_IDS);
    const t = text(html);
    expect(t).toContain("12.00%");
    expect(t).toContain("35 changes since 23 May 2016 (22 increases, 13 cuts)");
    expect(t).toContain("highest rate is 22.00%, from 27 Jun 2023 until 11 Jun 2024");
    expect(t).toContain("(1 + 12.00%) ÷ (1 + 9.6%) − 1 = 2.19%");
    expect(t).toContain("The PEIC observation ledger (SBP EasyData series, ingested)");
    expect(t).toContain(SERIES_KEY);
    expect(t).toContain("11 Nov 2026, 08:00 UTC");
  });

  it("emits FAQ JSON-LD from the same five questions it renders", async () => {
    const html = await render();
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(ld).toContain("FAQPage");
    expect((ld.match(/"@type":"Question"/g) ?? []).length).toBe(5);
    expect(html).toContain("What is the real policy rate?");
  });

  it("no word is glued to a bold, italic or link tag (a plain space after a closing tag was dropped once)", async () => {
    const markup = (await render()).replace(/<script[\s\S]*?<\/script>/g, "");
    expect([...markup.matchAll(/<\/(strong|em|a)>([A-Za-z]{2,})/g)].map((m) => m[0])).toEqual([]);
  });

  it("is deterministic for a fixed clock", async () => {
    expect(await render()).toBe(await render());
  });
});

describe("the required history is unavailable: the last good page stays (F.2a)", () => {
  const FALLBACK_POINTS: Point[] = [{ date: "2026-05-31", value: 11.5 }, { date: "2026-06-30", value: 11.5 }]; // the static snapshot: monthly points, not change dates
  const asFallback = () => (scenario.hist.policyRate = async () => history(FALLBACK_POINTS, { ...liveMeta("2026-06-30"), sourceStatus: "fallback" }));

  it("at production runtime a fallback snapshot REFUSES regeneration, naming the page and the source", async () => {
    asFallback();
    const err = await loadPolicyRatePageData().catch((e) => e);
    expect(err).toBeInstanceOf(ProviderUnavailableError);
    expect(err.message).toMatch(/^Interest Rate page not regenerated; keeping the last good page\. SBP policy-rate ledger: /);
    await expect(render()).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it.each([
    ["an empty history from the ledger", async () => history([])],
    ["a history loader that throws", async () => { throw new Error("connection reset"); }],
  ])("%s also refuses at runtime", async (_n, loader) => {
    scenario.hist.policyRate = loader as () => Promise<History>;
    await expect(loadPolicyRatePageData()).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it.each([PHASE_PRODUCTION_BUILD, PHASE_DEVELOPMENT_SERVER])("during %s it degrades to a labelled unavailable state instead of failing the deploy", async (phase) => {
    setPhase(phase);
    asFallback();
    const { model } = await loadPolicyRatePageData();
    expect(model.decisions).toEqual([]); // the fallback snapshot is NEVER analysed
    expect(model.stats).toBeNull();
    expect(model.source?.status).toBe("fallback");
    const t = text(await render());
    expect(t).toContain("The policy-rate history is unavailable right now");
    expect(t).toContain("Nothing is estimated in their place");
    expect(t).not.toContain("rate changes since");
    expect(t).toContain("Not the ledger: only a static fallback snapshot was available");
  });

  it("recovers on the very next regeneration, identical to a render that never failed", async () => {
    const baseline = await render();
    asFallback();
    await expect(render()).rejects.toBeInstanceOf(ProviderUnavailableError);
    healthy();
    expect(await render()).toBe(baseline);
  });
});

describe("optional sources fail without taking the page down", () => {
  it("missing inflation: the real-rate and comparison sections say so; every policy-rate section still renders", async () => {
    scenario.hist.cpiInflation = async () => { throw new Error("down"); };
    scenario.hist.coreInflation = async () => history([]);
    const html = await render();
    expect(sectionsIn(html)).toEqual(SECTION_IDS);
    const t = text(html);
    expect(t).toContain("The real policy rate is unavailable right now");
    expect(t).toContain("The comparison is unavailable right now");
    expect(t).toContain("35 changes since 23 May 2016"); // history, changes and cycles are unaffected
  });

  it("missing market yields and US data: those sections say so", async () => {
    scenario.hist.tbillYield3m = async () => { throw new Error("down"); };
    scenario.hist.pibYield3y = async () => history([]);
    scenario.fed = async () => null;
    const t = text(await render());
    expect(t).toContain("Market yields are unavailable right now");
    expect(t).toContain("The US comparison is unavailable right now");
    expect(t).toContain("35 changes since 23 May 2016");
  });

  it("the federal funds loader throwing is treated as absent, not as a failure", async () => {
    scenario.fed = async () => { throw new Error("FRED down"); };
    const { model } = await loadPolicyRatePageData();
    expect(model.fedFunds).toEqual([]);
    expect(model.changes).toHaveLength(35);
  });
});

describe("the page does not hide a disagreement between its headline figure and its history", () => {
  it("a headline figure that differs from the newest observation is reported in the checks", async () => {
    const { model } = await loadPolicyRatePageData();
    expect(model.checks.find((c) => c.id === "kpi-matches")?.status).toBe("ok");
    scenario.hist.policyRate = async () => history(REAL_POLICY_RATE.slice(0, -1)); // history lags: newest observation is 11.5, headline says 12
    const t = text(await render());
    expect(t).toContain("differs from the newest observation in the history");
  });
});

describe("sourceInfoFrom", () => {
  it("maps the history's meta to a plain description", () => {
    expect(sourceInfoFrom(null).status).toBe("unavailable");
    expect(sourceInfoFrom(history([]) as never).status).toBe("unavailable");
    expect(sourceInfoFrom(history(REAL_POLICY_RATE) as never).status).toBe("ledger");
    expect(sourceInfoFrom(history(REAL_POLICY_RATE, { ...liveMeta("2026-10-26"), sourceStatus: "cache-stale" }) as never).status).toBe("ledger");
    expect(sourceInfoFrom(history(REAL_POLICY_RATE, { ...liveMeta("2026-10-26"), sourceStatus: "fallback" }) as never).status).toBe("fallback");
  });
});

describe("the shared failure policy still says what it always said for the Inflation page", () => {
  it("defaults to the Inflation page's wording; only an explicit page name changes it", () => {
    const f = [{ provider: "World Bank" as const, reason: "x" }];
    expect(new ProviderUnavailableError(f).message).toMatch(/^Inflation page not regenerated; keeping the last good page\. World Bank: x$/);
    expect(new ProviderUnavailableError(f, "Interest Rate page").message).toMatch(/^Interest Rate page not regenerated/);
  });
});
