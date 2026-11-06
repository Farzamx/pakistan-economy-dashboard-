// Geographic relevance of news headlines (Phase E.1.1).
//
// THE DEFECT THESE TESTS EXIST TO CATCH
// Generic domestic-economy words — "budget", "rupee", "remittance", "current
// account deficit", "balance of payments" — were listed unguarded at score 10
// in the Pakistan group. Every country has a budget and a balance of payments
// and several have a rupee, so India's budget, Nepal's remittances, Kenya's
// budget and a Sri Lankan IMF story all scored as Pakistan-specific. (The IMF
// keyword was NOT the cause: it already had a guard. "budget" was.)
//
// WHAT THE FIX MUST NOT DO
// Hide international stories (they should land in an honestly named category,
// not vanish), lose genuine Pakistan stories, or move any headline the change
// has no business touching. The frozen table at the bottom is what the engine
// said BEFORE the change, so "bounded" is checked rather than claimed.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreRelevance } from "./relevanceEngine";

const PAKISTAN = { relevanceScore: 10, category: "Pakistan Economy" };
const INTERNATIONAL = { relevanceScore: 5, category: "Global Macro" };

describe("the Phase E.1 regression headline", () => {
  const T = "Sri Lanka to present 2027 budget before IMF program ends — Channel NewsAsia";

  it("is no longer classified as a Pakistan story", () => {
    expect(scoreRelevance(T)).toEqual(INTERNATIONAL);
  });

  it("stays international whichever outlet carried it", () => {
    for (const source of ["UA.NEWS", "Reuters", "Gulf News"]) expect(scoreRelevance(T, { source })).toEqual(INTERNATIONAL);
  });

  it("stays international even when a Pakistani outlet carried it", () => {
    // Dawn carries wire stories about its neighbours; the outlet must not
    // turn another country's budget into Pakistan's.
    expect(scoreRelevance(T, { source: "Dawn Business" })).toEqual(INTERNATIONAL);
  });

  it("is surfaced as an international story rather than hidden", () => {
    // Score 5 is above the engine's floor of 0-1 for unrelated news.
    expect(scoreRelevance(T).relevanceScore).toBeGreaterThan(1);
  });

  it("was the budget keyword, not the IMF keyword, that caused it", () => {
    // Pins the diagnosis: with the budget word removed it was already 5.
    expect(scoreRelevance("Sri Lanka to present 2027 plan before IMF program ends")).toEqual(INTERNATIONAL);
  });
});

describe("Pakistan-specific economic headlines keep their classification", () => {
  it.each([
    "SBP reserves rise $39m to $21.6bn",
    "State Bank of Pakistan holds policy rate at 12 percent",
    "Pakistan budget FY27 targets tax revenue growth",
    "PSX extends rally, reclaims 175,000 mark",
    "FBR vows to solve exporters' blacklisting issues",
    "Pakistani rupee gains against the dollar in interbank trading",
    "PKR steadies as remittances rise",
    "Karachi electricity tariff hike approved",
    "Finance Minister Aurangzeb outlines reform plan",
  ])("%s", (title) => {
    expect(scoreRelevance(title)).toEqual(PAKISTAN);
  });
});

describe("another country's domestic economy is not claimed as Pakistan's", () => {
  describe.each([
    ["Sri Lanka", [
      "Sri Lanka unveils 2027 budget with tax relief",
      "Sri Lankan rupee gains against dollar",
      "Sri Lanka remittances climb to record",
    ]],
    ["India", [
      "India to present 2027 budget before elections",
      "Indian rupee falls to record low",
      "India's current account deficit narrows",
    ]],
    ["Bangladesh", [
      "Bangladesh unveils budget as IMF loan talks continue",
      "Bangladesh remittances hit record high",
      "Bangladesh balance of payments under pressure",
    ]],
    ["elsewhere", [
      "Nepal remittances hit record high",
      "Kenya budget raises taxes on fuel",
      "Egypt seeks IMF programme as budget deficit widens",
      "Ghana current account deficit widens",
    ]],
  ])("%s", (_country, titles) => {
    it.each(titles)("%s", (title) => {
      const r = scoreRelevance(title);
      expect(r).toEqual(INTERNATIONAL);
      // Never the Pakistan label.
      expect(r.category).not.toBe("Pakistan Economy");
    });
  });
});

describe("international oil developments", () => {
  it("are labelled Energy, not Pakistan Economy, when nothing ties them to Pakistan", () => {
    expect(scoreRelevance("Brent crude jumps as OPEC+ extends output cuts")).toEqual({ relevanceScore: 8, category: "Energy" });
    expect(scoreRelevance("Middle East tensions lift oil prices")).toEqual({ relevanceScore: 8, category: "Energy" });
  });

  it("are Pakistan-specific when the headline ties them to Pakistan", () => {
    expect(scoreRelevance("Oil price surge widens Pakistan's import bill")).toEqual(PAKISTAN);
    expect(scoreRelevance("Pakistan cuts petrol price after global crude slump")).toEqual(PAKISTAN);
  });

  it("are kept visible: a high international score, not buried", () => {
    expect(scoreRelevance("OPEC announces output decision").relevanceScore).toBeGreaterThanOrEqual(8);
  });
});

describe("IMF stories", () => {
  it("explicitly involving Pakistan are Pakistan-specific", () => {
    for (const t of [
      "IMF board approves Pakistan tranche",
      "IMF staff-level agreement reached with Pakistan",
      "IMF country head urges Pakistan to broaden tax base",
      "Pakistan, IMF begin talks on next programme",
    ]) {
      expect(scoreRelevance(t), t).toEqual(PAKISTAN);
    }
  });

  it("with no Pakistan connection are international", () => {
    for (const t of [
      "IMF warns of risks to global growth",
      "IMF cuts global growth forecast",
      "Top 10 African countries with the lowest debt to the IMF",
      "IMF approves loan for Egypt",
    ]) {
      expect(scoreRelevance(t), t).toEqual(INTERNATIONAL);
    }
  });

  it("do not become Pakistan-specific because a Pakistani outlet carried them", () => {
    // Publisher context deliberately does not apply to global words like IMF.
    for (const source of ["Dawn Business", "Express Tribune", "Business Recorder"]) {
      expect(scoreRelevance("IMF cuts global growth forecast", { source })).toEqual(INTERNATIONAL);
    }
  });

  it("tie on score resolves to Pakistan Economy, as before", () => {
    expect(scoreRelevance("IMF Pakistan programme review").category).toBe("Pakistan Economy");
  });
});

describe("publisher context: a Pakistani outlet implies Pakistan for national terms", () => {
  it("keeps a bare 'Rupee' headline in Pakistan Economy when a Pakistani outlet runs it", () => {
    // Pakistani business desks write "Rupee gains against dollar" without the
    // country name; scoring the title alone would file PKR's daily story as
    // international.
    expect(scoreRelevance("Rupee gains 5 paisa against US dollar", { source: "Dawn Business" })).toEqual(PAKISTAN);
    expect(scoreRelevance("Budget targets missed by Rs200bn", { source: "Business Recorder" })).toEqual(PAKISTAN);
    expect(scoreRelevance("Remittances rise 12pc in October", { source: "The Express Tribune" })).toEqual(PAKISTAN);
  });

  it("gives the same headline no such context when the outlet is unknown or absent", () => {
    const t = "Rupee gains 5 paisa against US dollar";
    expect(scoreRelevance(t)).toEqual(INTERNATIONAL);
    expect(scoreRelevance(t, { source: "Gulf News" })).toEqual(INTERNATIONAL);
    expect(scoreRelevance(t, { source: "Reuters" })).toEqual(INTERNATIONAL);
    expect(scoreRelevance(t, { source: undefined })).toEqual(INTERNATIONAL);
  });

  it("recognises outlet-name variants seen in the live feed", () => {
    const t = "Rupee ends flat against dollar";
    for (const source of ["Dawn Business", "Dawn", "Express Tribune", "The Express Tribune", "Business Recorder", "Investify", "Arab News PK"]) {
      expect(scoreRelevance(t, { source }), source).toEqual(PAKISTAN);
    }
  });

  it("does not confuse a similarly named foreign outlet", () => {
    // "Arab News" is Saudi-based; only "Arab News PK" is Pakistani.
    expect(scoreRelevance("Rupee ends flat against dollar", { source: "Arab News" })).toEqual(INTERNATIONAL);
  });

  it("is withheld when the title names another country, even in a Pakistani outlet", () => {
    for (const t of ["Sri Lankan rupee gains against dollar", "Indian rupee falls to record low", "Bangladesh unveils budget", "Nepal remittances hit record high"]) {
      expect(scoreRelevance(t, { source: "Dawn Business" }), t).toEqual(INTERNATIONAL);
    }
  });

  it("is not withheld when the title names Pakistan alongside another country", () => {
    expect(scoreRelevance("India-Pakistan trade talks resume over budget", { source: "Dawn Business" })).toEqual(PAKISTAN);
    expect(scoreRelevance("Pakistan and India budget comparison", { source: "Reuters" })).toEqual(PAKISTAN);
  });
});

describe("the change is bounded: headlines it must not touch are identical", () => {
  // Verdicts of the engine BEFORE this change, captured from the previous
  // version. If any of these moves, something other than geography changed.
  const LEGACY: [string, number, string][] = [
    ["SBP reserves rise $39m to $21.6bn", 10, "Pakistan Economy"],
    ["Pakistan’s foreign exchange reserves climb to record high of more than $26bn amid Gulf war", 10, "Pakistan Economy"],
    ["Official rates of beef and mutton increased by Rs50-100 per kg in Karachi", 10, "Pakistan Economy"],
    ["ADB urges Pakistan to maintain policy continuity, accelerate economic reforms", 10, "Pakistan Economy"],
    ["PSX extends rally, reclaims 175,000 mark", 10, "Pakistan Economy"],
    ["FBR vows to solve exporters' blacklisting issues", 10, "Pakistan Economy"],
    ["Pakistan’s external debt nearly doubles in a decade to $135b", 10, "Pakistan Economy"],
    ["IMF country head urges Pakistan to broaden tax base, pursue reforms", 10, "Pakistan Economy"],
    ["The Fed will bring down the hammer on inflation, says Powell", 5, "Global Macro"],
    ["Top 10 African countries with the lowest debt to the IMF", 5, "Global Macro"],
    ["Brent crude jumps as OPEC+ extends output cuts", 8, "Energy"],
    ["Federal Reserve holds rates steady, signals cuts ahead", 8, "Central Banks"],
    ["China unveils new stimulus as economy slows", 8, "Geopolitics"],
    ["Gold hits record high as dollar weakens", 0, "Markets"],
    ["Global recession fears grow as unemployment rises", 5, "Global Macro"],
    ["Wall Street closes higher on tech rally", 5, "Global Macro"],
    ["Inflation in the eurozone cools to 2.1 percent", 5, "Global Macro"],
    ["US exports to Canada fall as tariffs bite", 8, "Geopolitics"],
    ["Electricity tariff hike approved for Karachi consumers", 10, "Pakistan Economy"],
    ["Water company appoints new CEO", 0, "Markets"],
    ["Restaurant chain to close 50 stores", 0, "Markets"],
    ["Pakistan, Saudi Arabia agree on investment framework", 10, "Pakistan Economy"],
    ["CPEC a model of win-win cooperation for the Global South", 8, "Geopolitics"],
    ["IMF warns of risks to global growth", 5, "Global Macro"],
    ["Middle East tensions lift oil prices", 8, "Energy"],
  ];

  it.each(LEGACY)("%s", (title, score, category) => {
    expect(scoreRelevance(title)).toEqual({ relevanceScore: score, category });
    // Passing a publisher must not move a headline that has no guarded term.
    expect(scoreRelevance(title, { source: "Dawn Business" })).toEqual({ relevanceScore: score, category });
  });

  it("keeps scores within 0-10 for every input", () => {
    for (const [title] of LEGACY) {
      const { relevanceScore } = scoreRelevance(title, { source: "Dawn Business" });
      expect(relevanceScore).toBeGreaterThanOrEqual(0);
      expect(relevanceScore).toBeLessThanOrEqual(10);
    }
  });
});

describe("the engine stays deterministic and title-only by default", () => {
  it("returns the same verdict for the same input", () => {
    const a = scoreRelevance("Rupee gains against dollar", { source: "Dawn Business" });
    expect(scoreRelevance("Rupee gains against dollar", { source: "Dawn Business" })).toEqual(a);
  });

  it("treats an omitted source and an empty options object identically", () => {
    expect(scoreRelevance("Kenya budget raises taxes")).toEqual(scoreRelevance("Kenya budget raises taxes", {}));
  });
});

describe("the pipeline hands the publisher to the scorer", () => {
  // Without this the publisher rule would silently never fire in production.
  const news = readFileSync(join(__dirname, "..", "data", "news.ts"), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("passes the source into scoreRelevance", () => {
    expect(news).toMatch(/scoreRelevance\(item\.title,\s*\{\s*source\s*\}\)/);
  });

  it("is the only call site, so every consumer sees the same classification", () => {
    expect((news.match(/scoreRelevance\(/g) ?? []).length).toBe(1);
  });
});
