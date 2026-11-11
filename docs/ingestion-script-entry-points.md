# Ingestion scripts: how they are launched, and why importing them is inert

Phase F.2b-S. Follows the F.2b-R incident ([incident-f2b-r-production-write.md](incident-f2b-r-production-write.md)).

## The rule

**Importing a script runs nothing.** A script's start-up — loading `.env.local`, creating a database client, calling
`main()` — happens only when that file is the program being executed. The mechanism is one shared helper,
[`src/lib/providers/scriptEntry.ts`](../src/lib/providers/scriptEntry.ts), built on the F.2b-R safety modules
(`writeSafetyGuard.ts`, `productionIsolation.ts`). Each script ends with:

```ts
runIfEntryPoint({ filename: __filename, requireMain: typeof require !== "undefined" && require.main === module }, () => {
  enterScript("ingest:fred");   // refuse under a test harness (exit 2), then load .env.local exactly as before
  main().catch(/* unchanged */);
});
```

"Executed directly" is decided by two independent signals, **either** of which is enough: `require.main === module`, and
`process.argv[1]` resolving to the script's own file. Both were observed to hold under every real launch style below, and
neither holds for an imported module. A silent ingestion outage would need both to fail at once.

`main()`, the calculations, provider mappings, retries, logging and exit codes are **byte-for-byte unchanged**; the
only differences from the previous version are the import swap and the wrapper (see the diff in the F.2b-S report).

## How each script is launched (observed, not assumed)

Read from the live Windows Task Scheduler (read-only), `package.json`, `.github/workflows/*`, `vercel.json` and the docs.

| Script | Scheduled? | Task Scheduler task · trigger | Also |
|---|---|---|---|
| `scripts/ingestSbp.ts` | **yes** | "PEIC SBP Ingestion" · daily 08:00 **and at logon**; StartWhenAvailable, WakeToRun, IgnoreNew, 1 h limit, **RestartCount 3** | `npm run ingest:sbp` |
| `scripts/ingestWorldBank.ts` | **yes** | "PEIC - World Bank GDP Ingestion" · weekly Mon 08:15 | `npm run ingest:worldbank` |
| `scripts/ingestNetLiquidReserves.ts` | **yes** | "PEIC - Net Liquid FX Reserves Ingestion" · weekly Mon 08:30 | `npm run ingest:netliquidreserves` |
| `scripts/ingestFred.ts` | **yes** | "PEIC - FRED Monthly Ingestion" · weekly Mon 08:45 | `npm run ingest:fred` |
| `scripts/ingestYahooGold.ts` | **a task exists** | "PEIC - Yahoo Gold Monthly Ingestion" · one-time-type trigger (2026-09-03 09:00), last run 2026-10-19 | `npm run ingest:yahoogold`. The script's old header said "NOT scheduled"; the live scheduler disagrees. |
| `scripts/calendarCanonicalDryRun.ts` | no | — | manual `npx tsx scripts/calendarCanonicalDryRun.ts` (read-only) |

Every scheduled action has the same shape: `F:\node.exe "<repo>\node_modules\tsx\dist\cli.mjs" "<repo>\scripts\<name>.ts"`,
**working directory = the repo root**, user `farza`, interactive logon. No scheduled command uses `npm`.
**No GitHub Actions workflow runs any of the scheduled scripts above** (three of the workflows call other things; one comment
mentions `ingestSbp.ts`). The one exception is read-only: `.github/workflows/cpi-pbs-runner-probe.yml` (Stage 1 of the GitHub
Actions evaluation for CPI ingestion) is **dispatch-only** and runs the *default dry run* of `ingestPbsCpiGroups.ts`
(`npm run ingest:pbscpigroups`, no flag) on a GitHub-hosted runner, to show that the PBS file is reachable and passes the
production validation from there. It has no schedule, no pull-request or push trigger, no secret, no environment, no database
credential and no write flag, and it cannot write: the dry run applies its plan to an in-memory ledger only. It is not a
scheduler for this job and does not register one. `src/lib/cpiIngestionSchedule.test.ts` keeps the script out of every other
workflow and pins each of these properties for the probe. **Vercel crons call API routes only** (`vercel.json`). No
`.bat`/`.ps1` wrappers exist.

Exit codes matter for the scheduler (SBP has `RestartCount 3`) and were left alone: `1` for a missing secret / total
failure / fatal error, `0` otherwise; the calendar dry run uses `process.exitCode = 1`.

## What changed in behaviour, exactly

| | Before | After |
|---|---|---|
| `import "scripts/ingestFred"` (tests, tools, IDE) | loads `.env.local`, creates a client, runs the ingestion | nothing runs; exports (e.g. `ingestSeries`) still available |
| Task Scheduler / `npm run` / `npx tsx` | runs | runs — **identical** exit code, stdout and stderr (verified side by side against git HEAD, six of six) |
| Run under a test harness (`PEIC_TEST_ISOLATION`, `VITEST*`, `NODE_ENV=test`) | runs | refuses: exit 2, `[label] REFUSED: …`, before reading any env file |
| New requirement for the scheduler | — | **none** (no new variable, flag or argument) |

Deliberately **not** applied to these six: the target-bound confirmation `PEIC_CONFIRM_WRITE_HOST` that guards the PBS
script. Requiring it would need the scheduled tasks to be edited; until that is separately approved, it would silently
stop scheduled ingestion. The harness refusal plus environment isolation (`dotenv` never overrides a set variable) are
the barriers that apply to them.

## How it is tested (`scripts/ingestScriptsEntrySafety.test.ts` and friends)

Every child process gets an explicit allow-list environment from `isolatedChildEnv()` — dead credentials, loopback database
URL, isolation marker — and the only URL it is ever given is a loopback spy.

1. **Import is inert** — a real child imports each script with tripwires on `fetch`, sockets, `child_process`,
   `createClient`, `dotenv`, `process.exit` and "Started" log lines, plus a canary variable that exists only in `.env.local`.
   All zero. A synthetic old-style script proves the probe can fail.
2. **Explicit start reaches the entry point** — run in the Task Scheduler shape (node + tsx cli + absolute path, cwd = repo root)
   and via `npm run`: exit 2 with the refusal message and zero requests. Silence would mean the entry point was *not* detected.
3. **Past the barrier, behaviour is unchanged** — mutated copies with the entry barrier removed print the original message
   and exit with the original code; the calendar dry run produces its report reading only through the spy.
4. **Containment** — World Bank with the barrier removed *and* a secret present: its provider connection is denied, and every
   database request lands on the spy with dead credentials only; no real credential or host appears anywhere.
5. **Policy scan** — every credential-touching script must start only through `runIfEntryPoint()`; no test may import a
   self-running script (the exception list is now empty); no test may import the `verify_*.mjs` tools.

## If you add a launcher

Entry detection was verified for `node tsx\dist\cli.mjs <abs path>`, `tsx <relative path>` (npm) and `npx tsx`. A different
launcher (`node --import tsx`, compiled JavaScript, pm2, a bundler) must be checked **before** it is scheduled: the failure
mode of a wrong detection is a script that exits 0 and does nothing. The unit tests in
`src/lib/providers/scriptEntry.test.ts` show how to probe it; the quickest manual check is that the script prints its usual
"Started — run …" line.
