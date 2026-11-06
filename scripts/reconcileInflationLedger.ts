// READ-ONLY verification harness for the Inflation page's planned move from live PBS parsing to the observation
// ledger (Phase F.2e-Prep). It changes nothing: no write, no ingestion, no page.
//
//   Part A  INDEPENDENT AUDIT of the production ledger — raw read-RPC rows, its own arithmetic, none of the new reader
//           code — so the check is not circular: coverage, gaps, duplicates, base period, units, provenance, exact
//           text-vs-number precision, latest period, headline reconstruction, contribution identity, and who/when wrote it.
//   Part B  RECONCILIATION: the real reader + assembler on the real ledger vs the F.1 parser on PBS's live file, value
//           for value, plus the three October 2026 reference figures (read out of the model, never put into it).
//   Part C  TIMING of the reads (ledger: 26 calls; PBS: 1 fetch + parse), repeated.
//
// SAFETY. Only these three PUBLIC read RPCs can be called — a wrapper throws on anything else — and the anon key is the
// only credential used. The script starts only when executed (runIfEntryPoint) and refuses under a test harness.
//
// Usage: npx tsx scripts/reconcileInflationLedger.ts [--runs N]

import { createClient } from "@supabase/supabase-js";

import { readLedgerPanel, readLedgerSeries, type ProvenanceRpc } from "@/lib/data/cpiGroupLedgerReader";
import { referenceFigures, reconcilePanels } from "@/lib/inflation/ledgerReconciliation";
import { parseCpiGroupPanel } from "@/lib/inflation/pbsGroups";
import { buildGroupModel } from "@/lib/inflation/viewModel";
import { PBS_CPI_FILE_URL, PBS_CPI_SERIES } from "@/lib/providers/pbsCpiGroupsAdapter";
import { enterScript, runIfEntryPoint } from "@/lib/providers/scriptEntry";

/** The ONLY database calls this script can make. All are public, read-only (STABLE / SELECT) RPCs. */
export const ALLOWED_READ_RPCS: readonly string[] = ["get_canonical_observation_provenance", "get_canonical_freshness_summary", "get_cron_run_history"];

type Row = Record<string, unknown>;
const line = (s = "") => console.log(s);
let failures = 0;
function check(ok: boolean, label: string, detail = ""): void {
  if (!ok) failures++;
  line(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function readOnlyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — check .env.local");
  const client = createClient(url, key);
  return {
    rpc(name: string, args?: Record<string, unknown>) {
      if (!ALLOWED_READ_RPCS.includes(name)) throw new Error(`reconcileInflationLedger: RPC "${name}" is not on the read-only allow-list`);
      return client.rpc(name, args);
    },
  };
}

async function main(): Promise<void> {
  const runsArg = process.argv.indexOf("--runs");
  const runs = runsArg >= 0 ? Math.max(1, Number(process.argv[runsArg + 1]) || 3) : 3;
  const db = readOnlyClient();
  line("=== Inflation ledger migration: READ-ONLY verification (no writes, no ingestion, no page change) ===");

  // ─────────────────────────────────────────── Part A ───────────────────────────────────────────
  line("\nPART A — independent audit of the production ledger");
  const raw: Record<string, Row[]> = {};
  for (const def of PBS_CPI_SERIES) {
    const { data, error } = await db.rpc("get_canonical_observation_provenance", { p_indicator_key: def.indicatorKey, p_limit: 5000 });
    if (error) throw new Error(`${def.indicatorKey}: ${error.message}`);
    raw[def.indicatorKey] = (data ?? []) as Row[];
  }
  const keys = PBS_CPI_SERIES.map((d) => d.indicatorKey);
  check(keys.every((k) => raw[k].length > 0), "all 26 expected series exist", `${keys.filter((k) => raw[k].length > 0).length} of 26`);

  const months = (k: string) => raw[k].map((r) => String(r.observation_period).slice(0, 7)).sort();
  const ref = months("pbs:cpiIndexNational");
  check(ref.length === 52 && ref[0] === "2022-07" && ref[ref.length - 1] === "2026-10", "headline covers 52 months, 2022-07 … 2026-10", `${ref.length} months, ${ref[0]} … ${ref[ref.length - 1]}`);
  check(keys.every((k) => JSON.stringify(months(k)) === JSON.stringify(ref)), "all 26 series cover exactly the same 52 months");
  const total = keys.reduce((s, k) => s + raw[k].length, 0);
  check(total === 1352, "1,352 current observations in total", String(total));
  const dups = keys.filter((k) => new Set(months(k)).size !== raw[k].length);
  check(dups.length === 0, "no duplicate current observation for any (series, month)", dups.join(", "));
  const idx = ref.map((m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5)));
  check(idx.every((v, i) => i === 0 || v - idx[i - 1] === 1), "no gaps: the 52 months are consecutive");
  check(keys.every((k) => raw[k].every((r) => { const p = String(r.observation_period); const [y, m] = [Number(p.slice(0, 4)), Number(p.slice(5, 7))]; return p === `${p.slice(0, 7)}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`; })), "every observation date is a month-end");

  const refOf = (r: Row) => (r.source_reference ?? {}) as Row;
  const bases = new Set(keys.flatMap((k) => raw[k].map((r) => String(refOf(r).basePeriod))));
  check(bases.size === 1 && bases.has("2015/2016"), "one consistent base period across all 1,352 observations", [...bases].join(", "));
  const units = new Set(keys.flatMap((k) => raw[k].map((r) => String(r.unit))));
  check(units.size === 3, "exactly three units (index, % of basket, % of basket all groups)", [...units].join(" | "));
  check(PBS_CPI_SERIES.every((d) => raw[d.indicatorKey].every((r) => r.source_series_id === d.sdmxIndicator && refOf(r).sdmxIndicator === d.sdmxIndicator)), "every row's source_series_id and SDMX indicator match its key");
  check(keys.every((k) => raw[k].every((r) => refOf(r).file === PBS_CPI_FILE_URL)), "every row names the PBS CPI file as its source");
  check(keys.every((k) => raw[k].every((r) => r.quality_status === "official" && r.release_date === null)), "quality_status is 'official' and release_date is null on every row (none invented)");
  check(keys.every((k) => raw[k].every((r) => Number(refOf(r).sourceValue) === Number(r.value))), "stored number == the exact source text recorded beside it, on all 1,352 rows (full precision)");
  const prepared = new Set(keys.flatMap((k) => raw[k].map((r) => String(r.source_updated_at))));
  const fetched = keys.flatMap((k) => raw[k].map((r) => String(r.fetched_at))).sort();
  const vintages = keys.flatMap((k) => raw[k].map((r) => String(r.vintage))).sort();
  line(`         source_updated_at (file Prepared): ${[...prepared].join(", ")}`);
  line(`         fetched_at: ${fetched[0]} … ${fetched[fetched.length - 1]}   vintage: ${vintages[0]} … ${vintages[vintages.length - 1]}`);
  line(`         DataSetIDs: ${[...new Set(keys.flatMap((k) => raw[k].map((r) => String(refOf(r).dataSetId))))].join(", ")}`);

  // Headline reconstruction and contribution identity, with this script's own arithmetic.
  const val = (k: string, m: string) => Number((raw[k].find((r) => String(r.observation_period).startsWith(m)) as Row).value);
  const gk = (n: number, kind: "Index" | "Weight") => `pbs:cpiGroup${kind}${String(n).padStart(2, "0")}`;
  const w = Array.from({ length: 12 }, (_, i) => val(gk(i + 1, "Weight"), ref[0]));
  const wSum = w.reduce((a, b) => a + b, 0);
  check(Array.from({ length: 12 }, (_, i) => ref.every((m) => val(gk(i + 1, "Weight"), m) === w[i])).every(Boolean), "each group weight is constant across all 52 months (fixed basket)");
  check(Math.abs(wSum - 100) <= 0.1, "the 12 weights total 100 (±0.1)", wSum.toFixed(4));
  check(ref.every((m) => Math.abs(val("pbs:cpiWeightTotal", m) - 100) <= 0.1), "the stored total-weight series is 100 (±0.1) in every month");
  let worst = 0;
  for (const m of ref) {
    const agg = w.reduce((s, wi, i) => s + wi * val(gk(i + 1, "Index"), m), 0) / wSum;
    worst = Math.max(worst, Math.abs(agg - val("pbs:cpiIndexNational", m)));
  }
  check(worst < 0.05, "the 12 group indices reconstruct the national headline index (Laspeyres) in every month", `worst gap ${worst.toFixed(4)} index points`);
  let worstContrib = 0;
  let nYoY = 0;
  for (let t = 12; t < ref.length; t++) {
    const m = ref[t], b = ref[t - 12];
    const H = val("pbs:cpiIndexNational", m), H0 = val("pbs:cpiIndexNational", b);
    const yoy = (H / H0 - 1) * 100;
    const sum = w.reduce((s, wi, i) => s + (wi / wSum) * ((val(gk(i + 1, "Index"), m) - val(gk(i + 1, "Index"), b)) / H0) * 100, 0);
    worstContrib = Math.max(worstContrib, Math.abs(sum - yoy));
    nYoY++;
  }
  check(worstContrib < 0.02, "group contributions add up to headline YoY inflation", `${nYoY} months, worst gap ${worstContrib.toFixed(4)} pp`);

  const { data: summary, error: sumErr } = await db.rpc("get_canonical_freshness_summary");
  if (sumErr) throw new Error(sumErr.message);
  const sum = (summary ?? []) as Row[];
  const pbsRows = sum.filter((r) => String(r.indicator_key).startsWith("pbs:"));
  check(pbsRows.length === 26 && pbsRows.every((r) => keys.includes(String(r.indicator_key))), "the freshness summary lists exactly the 26 expected pbs:* keys, no others", `${pbsRows.length} found`);
  check(pbsRows.every((r) => r.source_provider === "pbs-sdmx" && String(r.latest_observation_period) === "2026-10-31"), "provider is pbs-sdmx and the latest observation period is 2026-10-31 for all 26");
  const { data: cron, error: cronErr } = await db.rpc("get_cron_run_history", { p_job_name: "pbs-cpi-groups-ingestion", p_limit: 5 });
  if (cronErr) throw new Error(cronErr.message);
  line(`         cron_run_log for pbs-cpi-groups-ingestion: ${(cron as Row[]).length} row(s)${(cron as Row[]).length ? `, latest ${(cron as Row[])[0].started_at} (${(cron as Row[])[0].status})` : ""}`);

  // ─────────────────────────────────────────── Part B ───────────────────────────────────────────
  line("\nPART B — reconciliation: ledger-backed model vs F.1's live-PBS model");
  const rpc: ProvenanceRpc = (k, limit, signal) => db.rpc("get_canonical_observation_provenance", { p_indicator_key: k, p_limit: limit }).abortSignal(signal);
  const ledger = await readLedgerPanel(rpc);
  check(ledger.panel !== null, "the real reader + assembler accept the production ledger", ledger.issues.join(" | "));
  let pbsPanel = null as ReturnType<typeof parseCpiGroupPanel>["panel"];
  try {
    const res = await fetch(PBS_CPI_FILE_URL, { signal: AbortSignal.timeout(20_000) });
    const parsed = parseCpiGroupPanel(await res.text());
    pbsPanel = parsed.panel;
    check(pbsPanel !== null, `PBS's live file (HTTP ${res.status}) parses and passes the F.1 checks`, parsed.issues.join(" | "));
  } catch (err) {
    check(false, "PBS's live file could be fetched", err instanceof Error ? err.message : String(err));
  }
  if (ledger.panel && pbsPanel) {
    const rec = reconcilePanels(pbsPanel, ledger.panel);
    for (const c of rec.checks) check(c.ok, `${c.name}`, `${c.compared} values compared, max |diff| ${c.maxAbsDiff}${c.detail ? `, first mismatch ${c.detail}` : ""}`);
    check(rec.ok, `ALL identical (${rec.totalCompared} values compared)`);
    const fig = referenceFigures(buildGroupModel(ledger.panel)!, "2026-10");
    line(`         October 2026 from the ledger model: food contribution ${fig?.foodContribution.toFixed(4)} pp, total ${fig?.totalContribution.toFixed(4)} pp, transport YoY ${fig?.transportYoY.toFixed(4)} %`);
    check(!!fig && Math.abs(fig.foodContribution - 2.85) < 0.005 && Math.abs(fig.totalContribution - 9.61) < 0.005 && Math.abs(fig.transportYoY - 28.61) < 0.005, "October 2026 reference figures: food 2.85 pp, total 9.61 pp, transport 28.61 % (to 2 dp)");
    line(`         latest months: ledger ${ledger.panel.months.at(-1)}  PBS ${pbsPanel.months.at(-1)}`);
  }

  // ─────────────────────────────────────────── Part C ───────────────────────────────────────────
  line(`\nPART C — timing (${runs} runs each; wall-clock from this machine, so indicative, not a production figure)`);
  const ledgerMs: number[] = [];
  const seqMs: number[] = [];
  const pbsMs: number[] = [];
  let calls = 0;
  for (let i = 0; i < runs; i++) {
    const r = await readLedgerSeries(rpc);
    ledgerMs.push(r.stats.ms);
    calls = r.stats.rpcCalls;
    const t0 = Date.now();
    const rs = await readLedgerSeries(rpc, { concurrency: 1 });
    seqMs.push(Date.now() - t0);
    void rs;
    const t1 = Date.now();
    const res = await fetch(PBS_CPI_FILE_URL, { signal: AbortSignal.timeout(20_000) });
    parseCpiGroupPanel(await res.text());
    pbsMs.push(Date.now() - t1);
  }
  line(`  ledger, 26 RPCs @ concurrency 6 : ${ledgerMs.join(", ")} ms   (median ${median(ledgerMs)} ms; ${calls} RPC calls)`);
  line(`  ledger, 26 RPCs sequential      : ${seqMs.join(", ")} ms   (median ${median(seqMs)} ms)`);
  line(`  PBS file fetch + parse          : ${pbsMs.join(", ")} ms   (median ${median(pbsMs)} ms; 1 HTTP request)`);

  line(`\n=== ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`} · database writes: 0 · RPCs used: ${ALLOWED_READ_RPCS.join(", ")} ===`);
  process.exit(failures === 0 ? 0 : 1);
}

runIfEntryPoint({ filename: __filename, requireMain: typeof require !== "undefined" && require.main === module }, () => {
  enterScript("reconcile:inflation-ledger");
  main().catch((err) => {
    console.error("[reconcile:inflation-ledger] Fatal error:", err instanceof Error ? (err.stack ?? err.message) : String(err));
    console.error("DATABASE WRITES: 0");
    process.exit(1);
  });
});
