import { describe, expect, it } from "vitest";
import { extentWithZero, formatPercent, formatPp, formatValue, linearScale, niceStep, niceTicks } from "./scales";
import { squarify, type Rect } from "./treemapLayout";

describe("linearScale", () => {
  it("maps the domain ends to the range ends and interpolates linearly", () => {
    const s = linearScale([0, 10], [100, 200]);
    expect(s(0)).toBe(100);
    expect(s(10)).toBe(200);
    expect(s(2.5)).toBe(125);
  });

  it("supports an inverted range (SVG y grows downward)", () => {
    const y = linearScale([-5, 15], [300, 0]);
    expect(y(15)).toBe(0);
    expect(y(-5)).toBe(300);
    expect(y(0)).toBe(225);
  });

  it("does not divide by zero on a flat domain", () => {
    expect(linearScale([4, 4], [0, 100])(4)).toBe(50);
  });
});

describe("niceStep / niceTicks", () => {
  it("rounds a raw step up to 1, 2, 2.5, 5 or 10 × a power of ten", () => {
    expect(niceStep(0.8)).toBe(1);
    expect(niceStep(1.7)).toBe(2);
    expect(niceStep(2.2)).toBe(2.5);
    expect(niceStep(3.1)).toBe(5);
    expect(niceStep(7)).toBe(10);
    expect(niceStep(34)).toBe(50);
  });

  it("covers the data range: first tick <= min, last tick >= max", () => {
    for (const [min, max] of [[0.3, 38], [-1.9, 48.1], [3.2, 4.9], [-4.76, 49.72], [0, 0.4]] as const) {
      const t = niceTicks(min, max, 5);
      expect(t[0], `${min}..${max}`).toBeLessThanOrEqual(min);
      expect(t.at(-1)!, `${min}..${max}`).toBeGreaterThanOrEqual(max);
    }
  });

  it("includes zero when the range spans it, so a baseline can be drawn", () => {
    expect(niceTicks(-3, 12)).toContain(0);
  });

  it("is evenly spaced and ascending", () => {
    const t = niceTicks(0.3, 38, 5);
    const steps = t.slice(1).map((v, i) => Number((v - t[i]).toFixed(6)));
    expect(new Set(steps).size).toBe(1);
    expect(steps[0]).toBeGreaterThan(0);
  });

  it("handles a flat series by giving the axis some room", () => {
    const t = niceTicks(5, 5);
    expect(t[0]).toBeLessThan(5);
    expect(t.at(-1)!).toBeGreaterThan(5);
  });
});

describe("extentWithZero", () => {
  it("always includes zero", () => {
    expect(extentWithZero([3, 9])).toEqual([0, 9]);
    expect(extentWithZero([-2, -1])).toEqual([-2, 0]);
    expect(extentWithZero([-2, 5])).toEqual([-2, 5]);
    expect(extentWithZero([])).toEqual([0, 1]);
  });
});

describe("number formatting", () => {
  it("uses a true minus sign and never prints negative zero", () => {
    expect(formatValue(-0.8)).toBe("−0.8");
    expect(formatValue(-0.04)).toBe("0.0");
    expect(formatValue(0)).toBe("0.0");
  });

  it("signs changes, not levels", () => {
    expect(formatValue(1.94, 1, { signed: true })).toBe("+1.9");
    expect(formatValue(1.94)).toBe("1.9");
    expect(formatPp(-0.8)).toBe("−0.8 pp");
    expect(formatPp(0)).toBe("0.0 pp");
    expect(formatPercent(9.6)).toBe("9.6%");
    expect(formatPercent(-4.76, 2)).toBe("−4.76%");
  });
});

describe("squarify (treemap layout)", () => {
  const bounds: Rect = { x: 0, y: 0, w: 600, h: 300 };
  const weights = [34.58, 1.02, 8.6, 23.63, 4.1, 2.79, 5.91, 2.21, 1.59, 3.79, 6.92, 4.87];
  const items = weights.map((value, i) => ({ id: `g${i + 1}`, value }));
  const cells = squarify(items, bounds);

  it("returns one cell per item", () => {
    expect(cells).toHaveLength(12);
    expect(new Set(cells.map((c) => c.id)).size).toBe(12);
  });

  it("gives each cell an area proportional to its value", () => {
    const total = weights.reduce((s, v) => s + v, 0);
    for (const c of cells) expect((c.w * c.h) / (bounds.w * bounds.h), c.id).toBeCloseTo(c.value / total, 9);
  });

  it("fills the bounds exactly: areas sum to the whole", () => {
    expect(cells.reduce((s, c) => s + c.w * c.h, 0)).toBeCloseTo(bounds.w * bounds.h, 6);
  });

  it("keeps every cell inside the bounds", () => {
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(-1e-9);
      expect(c.y).toBeGreaterThanOrEqual(-1e-9);
      expect(c.x + c.w).toBeLessThanOrEqual(bounds.w + 1e-9);
      expect(c.y + c.h).toBeLessThanOrEqual(bounds.h + 1e-9);
    }
  });

  it("never overlaps two cells", () => {
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i];
        const b = cells[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(ox > 1e-6 && oy > 1e-6, `${a.id} overlaps ${b.id}`).toBe(false);
      }
  });

  it("puts the largest item first (largest area, top-left)", () => {
    expect(cells[0].id).toBe("g1");
    expect(cells[0].x).toBe(0);
    expect(cells[0].y).toBe(0);
  });

  it("is deterministic and drops non-positive values rather than inventing area for them", () => {
    expect(squarify(items, bounds)).toEqual(cells);
    const withZero = squarify([...items, { id: "zero", value: 0 }, { id: "neg", value: -3 }], bounds);
    expect(withZero.map((c) => c.id)).not.toContain("zero");
    expect(withZero.map((c) => c.id)).not.toContain("neg");
    expect(withZero).toHaveLength(12);
  });

  it("returns nothing for empty input or empty bounds", () => {
    expect(squarify([], bounds)).toEqual([]);
    expect(squarify(items, { x: 0, y: 0, w: 0, h: 100 })).toEqual([]);
  });

  it("keeps cells reasonably square (worst aspect ratio under 6 for the CPI weights)", () => {
    const worstAspect = Math.max(...cells.map((c) => Math.max(c.w / c.h, c.h / c.w)));
    expect(worstAspect).toBeLessThan(6);
  });
});
