import { describe, it, expect } from "vitest";
import { computeDirection, computeChange, computeAcceleration, summarizeTrend } from "./trendAnalysis";

describe("computeDirection", () => {
  it("Rising when latest > previous", () => {
    expect(computeDirection(10, 5)).toBe("Rising");
  });
  it("Falling when latest < previous", () => {
    expect(computeDirection(5, 10)).toBe("Falling");
  });
  it("Flat when exactly equal — no epsilon/threshold applied", () => {
    expect(computeDirection(5, 5)).toBe("Flat");
  });
  it("Unknown when either input is null — never guesses a direction", () => {
    expect(computeDirection(null, 5)).toBe("Unknown");
    expect(computeDirection(5, null)).toBe("Unknown");
    expect(computeDirection(null, null)).toBe("Unknown");
  });
  it("a change one unit off zero is Rising/Falling, never rounded to Flat (no invented epsilon)", () => {
    expect(computeDirection(5.001, 5)).toBe("Rising");
    expect(computeDirection(4.999, 5)).toBe("Falling");
  });
});

describe("computeChange", () => {
  it("computes absolute and percent change", () => {
    const result = computeChange(110, 100);
    expect(result.direction).toBe("Rising");
    expect(result.absolute).toBe(10);
    expect(result.percent).toBeCloseTo(10, 5);
  });
  it("percent is null when previous is 0 (undefined division, not fabricated Infinity)", () => {
    const result = computeChange(5, 0);
    expect(result.absolute).toBe(5);
    expect(result.percent).toBeNull();
  });
  it("both fields null when either input is null", () => {
    const result = computeChange(null, 100);
    expect(result.absolute).toBeNull();
    expect(result.percent).toBeNull();
    expect(result.direction).toBe("Unknown");
  });
});

describe("computeAcceleration", () => {
  it("Accelerating when latest change magnitude exceeds prior change magnitude, same direction", () => {
    expect(computeAcceleration(5, 2)).toBe("Accelerating");
  });
  it("Decelerating when latest change magnitude is smaller", () => {
    expect(computeAcceleration(1, 4)).toBe("Decelerating");
  });
  it("Steady when magnitudes are equal (including both zero)", () => {
    expect(computeAcceleration(3, 3)).toBe("Steady");
    expect(computeAcceleration(0, 0)).toBe("Steady");
  });
  it("Unknown when either change is null", () => {
    expect(computeAcceleration(null, 2)).toBe("Unknown");
    expect(computeAcceleration(2, null)).toBe("Unknown");
  });
});

describe("summarizeTrend", () => {
  it("returns nulls when there are zero points — never fabricates a trend from nothing", () => {
    const s = summarizeTrend([]);
    expect(s.latestValue).toBeNull();
    expect(s.previousValue).toBeNull();
    expect(s.change.direction).toBe("Unknown");
    expect(s.acceleration).toBe("Unknown");
  });
  it("returns latestValue only, Unknown change, with exactly one point", () => {
    const s = summarizeTrend([{ value: 42 }]);
    expect(s.latestValue).toBe(42);
    expect(s.previousValue).toBeNull();
    expect(s.change.direction).toBe("Unknown");
  });
  it("computes change with two points, acceleration stays Unknown (needs 3)", () => {
    const s = summarizeTrend([{ value: 10 }, { value: 15 }]);
    expect(s.latestValue).toBe(15);
    expect(s.previousValue).toBe(10);
    expect(s.change.direction).toBe("Rising");
    expect(s.change.absolute).toBe(5);
    expect(s.acceleration).toBe("Unknown");
  });
  it("computes acceleration with three or more points, oldest-first convention", () => {
    // 10 -> 12 (change +2) -> 18 (change +6): accelerating
    const s = summarizeTrend([{ value: 10 }, { value: 12 }, { value: 18 }]);
    expect(s.change.absolute).toBe(6);
    expect(s.acceleration).toBe("Accelerating");
  });
  it("real-world-shaped points (extra fields like TrendPoint's `month`) are accepted structurally", () => {
    const s = summarizeTrend([
      { month: "Jan", value: 1 } as { month: string; value: number },
      { month: "Feb", value: 2 } as { month: string; value: number },
    ]);
    expect(s.latestValue).toBe(2);
  });
});
