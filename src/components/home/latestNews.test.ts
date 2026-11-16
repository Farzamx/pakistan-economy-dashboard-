// The Overview no longer has a Latest News ticker. The ticker and the old headline list were removed with the rest of the pre-redesign
// Overview components; these checks read the page source so the removed row, or a sentiment tag / model name, cannot come back unnoticed.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("the Latest News ticker is no longer on the Overview", () => {
  const page = readFileSync(join(__dirname, "..", "..", "app", "overview", "page.tsx"), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("is not mounted by the page", () => {
    expect(page).not.toContain("<LatestNewsBody");
    expect(page).not.toContain('id="home-latest-news"');
  });

  it("the headlines the page shows carry no sentiment tag and name no model", () => {
    // The weekly snapshot still carries a model name for the assistant's context object; it must never reach a rendered section.
    expect(page).not.toMatch(/getTaggedNews|tagged by/);
    const rendered = page.slice(page.indexOf("return ("));
    expect(rendered).not.toMatch(/modelDisplayName|modelUsed|sentiment/);
  });
});
