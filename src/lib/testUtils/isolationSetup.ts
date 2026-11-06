// Vitest setup file (vitest.config.mts -> test.setupFiles). Runs in EVERY test worker, before any test
// file is imported. It replaces every credential in the worker's process.env with a dead value and
// verifies the result; if isolation cannot be proven it throws, and the test file does not run.
//
// Why a worker-level scrub matters: several scripts call dotenv at import time or at start-up, and dotenv
// never overrides a variable that already exists. With dead values already in place, no script run from a
// test — in-process or as a subprocess that inherits this environment — can pick up the real ones.
// See productionIsolation.ts and docs/incident-f2b-r-production-write.md.

import path from "node:path";
import { scrubProcessEnvForTests } from "./productionIsolation";

scrubProcessEnvForTests(path.resolve(import.meta.dirname, "..", "..", ".."));
