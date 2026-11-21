// Typography readability scale: the small-text floor raised on 2026-11-20 must not quietly regress, and headings must keep their size.
// Guards the one-ladder rule documented in globals.css: small sizes sit on 10 / 11 / 12 / 13 / 14 / 15 / 16px, nothing under 10px, headings untouched.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");
const css = fs.readFileSync(path.join(SRC, "app", "globals.css"), "utf-8");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}
const sources = walk(SRC).map((p) => ({ p: path.relative(ROOT, p), t: fs.readFileSync(p, "utf-8") }));
const px = (rem: string) => parseFloat(rem) * 16;
const block = (selector: string) => new RegExp(`${selector.replace(/[.]/g, "\\.")} \\{([^}]*)\\}`).exec(css)![1];
const fontSize = (selector: string) => px(/font-size:\s*([\d.]+)rem/.exec(block(selector))![1]);

describe("the Tailwind text tokens are raised in one place", () => {
  it("text-xs is 13px and text-sm is 15px, with line-heights that keep the page compact", () => {
    const theme = /@theme \{([^}]*)\}/.exec(css)![1];
    expect(px(/--text-xs:\s*([\d.]+)rem/.exec(theme)![1])).toBe(13);
    expect(px(/--text-sm:\s*([\d.]+)rem/.exec(theme)![1])).toBe(15);
    expect(Number(/--text-xs--line-height:\s*([\d.]+)/.exec(theme)![1])).toBeLessThanOrEqual(1.4);
    expect(Number(/--text-sm--line-height:\s*([\d.]+)/.exec(theme)![1])).toBeLessThanOrEqual(1.5);
  });
  it("the PEIC label, caption, subtitle, data and overline classes sit at or above the new floor", () => {
    expect(fontSize(".text-overline")).toBeGreaterThanOrEqual(11);
    expect(fontSize(".text-label")).toBeGreaterThanOrEqual(12);
    expect(fontSize(".text-caption")).toBeGreaterThanOrEqual(13);
    expect(fontSize(".text-subtitle")).toBeGreaterThanOrEqual(14);
    expect(fontSize(".text-data")).toBeGreaterThanOrEqual(13.5);
  });
  it("headings and hero figures keep their size: they were not part of the pass", () => {
    expect(fontSize(".text-title")).toBe(16);
    expect(fontSize(".text-display")).toBe(30);
    expect(fontSize(".text-metric")).toBe(26);
    expect(fontSize(".text-headline")).toBe(22);
    expect(fontSize(".text-hero-headline")).toBe(28);
  });
});

describe("no text in the source is below the readability floor", () => {
  it("no Tailwind arbitrary size is under 10px", () => {
    const tiny: string[] = [];
    for (const { p, t } of sources) for (const m of t.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) if (Number(m[1]) < 10) tiny.push(`${p}: ${m[0]}`);
    expect(tiny).toEqual([]);
  });
  it("only ladder sizes are used for small text (10, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 16 and larger), so hierarchy stays on one scale", () => {
    const allowed = new Set([10, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 16]);
    const off: string[] = [];
    for (const { p, t } of sources) for (const m of t.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) if (Number(m[1]) <= 16 && !allowed.has(Number(m[1]))) off.push(`${p}: ${m[0]}`);
    expect(off).toEqual([]);
  });
  it("chart label sizes (fontSize props) are at least 10px", () => {
    const tiny: string[] = [];
    for (const { p, t } of sources) {
      if (/alertEmailTemplate|ingestionWatchdog/.test(p)) continue; // e-mail HTML, not the website
      for (const m of t.matchAll(/fontSize(?:=\{|: )(\d+)\b/g)) if (Number(m[1]) < 10) tiny.push(`${p}: ${m[0]}`);
    }
    expect(tiny).toEqual([]);
  });
  it("a KPI delta is never cut off with an ellipsis (it wraps instead)", () => {
    for (const f of ["components/KpiCard.tsx", "components/MacroSnapshot.tsx"]) {
      const t = fs.readFileSync(path.join(SRC, f), "utf-8");
      expect(t, f).not.toMatch(/<span className="truncate">\{(kpi\.)?change\}<\/span>/);
    }
  });
});
