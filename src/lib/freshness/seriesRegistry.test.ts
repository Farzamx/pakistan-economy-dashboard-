import { describe, it, expect } from "vitest";
import { getSeriesRegistry, getSeriesDefinition, getSbpSeriesDefinition } from "./seriesRegistry";
import { getAllSbpIndicatorKeys } from "@/lib/data/sbp";

describe("seriesRegistry", () => {
  it("registers every SBP indicator plus the extra non-SbpIndicatorKey series plus the Phase 8.3 World Bank pilot plus the Phase 8.12 FRED pilot plus the Phase 8.17 Yahoo Gold pilot", () => {
    const registry = getSeriesRegistry();
    const sbpKeys = getAllSbpIndicatorKeys();
    // +3 = foodInflationUrban, moneySupplyM2YoyGrowth, and (Phase 6) the
    // Forex_Arch.xlsx net-liquid-reserves series that fxReserves.ts serves.
    // +3 = (Phase 8.3) the World Bank GDP-growth pilot (Pakistan/India/Bangladesh).
    // +2 = (Phase 8.12) the FRED monthly canonicalization pilot (fedFunds, usCpiInflation).
    // +1 = (Phase 8.17) the Yahoo Gold Monthly canonicalization pilot.
    expect(registry.size).toBe(sbpKeys.length + 3 + 3 + 2 + 1);
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
