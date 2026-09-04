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
const FORBIDDEN_IMPORTS = ["macroIntelligenceSnapshots", "macroIntelligenceHistory", "macroIntelligenceSnapshotCompute"];

describe("intelligence engine has no dependency on persistence (Phase 10.1 architectural invariant)", () => {
  const files = readdirSync(INTELLIGENCE_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

  it("found the expected engine files (sanity check that this test isn't silently scanning zero files)", () => {
    expect(files).toEqual(expect.arrayContaining(["types.ts", "evidence.ts", "trendAnalysis.ts", "signalDefinitions.ts", "macroIntelligence.ts"]));
  });

  it.each(files)("%s does not import any Phase 10.1 persistence/history module", (file) => {
    const source = readFileSync(join(INTELLIGENCE_DIR, file), "utf-8");
    for (const forbidden of FORBIDDEN_IMPORTS) {
      expect(source.includes(forbidden)).toBe(false);
    }
  });
});
