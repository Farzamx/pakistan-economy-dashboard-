# Incident F.2b-R — unauthorized production write during mutation testing

**Date:** 2026-11-06 (17:27–17:29 UTC) · **Phase:** F.2b, which authorized *no* database writes ·
**Status:** contained; data preserved untouched; test architecture hardened.

## What happened

A mutation-testing experiment flipped `WRITE_MODE_AUTHORIZED` to `true` in
`src/lib/providers/pbsCpiGroupsIngestion.ts` and ran `scripts/ingestPbsCpiGroups.test.ts`. That suite
starts the real script as a subprocess, including `--write`. With the flag true, the script's write
path ran against the production database and ingested the PBS CPI file: 1,352 observations in 26 series.

## Confirmed scope (read-only verification, 2026-11-06, public anon key + public read RPCs only)

| Check | Result |
|---|---|
| `pbs:*` keys in the ledger | exactly the 26 expected; none unexpected, none missing |
| Coverage | 52 consecutive month-ends (2022-07-31 … 2026-10-31) in each of the 26 series; 1,352 current rows |
| Reconciliation with the live PBS file | 1,352 / 1,352 values exactly equal (max difference 0), checked by an independent parser |
| Provenance (every row) | provider `pbs-sdmx`; `source_series_id` = SDMX code; `quality_status` official; `release_date` null; `source_updated_at` = file *Prepared* (2026-11-03T06:38:35Z); `source_reference` file URL, DataSetID, base period, source value text all as designed |
| Vintages / `fetched_at` | all within 17:27:24–17:29:30 UTC; one current row per (key, period) |
| Other canonical keys | none of the other 29 keys has a canonical vintage in the incident window (newest: 06:50 UTC) |
| `cron_run_log` | exactly one `pbs-cpi-groups-ingestion` row: 17:27:23 → 17:29:30, `success`, "26 PBS CPI series \| 0 unchanged \| 26 updated \| 0 failed" |
| Other cron jobs seen in the window | ten routine jobs at 17:57–17:58 UTC, part of an irregular sync batch that pre-dates the incident (same batch pattern earlier the same day); none belong to this code path |

The write path performs exactly three kinds of write: `ingest_raw_observation`, `resolve_canonical_observation`
and `log_cron_run` (which also trims that one job's log to its newest 50 rows — no other job is touched).
No source-health, notification, e-mail or schema operation exists on that path.

### What could NOT be verified, and why
* **`raw_observations` row count.** The table has no read RPC and no policy; the anon key cannot see it.
  Expected 1,352 (one per observation); consistent with the single logged run and with the orchestrator's
  value-equality short-circuit, but **unverified**.
* **Superseded canonical rows.** Not exposed by any read RPC. None are expected (every key was empty before),
  but this is **unverified**.
* **A database audit log.** None is accessible without privileged credentials, which were not used. So
  "no other writes" is established only for the three RPC surfaces above and for the ledger/cron views that
  can be read; it is not established by an audit trail.
* **An aborted earlier run.** A run killed before `log_cron_run` would leave no log row. The canonical state
  (one vintage per row, one contiguous 2-minute window) is consistent with a single pass; it cannot exclude
  a second, fully-idempotent pass that wrote nothing.

## Data decision

The 1,352 observations are treated as a valid initial population. **Nothing was deleted, superseded,
re-ingested or rewritten.** Whether to keep them (recommended: they are correct and a re-run changes nothing,
verified by `--ledger live-read`: 26 unchanged / 0 new / 0 revised) is a decision for the F.2c authorization.

## Root cause

1. **The script loaded the credentials itself.** `.env.local` was not "inherited": `runWrite()` called
   `dotenv.config({ path: <cwd>/.env.local })` unconditionally, and the test helper sets `cwd` to the repository
   root. Any process that ran the write path from the repo root could obtain every secret in that file —
   not only the database ones (it also holds a Supabase management token, an e-mail API key, the cron secret,
   a Vercel OIDC token and others).
2. **The flag was changed on disk.** The harness did a text replacement in the source file; `tsx` compiled the
   mutated file when the test spawned the script.
3. **The real write path was reachable from a test.** The test that checks "`--write` is refused" runs the real script.
   It is only safe while the flag is false.
4. **The flag was the only barrier.** No environment isolation, no second gate, no confirmation tied to the
   target, no test-harness detection, and the project has a single Supabase instance (no staging) — so
   "the database" in a test *is* production.
5. **The same flag was both the safety mechanism and the thing under test.** Mutation testing exists to flip
   guards; a guard that must be flipped to be tested cannot also protect.
6. **Process.** The mutation list included the write flag with a suite that spawns the real script, in a phase
   that prohibited database writes, and the "caught" result was accepted without checking for side effects.
   The write was found only by a later read-only ledger check.
7. **Contributing:** the 120 s `spawnSync` timeout did not stop the run (it took 126.9 s). On Windows a timeout
   kills the shell, not necessarily the process tree beneath it (inferred from the timings, not separately
   proven) — a runaway subprocess can outlive its test.

## Safeguards implemented (all local; no database operation)

| # | Safeguard | Where | Independent of the flag? |
|---|---|---|---|
| 1 | Every test worker has its credentials replaced by dead values before any test file loads; verified, fails closed | `src/lib/testUtils/isolationSetup.ts`, registered in `vitest.config.mts` | yes |
| 2 | Test subprocesses get an **explicit** environment: a short allow-list + dead credentials + loopback URL + marker; verified, fails closed (also if an env file exists but cannot be inspected) | `isolatedChildEnv()` in `src/lib/testUtils/productionIsolation.ts` | yes |
| 3 | Database URLs: only loopback accepted; hosted Supabase names, hosts found in the repo's env files, unparseable or empty values are rejected | `assertNonProductionUrl()` | yes |
| 4 | The write path refuses when any test-harness signal is present, **before** any file is read, env loaded or network touched | `assertNotUnderTest()` in `src/lib/providers/writeSafetyGuard.ts`, called by the script | yes |
| 5 | A write needs `PEIC_CONFIRM_WRITE_HOST` = the host being written to, typed for that run | `assertWriteConfirmed()` | yes |
| 6 | `.env.local` is read only through `loadLocalEnv()`, a no-op under any harness signal | same module | yes |
| 7 | Policy scan of every test file: subprocesses must use `isolatedChildEnv`; no test may import a self-running script except documented exceptions that carry their own safeguards | `src/lib/testUtils/isolationPolicy.test.ts` | yes |

`dotenv` never overrides an existing variable; that property is what makes dead values in the environment an
effective last line of defence even if every software barrier is removed — and it is tested.

## Proof that mutation testing cannot reach production

`scripts/ingestPbsCpiGroups.isolation.test.ts` runs *mutated copies* of the production script (originals untouched)
against a local spy server standing in for the database:

* **A.** flag flipped (the incident): refused by barrier 4, exit 2, **0 requests**.
* **B.** flag flipped + barrier 4 removed: refused by barrier 5, **0 requests**.
* **C.** flag flipped + all three software barriers removed + `.env.local` loading forced on: the write path runs
  to completion — 26 history reads, 1,352 raw writes, 1,352 canonical writes, 1 cron log — and **every request reaches
  only the loopback spy, with a dead API key and a dead worker secret**; no real credential value or production
  host appears anywhere in the traffic or output.

After running the exact incident mutation under the new architecture, the production ledger and cron log were
re-read: unchanged (1,352 rows, same vintages, still one cron row). 12 of 12 mutations of the new safeguards are
caught by the tests.

## Review of the other ingestion tests and scripts

* **No other test spawns a process** except with `isolatedChildEnv` (policy test); `sbpTransport.test.ts` mocks `child_process`.
* **`scripts/ingestSbp.test.ts` imports `scripts/ingestSbp.ts`, whose module body runs `loadEnv(".env.local")` and
  then `main()` — the full production SBP ingestion.** It has run, with real credentials, on every full test run.
  Evidence it has not written from tests: after the last recorded run (06:50 UTC today) all 22 SBP source-health
  series show no later attempt, despite many test runs since; vitest tears the worker down within milliseconds.
  That is a race, not a guarantee, and earlier history cannot be attributed from the database (unverified).
  *Contained now* in the test only: the worker holds dead credentials (so `main()` can reach only `127.0.0.1:9`), its
  `process.exit` is stubbed, and a test asserts the environment it saw was dead.
* **All six ingestion scripts** (`ingestSbp`, `ingestWorldBank`, `ingestFred`, `ingestNetLiquidReserves`, `ingestYahooGold`,
  `calendarCanonicalDryRun`) load `.env.local` at module load and call `main()` unconditionally. They are write-by-design
  operator tools with no write gate; only `ingestSbp.test.ts` can reach one from a test.
* No provider implementation was changed in this phase.

### Bounded correction — APPLIED in Phase F.2b-S
Proposed here and implemented, after separate authorization, in Phase F.2b-S: all six scripts now start only through
`runIfEntryPoint()` (two independent entry signals; `require.main === module` alone, as first sketched, was judged too
thin because a false negative would silently stop scheduled ingestion), and the `ingestSbp.test.ts` exit stub was
removed. See [ingestion-script-entry-points.md](ingestion-script-entry-points.md). The "Remaining limitations" item 5
below is therefore resolved for those six scripts.

## Remaining limitations
1. Barriers 4–6 are in the same repository: they stop accidents, not a person who edits them. Barrier 5 is a deliberate speed-bump.
2. The ad-hoc mutation harness lives outside the repo (session scratchpad). Its safety now comes from running only through
   vitest (worker scrub). A future harness that runs scripts *outside* vitest does not get that protection — use `isolatedChildEnv`.
3. Credential detection beyond the env files in the repo root relies on variable-name patterns (a secret in an
   oddly-named variable, sourced from a shell profile, is replaced only if its name matches; a *value* is recognised
   only if it appears in a repo env file).
4. The allow-list may need a variable added if a future runtime needs one; the failure mode is a failing test, not a leak.
5. Unrelated ingestion scripts remain unguarded (proposal above).
6. The orphaned-child-on-timeout behaviour on Windows is mitigated (isolation makes an orphan harmless), not eliminated.
7. `raw_observations` and any DB audit trail remain unverifiable without privileged access.
