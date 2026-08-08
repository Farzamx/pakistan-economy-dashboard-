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
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
