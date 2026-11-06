import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSeriesRegistry, getSeriesDefinition, getSbpSeriesDefinition } from "./seriesRegistry";
import { getAllSbpIndicatorKeys } from "@/lib/data/sbp";
import * as adapter from "@/lib/providers/pbsCpiGroupsAdapter";
import { PBS_CPI_GROUP_COUNT, PBS_CPI_INDICATOR_KEYS, PBS_CPI_SERIES, PBS_SDMX_PROVIDER_ID } from "@/lib/providers/pbsCpiSeries";
import { CPI_GROUP_COUNT } from "@/lib/inflation/pbsGroups";

describe("seriesRegistry", () => {
  it("registers every SBP indicator plus the extra non-SbpIndicatorKey series plus the Phase 8.3 World Bank pilot plus the Phase 8.12 FRED pilot plus the Phase 8.17 Yahoo Gold pilot", () => {
    const registry = getSeriesRegistry();
    const sbpKeys = getAllSbpIndicatorKeys();
    // +3 = foodInflationUrban, moneySupplyM2YoyGrowth, and (Phase 6) the
    // Forex_Arch.xlsx net-liquid-reserves series that fxReserves.ts serves.
    // +3 = (Phase 8.3) the World Bank GDP-growth pilot (Pakistan/India/Bangladesh).
    // +2 = (Phase 8.12) the FRED monthly canonicalization pilot (fedFunds, usCpiInflation).
    // +1 = (Phase 8.17) the Yahoo Gold Monthly canonicalization pilot.
    // +26 = (Phase F.2f) the PBS CPI-by-group ledger series (1 headline + 12 indices + 12 weights + 1 total weight).
    expect(registry.size).toBe(sbpKeys.length + 3 + 3 + 2 + 1 + 26);
    for (const key of sbpKeys) {
      expect(registry.has(`sbp:${key}`)).toBe(true);
    }
    expect(registry.has("sbp:foodInflationUrban")).toBe(true);
    expect(registry.has("sbp:moneySupplyM2YoyGrowth")).toBe(true);
    expect(registry.has("sbp-forex-arch:netLiquidReserves")).toBe(true);
    expect(registry.has("worldbank:gdpGrowthPak")).toBe(true);
    expect(registry.has("worldbank:gdpGrowthIndia")).toBe(true);
    expect(registry.has("worldbank:gdpGrowthBangladesh")).toBe(true);
    expect(registry.has("fred:fedFunds")).toBe(true);
    expect(registry.has("fred:usCpiInflation")).toBe(true);
    expect(registry.has("yahoo:goldMonthly")).toBe(true);
  });

  it("every World Bank pilot entry declares annual cadence, the world-bank provider, and honestly expects sourceUpdatedAt but not releaseDate", () => {
    for (const seriesId of ["worldbank:gdpGrowthPak", "worldbank:gdpGrowthIndia", "worldbank:gdpGrowthBangladesh"]) {
      const def = getSeriesDefinition(seriesId);
      expect(def).not.toBeNull();
      expect(def?.cadence).toBe("annual");
      expect(def?.provider).toBe("world-bank");
      expect(def?.graceDays).toBe(450);
      expect(def?.expectsReleaseDate).toBe(false);
      expect(def?.expectsSourceUpdatedAt).toBe(true);
    }
  });

  it("every Phase 8.12 FRED pilot entry declares monthly cadence, the fred provider, the reused-and-validated graceDays=40, and honestly expects neither releaseDate nor sourceUpdatedAt", () => {
    for (const seriesId of ["fred:fedFunds", "fred:usCpiInflation"]) {
      const def = getSeriesDefinition(seriesId);
      expect(def).not.toBeNull();
      expect(def?.cadence).toBe("monthly");
      expect(def?.provider).toBe("fred");
      expect(def?.graceDays).toBe(40);
      expect(def?.expectsReleaseDate).toBe(false);
      expect(def?.expectsSourceUpdatedAt).toBe(false);
      expect(def?.marketType).toBeUndefined(); // neither pilot series has a tradeable market session
    }
  });

  it("no daily-cadence FRED series is registered — the Phase 8.11 audit's daily graceDays policy block remains unresolved and out of Phase 8.12 scope", () => {
    const registry = getSeriesRegistry();
    for (const [, def] of registry) {
      if (def.provider === "fred") {
        expect(def.cadence).not.toBe("daily");
      }
    }
    expect(registry.has("fred:dgs10")).toBe(false);
    expect(registry.has("fred:dff")).toBe(false);
  });

  it("the Phase 8.17 Yahoo Gold Monthly entry declares monthly cadence, the yahoo-finance provider, the reused graceDays=40, no marketType, and honestly expects neither releaseDate nor sourceUpdatedAt", () => {
    const def = getSeriesDefinition("yahoo:goldMonthly");
    expect(def).not.toBeNull();
    expect(def?.cadence).toBe("monthly");
    expect(def?.provider).toBe("yahoo-finance");
    expect(def?.graceDays).toBe(40);
    expect(def?.marketType).toBeUndefined();
    expect(def?.expectsReleaseDate).toBe(false);
    expect(def?.expectsSourceUpdatedAt).toBe(false);
  });

  it("no Silver/DXY/FX Yahoo series is registered — the Phase 8.17 pilot is gold-only", () => {
    const registry = getSeriesRegistry();
    for (const [, def] of registry) {
      if (def.provider === "yahoo-finance") {
        expect(def.seriesId).toBe("yahoo:goldMonthly");
      }
    }
    expect(registry.has("yahoo:silverMonthly")).toBe(false);
    expect(registry.has("yahoo:dxyMonthly")).toBe(false);
  });

  describe("Phase F.2f: the 26 PBS CPI ledger series", () => {
    it("registers exactly the 26 keys the adapter writes, no more and no fewer", () => {
      const pbs = [...getSeriesRegistry().values()].filter((d) => d.provider === "pbs-sdmx").map((d) => d.seriesId).sort();
      expect(pbs).toEqual([...PBS_CPI_INDICATOR_KEYS].sort());
      expect(pbs).toHaveLength(26);
    });

    it("every entry: monthly, the reused graceDays=40, honestly expects sourceUpdatedAt (the adapter fills it) but NOT releaseDate (the file has none), no marketType", () => {
      for (const key of PBS_CPI_INDICATOR_KEYS) {
        const def = getSeriesDefinition(key);
        expect(def, key).not.toBeNull();
        expect(def).toEqual({ seriesId: key, provider: "pbs-sdmx", cadence: "monthly", graceDays: 40, expectsReleaseDate: false, expectsSourceUpdatedAt: true });
      }
    });

    it("the grace figure is the SAME constant every other monthly entry uses — no new policy number was introduced", () => {
      const monthlyGrace = new Set([...getSeriesRegistry().values()].filter((d) => d.cadence === "monthly" && d.provider !== "sbp-easydata").map((d) => d.graceDays));
      expect([...monthlyGrace]).toEqual([40]);
    });

    it("the other providers' entries are unchanged (sampled): SBP, World Bank, FRED and Yahoo Gold keep their definitions", () => {
      expect(getSeriesDefinition("sbp:usdPkr")?.provider).toBe("sbp-easydata");
      expect(getSeriesDefinition("worldbank:gdpGrowthPak")).toMatchObject({ cadence: "annual", graceDays: 450 });
      expect(getSeriesDefinition("fred:fedFunds")).toMatchObject({ cadence: "monthly", graceDays: 40, expectsSourceUpdatedAt: false });
      expect(getSeriesDefinition("yahoo:goldMonthly")).toMatchObject({ cadence: "monthly", graceDays: 40 });
    });

    it("the registry stays light: it imports the dependency-free series constants, never the XML adapter (it sits in a client-bundle chain)", () => {
      const src = readFileSync(join(__dirname, "seriesRegistry.ts"), "utf-8");
      expect(src).toContain('from "@/lib/providers/pbsCpiSeries"');
      expect(src).not.toMatch(/pbsCpiGroupsAdapter|pbsGroups|ingestionOrchestrator/);
      const constants = readFileSync(join(__dirname, "..", "providers", "pbsCpiSeries.ts"), "utf-8");
      expect([...constants.matchAll(/^import /gm)]).toHaveLength(0);
    });

    it("the adapter re-exports the SAME objects (one definition, not two that could drift)", () => {
      expect(adapter.PBS_CPI_SERIES).toBe(PBS_CPI_SERIES);
      expect(adapter.PBS_CPI_INDICATOR_KEYS).toBe(PBS_CPI_INDICATOR_KEYS);
      expect(adapter.PBS_SDMX_PROVIDER_ID).toBe(PBS_SDMX_PROVIDER_ID);
      expect(PBS_CPI_GROUP_COUNT).toBe(CPI_GROUP_COUNT);
    });

    it("the EXISTING freshness engine, unchanged, gives these definitions a sensible verdict on the real production observation (2026-10, Prepared 3 Nov, ingested 6 Nov)", async () => {
      const { evaluateFreshness } = await import("./freshnessEngine");
      const def = getSeriesDefinition("pbs:cpiIndexNational") as NonNullable<ReturnType<typeof getSeriesDefinition>>;
      const obs = { observationPeriod: "2026-10-31", value: 307.6230055276665, releaseDate: null, sourceUpdatedAt: "2026-11-03T06:38:35Z", fetchedAt: "2026-11-06T17:29:30Z", vintage: "2026-11-06T17:29:30Z" };
      const soon = evaluateFreshness(obs, def, { now: new Date("2026-11-15T12:00:00Z") });
      const muchLater = evaluateFreshness(obs, def, { now: new Date("2027-01-20T12:00:00Z") });
      expect(soon.severity).toBe("healthy"); // nothing wrong a fortnight after the release
      expect(muchLater.state).toBe("stale"); // far past one release cycle plus the 40-day grace, with nothing newer ingested
      expect(muchLater.severity).toBe("problem");
      // releaseDate is genuinely null for this source and the definition says so: that must not be held against it
      expect(def.expectsReleaseDate).toBe(false);
      expect(soon.reasonCode).not.toMatch(/release-date/i);
    });
  });

  it("returns null for an unknown series id rather than throwing", () => {
    expect(getSeriesDefinition("nonexistent:series")).toBeNull();
  });

  it("only usdPkr among SBP indicators declares a marketType", () => {
    for (const key of getAllSbpIndicatorKeys()) {
      const def = getSbpSeriesDefinition(key);
      if (key === "usdPkr") {
        expect(def.marketType).toBe("forex");
      } else {
        expect(def.marketType).toBeUndefined();
      }
    }
  });

  it("applies the documented grace-day overrides for policyRate, pibYield3y, and lsm", () => {
    expect(getSbpSeriesDefinition("policyRate").graceDays).toBe(120);
    expect(getSbpSeriesDefinition("pibYield3y").graceDays).toBe(90);
    expect(getSbpSeriesDefinition("lsm").graceDays).toBe(75);
  });

  it("every SBP entry honestly declares it does not expect release_date or source_updated_at from the source", () => {
    for (const key of getAllSbpIndicatorKeys()) {
      const def = getSbpSeriesDefinition(key);
      expect(def.expectsReleaseDate).toBe(false);
      expect(def.expectsSourceUpdatedAt).toBe(false);
    }
  });

  it("every SBP entry uses the sbp-easydata provider id", () => {
    for (const key of getAllSbpIndicatorKeys()) {
      expect(getSbpSeriesDefinition(key).provider).toBe("sbp-easydata");
    }
  });

  it("seriesId is provider-qualified, matching canonical_observations.indicator_key's convention", () => {
    const def = getSbpSeriesDefinition("usdPkr");
    expect(def.seriesId).toBe("sbp:usdPkr");
  });
});
