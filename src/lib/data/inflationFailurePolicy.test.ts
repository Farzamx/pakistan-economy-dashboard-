// Phase F.2a: a provider failure must never replace a good Inflation page with a
// degraded one.
//
// These tests drive the REAL page component end to end — the real fetchers, the
// real PBS parser and integrity checks, the real World Bank parser, the real
// view-model and the real policy — and stub only the NETWORK (`fetch`) and the
// ledger-facing modules. Nothing disrupts a live service.
//
// How "keep the last good page" is verified here: Next's documented rule is that
// a regeneration that THROWS leaves the previous page in place. So at runtime the
// page function must REJECT (and must never resolve to a degraded page); during
// the build it must RESOLVE with the labelled unavailable states. The same rules
// were also confirmed against real `next build` / `next start` runs (see the
// phase report).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";
import { PBS_CPI_SDMX_URL } from "./pbsCpiGroups";
import { parseWorldBankInflation } from "./worldBankInflation";
import { enforceProviderPolicy, failureModeFor, ProviderUnavailableError } from "./providerFailurePolicy";
import { parseCpiGroupPanel } from "@/lib/inflation/pbsGroups";
import { buildInflationViewModel } from "@/lib/inflation/viewModel";
import { CORE_YOY, FOOD_YOY, HEADLINE_YOY, PBS_XML, POLICY, tamperedPbsXml, truncatedPbsXml, wbBody } from "@/lib/inflation/__fixtures__/pageFixtures";

// ── Ledger-facing modules: fixed, healthy data (the policy under test concerns the EXTERNAL providers). ──
vi.mock("@/lib/data/sbpServer", async () => {
  const f = await import("@/lib/inflation/__fixtures__/pageFixtures");
  const kpi = { title: "CPI Inflation", value: "9.6", unit: "%", change: "-0.7 pp vs Sep 2026", trend: "down", glow: "purple" };
  return {
    getSbpIndicator: async () => ({ kpi, trend: [], meta: {} }),
    getSbpIndicatorHistory: async (key: string) => ({ points: key === "cpiInflation" ? f.HEADLINE_YOY : key === "coreInflation" ? f.CORE_YOY : f.POLICY }),
    getFoodInflationUrbanHistory: async () => ({ points: f.FOOD_YOY }),
  };
});
vi.mock("@/lib/data/cpiMonthlyIndex", async () => {
  const f = await import("@/lib/inflation/__fixtures__/pageFixtures");
  const { parseCpiGroupPanel: parse } = await import("@/lib/inflation/pbsGroups");
  const panel = parse(f.PBS_XML).panel!;
  return { getCpiMonthlyIndexSeries: async () => [...panel.headlineIndex].map(([m, v]) => ({ observationDate: `${m}-28`, indexValue: v })) };
});
vi.mock("@/lib/data/cpiCategoryBreakdown", () => ({ getLatestCpiCategoryBreakdown: async () => null }));

// Final Inflation milestone: the page now tries the PEIC ledger BEFORE PBS. These tests are about the EXTERNAL providers' failure
// policy, so the ledger is held "unavailable" here — which makes PBS's file the CPI-group source, exactly as these scenarios
// were written. (Without this the real reader would retry 26 reads against a dead loopback URL on every render: harmless, but
// slow.) The ledger-first behaviour has its own suite: inflationLedgerIntegration.test.ts.
vi.mock("@/lib/data/cpiGroupLedgerReader", () => ({
  readLedgerPanel: async () => ({ panel: null, issues: ["The ledger is not available in this test."], failureKind: "unavailable", provenance: null, grid: new Map(), stats: { rpcCalls: 0, retries: 0, failedKeys: 26, ms: 0 } }),
}));
vi.mock("@/lib/cronLogging", () => ({ getCronRunHistory: async () => [] }));

import InflationRatePage from "@/app/inflation-rate-pakistan/page";
import { loadInflationPageData } from "./inflationPageData";

// ── The network: scenario-driven stand-ins for PBS and the World Bank. ──
type Pbs = "ok" | "403" | "network" | "tampered" | "truncated";
type Wb = "ok" | "503" | "network" | "noLKA";
const net: { pbs: Pbs; wb: Wb; calls: string[] } = { pbs: "ok", wb: "ok", calls: [] };

function fakeFetch(input: unknown): Promise<Response> {
  const url = String(input);
  net.calls.push(url);
  if (url === PBS_CPI_SDMX_URL) {
    if (net.pbs === "403") return Promise.resolve(new Response("Forbidden", { status: 403 }));
    if (net.pbs === "network") return Promise.reject(new Error("socket hang up"));
    const xml = net.pbs === "tampered" ? tamperedPbsXml() : net.pbs === "truncated" ? truncatedPbsXml() : PBS_XML;
    return Promise.resolve(new Response(xml, { status: 200 }));
  }
  if (url.includes("api.worldbank.org")) {
    if (net.wb === "503") return Promise.resolve(new Response("unavailable", { status: 503 }));
    if (net.wb === "network") return Promise.reject(new Error("timeout"));
    return Promise.resolve(new Response(JSON.stringify(wbBody(net.wb === "noLKA" ? ["LKA"] : [])), { status: 200 }));
  }
  return Promise.reject(new Error(`unexpected request in test: ${url}`));
}

const SECTION_IDS = ["overview", "history", "measures", "food-rest", "urban-rural", "groups", "groups-time", "patterns", "compare", "distribution", "international", "policy", "findings", "meaning", "methodology", "faq"];
const sectionsIn = (html: string) => SECTION_IDS.filter((id) => html.includes(`id="${id}"`));
const render = async () => renderToStaticMarkup(await InflationRatePage());

const savedPhase = process.env.NEXT_PHASE;
let errorSpy: ReturnType<typeof vi.spyOn>;

function setPhase(phase: string | undefined) {
  if (phase === undefined) delete process.env.NEXT_PHASE;
  else process.env.NEXT_PHASE = phase;
}

beforeEach(() => {
  // The page prints when it was generated (to the minute); a frozen clock keeps whole-page comparisons deterministic.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
  net.pbs = "ok";
  net.wb = "ok";
  net.calls = [];
  vi.stubGlobal("fetch", fakeFetch);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  setPhase(PHASE_PRODUCTION_SERVER); // the default under test: production runtime
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
  setPhase(savedPhase);
});

// ═════════════════════════════════════════════════════════════════════════════

describe("the policy: build and dev degrade, everything else refuses", () => {
  it("degrades only during the production build and the dev server", () => {
    expect(failureModeFor(PHASE_PRODUCTION_BUILD)).toBe("degrade");
    expect(failureModeFor(PHASE_DEVELOPMENT_SERVER)).toBe("degrade");
  });

  it("refuses at production runtime", () => {
    expect(failureModeFor(PHASE_PRODUCTION_SERVER)).toBe("throw");
  });

  it("fails SAFE: an unset, unknown or future phase refuses rather than degrades", () => {
    expect(failureModeFor(undefined)).toBe("throw");
    expect(failureModeFor("")).toBe("throw");
    expect(failureModeFor("phase-something-new")).toBe("throw");
    expect(failureModeFor("PHASE-PRODUCTION-BUILD")).toBe("throw"); // exact match only
  });

  it("reads the current process's phase by default", () => {
    setPhase(PHASE_PRODUCTION_BUILD);
    expect(failureModeFor()).toBe("degrade");
    setPhase(undefined);
    expect(failureModeFor()).toBe("throw");
  });

  it("enforceProviderPolicy: no failures never throws; failures throw only in 'throw' mode", () => {
    const f = [{ provider: "World Bank" as const, reason: "The request failed or returned no usable data." }];
    expect(() => enforceProviderPolicy([], "throw")).not.toThrow();
    expect(() => enforceProviderPolicy(f, "degrade")).not.toThrow();
    expect(() => enforceProviderPolicy(f, "throw")).toThrow(ProviderUnavailableError);
  });

  it("the error names the providers and reasons, and carries them for logging", () => {
    try {
      enforceProviderPolicy([{ provider: "PBS CPI file", reason: "HTTP 403" }, { provider: "World Bank", reason: "timeout" }], "throw");
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ProviderUnavailableError);
      const err = e as ProviderUnavailableError;
      expect(err.message).toContain("keeping the last good page");
      expect(err.message).toContain("PBS CPI file: HTTP 403");
      expect(err.message).toContain("World Bank: timeout");
      expect(err.failures).toHaveLength(2);
    }
  });
});

describe("1. successful providers produce a complete page", () => {
  it("renders all 16 sections with the group, contribution and international content", async () => {
    const html = await render();
    expect(sectionsIn(html)).toEqual(SECTION_IDS);
    expect(html).toContain("Every group, every month");
    expect(html).toContain("What moved the headline between two months");
    expect(html).toContain("Component comparison");
    expect(html).toContain("Pakistan and regional peers");
    expect(html).toContain("Annual consumer-price inflation by country");
  });

  it("shows no unavailable or fallback state", async () => {
    const html = await render();
    expect(html).not.toContain("is unavailable right now");
    expect(html).not.toContain("Showing the latest month only");
    expect(html).not.toContain("Category history is unavailable");
  });

  it("asks each external provider exactly once", async () => {
    await render();
    expect(net.calls.filter((u) => u === PBS_CPI_SDMX_URL)).toHaveLength(1);
    expect(net.calls.filter((u) => u.includes("api.worldbank.org"))).toHaveLength(1);
  });
});

describe("2. PBS failure at runtime refuses to regenerate", () => {
  it("HTTP 403 rejects with ProviderUnavailableError — it never resolves to a degraded page", async () => {
    net.pbs = "403";
    await expect(render()).rejects.toThrow(ProviderUnavailableError);
    await expect(render()).rejects.toThrow(/PBS CPI file.*HTTP 403/);
  });

  it("a network error rejects the same way", async () => {
    net.pbs = "network";
    await expect(render()).rejects.toThrow(/PBS CPI file.*socket hang up/);
  });

  it("logs why, so the platform's error log explains the stale page", async () => {
    net.pbs = "403";
    await expect(render()).rejects.toThrow();
    expect(errorSpy.mock.calls.flat().join(" ")).toMatch(/regeneration refused, last good page stays.*PBS CPI file/);
  });

  it("also refuses when the phase is unset (fail-safe)", async () => {
    setPhase(undefined);
    net.pbs = "403";
    await expect(render()).rejects.toThrow(ProviderUnavailableError);
  });
});

describe("3. World Bank failure at runtime follows the same policy", () => {
  it("HTTP 503 rejects", async () => {
    net.wb = "503";
    await expect(render()).rejects.toThrow(/World Bank.*failed or returned no usable data/);
  });

  it("a network error rejects", async () => {
    net.wb = "network";
    await expect(render()).rejects.toThrow(ProviderUnavailableError);
  });

  it("a response that silently drops a compared country rejects (it would shrink the comparison unannounced)", async () => {
    net.wb = "noLKA";
    await expect(render()).rejects.toThrow(/World Bank.*No data returned for: LKA/);
  });

  it("when BOTH providers fail the error names both", async () => {
    net.pbs = "403";
    net.wb = "503";
    await expect(render()).rejects.toThrow(/PBS CPI file.*World Bank/);
  });
});

describe("4. build-time provider failures render the unavailable state without failing", () => {
  beforeEach(() => setPhase(PHASE_PRODUCTION_BUILD));

  it("PBS 403 + World Bank 503: the page still renders, all 16 sections, with labelled unavailable states", async () => {
    net.pbs = "403";
    net.wb = "503";
    const html = await render();
    expect(sectionsIn(html)).toEqual(SECTION_IDS);
    expect(html).toContain("is unavailable right now");
    expect(html).toContain("International comparison is unavailable right now");
    expect(html).toContain("CPI group data is unavailable right now");
  });

  it("still logs the failure, so a degraded build is visible in the build output", async () => {
    net.pbs = "403";
    await render();
    expect(errorSpy.mock.calls.flat().join(" ")).toMatch(/rendering the unavailable state.*PBS CPI file/);
  });

  it("the dev server degrades the same way", async () => {
    setPhase(PHASE_DEVELOPMENT_SERVER);
    net.wb = "network";
    const html = await render();
    expect(html).toContain("International comparison is unavailable right now");
  });

  it("with healthy providers the build renders exactly what runtime renders (the policy changes nothing when nothing fails)", async () => {
    const build = await render();
    setPhase(PHASE_PRODUCTION_SERVER);
    const runtime = await render();
    expect(build).toBe(runtime);
  });
});

describe("5. invalid CPI data never produces a partially populated page", () => {
  it("a file that fails the Laspeyres identity is refused at runtime", async () => {
    net.pbs = "tampered";
    await expect(render()).rejects.toThrow(/PBS CPI file.*do not reproduce the headline index/);
  });

  it("a valid but too-short file is refused at runtime", async () => {
    net.pbs = "truncated";
    await expect(render()).rejects.toThrow(/PBS CPI file.*too few months/);
  });

  it("at build, a failed identity check leaves EVERY group-derived section unavailable — none half-drawn", async () => {
    setPhase(PHASE_PRODUCTION_BUILD);
    net.pbs = "tampered";
    const html = await render();
    expect(html).toContain("CPI group data is unavailable right now");
    // Nothing computed from the rejected file is present anywhere on the page.
    for (const fragment of ["Every group, every month", "What moved the headline between two months", "Component comparison", "Which groups are rising fastest", "Group inflation now, six months ago", "Each group", "Of the 9.61"]) {
      expect(html, fragment).not.toContain(fragment);
    }
    // Sections that do not depend on the file are unaffected.
    expect(html).toContain("Headline inflation by month");
    expect(html).toContain("Pakistan and regional peers");
  });

  it("at build, a too-short file likewise yields no group content", async () => {
    setPhase(PHASE_PRODUCTION_BUILD);
    net.pbs = "truncated";
    const html = await render();
    expect(html).not.toContain("Every group, every month");
    expect(html).toContain("CPI group data is unavailable right now");
  });

  it("no group-derived finding is generated from rejected data", async () => {
    setPhase(PHASE_PRODUCTION_BUILD);
    net.pbs = "tampered";
    const html = await render();
    expect(html).not.toContain("of the 12 CPI groups");
    expect(html).not.toContain("percentage-point rise in the CPI over the twelve months");
  });
});

describe("6. a successful regeneration after a failure restores normal operation", () => {
  it("the page recovers on the very next attempt, and is identical to a render that never failed", async () => {
    const baseline = await render();

    net.pbs = "403";
    await expect(render()).rejects.toThrow(ProviderUnavailableError);

    net.pbs = "ok";
    const recovered = await render();
    expect(sectionsIn(recovered)).toEqual(SECTION_IDS);
    expect(recovered).not.toContain("is unavailable right now");
    expect(recovered).toBe(baseline); // no residue from the failed attempt
  });

  it("recovers from a World Bank failure the same way, and from several failures in a row", async () => {
    const baseline = await render();
    net.wb = "network";
    await expect(render()).rejects.toThrow();
    await expect(render()).rejects.toThrow();
    net.pbs = "tampered";
    await expect(render()).rejects.toThrow();
    net.pbs = "ok";
    net.wb = "ok";
    expect(await render()).toBe(baseline);
  });
});

describe("7. F.1 calculations are unchanged by the policy", () => {
  it("the loader's model equals the view model built independently from the same inputs", async () => {
    const panel = parseCpiGroupPanel(PBS_XML).panel!;
    const expected = buildInflationViewModel({
      headline: HEADLINE_YOY,
      core: CORE_YOY,
      food: FOOD_YOY,
      index: [...panel.headlineIndex].map(([m, v]) => ({ observationDate: `${m}-28`, indexValue: v })),
      policy: POLICY,
      panel,
      panelIssues: [],
      snapshot: null,
      intl: parseWorldBankInflation(wbBody()),
    });
    const { model } = await loadInflationPageData();
    // Everything F.1 computes is identical; the one addition is the source description, checked separately below.
    expect({ ...model, groupSource: null }).toEqual(expected);
    expect(model.groupSource).toMatchObject({ source: "pbs-live", reason: "fallback-ledger-unavailable", fallback: true });
  });

  it("the known October 2026 figures are intact: food contribution 2.85 pp, total 9.61, transport YoY 28.61%", async () => {
    const { model } = await loadInflationPageData();
    const oct = model.groups!.contribYoY.at(-1)!;
    expect(oct.month).toBe("2026-10");
    expect(oct.byGroup[1]).toBeCloseTo(2.85, 2);
    expect(oct.total).toBeCloseTo(9.61, 2);
    expect(model.groups!.yoy[7].at(-1)!.value).toBeCloseTo(28.61, 2);
  });

  it("the canonical headline KPI passes through untouched", async () => {
    const { headlineKpi } = await loadInflationPageData();
    expect(headlineKpi.kpi.value).toBe("9.6");
    expect(headlineKpi.kpi.change).toBe("-0.7 pp vs Sep 2026");
  });

  it("page structure, default view and SEO are unchanged: 16 sections, 24-month default, original FAQ", async () => {
    const html = await render();
    expect(sectionsIn(html)).toHaveLength(16);
    expect(html).toContain("What is Pakistan&#x27;s current inflation rate?");
    expect(html).toContain("FAQPage");
  });
});
