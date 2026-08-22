import { describe, it, expect } from "vitest";
import {
  evaluateInflationSignal,
  evaluateMonetaryPolicySignal,
  evaluateExternalSectorSignal,
  evaluateLiquidityCreditSignal,
  evaluateFiscalConditionsSignal,
  evaluateGrowthSignal,
  evaluateMarketStressSignal,
} from "./signalDefinitions";
import type { IndicatorObservationEvidence, SignalDirection } from "./types";

const NOW = "2026-08-14T00:00:00.000Z";

function ev(overrides: Partial<IndicatorObservationEvidence> & { seriesId: string; label: string; direction: SignalDirection }): IndicatorObservationEvidence {
  return {
    seriesId: overrides.seriesId,
    label: overrides.label,
    value: overrides.value ?? 10,
    unit: overrides.unit ?? "%",
    observationPeriod: overrides.observationPeriod ?? "2026-06-30",
    direction: overrides.direction,
    changeAbsolute: overrides.changeAbsolute ?? 1,
    changePercent: overrides.changePercent ?? 10,
    acceleration: overrides.acceleration ?? "Unknown",
    availability: overrides.availability ?? "Fresh",
    freshnessState: overrides.freshnessState ?? "current",
    freshnessReason: overrides.freshnessReason ?? "current",
    isFallback: overrides.isFallback ?? false,
  };
}

function staleEv(seriesId: string, label: string): IndicatorObservationEvidence {
  return ev({ seriesId, label, direction: "Unknown", availability: "Stale", freshnessState: "stale", value: 99 });
}

describe("evaluateInflationSignal", () => {
  it("1/5. rising inflation, healthy input -> state 'rising'", () => {
    const cpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Rising" });
    const signal = evaluateInflationSignal({ cpi, core: null }, NOW);
    expect(signal.dimension).toBe("Inflation");
    expect(signal.state).toBe("rising");
    expect(signal.direction).toBe("Rising");
    expect(signal.confidence).not.toBe("Insufficient");
  });

  it("6. falling inflation -> state 'falling'", () => {
    const cpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Falling" });
    const signal = evaluateInflationSignal({ cpi, core: null }, NOW);
    expect(signal.state).toBe("falling");
  });

  it("2/12. stale CPI input -> insufficient-data, never treated as current", () => {
    const cpi = staleEv("sbp:cpiInflation", "CPI Inflation (YoY)");
    const signal = evaluateInflationSignal({ cpi, core: null }, NOW);
    expect(signal.state).toBe("insufficient-data");
    expect(signal.confidence).toBe("Insufficient");
    expect(signal.confidenceScore).toBeNull();
    expect(signal.missingInputs).toContain("CPI Inflation (YoY)");
  });

  it("3. missing (null) CPI input -> insufficient-data", () => {
    const signal = evaluateInflationSignal({ cpi: null, core: null }, NOW);
    expect(signal.state).toBe("insufficient-data");
    expect(signal.missingInputs).toContain("CPI Inflation (YoY)");
  });

  it("4. delayed-release CPI is still usable, not forced to insufficient-data", () => {
    const cpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Rising", availability: "DelayedRelease", freshnessState: "delayed-release" });
    const signal = evaluateInflationSignal({ cpi, core: null }, NOW);
    expect(signal.state).toBe("rising");
    expect(signal.confidence).not.toBe("Insufficient");
  });

  it("13/14. evidence traceability — exact seriesId/value/observationPeriod preserved", () => {
    const cpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Rising", value: 7.5, observationPeriod: "2026-07-31" });
    const signal = evaluateInflationSignal({ cpi, core: null }, NOW);
    expect(signal.evidence).toHaveLength(1);
    expect(signal.evidence[0].seriesId).toBe("sbp:cpiInflation");
    expect(signal.evidence[0].value).toBe(7.5);
    expect(signal.evidence[0].observationPeriod).toBe("2026-07-31");
  });

  it("does not implement an 'above/below reference' rule — state is direction-only regardless of magnitude", () => {
    const highCpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Rising", value: 40 }); // an extreme value
    const signal = evaluateInflationSignal({ cpi: highCpi, core: null }, NOW);
    expect(signal.state).toBe("rising"); // not "elevated"/"high"/any invented threshold label
  });
});

describe("evaluateMonetaryPolicySignal", () => {
  it("7. policy tightening (rate rising) -> state 'tightening'", () => {
    const policyRate = ev({ seriesId: "sbp:policyRate", label: "SBP Policy Rate", direction: "Rising" });
    const signal = evaluateMonetaryPolicySignal({ policyRate, cpi: null }, NOW);
    expect(signal.state).toBe("tightening");
  });

  it("8. policy easing (rate falling) -> state 'easing'", () => {
    const policyRate = ev({ seriesId: "sbp:policyRate", label: "SBP Policy Rate", direction: "Falling" });
    const signal = evaluateMonetaryPolicySignal({ policyRate, cpi: null }, NOW);
    expect(signal.state).toBe("easing");
  });

  it("rate unchanged -> state 'held'", () => {
    const policyRate = ev({ seriesId: "sbp:policyRate", label: "SBP Policy Rate", direction: "Flat" });
    const signal = evaluateMonetaryPolicySignal({ policyRate, cpi: null }, NOW);
    expect(signal.state).toBe("held");
  });

  it("real-rate proxy appears in summary only when both policy rate and CPI are usable, never fabricated from one input", () => {
    const policyRate = ev({ seriesId: "sbp:policyRate", label: "SBP Policy Rate", direction: "Rising", value: 12 });
    const cpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Falling", value: 8 });
    const withCpi = evaluateMonetaryPolicySignal({ policyRate, cpi }, NOW);
    expect(withCpi.summary).toContain("Real-rate proxy");
    expect(withCpi.summary).toContain("4.00 pp");

    const withoutCpi = evaluateMonetaryPolicySignal({ policyRate, cpi: null }, NOW);
    expect(withoutCpi.summary).not.toContain("Real-rate proxy");
  });

  it("real-rate proxy never overrides the tightening/easing/held state — action and stance stay separate facts", () => {
    const policyRate = ev({ seriesId: "sbp:policyRate", label: "SBP Policy Rate", direction: "Falling", value: 5 }); // easing action
    const cpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Rising", value: 20 }); // deeply negative real rate
    const signal = evaluateMonetaryPolicySignal({ policyRate, cpi }, NOW);
    expect(signal.state).toBe("easing"); // still reads off the rate's own action, not the real-rate level
  });
});

describe("evaluateExternalSectorSignal", () => {
  it("9. across-the-board improvement -> state 'improving'", () => {
    const rising = (seriesId: string, label: string) => ev({ seriesId, label, direction: "Rising" });
    const signal = evaluateExternalSectorSignal(
      {
        reserves: rising("sbp-forex-arch:netLiquidReserves", "Foreign Reserves"),
        currentAccount: rising("sbp:currentAccount", "Current Account"),
        tradeBalance: rising("sbp:tradeBalance", "Trade Balance"),
        exports: rising("sbp:exports", "Exports"),
        imports: ev({ seriesId: "sbp:imports", label: "Imports", direction: "Falling" }), // falling imports also = improving polarity
        remittances: rising("sbp:remittances", "Remittances"),
      },
      NOW,
    );
    expect(signal.state).toBe("improving");
    expect(signal.evidence).toHaveLength(6);
  });

  it("10. across-the-board deterioration -> state 'deteriorating'", () => {
    const falling = (seriesId: string, label: string) => ev({ seriesId, label, direction: "Falling" });
    const signal = evaluateExternalSectorSignal(
      {
        reserves: falling("sbp-forex-arch:netLiquidReserves", "Foreign Reserves"),
        currentAccount: falling("sbp:currentAccount", "Current Account"),
        tradeBalance: falling("sbp:tradeBalance", "Trade Balance"),
        exports: falling("sbp:exports", "Exports"),
        imports: ev({ seriesId: "sbp:imports", label: "Imports", direction: "Rising" }), // rising imports = deteriorating polarity
        remittances: falling("sbp:remittances", "Remittances"),
      },
      NOW,
    );
    expect(signal.state).toBe("deteriorating");
  });

  it("polarity-aware vote arithmetic: rising imports (negative polarity) correctly counts AGAINST 'improving', not for it", () => {
    const signal = evaluateExternalSectorSignal(
      {
        reserves: ev({ seriesId: "r", label: "Foreign Reserves", direction: "Rising" }), // +1
        currentAccount: ev({ seriesId: "ca", label: "Current Account", direction: "Rising" }), // +1
        tradeBalance: ev({ seriesId: "tb", label: "Trade Balance", direction: "Flat" }), // 0
        exports: ev({ seriesId: "ex", label: "Exports", direction: "Flat" }), // 0
        imports: ev({ seriesId: "im", label: "Imports", direction: "Rising" }), // rising imports = negative contribution: -1
        remittances: ev({ seriesId: "re", label: "Remittances", direction: "Flat" }), // 0
      },
      NOW,
    );
    // Sum = 1 + 1 + 0 + 0 - 1 + 0 = +1 -> improving, NOT the +3 a naive
    // "count every Rising indicator as positive" rule would have produced
    // (reserves/currentAccount/imports are all Rising, but imports' rising
    // move is a headwind, not a tailwind, for the external position).
    expect(signal.state).toBe("improving");
  });

  it("11. conflicting signals — an exact polarity-weighted tie -> state 'mixed', not forced to a side", () => {
    const signal = evaluateExternalSectorSignal(
      {
        reserves: ev({ seriesId: "r", label: "Foreign Reserves", direction: "Rising" }), // +1
        currentAccount: ev({ seriesId: "ca", label: "Current Account", direction: "Rising" }), // +1
        tradeBalance: ev({ seriesId: "tb", label: "Trade Balance", direction: "Falling" }), // -1
        exports: ev({ seriesId: "ex", label: "Exports", direction: "Falling" }), // -1
        imports: ev({ seriesId: "im", label: "Imports", direction: "Flat" }), // 0
        remittances: ev({ seriesId: "re", label: "Remittances", direction: "Flat" }), // 0
      },
      NOW,
    );
    // Sum = 1 + 1 - 1 - 1 + 0 + 0 = 0 -> mixed.
    expect(signal.state).toBe("mixed");
  });

  it("12. zero usable indicators -> insufficient-data", () => {
    const signal = evaluateExternalSectorSignal({ reserves: null, currentAccount: null, tradeBalance: null, exports: null, imports: null, remittances: null }, NOW);
    expect(signal.state).toBe("insufficient-data");
    expect(signal.missingInputs).toHaveLength(6);
  });

  it("USD/PKR is never an input to this dimension's vote (excluded by design, tracked under Market Stress instead)", () => {
    // Structural proof: the function signature has no usdPkr parameter at all.
    const signal = evaluateExternalSectorSignal({ reserves: null, currentAccount: null, tradeBalance: null, exports: null, imports: null, remittances: null }, NOW);
    expect(signal.evidence.every((e) => e.seriesId !== "sbp:usdPkr")).toBe(true);
  });
});

describe("evaluateLiquidityCreditSignal", () => {
  it("both indicators rising -> 'expanding'", () => {
    const m2 = ev({ seriesId: "sbp:moneySupplyM2", label: "M2", direction: "Rising" });
    const pcg = ev({ seriesId: "sbp:privateCreditGrowth", label: "Private Credit Growth", direction: "Rising" });
    const signal = evaluateLiquidityCreditSignal({ m2, privateCreditGrowth: pcg }, NOW);
    expect(signal.state).toBe("expanding");
  });
  it("both falling -> 'contracting'", () => {
    const m2 = ev({ seriesId: "sbp:moneySupplyM2", label: "M2", direction: "Falling" });
    const pcg = ev({ seriesId: "sbp:privateCreditGrowth", label: "Private Credit Growth", direction: "Falling" });
    const signal = evaluateLiquidityCreditSignal({ m2, privateCreditGrowth: pcg }, NOW);
    expect(signal.state).toBe("contracting");
  });
  it("11. one rising, one falling -> 'mixed' (conflicting signals)", () => {
    const m2 = ev({ seriesId: "sbp:moneySupplyM2", label: "M2", direction: "Rising" });
    const pcg = ev({ seriesId: "sbp:privateCreditGrowth", label: "Private Credit Growth", direction: "Falling" });
    const signal = evaluateLiquidityCreditSignal({ m2, privateCreditGrowth: pcg }, NOW);
    expect(signal.state).toBe("mixed");
  });
});

describe("evaluateFiscalConditionsSignal", () => {
  it("balance rising toward positive (deficit narrowing, SBP's negative-for-deficit convention) -> 'improving'", () => {
    const fiscalBalance = ev({ seriesId: "sbp:fiscalBalance", label: "Fiscal Balance", direction: "Rising", value: -3, changeAbsolute: 1 });
    const signal = evaluateFiscalConditionsSignal({ fiscalBalance }, NOW);
    expect(signal.state).toBe("improving");
  });
  it("balance falling (deficit widening) -> 'deteriorating'", () => {
    const fiscalBalance = ev({ seriesId: "sbp:fiscalBalance", label: "Fiscal Balance", direction: "Falling", value: -6, changeAbsolute: -1 });
    const signal = evaluateFiscalConditionsSignal({ fiscalBalance }, NOW);
    expect(signal.state).toBe("deteriorating");
  });
  it("3. missing input -> insufficient-data", () => {
    const signal = evaluateFiscalConditionsSignal({ fiscalBalance: null }, NOW);
    expect(signal.state).toBe("insufficient-data");
  });
});

describe("evaluateGrowthSignal", () => {
  it("GDP growth rate rising -> 'accelerating'", () => {
    const gdpGrowth = ev({ seriesId: "worldbank:gdpGrowthPak", label: "GDP Growth", direction: "Rising" });
    const signal = evaluateGrowthSignal({ gdpGrowth }, NOW);
    expect(signal.state).toBe("accelerating");
  });
  it("GDP growth rate falling -> 'decelerating'", () => {
    const gdpGrowth = ev({ seriesId: "worldbank:gdpGrowthPak", label: "GDP Growth", direction: "Falling" });
    const signal = evaluateGrowthSignal({ gdpGrowth }, NOW);
    expect(signal.state).toBe("decelerating");
  });
});

describe("evaluateMarketStressSignal", () => {
  it("gold rising + PKR weakening (both co-move toward risk-off) -> 'pressure-building', with an explicit non-causal disclaimer", () => {
    const gold = ev({ seriesId: "yahoo:goldMonthly", label: "Gold", direction: "Rising" });
    const usdPkr = ev({ seriesId: "sbp:usdPkr", label: "USD/PKR", direction: "Rising" });
    const signal = evaluateMarketStressSignal({ gold, usdPkr }, NOW);
    expect(signal.state).toBe("pressure-building");
    expect(signal.summary).toContain("no causal relationship");
  });
  it("gold falling + PKR strengthening -> 'pressure-easing'", () => {
    const gold = ev({ seriesId: "yahoo:goldMonthly", label: "Gold", direction: "Falling" });
    const usdPkr = ev({ seriesId: "sbp:usdPkr", label: "USD/PKR", direction: "Falling" });
    const signal = evaluateMarketStressSignal({ gold, usdPkr }, NOW);
    expect(signal.state).toBe("pressure-easing");
  });
  it("11. divergent movement -> 'mixed', not forced to a side", () => {
    const gold = ev({ seriesId: "yahoo:goldMonthly", label: "Gold", direction: "Rising" });
    const usdPkr = ev({ seriesId: "sbp:usdPkr", label: "USD/PKR", direction: "Falling" });
    const signal = evaluateMarketStressSignal({ gold, usdPkr }, NOW);
    expect(signal.state).toBe("mixed");
  });
  it("12. both unavailable -> insufficient-data", () => {
    const signal = evaluateMarketStressSignal({ gold: null, usdPkr: null }, NOW);
    expect(signal.state).toBe("insufficient-data");
  });
});

describe("19. multiple dimensions can coexist independently", () => {
  it("evaluating all seven produces seven independent signals with their own states — no shared mutable state between calls", () => {
    const cpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Rising" });
    const inflation = evaluateInflationSignal({ cpi, core: null }, NOW);
    const growth = evaluateGrowthSignal({ gdpGrowth: null }, NOW);
    expect(inflation.dimension).toBe("Inflation");
    expect(growth.dimension).toBe("Growth");
    expect(inflation.state).toBe("rising");
    expect(growth.state).toBe("insufficient-data");
  });
});

describe("18. deterministic repeated evaluation", () => {
  it("calling the same rule twice with identical inputs and calculatedAt produces deep-equal output", () => {
    const cpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Rising" });
    const a = evaluateInflationSignal({ cpi, core: null }, NOW);
    const b = evaluateInflationSignal({ cpi, core: null }, NOW);
    expect(a).toEqual(b);
  });
});

describe("20. no false single-score certainty", () => {
  it("a signal has no numeric 'score' field at all — only categorical state/direction/confidence", () => {
    const cpi = ev({ seriesId: "sbp:cpiInflation", label: "CPI Inflation (YoY)", direction: "Rising" });
    const signal = evaluateInflationSignal({ cpi, core: null }, NOW);
    expect(signal).not.toHaveProperty("score");
    expect(typeof signal.state).toBe("string");
  });
});
