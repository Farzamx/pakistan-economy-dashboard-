import { describe, it, expect } from "vitest";
import { getSeriesRegistry, getSeriesDefinition, getSbpSeriesDefinition } from "./seriesRegistry";
import { getAllSbpIndicatorKeys } from "@/lib/data/sbp";

describe("seriesRegistry", () => {
  it("registers every SBP indicator plus the extra non-SbpIndicatorKey series plus the Phase 8.3 World Bank pilot", () => {
    const registry = getSeriesRegistry();
    const sbpKeys = getAllSbpIndicatorKeys();
    // +3 = foodInflationUrban, moneySupplyM2YoyGrowth, and (Phase 6) the
    // Forex_Arch.xlsx net-liquid-reserves series that fxReserves.ts serves.
    // +3 = (Phase 8.3) the World Bank GDP-growth pilot (Pakistan/India/Bangladesh).
    expect(registry.size).toBe(sbpKeys.length + 3 + 3);
    for (const key of sbpKeys) {
      expect(registry.has(`sbp:${key}`)).toBe(true);
    }
    expect(registry.has("sbp:foodInflationUrban")).toBe(true);
    expect(registry.has("sbp:moneySupplyM2YoyGrowth")).toBe(true);
    expect(registry.has("sbp-forex-arch:netLiquidReserves")).toBe(true);
    expect(registry.has("worldbank:gdpGrowthPak")).toBe(true);
    expect(registry.has("worldbank:gdpGrowthIndia")).toBe(true);
    expect(registry.has("worldbank:gdpGrowthBangladesh")).toBe(true);
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
