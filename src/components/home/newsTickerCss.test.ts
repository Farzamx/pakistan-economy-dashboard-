// The ticker's stylesheet contract (globals.css, ".pe-newsticker" block).
//
// This pins behaviour that is easy to break silently with a CSS edit and that no
// rendering test can see, because it lives entirely in the stylesheet: motion
// that must never apply to someone who asked for reduced motion, a loop that
// must be exactly one copy long, and a panel that must never grow a scrollbar.
// It reads the source text, so it asserts on structure and meaning rather than
// on exact formatting.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "..", "..", "app", "globals.css"), "utf-8");

// The ticker block runs from its header comment to the end of its keyframes.
const START = css.indexOf('/* ── Overview "Latest News" ticker');
const block = css.slice(START);

/** The source of the at-rule that opens at `index`, found by matching braces. */
function atRuleBody(source: string, headerStart: number): string {
  const open = source.indexOf("{", headerStart);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error("unbalanced braces");
}

describe("the ticker block exists", () => {
  it("is present in globals.css", () => {
    expect(START).toBeGreaterThan(-1);
  });
});

describe("motion is an enhancement, never the default", () => {
  const noPref = atRuleBody(block, block.indexOf("@media (prefers-reduced-motion: no-preference)"));

  it("applies the animation only inside prefers-reduced-motion: no-preference", () => {
    // Exactly one place sets the animation, and it is inside that media query,
    // so a visitor who asked for reduced motion can never receive it.
    const all = [...block.matchAll(/animation:\s*pe-newsticker-scroll/g)];
    expect(all).toHaveLength(1);
    expect(noPref).toMatch(/animation:\s*pe-newsticker-scroll/);
  });

  it("also requires container-query unit support, falling back to the static list", () => {
    expect(noPref).toContain("@supports (width: 1cqw)");
    const supports = atRuleBody(noPref, noPref.indexOf("@supports"));
    expect(supports).toMatch(/animation:\s*pe-newsticker-scroll/);
  });

  it("never sets the animation on the default (static) rules", () => {
    const beforeEnhancement = block.slice(0, block.indexOf("@media (prefers-reduced-motion: no-preference)"));
    expect(beforeEnhancement).not.toMatch(/animation\s*:/);
    expect(beforeEnhancement).not.toMatch(/animation-name/);
  });

  it("only animates when the component says it should (two or more headlines)", () => {
    expect(noPref).toContain('.pe-newsticker[data-animated="true"] .pe-newsticker-track');
  });

  it("does not use an animation name that collides with the existing ticker", () => {
    // MarketTicker already owns "ticker-scroll"; reusing it would couple the two.
    expect(block).not.toMatch(/animation:\s*ticker-scroll/);
    expect(block).toContain("@keyframes pe-newsticker-scroll");
  });
});

describe("the loop is seamless by construction", () => {
  const keyframes = atRuleBody(block, block.indexOf("@keyframes pe-newsticker-scroll"));

  it("travels exactly one copy: from 0 to -50% of the two-copy track", () => {
    expect(keyframes).toMatch(/from\s*\{[^}]*translate3d\(0,\s*0,\s*0\)/);
    expect(keyframes).toMatch(/to\s*\{[^}]*translate3d\(-50%,\s*0,\s*0\)/);
  });

  it("runs at a constant pace: linear, infinite", () => {
    // The calc() nests var() calls, so match through to the closing parenthesis.
    expect(block).toMatch(/pe-newsticker-scroll calc\(.*\) linear infinite/);
  });

  it("sizes the loop from the headline count, so pace per card is constant", () => {
    expect(block).toContain("calc(var(--pe-newsticker-count) * var(--pe-newsticker-seconds))");
  });

  it("sizes every card from the panel, with one shared width", () => {
    const widths = [...block.matchAll(/(?:^|\s)(?:flex:\s*0 0|width:)\s*(min\(100cqw, max\(200px, 62cqw\)\))/gm)].map((m) => m[1]);
    // flex-basis and width both use the same expression.
    expect(widths.length).toBeGreaterThanOrEqual(2);
    expect(new Set(widths).size).toBe(1);
  });

  it("keeps cards narrower than the panel, so a headline is wholly visible while it moves", () => {
    // A card as wide as the panel is only ever fully on screen for an instant.
    expect(block).toContain("62cqw");
    expect(block).not.toMatch(/(?:flex:\s*0 0|width:)\s*100cqw/);
  });

  it("styles every card identically, divider included, so the wrap cannot show a seam", () => {
    const itemRule = block.slice(block.indexOf(".pe-newsticker[data-animated=\"true\"] .pe-newsticker-item,"));
    expect(itemRule).toContain("border-inline-start");
    expect(itemRule).toContain(".pe-newsticker-item:first-child");
  });
});

describe("pausing", () => {
  const pauseRule = block.slice(block.indexOf(".pe-newsticker-track:hover"), block.indexOf("animation-play-state: paused;"));

  it("pauses on hover", () => {
    expect(pauseRule).toContain(".pe-newsticker-track:hover");
  });

  it("pauses while a headline has keyboard focus", () => {
    expect(pauseRule).toContain(":has(.pe-newsticker-card:focus)");
  });

  it("pauses when the Pause control is on", () => {
    expect(pauseRule).toContain('[data-paused="true"]');
    expect(block).toContain("animation-play-state: paused");
  });

  it("does NOT pause merely because the Pause control itself is hovered or focused", () => {
    // Otherwise pressing Play while the pointer or focus is still on the panel
    // would appear to do nothing.
    expect(pauseRule).not.toMatch(/\.pe-newsticker(?:\[[^\]]+\])?:hover\s+\.pe-newsticker-track/);
    expect(pauseRule).not.toMatch(/:focus-within/);
  });
});

describe("the panel never grows a scrollbar", () => {
  it("clips instead of scrolling", () => {
    expect(block).toMatch(/overflow:\s*clip/);
  });

  it("never asks for a scroll container", () => {
    expect(block).not.toMatch(/overflow(-x|-y)?:\s*(auto|scroll)/);
  });

  it("keeps the moving track out of normal flow, so it cannot widen the page", () => {
    // The existing MarketTicker's history: an in-flow max-content strip inside an
    // overflow box pushed the whole page wider than the viewport.
    const track = block.slice(block.indexOf('.pe-newsticker[data-animated="true"] .pe-newsticker-track {'));
    expect(track.slice(0, track.indexOf("}"))).toContain("position: absolute");
  });

  it("contains its own size, so its contents cannot dictate its width", () => {
    expect(block).toContain("container-type: inline-size");
  });
});

describe("reduced motion gets a readable static list", () => {
  it("hides the duplicate copy and the Pause control by default", () => {
    expect(block).toMatch(/\.pe-newsticker-set\[data-set="duplicate"\],\s*\.pe-newsticker-controls\s*\{\s*display:\s*none/);
  });

  it("bounds each title instead of scrolling when the panel height is fixed", () => {
    expect(block).toMatch(/-webkit-line-clamp:\s*3/);
  });

  it("caps the rows that show beside Markets rather than scrolling", () => {
    expect(block).toMatch(/\.pe-newsticker-item\[data-extra\]\s*\{\s*display:\s*none/);
  });
});

describe("both themes", () => {
  it("uses only the theme-aware design tokens for colour", () => {
    // No literal colours: every colour is a --pe-* variable, which re-themes.
    const colourDeclarations = block.match(/(?:color|background|border[a-z-]*|outline):[^;]+;/g) ?? [];
    for (const d of colourDeclarations) {
      expect(d, d).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    }
  });
});
