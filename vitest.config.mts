import { defineConfig } from "vitest/config";
import path from "path";

// Unit-test runner for the platform's pure-function engine layer
// (src/lib/decisionSupportLab/*Engine.ts and similar) — no test runner
// existed in this repo before Phase 6. Deliberately scoped to engines,
// not components: these are the highest-value, lowest-cost test target
// (deterministic math with exact expected values), not an attempt at full
// component/E2E coverage.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // Phase 7: "server-only" isn't installed in this repo's node_modules
      // (see src/lib/testUtils/serverOnlyStub.ts's header) -- this lets
      // Vitest resolve modules that legitimately need the real tag in
      // production (comparisonData.ts) without weakening that boundary,
      // which is enforced by Next.js's own bundler, not by this alias.
      "server-only": path.resolve(import.meta.dirname, "./src/lib/testUtils/serverOnlyStub.ts"),
    },
  },
});
