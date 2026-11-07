// Colour validation for the analytical-page palette, computed — not eyeballed.
// Also asserts globals.css carries exactly the values defined in vizPalette.ts.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio, deltaE, lightness, worstCaseDeltaE } from "./colorMath";
import { INK, MOM_SCALE, SCALES, SERIES_COLORS, SERIES_ORDER, SURFACE, YOY_SCALE, classify, heatTokenNames, type Theme } from "./vizPalette";

const THEMES: Theme[] = ["light", "dark"];

describe("categorical series colours", () => {
  for (const theme of THEMES) {
    const colors = SERIES_ORDER.map((n) => SERIES_COLORS[theme][n]);

    it(`${theme}: every colour clears 3:1 against the chart surface (WCAG 1.4.11, graphical objects)`, () => {
      for (const [i, c] of colors.entries()) {
        expect(contrastRatio(c, SURFACE[theme]), `${SERIES_ORDER[i]} ${c}`).toBeGreaterThanOrEqual(3);
      }
    });

    it(`${theme}: adjacent series stay clearly different to normal vision (ΔE ≥ 15) and under colour-blindness (ΔE ≥ 8)`, () => {
      for (let i = 1; i < colors.length; i++) {
        const w = worstCaseDeltaE(colors[i - 1], colors[i]);
        const pair = `${SERIES_ORDER[i - 1]}/${SERIES_ORDER[i]} (${colors[i - 1]} vs ${colors[i]}) worst under ${w.under}: ${w.value.toFixed(1)}`;
        expect(deltaE(colors[i - 1], colors[i]), pair).toBeGreaterThanOrEqual(15);
        expect(w.value, pair).toBeGreaterThanOrEqual(8);
      }
    });

    it(`${theme}: no two series colours are near-identical, even non-adjacent ones (ΔE ≥ 10 normal vision)`, () => {
      for (let i = 0; i < colors.length; i++)
        for (let j = i + 1; j < colors.length; j++)
          expect(deltaE(colors[i], colors[j]), `${SERIES_ORDER[i]}/${SERIES_ORDER[j]}`).toBeGreaterThanOrEqual(10);
    });
  }
});

describe("heat scales", () => {
  for (const scale of Object.values(SCALES)) {
    for (const theme of THEMES) {
      it(`${scale.id}/${theme}: cell text clears 4.5:1 on every class (WCAG 1.4.3)`, () => {
        for (const c of scale.classes) {
          expect(contrastRatio(c.fill[theme], c.ink[theme]), `${c.id} ${c.fill[theme]} / ${c.ink[theme]}`).toBeGreaterThanOrEqual(4.5);
        }
      });

      it(`${scale.id}/${theme}: neighbouring classes are distinguishable (ΔE ≥ 6 normal vision, ≥ 3.5 colour-blind)`, () => {
        for (let i = 1; i < scale.classes.length; i++) {
          const a = scale.classes[i - 1].fill[theme];
          const b = scale.classes[i].fill[theme];
          const w = worstCaseDeltaE(a, b);
          expect(deltaE(a, b), `${scale.classes[i - 1].id}→${scale.classes[i].id}`).toBeGreaterThanOrEqual(6);
          expect(w.value, `${scale.classes[i - 1].id}→${scale.classes[i].id} under ${w.under}`).toBeGreaterThanOrEqual(3.5);
        }
      });

      it(`${scale.id}/${theme}: every class is distinguishable from the card surface it sits on`, () => {
        for (const c of scale.classes) expect(deltaE(c.fill[theme], SURFACE[theme]), c.id).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it("the YoY magnitude ramp is monotonic in lightness (lighter = lower in light mode, brighter = higher in dark mode)", () => {
    const positives = YOY_SCALE.classes.filter((c) => c.min !== null && c.min >= 0);
    for (let i = 1; i < positives.length; i++) {
      expect(lightness(positives[i].fill.light), `light ${positives[i].id}`).toBeLessThan(lightness(positives[i - 1].fill.light));
      expect(lightness(positives[i].fill.dark), `dark ${positives[i].id}`).toBeGreaterThan(lightness(positives[i - 1].fill.dark));
    }
  });

  it("the MoM scale diverges around a neutral middle class that straddles zero", () => {
    const mid = MOM_SCALE.classes.find((c) => (c.min ?? -Infinity) < 0 && (c.max ?? Infinity) > 0)!;
    expect(mid.id).toBe("mom-0");
    expect(MOM_SCALE.classes.length % 2).toBe(0); // 2 negative + neutral + 3 positive: asymmetric on purpose (rises are larger than falls)
  });
});

describe("classify — class breaks tile the number line", () => {
  it("puts boundary values in the upper class (bounds are [min, max))", () => {
    expect(classify(YOY_SCALE, 0).id).toBe("yoy-0");
    expect(classify(YOY_SCALE, 2.999).id).toBe("yoy-0");
    expect(classify(YOY_SCALE, 3).id).toBe("yoy-1");
    expect(classify(YOY_SCALE, 25).id).toBe("yoy-6");
    expect(classify(YOY_SCALE, -0.0001).id).toBe("yoy-neg");
    expect(classify(MOM_SCALE, -0.5).id).toBe("mom-0");
    expect(classify(MOM_SCALE, 0.5).id).toBe("mom-p1");
  });

  it("classifies every value in a wide sweep into exactly one class", () => {
    for (const scale of Object.values(SCALES)) {
      for (let v = -80; v <= 80; v += 0.25) {
        const hits = scale.classes.filter((c) => (c.min === null || v >= c.min) && (c.max === null || v < c.max));
        expect(hits, `${scale.id} @ ${v}`).toHaveLength(1);
      }
    }
  });

  it("refuses to colour a non-number — a missing reading must never get a colour", () => {
    expect(() => classify(YOY_SCALE, NaN)).toThrow();
    expect(() => classify(YOY_SCALE, Infinity)).toThrow();
  });

  it("class bounds are contiguous: each class starts where the previous one ends", () => {
    for (const scale of Object.values(SCALES)) {
      for (let i = 1; i < scale.classes.length; i++) expect(scale.classes[i].min).toBe(scale.classes[i - 1].max);
      expect(scale.classes[0].min).toBeNull();
      expect(scale.classes.at(-1)!.max).toBeNull();
    }
  });
});

describe("globals.css carries exactly the palette defined in vizPalette.ts", () => {
  const css = readFileSync(join(__dirname, "..", "..", "app", "globals.css"), "utf-8");

  /** The declarations of the first rule whose selector matches `selector`, after the marker comment. */
  function blockFor(theme: Theme): string {
    const start = css.indexOf("/* ── Analytical charts palette");
    expect(start, "palette block marker missing from globals.css").toBeGreaterThan(-1);
    const tail = css.slice(start);
    const selector = theme === "dark" ? '[data-theme="dark"]' : '[data-theme="light"]';
    const open = tail.indexOf(selector);
    expect(open, `${selector} block missing`).toBeGreaterThan(-1);
    const end = tail.indexOf("}", open);
    return tail.slice(open, end);
  }

  for (const theme of THEMES) {
    it(`${theme}: series tokens match`, () => {
      const block = blockFor(theme).toLowerCase();
      for (const n of SERIES_ORDER) expect(block, `--pe-viz-${n}`).toContain(`--pe-viz-${n}: ${SERIES_COLORS[theme][n].toLowerCase()}`);
    });

    it(`${theme}: heat fill and ink tokens match`, () => {
      const block = blockFor(theme).toLowerCase();
      for (const scale of Object.values(SCALES)) {
        for (const c of scale.classes) {
          const t = heatTokenNames(c.id);
          expect(block, t.fill).toContain(`${t.fill}: ${c.fill[theme].toLowerCase()}`);
          expect(block, t.ink).toContain(`${t.ink}: ${c.ink[theme].toLowerCase()}`);
        }
      }
    });
  }

  it("uses only the two ink colours the contrast checks assume", () => {
    for (const scale of Object.values(SCALES)) for (const c of scale.classes) for (const t of THEMES) expect([INK.dark, INK.light]).toContain(c.ink[t]);
  });
});
