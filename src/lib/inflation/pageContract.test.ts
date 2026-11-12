// Integration contract for the upgraded Inflation page: it is the SAME route,
// with the same SEO, and it keeps to the boundaries of this phase (no new
// route, no protected modules, no writes). These read source files, so they
// fail the moment someone breaks a promise this page made.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { getRelatedLinks, SEO_PAGES } from "@/lib/seoConfig";

const ROOT = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf-8");
const page = read("src/app/inflation-rate-pakistan/page.tsx");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Every file this upgrade added under src (non-test), which must respect the phase boundaries. */
const NEW_SOURCE = [
  ...walk(join(ROOT, "src/components/analytics")),
  ...walk(join(ROOT, "src/components/inflation")),
  ...walk(join(ROOT, "src/lib/inflation")),
  ...walk(join(ROOT, "src/lib/analytics")),
  join(ROOT, "src/lib/data/pbsCpiGroups.ts"),
  join(ROOT, "src/lib/data/worldBankInflation.ts"),
  join(ROOT, "src/lib/data/inflationPageData.ts"),
  join(ROOT, "src/lib/data/cpiGroupPanelSource.ts"),
  join(ROOT, "src/lib/seoStructuredData.ts"),
  join(ROOT, "src/app/inflation-rate-pakistan/page.tsx"),
].filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f));

describe("the route is preserved, not duplicated", () => {
  it("the Inflation Rate page is still at src/app/inflation-rate-pakistan", () => {
    expect(existsSync(join(ROOT, "src/app/inflation-rate-pakistan/page.tsx"))).toBe(true);
    expect(page).toContain('const SLUG = "inflation-rate-pakistan"');
  });

  it("no inflation workshop or duplicate indicator route was created", () => {
    const dirs = readdirSync(join(ROOT, "src/app"));
    expect(dirs.filter((d) => /inflation/.test(d)).sort()).toEqual(["inflation-rate-pakistan", "pakistan-core-inflation", "pakistan-food-inflation", "pakistan-wholesale-inflation", "weekly-inflation-pakistan"]);
    expect(dirs.some((d) => /workshop/.test(d) && /inflation|cpi/i.test(d))).toBe(false);
  });

  it("is still listed in the SEO page registry and the related-indicator graph", () => {
    expect(SEO_PAGES.some((p) => p.slug === "inflation-rate-pakistan")).toBe(true);
    const related = getRelatedLinks("inflation-rate-pakistan").map((l) => l.href);
    expect(related).toContain("/pakistan-interest-rate");
    expect(related).toContain("/pakistan-core-inflation");
    expect(related).toContain("/pakistan-food-inflation");
  });

  it("the page's own NAV anchors each point at a section that exists", () => {
    const navIds = [...page.matchAll(/^\s+\["([a-z-]+)", "[^"]+"\],$/gm)].map((m) => m[1]);
    expect(navIds.length).toBeGreaterThan(10);
    for (const id of navIds) expect(page, `section #${id}`).toContain(`id="${id}"`);
  });
});

describe("SEO is preserved", () => {
  it("keeps the original title and description verbatim", () => {
    expect(page).toContain('const TITLE = "Pakistan Inflation Rate (CPI) — Live Data & Analysis";');
    expect(page).toContain("Pakistan's current CPI inflation rate, 24-month trend chart, and a plain-English explanation of what drives inflation and why it matters for households and policy.");
  });

  it("keeps the canonical URL and Open Graph / Twitter metadata", () => {
    expect(page).toContain("alternates: { canonical: PAGE_URL }");
    expect(page).toContain('openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" }');
    expect(page).toContain('twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION }');
  });

  it("keeps the four FAQ questions, rendered visibly and emitted as JSON-LD from the same array", () => {
    for (const q of ["What is Pakistan's current inflation rate?", "What causes inflation in Pakistan?", "What is core inflation and how is it different from CPI?", "How often is Pakistan's inflation data released?"]) expect(page).toContain(q);
    expect(page).toContain("indicatorJsonLd({ title: \"Pakistan Inflation Rate\", canonicalPath: `/${SLUG}`, faq })");
    // Rendered from the same array, as an accordion: every answer stays in the page's HTML (a closed <details>), nothing is dropped.
    expect(page).toContain("<FaqAccordion items={faq} />");
  });

  it("the default (24-month) view still matches the description's '24-month trend chart'", () => {
    expect(read("src/components/inflation/HistorySection.tsx")).toContain('useState<RangeKey>("24")');
  });
});

describe("caching", () => {
  it("declares ISR (the route used to be frozen at deploy time) and the fetches revalidate within it", () => {
    expect(page).toMatch(/export const revalidate = 3600;/);
    expect(read("src/lib/data/pbsCpiGroups.ts")).toMatch(/REVALIDATE_SECONDS = 3600/);
    expect(read("src/lib/data/worldBankInflation.ts")).toMatch(/REVALIDATE_SECONDS = 3600/);
  });

  it("loads all data in one place, in parallel, through Promise.all", () => {
    const loader = read("src/lib/data/inflationPageData.ts");
    expect(loader).toContain("Promise.all([");
    expect(page).toContain("await loadInflationPageData()");
    expect((page.match(/await /g) ?? []).length).toBe(1); // no second fetch in the page itself
  });
});

describe("boundaries of this phase", () => {
  it("nothing new imports the protected intelligence or freshness modules", () => {
    for (const f of NEW_SOURCE) {
      const src = readFileSync(f, "utf-8");
      expect(src, relative(ROOT, f)).not.toMatch(/from "@\/lib\/intelligence/);
      expect(src, relative(ROOT, f)).not.toMatch(/from "@\/lib\/freshness/);
    }
  });

  it("nothing new writes to a database or calls a write RPC", () => {
    for (const f of NEW_SOURCE) {
      const src = readFileSync(f, "utf-8");
      expect(src, relative(ROOT, f)).not.toMatch(/\.rpc\(/); // new code calls no RPC at all: reads go through the existing data modules
      expect(src, relative(ROOT, f)).not.toMatch(/from "@\/lib\/supabase/);
      expect(src, relative(ROOT, f)).not.toMatch(/NOTIFICATION_WORKER_SECRET|SUPABASE_SERVICE|service_role/);
    }
  });

  it("only the existing read paths reach the database (no direct Supabase client in new code)", () => {
    for (const f of NEW_SOURCE) expect(readFileSync(f, "utf-8"), relative(ROOT, f)).not.toContain("createPublicDataClient");
  });

  it("adds no dependency", () => {
    const pkg = JSON.parse(read("package.json"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const f of NEW_SOURCE) {
      for (const m of readFileSync(f, "utf-8").matchAll(/from "([^"@./][^"]*|@[^/"]+\/[^"]+)"/g)) {
        const name = m[1].startsWith("@") ? m[1].split("/").slice(0, 2).join("/") : m[1].split("/")[0];
        if (["react", "react-dom", "next", "server-only"].includes(name) || name.startsWith("node:")) continue;
        expect(deps, `${relative(ROOT, f)} imports ${name}`).toContain(name);
      }
    }
  });

  it("the existing KPI is used as-is: the headline tile prints the canonical KPI value and change, never a recomputed one", () => {
    const o = read("src/components/inflation/OverviewSection.tsx");
    expect(o).toContain("value={`${hk.value}${hk.unit ?? \"%\"}`}");
    expect(o).toContain("change={hk.change}");
    expect(o).toContain("<DataQualityBadge kpi={hk} freshness={hk.freshness} />");
  });
});

describe("scroll containers", () => {
  // sr-only text is position:absolute. Inside a scroller that is NOT positioned it escapes the scroller's
  // clipping, and its far-right static position stretches the whole page (a real bug this page had at 390px).
  it("every overflow-auto / overflow-x-auto wrapper is also `relative`", () => {
    for (const f of NEW_SOURCE.filter((p) => p.endsWith(".tsx"))) {
      const src = readFileSync(f, "utf-8");
      for (const m of src.matchAll(/className="([^"]*\boverflow-(?:x-)?auto\b[^"]*)"/g)) {
        expect(m[1], `${relative(ROOT, f)}: "${m[1].slice(0, 60)}"`).toMatch(/\brelative\b/);
      }
    }
  });
});

describe("the ledger is the CPI-group source, behind one resolver", () => {
  const loader = read("src/lib/data/inflationPageData.ts");

  it("the loader gets the group panel only through the resolver, never from the PBS fetcher directly", () => {
    expect(loader).toContain('import { CPI_INGESTION_JOB_NAME, CPI_RUN_STALE_AFTER_HOURS, resolveCpiGroupPanel } from "@/lib/data/cpiGroupPanelSource"');
    expect(loader).toContain("resolveCpiGroupPanel()");
    expect(loader).not.toMatch(/from "@\/lib\/data\/pbsCpiGroups"/);
    expect(loader).not.toMatch(/getCpiGroupPanel\(/);
  });

  it("the resolver reuses the validated modules instead of re-implementing them", () => {
    const r = read("src/lib/data/cpiGroupPanelSource.ts");
    expect(r).toContain('from "@/lib/data/cpiGroupLedgerReader"');
    expect(r).toContain('from "@/lib/data/pbsCpiGroups"');
    expect(r).toContain('from "@/lib/inflation/panelSource"');
    expect(r).not.toMatch(/\.rpc\(|createPublicDataClient|fetch\(/); // wiring only: no I/O of its own
  });

  it("a missing panel still refuses to regenerate at runtime (the F.2a last-good behaviour is still routed through the failure policy)", () => {
    expect(loader).toContain("panelLoaded: selection.panel !== null");
    expect(loader).toContain("enforceProviderPolicy(failures, mode)");
  });

  it("the source is shown above each of the three group-derived sections, and the six facts live in the methodology", () => {
    expect((page.match(/<GroupSourceStrip source=\{model\.groupSource\} \/>/g) ?? []).length).toBe(3);
    expect(read("src/components/inflation/MethodologySection.tsx")).toContain("<DataStatusPanel source={model.groupSource} />");
  });

  it("the page never calls the ledger or the PBS fetcher itself", () => {
    expect(page).not.toMatch(/cpiGroupLedgerReader|pbsCpiGroups|cpiGroupPanelSource|createPublicDataClient/);
  });

  it("no module in the page's import graph writes: the milestone adds read paths only", () => {
    for (const f of ["src/lib/data/cpiGroupPanelSource.ts", "src/lib/inflation/groupSource.ts", "src/components/inflation/DataSourceStatus.tsx"]) {
      expect(read(f), f).not.toMatch(/\.insert\(|\.upsert\(|\.update\(|\.delete\(|ingestManySeries|WRITE_MODE_AUTHORIZED|log_cron_run|logCronRun/);
    }
  });
});

describe("honest limits are stated on the page", () => {
  it("says urban/rural is unavailable instead of charting something else", () => {
    const u = read("src/components/inflation/UrbanRuralSection.tsx");
    expect(u).toContain("PEIC holds no rural inflation data");
  });

  it("never labels the derived food/other split as PBS's non-food measure", () => {
    const f = read("src/components/inflation/FoodRestSection.tsx");
    expect(f).toMatch(/not<\/em>\{" "\}\s+PBS&rsquo;s &ldquo;non-food&rdquo; measure/);
    expect(f).not.toMatch(/label: "Non-food/i);
  });

  it("labels month-on-month as derived wherever it can be chosen", () => {
    expect(read("src/components/inflation/HistorySection.tsx")).toContain("Month on month (derived)");
    expect(read("src/components/inflation/PatternsSection.tsx")).toContain("Month on month (derived)");
  });
});
