// The bond workshop's components, rendered to static markup with the real data and asserted on what they actually emit: the sections, the figures, the
// definition toggle, the data-freshness warning, the missing-value wording, and the page-level guarantees (same URL, structured data, no data writes).
// The interactive behaviour (hover, slider, keyboard, playback) is covered by the browser verification; the geometry and analytics behind it by
// src/lib/bonds/*.test.ts.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BondFindings from "./BondFindings";
import BondMethodology from "./BondMethodology";
import BondWorkshop from "./BondWorkshop";
import YieldCurveExplorer from "./YieldCurveExplorer";
import { getExcludedRows, getPibAuctions, getProvenance, getTBillAuctions } from "@/lib/bonds/dataset";
import { buildBondInsights, buildMethodFacts, buildSnapshot, dataFreshness, STALE_AFTER_DAYS } from "@/lib/bonds/snapshot";
import type { AuctionRecord } from "@/lib/bonds/types";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

const tbills = getTBillAuctions();
const pibs = getPibAuctions();
const provenance = getProvenance();
const policy = [
  { date: "2025-05-05", value: 11 },
  { date: "2026-10-26", value: 12 },
];
const snapshot = { cutoff: buildSnapshot({ tbills, pibs, policy, def: "cutoff" }), wa: buildSnapshot({ tbills, pibs, policy, def: "wa" }) };
const fresh = dataFreshness(provenance.retrievedOn, provenance.retrievedOn, tbills, pibs);

const workshop = (freshness = fresh, snap = snapshot, pol: typeof policy | null = policy) =>
  html(createElement(BondWorkshop, { tbills, pibs, policy: pol, snapshot: snap, freshness }));

describe("BondWorkshop", () => {
  const out = workshop();

  it("renders every section of the workshop that the page navigation points to", () => {
    for (const id of ["latest", "curve", "history", "term", "auctions"]) expect(out, id).toContain(`id="${id}"`);
  });

  it("opens on the cut-off definition and offers both, as a radio group", () => {
    expect(text(out)).toContain("Cut-off yield at each tenor's most recent auction");
    expect(out).toMatch(/type="radio"[^>]*name="bond-def"[^>]*checked=""|checked=""[^>]*name="bond-def"/);
    expect(text(out)).toContain("Weighted average");
  });

  it("shows one tile per headline tenor with its yield to two decimals, never a bare zero", () => {
    const tiles = snapshot.cutoff;
    expect(tiles.length).toBeGreaterThanOrEqual(6);
    expect(tiles.map((t) => t.key)).toContain("t3m");
    for (const t of tiles) {
      expect(t.value, t.key).not.toMatch(/^0(\.0+)?%?$/);
      expect(out, t.key).toContain(t.label);
    }
    expect(snapshot.cutoff.find((t) => t.key === "t3m")?.value).toMatch(/^\d+\.\d{2}%$/);
  });

  it("states what the numbers are: auction (primary-market) yields, percent per annum, with the latest auction dates", () => {
    const t = text(out);
    expect(t).toMatch(/Auction \(primary-market\) yields, percent per annum/);
    expect(t).toContain("T-bills: ");
    expect(t).toContain("PIBs: ");
  });

  it("the weighted-average snapshot differs from the cut-off one: the two definitions are never silently the same", () => {
    const cutoff = snapshot.cutoff.map((t) => t.value).join("|");
    const wa = snapshot.wa.map((t) => t.value).join("|");
    expect(cutoff).not.toBe(wa);
  });

  it("does not warn about stale data when the archive was read today", () => {
    expect(out).not.toContain("This data may be out of date");
  });

  it("warns, with the age, once the archive is more than three weeks old", () => {
    const old = dataFreshness(provenance.retrievedOn, "2026-12-20", tbills, pibs);
    expect(old.stale).toBe(true);
    const t = text(workshop(old));
    expect(t).toContain("This data may be out of date");
    expect(t).toContain(`${old.ageDays} days ago`);
  });

  it("the stale threshold is exactly three weeks", () => {
    expect(STALE_AFTER_DAYS).toBe(21);
    expect(dataFreshness("2026-11-12", "2026-12-03", tbills, pibs).stale).toBe(false);
    expect(dataFreshness("2026-11-12", "2026-12-04", tbills, pibs).stale).toBe(true);
  });

  it("renders without the policy rate (the ledger being unavailable must not break the page)", () => {
    expect(() => workshop(fresh, snapshot, null)).not.toThrow();
  });

  it("carries no zero-yield figure for the failed 15-year PIB: its tile is dated and flagged", () => {
    const failed = snapshot.cutoff.filter((t) => t.warning);
    for (const t of failed) {
      expect(t.warning, t.key).toMatch(/no yield|rejected|none accepted|not offered/i);
      expect(t.value, t.key).not.toBe("0.00%");
    }
  });
});

describe("YieldCurveExplorer", () => {
  const out = html(createElement(YieldCurveExplorer, { tbills, pibs, def: "cutoff" }));

  it("renders the explorer with its shape and change panels", () => {
    expect(out).toContain('data-testid="yield-curve-explorer"');
    expect(out).toContain('data-testid="curve-shape-panel"');
    expect(out).toContain('data-testid="curve-change-panel"');
  });

  it("labels the curve as auction-based and never as one simultaneous market curve", () => {
    const t = text(out);
    expect(t).toMatch(/auction/i);
    // The combined view says outright that the two curves are different auctions, not one curve.
    expect(t).toContain("Different auctions, shown together; not one simultaneous curve.");
    expect(t).not.toMatch(/secondary|PKRV|live market/i);
  });

  it("has accessible controls: a labelled slider, previous/next buttons, and a Play button that explains itself", () => {
    expect(out).toContain('type="range"');
    expect(out).toContain('aria-label="Previous auction"');
    expect(out).toContain('aria-label="Next auction"');
    expect(out).toContain("Play");
  });

  it("offers the three views (T-bills, PIBs, both) and the comparison choices", () => {
    const t = text(out);
    for (const label of ["T-bills", "PIBs", "T-bills + PIBs"]) expect(t, label).toContain(label);
  });
});

describe("BondFindings", () => {
  const insights = buildBondInsights({ tbills, pibs, policy, def: "cutoff" });
  const out = html(createElement(BondFindings, { insights }));

  it("lists every finding as a sentence, each one reproducible from its evidence", () => {
    expect(insights.length).toBeGreaterThanOrEqual(5);
    for (const i of insights) {
      expect(i.evidence.length, i.id).toBeGreaterThan(0);
      expect(text(out), i.id).toContain(i.text.slice(0, 40));
    }
  });

  it("keeps the evidence and the caveat in the markup (behind a disclosure), not removed", () => {
    for (const i of insights) {
      if (i.caveat) expect(text(out), i.id).toContain(i.caveat.slice(0, 30));
      // every figure a finding is computed from is printed under it, as the finding's own evidence
      for (const e of i.evidence.filter((x) => x.unit === "%")) expect(text(out), `${i.id} ${e.label}`).toContain(`${e.value.toFixed(2)}%`);
    }
    expect(out).toContain("<details");
  });

  it("states no cause: no finding says 'because', 'due to' or 'caused'", () => {
    for (const i of insights) expect(i.text, i.id).not.toMatch(/\bbecause\b|\bdue to\b|\bcaused?\b|\bforecast/i);
  });

  it("renders nothing harmful for no findings", () => {
    expect(() => html(createElement(BondFindings, { insights: [] }))).not.toThrow();
  });
});

describe("BondMethodology", () => {
  const facts = buildMethodFacts(tbills, pibs);

  it("builds method facts from the real data", () => {
    expect(facts).not.toBeNull();
  });

  const out = html(createElement(BondMethodology, { facts: facts!, retrievedOn: provenance.retrievedOn, sources: provenance.sources, excluded: getExcludedRows(), related: [{ href: "/pakistan-interest-rate", label: "Pakistan Interest Rate" }] }));
  const t = text(out);

  it("keeps three always-visible lines: the source, what the yields are, and the coverage", () => {
    expect(t).toContain("State Bank of Pakistan auction archives");
    expect(t).toMatch(/not secondary-market quotes and not the PKRV curve/);
    expect(t).toContain(`T-bills: ${facts!.tbillAuctions} auctions`);
    expect(t).toContain(`PIBs: ${facts!.pibAuctions} auctions`);
  });

  it("has the three labelled disclosures and all of their text in the markup", () => {
    for (const summary of ["Definitions", "Data limits", "Source files and checks"]) expect(out, summary).toContain(summary);
    expect((out.match(/<details/g) ?? []).length).toBe(3);
    for (const term of ["Cut-off yield", "Weighted-average yield", "settlement date", "Slope", "Offered"]) expect(t, term).toContain(term);
  });

  it("states the data limits that change how a number is read", () => {
    expect(t).toMatch(/gaps in the charts, never zeros/);
    expect(t).toContain("Real (inflation-adjusted) yields are not shown");
    expect(t).toMatch(/EasyData weighted-average series for the 3-month bill differs/);
    expect(t).toContain(`${facts!.slopeAuctions} of ${facts!.tbillAuctions} T-bill auctions have a slope`);
  });

  it("lists every excluded row, or says none were excluded", () => {
    const rows = getExcludedRows();
    if (rows.length === 0) expect(t).toContain("No rows were excluded");
    else for (const r of rows) expect(t).toContain(r.tenorLabel);
  });

  it("lists every source file with its checksum and a link to it", () => {
    for (const s of provenance.sources) {
      expect(out).toContain(s.sha256);
      expect(out).toContain(`href="${s.url}"`);
    }
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("links the related workshop", () => {
    expect(out).toContain('href="/pakistan-interest-rate"');
  });
});

describe("the page and its components", () => {
  const ROOT = path.resolve(__dirname, "..", "..", "..");
  const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
  const page = read("src/app/pakistan-bond-yields/page.tsx");
  const componentFiles = readdirSync(__dirname).filter((f) => /\.tsx$/.test(f));

  it("keeps the same URL and canonical, and declares ISR", () => {
    expect(page).toContain('const SLUG = "pakistan-bond-yields";');
    expect(page).toMatch(/alternates: \{ canonical: PAGE_URL \}/);
    expect(page).toMatch(/export const revalidate = 3600;/);
  });

  it("emits the FAQ as structured data from the same array it renders", () => {
    expect(page).toContain('indicatorJsonLd({ title: "Pakistan Bond Yields", canonicalPath: `/${SLUG}`, faq })');
    expect(page).toContain("<FaqAccordion items={faq} />");
  });

  it("reads the policy rate through the existing ledger path and treats a fallback snapshot as unavailable", () => {
    expect(page).toContain('getSbpIndicatorHistory("policyRate")');
    expect(page).toMatch(/sourceStatus === "fallback"/);
  });

  it("no component imports the data file or any server-only module: the data reaches them through props", () => {
    expect(componentFiles.length).toBeGreaterThanOrEqual(8);
    for (const f of componentFiles) {
      const src = read(`src/components/bonds/${f}`);
      expect(src, f).not.toMatch(/(from|import)\s+["']@\/data\//);
      expect(src, f).not.toMatch(/server-only|sbpServer|supabase|@\/lib\/data\//i);
    }
  });

  it("nothing in the bond workshop writes data, calls the network or touches the write gate", () => {
    const files = [
      "src/app/pakistan-bond-yields/page.tsx",
      ...readdirSync(path.join(ROOT, "src/lib/bonds")).filter((f) => /^[A-Za-z]+\.ts$/.test(f)).map((f) => `src/lib/bonds/${f}`),
      ...componentFiles.map((f) => `src/components/bonds/${f}`),
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/\.(insert|upsert)\(|\.rpc\(|\bfetch\(|supabase|WRITE_MODE_AUTHORIZED|writeFile/i);
    }
  });

  it("every PIB failure the page mentions is in the data: no auction in the archive carries a zero yield", () => {
    const zero = (a: AuctionRecord) => Object.values(a.tenors).some((t) => t && (t.cutoffYield === 0 || t.waYield === 0));
    expect([...tbills, ...pibs].filter(zero)).toEqual([]);
  });
});
