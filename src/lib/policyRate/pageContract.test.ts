// Integration contract for the upgraded Interest Rate page: it is the SAME route with the same SEO, it keeps to the boundaries of this
// phase (no new route, no protected modules, no writes, no new dependency), and it states its limits honestly. These read source files,
// so they fail the moment someone breaks a promise this page made.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getRelatedLinks, SEO_PAGES } from "@/lib/seoConfig";

const ROOT = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf-8");
const page = read("src/app/pakistan-interest-rate/page.tsx");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Every non-test source file this page added, which must respect the boundaries. */
const NEW_SOURCE = [
  ...walk(join(ROOT, "src/components/policyRate")),
  ...walk(join(ROOT, "src/lib/policyRate")),
  join(ROOT, "src/lib/data/policyRatePageData.ts"),
  join(ROOT, "src/app/pakistan-interest-rate/page.tsx"),
].filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f) && !f.includes("__fixtures__"));

describe("the route is preserved, not duplicated", () => {
  it("the Interest Rate page is still at src/app/pakistan-interest-rate", () => {
    expect(existsSync(join(ROOT, "src/app/pakistan-interest-rate/page.tsx"))).toBe(true);
    expect(page).toContain('const SLUG = "pakistan-interest-rate"');
  });

  it("no second interest-rate or monetary-policy route was created", () => {
    const dirs = readdirSync(join(ROOT, "src/app"));
    expect(dirs.filter((d) => /interest|policy-rate|monetary/.test(d))).toEqual(["pakistan-interest-rate"]);
    expect(dirs.some((d) => /workshop/.test(d) && /interest|rate/i.test(d))).toBe(false);
  });

  it("is still in the SEO registry and the related-indicator graph", () => {
    expect(SEO_PAGES.some((p) => p.slug === "pakistan-interest-rate")).toBe(true);
    expect(getRelatedLinks("pakistan-interest-rate").length).toBeGreaterThan(0);
  });

  it("the page's own NAV anchors each point at a section that exists", () => {
    const navIds = [...page.matchAll(/^\s+\["([a-z-]+)", "[^"]+"\],$/gm)].map((m) => m[1]);
    expect(navIds.length).toBeGreaterThan(8);
    for (const id of navIds) expect(page, `section #${id}`).toContain(`id="${id}"`);
  });
});

describe("SEO is preserved", () => {
  it("keeps the original title and description verbatim", () => {
    expect(page).toContain('const TITLE = "Pakistan Interest Rate (SBP Policy Rate) — Live Data";');
    expect(page).toContain("The State Bank of Pakistan's current policy interest rate, historical trend, and a plain-English explanation of how it affects loans, savings, and the economy.");
  });

  it("keeps the canonical URL and Open Graph / Twitter metadata", () => {
    expect(page).toContain("alternates: { canonical: PAGE_URL }");
    expect(page).toContain('openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" }');
    expect(page).toContain('twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION }');
  });

  it("keeps the four original FAQ questions, rendered visibly and emitted as JSON-LD from the same array", () => {
    for (const q of ["What is Pakistan's current interest rate?", "How often does SBP change the interest rate?", "What is KIBOR and how does it relate to the policy rate?", "What was Pakistan's highest-ever interest rate?"]) expect(page).toContain(q);
    expect(page).toContain('indicatorJsonLd({ title: "Pakistan Interest Rate", canonicalPath: `/${SLUG}`, faq })');
    // Rendered from the same array, as an accordion: every answer stays in the page's HTML (a closed <details>), nothing is dropped.
    expect(page).toContain("<FaqAccordion items={faq} />");
  });

  it("every number in the FAQ answers is computed from the data, not typed in", () => {
    const start = page.indexOf("const faq = [");
    const faqBlock = page.slice(start, page.indexOf("return (", start)); // single-line markers: independent of the checkout's line endings
    expect(faqBlock.length).toBeGreaterThan(500);
    expect(faqBlock).not.toMatch(/\b(22|12|11\.5|10\.5|5\.75)\s?%/); // the old copy said "peaked at 22% in 2023"
  });
});

describe("caching and loading", () => {
  it("declares ISR and loads all data in one place, in parallel", () => {
    expect(page).toMatch(/export const revalidate = 3600;/);
    const loader = read("src/lib/data/policyRatePageData.ts");
    expect(loader).toContain("Promise.all([");
    expect(page).toContain("await loadPolicyRatePageData()");
    expect((page.match(/await /g) ?? []).length).toBe(1); // no second fetch in the page itself
  });

  it("the policy-rate history is the one REQUIRED input and is protected by the shared last-good-page policy", () => {
    const loader = read("src/lib/data/policyRatePageData.ts");
    expect(loader).toContain("enforceProviderPolicy(failures, mode, POLICY_RATE_PAGE_NAME)");
    expect(loader).toContain('status !== "ledger"');
    // the static fallback snapshot is never analysed
    expect(loader).toContain('policy: source.status === "ledger" ? (policyHist?.points ?? null) : null');
  });
});

describe("boundaries of this phase", () => {
  it("reads only through the existing data modules: no RPC, no Supabase client, no writes, no secrets", () => {
    for (const f of NEW_SOURCE) {
      const src = readFileSync(f, "utf-8");
      const name = relative(ROOT, f);
      expect(src, name).not.toMatch(/\.rpc\(/);
      expect(src, name).not.toMatch(/from "@\/lib\/supabase/);
      expect(src, name).not.toContain("createPublicDataClient");
      expect(src, name).not.toMatch(/\.insert\(|\.upsert\(|\.delete\(\s*\)|log_cron_run|logCronRun|ingestManySeries|WRITE_MODE_AUTHORIZED/);
      expect(src, name).not.toMatch(/NOTIFICATION_WORKER_SECRET|SUPABASE_SERVICE|service_role/);
    }
  });

  it("imports no protected intelligence or freshness module", () => {
    for (const f of NEW_SOURCE) {
      const src = readFileSync(f, "utf-8");
      expect(src, relative(ROOT, f)).not.toMatch(/from "@\/lib\/intelligence/);
      expect(src, relative(ROOT, f)).not.toMatch(/from "@\/lib\/freshness/);
    }
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

  it("reuses the shared chart toolkit and the Inflation page's step rule instead of copying them", () => {
    const a = read("src/lib/policyRate/analytics.ts");
    expect(a).toContain('from "@/lib/inflation/analytics"');
    expect(a).toMatch(/policyRateAt, policyStepSeries/);
    for (const c of walk(join(ROOT, "src/components/policyRate"))) {
      const src = readFileSync(c, "utf-8");
      expect(src, relative(ROOT, c)).not.toMatch(/from "recharts"/); // charts come from components/analytics
    }
    expect(read("src/components/policyRate/HistorySection.tsx")).toContain('from "@/components/analytics/ChartFrame"');
  });

  it("the Inflation page and its components are not touched by this page's code", () => {
    for (const f of NEW_SOURCE) {
      const src = readFileSync(f, "utf-8");
      // the one deliberate reuse from the Inflation components is the UTC date formatter
      for (const m of src.matchAll(/from "@\/components\/inflation\/([A-Za-z]+)"/g)) expect(m[1], relative(ROOT, f)).toBe("DataSourceStatus");
    }
  });
});

describe("animation is restrained: opt-in, and never under prefers-reduced-motion", () => {
  const animated = ["src/components/analytics/TimeCharts.tsx", "src/components/analytics/DateCharts.tsx", "src/components/analytics/RegimeTimeline.tsx", "src/components/policyRate/AnimatedFigure.tsx"];
  it("every file that animates reads the reduced-motion preference through the hydration-safe hook", () => {
    for (const f of animated) expect(read(f), f).toContain("useSafeReducedMotion");
  });
  it("no chart animates unless the page asks: Recharts animation is always gated by `animate && !reduced`", () => {
    for (const f of animated.slice(0, 2)) {
      const src = read(f);
      const flags = [...src.matchAll(/isAnimationActive=\{([^}]+)\}/g)].map((m) => m[1]);
      expect(flags.length, f).toBeGreaterThan(0);
      for (const flag of flags) expect(flag.trim(), f).toMatch(/^(false|animate && !reduced)$/); // never animated, or animated only when asked and motion is allowed
      expect(src, f).not.toMatch(/isAnimationActive=\{true\}|isAnimationActive: true|isAnimationActive(?![=:])/);
    }
    expect(read("src/components/analytics/DateCharts.tsx")).toContain("isAnimationActive: animate && !reduced");
  });
  it("the page's animation lasts under a second and a half in every component", () => {
    expect(read("src/components/analytics/TimeCharts.tsx")).toMatch(/duration: 900/);
    expect(read("src/components/analytics/RegimeTimeline.tsx")).toMatch(/1100ms/);
    expect(read("src/components/policyRate/AnimatedFigure.tsx")).toMatch(/duration = 1100/);
  });
  it("the reveal is skipped under reduced motion and the finished chart is what the server renders", () => {
    const src = read("src/components/analytics/RegimeTimeline.tsx");
    expect(src).toContain('useState<"static" | "armed" | "play">("static")');
    expect(src).toMatch(/if \(!animate \|\| reduced/);
  });
});

describe("scroll containers", () => {
  it("every overflow wrapper is relative, focusable by keyboard and named", () => {
    for (const f of walk(join(ROOT, "src/components/policyRate"))) {
      for (const m of readFileSync(f, "utf-8").matchAll(/<div className="([^"]*overflow-(?:x-)?auto[^"]*)"([^>]*)>/g)) {
        expect(m[1], relative(ROOT, f)).toMatch(/\brelative\b/);
        expect(m[2], relative(ROOT, f)).toContain("tabIndex={0}");
        expect(m[2], relative(ROOT, f)).toContain('role="region"');
        expect(m[2], relative(ROOT, f)).toContain("aria-label=");
      }
    }
  });
});

describe("honest limits are stated on the page", () => {
  const all = walk(join(ROOT, "src/components/policyRate")).map((f) => readFileSync(f, "utf-8")).join("\n");

  it("says meetings that held the rate are not in the data", () => {
    expect(all).toContain("Meetings at which the rate was");
    expect(all).toMatch(/held<\/strong>\{" "\}are not in the series/); // explicit {" "}: a plain space after a closing tag was dropped once
  });

  it("calls the real policy rate ex-post and not a market or expected rate, and gives the formula", () => {
    expect(all).toContain("not</strong> a market real interest rate");
    expect(all).toContain("(1 + policy rate) ÷ (1 + inflation) − 1");
    expect(all).toMatch(/ex-post/);
  });

  it("shows inflation and the policy rate together, not linked", () => {
    expect(all).toContain("Shown together, not linked");
    expect(all).toContain("They do not say that the cycle moved inflation");
  });

  it("keeps the policy rate, T-bill/PIB yields and bank rates apart, and says what is not held", () => {
    expect(all).toContain("Three different rates");
    expect(all).toContain("KIBOR, bank deposit rates, lending rates and mortgage rates");
  });

  it("says only the US is comparable internationally", () => {
    expect(all).toContain("One comparable country only");
    expect(all).toContain("Policy rates for India, Bangladesh, Sri Lanka or other peers are not held");
  });

  it("holds two government-security maturities and draws no yield curve, and says so", () => {
    expect(all).toContain("Two maturities, not a yield curve");
    expect(all).toContain("so no curve is drawn and no line between the two is implied");
    expect(all).toContain("Government-security maturities other than the 3-month T-bill and the 3-year PIB, so no yield curve");
  });

  it("states that yields are compared with the policy rate in effect on the auction day, not resampled to months", () => {
    expect(all).toContain("not averaged into months");
    expect(all).toContain("the policy rate in effect ON that date");
    expect(all).toContain("Holding (no change recorded)");
  });

  it("never claims a cause (the one sentence that denies causation is the only exemption)", () => {
    const withoutDisclaimer = all.replace("This page does not show that one caused another", "");
    expect(withoutDisclaimer).not.toMatch(/\b(caused|because of|as a result of|led to|drove inflation|brought inflation down)\b/i);
    expect(all).toContain("This page does not show that one caused another"); // and the disclaimer itself must stay
  });
});
