import { describe, expect, it } from "vitest";
import { evaluateRequiredProviders, type ProviderHealthInput } from "./providerHealth";

const COUNTRIES = ["PAK", "IND", "BGD", "LKA"];
const series = (...codes: string[]) => Object.fromEntries(codes.map((c) => [c, [{ year: 2025, value: 3.5 }]]));

function input(over: Partial<ProviderHealthInput> = {}): ProviderHealthInput {
  return { panelLoaded: true, panelIssues: [], groupsBuilt: true, intl: { series: series(...COUNTRIES) }, expectedCountries: COUNTRIES, ...over };
}

describe("evaluateRequiredProviders", () => {
  it("reports nothing when both providers are complete", () => {
    expect(evaluateRequiredProviders(input())).toEqual([]);
  });

  it("reports PBS when the file did not load, with the parser's own reasons", () => {
    const f = evaluateRequiredProviders(input({ panelLoaded: false, groupsBuilt: false, panelIssues: ["PBS CPI file request returned HTTP 403."] }));
    expect(f).toEqual([{ provider: "PBS CPI file", reason: "PBS CPI file request returned HTTP 403." }]);
  });

  it("reports PBS when the file failed its integrity checks", () => {
    const f = evaluateRequiredProviders(input({ panelLoaded: false, groupsBuilt: false, panelIssues: ["The group indices do not reproduce the headline index: worst gap 1.6 index points in 2026-01 (limit 0.05)."] }));
    expect(f[0].reason).toContain("do not reproduce the headline index");
  });

  it("reports PBS when the file is valid but too short to decompose", () => {
    const f = evaluateRequiredProviders(input({ groupsBuilt: false }));
    expect(f).toEqual([{ provider: "PBS CPI file", reason: "The file holds too few months to compute a year-on-year decomposition." }]);
  });

  it("gives a reason even when the parser supplied none", () => {
    expect(evaluateRequiredProviders(input({ panelLoaded: false, groupsBuilt: false }))[0].reason).toBe("No usable data was returned.");
  });

  it("reports the World Bank when the request produced nothing", () => {
    expect(evaluateRequiredProviders(input({ intl: null }))).toEqual([{ provider: "World Bank", reason: "The request failed or returned no usable data." }]);
  });

  it("reports a World Bank response that drops a country the page compares", () => {
    const f = evaluateRequiredProviders(input({ intl: { series: series("PAK", "IND", "BGD") } }));
    expect(f).toEqual([{ provider: "World Bank", reason: "No data returned for: LKA." }]);
  });

  it("treats a country whose every value is null as missing", () => {
    const f = evaluateRequiredProviders(input({ intl: { series: { ...series("PAK", "IND", "BGD"), LKA: [{ year: 2024, value: null }, { year: 2025, value: null }] } } }));
    expect(f[0].reason).toBe("No data returned for: LKA.");
  });

  it("accepts a country with a real negative value (deflation is data, not absence)", () => {
    expect(evaluateRequiredProviders(input({ intl: { series: { ...series("PAK", "IND", "BGD"), LKA: [{ year: 2025, value: -4.76 }] } } }))).toEqual([]);
  });

  it("reports both providers when both fail", () => {
    const f = evaluateRequiredProviders(input({ panelLoaded: false, groupsBuilt: false, panelIssues: ["x"], intl: null }));
    expect(f.map((x) => x.provider)).toEqual(["PBS CPI file", "World Bank"]);
  });
});
