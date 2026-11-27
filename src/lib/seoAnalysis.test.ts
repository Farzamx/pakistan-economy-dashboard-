import { describe, expect, it } from "vitest";
import { trendAnalysis } from "./seoAnalysis";

const pts = [
  { month: "Jan 26", value: 10 },
  { month: "Feb 26", value: 14 },
  { month: "Mar 26", value: 9 },
  { month: "Apr 26", value: 12 },
];

describe("trendAnalysis", () => {
  it("states the window, the change as a percentage of the start, and the high and low with their labels", () => {
    expect(trendAnalysis(pts, { format: (v) => `$${v.toFixed(1)}B`, subject: "reserves" })).toEqual([
      "In the 4 observations shown (Jan 26 to Apr 26), reserves went from $10.0B to $12.0B, up 20.0%.",
      "Its highest reading in that window was $14.0B (Feb 26) and its lowest $9.0B (Mar 26).",
    ]);
  });
  it("uses an explicit difference unit for rates", () => {
    expect(trendAnalysis(pts, { format: (v) => `${v}%`, subject: "growth", differenceUnit: "percentage points" })[0]).toMatch(/up 2\.00 percentage points\.$/);
  });
  it("says nothing with fewer than two observations, and skips non-numbers", () => {
    expect(trendAnalysis([pts[0]], { format: String, subject: "x" })).toEqual([]);
    expect(trendAnalysis(null, { format: String, subject: "x" })).toEqual([]);
    expect(trendAnalysis([pts[0], { month: "x", value: NaN }], { format: String, subject: "x" })).toEqual([]);
  });
  it("omits the high/low sentence when the first is the low and the last is the high", () => {
    expect(trendAnalysis([{ month: "a", value: 1 }, { month: "b", value: 2 }], { format: String, subject: "x" })).toHaveLength(1);
  });
});
