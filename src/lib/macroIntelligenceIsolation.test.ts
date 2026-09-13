// Phase 10.1 — persistence isolation guard. Architectural rule: "Persistence
// must NEVER feed historical information back into signal computation. The
// intelligence engine remains the source of truth." This test enforces
// that mechanically rather than by convention alone: every source file in
// src/lib/intelligence/ is read and grepped for any import of the new
// Phase 10.1 modules. A future change that makes the engine depend on
// persistence (even indirectly, via a new import) fails this test
// immediately.
//
// Deliberately placed OUTSIDE src/lib/intelligence/ — that directory is
// explicitly not to be modified in this phase, and adding even a new file
// there (despite it only reading, never importing, engine code) would cut
// against that boundary. This file imports nothing from
// src/lib/intelligence/ either; it only reads source text by path.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const INTELLIGENCE_DIR = join(__dirname, "intelligence");
// macroIntelligenceDecision joined this list in Phase 12 — the decision
// layer is another strictly downstream reader of the engine's output, so
// the same one-way rule applies to it: the engine must never import it.
const FORBIDDEN_IMPORTS = [
  "macroIntelligenceSnapshots",
  "macroIntelligenceHistory",
  "macroIntelligenceSnapshotCompute",
  "macroIntelligenceDecision",
  // Phase 13 — historical analytics is the furthest-downstream reader of
  // the engine's persisted output, so the same one-way rule applies.
  "macroIntelligenceHistoricalAnalytics",
];

/**
 * These files are heavily commented, and several of those comments name the
 * very functions these assertions forbid (explaining what the module
 * deliberately does NOT call). Matching raw source text therefore reports a
 * dependency that does not exist — so comments are removed before any
 * negative assertion, leaving only code.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("intelligence engine has no dependency on persistence (Phase 10.1 architectural invariant)", () => {
  const files = readdirSync(INTELLIGENCE_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

  it("found the expected engine files (sanity check that this test isn't silently scanning zero files)", () => {
    expect(files).toEqual(expect.arrayContaining(["types.ts", "evidence.ts", "trendAnalysis.ts", "signalDefinitions.ts", "macroIntelligence.ts"]));
  });

  it.each(files)("%s does not import any persistence/history/decision module", (file) => {
    const source = readFileSync(join(INTELLIGENCE_DIR, file), "utf-8");
    for (const forbidden of FORBIDDEN_IMPORTS) {
      expect(source.includes(forbidden)).toBe(false);
    }
  });

  // Phase 12 — the decision layer interprets the engine's output; it must
  // never reach back into the engine's internals to recompute a signal,
  // re-derive evidence, or apply its own confidence rule. Importing the
  // shared TYPE module is correct and expected; importing any rule module
  // is not.
  it("the decision layer imports only the engine's types, never its rule modules", () => {
    const source = readFileSync(join(__dirname, "macroIntelligenceDecision.ts"), "utf-8");
    for (const ruleModule of ["intelligence/evidence", "intelligence/signalDefinitions", "intelligence/trendAnalysis", "intelligence/macroIntelligence"]) {
      expect(source.includes(ruleModule)).toBe(false);
    }
    expect(source.includes("@/lib/intelligence/types")).toBe(true);
  });

  // Phase 13 — the same rule for historical analytics, plus two properties
  // specific to it: it must read PERSISTED snapshots rather than recomputing
  // history from the live engine, and it must reuse the decision layer's
  // classification rules rather than introducing a parallel set.
  it("historical analytics never recomputes history from the engine's rule modules", () => {
    const source = readFileSync(join(__dirname, "macroIntelligenceHistoricalAnalytics.ts"), "utf-8");
    for (const ruleModule of ["intelligence/evidence", "intelligence/signalDefinitions", "intelligence/trendAnalysis", "intelligence/macroIntelligence"]) {
      expect(source.includes(ruleModule)).toBe(false);
    }
    expect(source.includes("@/lib/intelligence/types")).toBe(true);
    expect(source.includes("@/lib/data/macroIntelligenceSnapshots")).toBe(true);
  });

  it("historical analytics reuses the decision layer's rules instead of redefining thresholds", () => {
    const source = readFileSync(join(__dirname, "macroIntelligenceHistoricalAnalytics.ts"), "utf-8");
    for (const reused of ["assessState", "determinePosture", "computeBreadth", "isPolarityRated", "INSUFFICIENT_DATA_STATE"]) {
      expect(source.includes(reused)).toBe(true);
    }
    // No parallel polarity map, and no re-declared breadth/posture constants.
    expect(source.includes("POLARITY_BY_DIMENSION")).toBe(false);
    expect(source).not.toMatch(/BROAD_BASED_FRACTION\s*=/);
    expect(source).not.toMatch(/MIN_RATED_DIMENSIONS_FOR_POSTURE\s*=/);
  });

  it("historical analytics performs no I/O of its own — the page supplies already-fetched snapshots", () => {
    const source = stripComments(readFileSync(join(__dirname, "macroIntelligenceHistoricalAnalytics.ts"), "utf-8"));
    for (const io of ["createClient", "supabase", "fetch(", ".rpc(", "readRecentMacroIntelligenceSnapshots"]) {
      expect(source.includes(io)).toBe(false);
    }
  });

  it("the macro-intelligence page still reads snapshots exactly once (no N+1)", () => {
    const page = stripComments(readFileSync(join(__dirname, "..", "app", "macro-intelligence", "page.tsx"), "utf-8"));
    const reads = page.match(/readRecentMacroIntelligenceSnapshots\(/g) ?? [];
    expect(reads).toHaveLength(1);
  });
});
