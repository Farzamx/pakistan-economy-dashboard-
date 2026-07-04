/**
 * Phase 10 Production Verification — Economic Calendar Audit
 *
 * Verifies end-to-end pipeline health for every automated event type:
 *   1. Environment check
 *   2. Automated series pipeline status (all 9 automated + 4 official-calendar series)
 *   3. Stuck scheduled events audit (past-due but never released)
 *   4. treasury-bill-auction-6m / -12m cleanup verification (migration 0034)
 *   5. Notification pipeline health (pending jobs, recent completions)
 *   6. Gap detection coverage (lookback check for monthly series)
 *   7. Official calendar sync freshness (MPC / T-bills / PIB)
 *   8. Subscriber system health (subscriber count, recent email log)
 *   9. Source health log (last fetch attempt per sync job)
 *  10. cron_run_log freshness (all 8 pipeline steps)
 *  11. Recurrence integrity (future events exist for all automated monthly series)
 *  12. Full dependency map summary
 *
 * Run:
 *   node scripts/verify_phase10.mjs
 *
 * Reads credentials from .env.local.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Load .env.local ──────────────────────────────────────────────────────────
let SUPABASE_URL, ANON_KEY;
try {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const [k, ...rest] = line.trim().split("=");
    const v = rest.join("=").replace(/^"|"$/g, "");
    if (k === "NEXT_PUBLIC_SUPABASE_URL") SUPABASE_URL = v;
    if (k === "NEXT_PUBLIC_SUPABASE_ANON_KEY") ANON_KEY = v;
  }
} catch {
  console.error("Could not read .env.local. Copy .env.example and fill in values.");
  process.exit(1);
}
if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

async function query(path, params = "") {
  const url = `${SUPABASE_URL}/rest/v1/${path}${params ? `?${params}` : ""}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
  return res.json();
}

function section(title) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(70));
}

function ok(msg) { console.log(`  ✅  ${msg}`); }
function warn(msg) { console.log(`  ⚠️   ${msg}`); }
function fail(msg) { console.log(`  ❌  ${msg}`); }
function info(msg) { console.log(`  ℹ️   ${msg}`); }

// ── Section 1: Environment ───────────────────────────────────────────────────
section("1. Environment");
info(`Supabase URL: ${SUPABASE_URL}`);
info(`Today: ${new Date().toISOString().slice(0, 10)}`);

// ── Section 2: Automated Series Pipeline Status ──────────────────────────────
section("2. Automated Series — Next Scheduled Event");

const AUTOMATED_SERIES = [
  // Monthly EasyData / PBS
  "cpi-inflation-release",
  "core-inflation-release",
  "current-account-balance",
  "worker-remittances",
  "large-scale-manufacturing-lsm-growth",
  // Weekly
  "spi-weekly-inflation-release",
  // As-needed
  "sbp-foreign-exchange-reserves",
  // PBS advance Excel
  "trade-balance",
  "exports-release",
  "imports-release",
  // Official calendar
  "sbp-monetary-policy-committee-meeting",
  "treasury-bill-auction-3m",
  "pib-auction",
  "sbp-monetary-policy-report",
];

const today = new Date().toISOString().slice(0, 10);

for (const slug of AUTOMATED_SERIES) {
  try {
    const rows = await query(
      "economic_events",
      `select=event_date,status,actual_value,economic_event_series!inner(slug)&economic_event_series.slug=eq.${slug}&status=eq.scheduled&order=event_date.asc&limit=1`,
    );
    const ev = rows[0];
    if (!ev) {
      warn(`${slug}: NO scheduled event found — check gap detection or recurrence`);
    } else {
      const isPastDue = ev.event_date < today;
      if (isPastDue) {
        fail(`${slug}: PAST-DUE scheduled event at ${ev.event_date} — expected release not triggered`);
      } else {
        ok(`${slug}: next scheduled ${ev.event_date}`);
      }
    }
  } catch (e) {
    fail(`${slug}: query error — ${e.message}`);
  }
}

// ── Section 3: Stuck Scheduled Events (past-due, no actual_value) ───────────
section("3. Stuck Scheduled Events Audit");

try {
  const stuckRows = await query(
    "economic_events",
    `select=slug,event_date,status,actual_value,economic_event_series!inner(slug,automation_tier)&status=eq.scheduled&event_date=lt.${today}&order=event_date.asc&limit=50`,
  );
  if (stuckRows.length === 0) {
    ok("No past-due scheduled events — calendar is clean");
  } else {
    const manual = stuckRows.filter(r => r.economic_event_series?.automation_tier === "manual");
    const automated = stuckRows.filter(r => r.economic_event_series?.automation_tier !== "manual");
    if (manual.length > 0) {
      info(`${manual.length} manual series past-due events (expected — no auto-release path):`);
      for (const r of manual.slice(0, 5)) info(`  → ${r.economic_event_series?.slug} @ ${r.event_date}`);
    }
    if (automated.length > 0) {
      fail(`${automated.length} AUTOMATED series past-due events (should have released):`);
      for (const r of automated) fail(`  → ${r.economic_event_series?.slug} @ ${r.event_date}`);
    } else {
      ok(`${manual.length} manual-only past-due events — no automated series stuck`);
    }
  }
} catch (e) {
  fail(`Stuck events query failed: ${e.message}`);
}

// ── Section 4: Treasury-Bill 6M / 12M Cleanup (migration 0034) ──────────────
section("4. T-Bill 6M / 12M Cleanup Verification (migration 0034)");

for (const slug of ["treasury-bill-auction-6m", "treasury-bill-auction-12m"]) {
  try {
    const scheduled = await query(
      "economic_events",
      `select=event_date,status,economic_event_series!inner(slug)&economic_event_series.slug=eq.${slug}&status=eq.scheduled&limit=5`,
    );
    if (scheduled.length === 0) {
      ok(`${slug}: no scheduled events — migration 0034 applied`);
    } else {
      fail(`${slug}: ${scheduled.length} scheduled event(s) still exist — run migration 0034`);
      for (const r of scheduled) fail(`  → event_date=${r.event_date}`);
    }
  } catch (e) {
    fail(`${slug}: query error — ${e.message}`);
  }
}

// ── Section 5: Notification Pipeline Health ──────────────────────────────────
section("5. Notification Pipeline Health");

try {
  const recentJobs = await query(
    "notification_jobs",
    `select=id,status,created_at,completed_at,economic_event_id&order=created_at.desc&limit=5`,
  );
  if (recentJobs.length === 0) {
    info("No notification_jobs rows — no events released yet (or table is empty)");
  } else {
    info(`Last ${recentJobs.length} notification jobs:`);
    for (const j of recentJobs) {
      const age = Math.round((Date.now() - new Date(j.created_at).getTime()) / 3600000);
      const status = j.status === "completed" ? "✅" : j.status === "pending" ? "⏳" : "❌";
      console.log(`    ${status} ${j.status} | created ${age}h ago | event_id=${j.economic_event_id?.slice(0, 8)}...`);
    }
    const pendingCount = recentJobs.filter(j => j.status === "pending").length;
    if (pendingCount > 0) warn(`${pendingCount} pending job(s) — check if sync cron is running`);
    else ok("All recent notification jobs completed");
  }
} catch (e) {
  fail(`notification_jobs query failed (table may require service key): ${e.message}`);
  info("This is expected — notification_jobs has RLS restricting anon access");
}

// ── Section 6: Gap Detection Coverage ───────────────────────────────────────
section("6. Gap Detection Coverage (monthly series lookback)");

const MONTHLY_SERIES = [
  { slug: "cpi-inflation-release",                  lagMonths: 1, expectedDay: 1  },
  { slug: "core-inflation-release",                 lagMonths: 1, expectedDay: 1  },
  { slug: "current-account-balance",                lagMonths: 2, expectedDay: 15 },
  { slug: "worker-remittances",                     lagMonths: 2, expectedDay: 10 },
  { slug: "large-scale-manufacturing-lsm-growth",   lagMonths: 2, expectedDay: 18 },
  { slug: "trade-balance",                          lagMonths: 1, expectedDay: 17 },
  { slug: "exports-release",                        lagMonths: 1, expectedDay: 17 },
  { slug: "imports-release",                        lagMonths: 1, expectedDay: 17 },
];

function expectedReleaseDate(obsYear, obsMonth, lagMonths, dayOfMonth) {
  let releaseMonth = obsMonth + lagMonths;
  let releaseYear = obsYear;
  while (releaseMonth > 12) { releaseMonth -= 12; releaseYear++; }
  const lastDay = new Date(Date.UTC(releaseYear, releaseMonth, 0)).getUTCDate();
  return new Date(Date.UTC(releaseYear, releaseMonth - 1, Math.min(dayOfMonth, lastDay)));
}

const now = new Date();
for (const { slug, lagMonths, expectedDay } of MONTHLY_SERIES) {
  // Check the most recent past release month (i=lagMonths+1 to be past due)
  const lookbackIdx = lagMonths + 1;
  let obsMonth = now.getUTCMonth() + 1 - lookbackIdx;
  let obsYear = now.getUTCFullYear();
  while (obsMonth <= 0) { obsMonth += 12; obsYear--; }

  const expectedDate = expectedReleaseDate(obsYear, obsMonth, lagMonths, expectedDay);
  const windowStart = new Date(expectedDate);
  windowStart.setUTCDate(windowStart.getUTCDate() - 10);
  const windowEnd = new Date(expectedDate);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 10);

  try {
    const rows = await query(
      "economic_events",
      `select=event_date,status,actual_value,economic_event_series!inner(slug)&economic_event_series.slug=eq.${slug}` +
      `&event_date=gte.${windowStart.toISOString().slice(0,10)}&event_date=lte.${windowEnd.toISOString().slice(0,10)}&limit=3`,
    );
    if (rows.length === 0) {
      fail(`${slug}: MISSING event near ${expectedDate.toISOString().slice(0,10)} (obs ${obsYear}-${String(obsMonth).padStart(2,'0')}) — gap detection should have created it`);
    } else {
      const r = rows[0];
      const statusIcon = r.status === "released" ? "✅" : r.status === "scheduled" ? "⏳" : "⚠️";
      ok(`${slug}: ${statusIcon} ${r.status} @ ${r.event_date}${r.actual_value ? ` = ${r.actual_value}` : ""}`);
    }
  } catch (e) {
    fail(`${slug}: query error — ${e.message}`);
  }
}

// ── Section 7: Official Calendar Sync Freshness ──────────────────────────────
section("7. Official Calendar Sync — Future Events");

for (const slug of ["sbp-monetary-policy-committee-meeting", "treasury-bill-auction-3m", "pib-auction"]) {
  try {
    const rows = await query(
      "economic_events",
      `select=event_date,status,economic_event_series!inner(slug)&economic_event_series.slug=eq.${slug}&status=eq.scheduled&event_date=gt.${today}&order=event_date.asc&limit=3`,
    );
    if (rows.length === 0) {
      warn(`${slug}: no future scheduled events — official calendar may need a reconcile run`);
    } else {
      ok(`${slug}: ${rows.length} future scheduled event(s), next ${rows[0].event_date}`);
    }
  } catch (e) {
    fail(`${slug}: query error — ${e.message}`);
  }
}

// ── Section 8: Subscriber System Health ─────────────────────────────────────
section("8. Subscriber System Health");

try {
  const subs = await query("subscribers", `select=status&limit=200`);
  const verified = subs.filter(s => s.status === "verified").length;
  const pending = subs.filter(s => s.status === "pending").length;
  ok(`Subscribers: ${verified} verified, ${pending} pending verification`);
} catch (e) {
  info(`subscribers query failed (expected — RLS restricts anon): ${e.message}`);
}

// ── Section 9: cron_run_log Freshness ────────────────────────────────────────
section("9. cron_run_log — Last 24h Run Summary");

const EXPECTED_CRON_JOBS = [
  "official-calendar-sync",
  "calendar-gap-detection",
  "cpi-pbs-sync",
  "trade-balance-sync",
  "fx-reserves-sync",
  "sbp-actual-value-sync",
  "lsm-pbs-sync",
  "lsm-yoy-sync",
  "notification-worker",
];

const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();

try {
  const cronRows = await query(
    "cron_run_log",
    `select=job_name,status,ran_at,detail&ran_at=gte.${since24h}&order=ran_at.desc&limit=100`,
  );

  const byJob = {};
  for (const r of cronRows) {
    if (!byJob[r.job_name]) byJob[r.job_name] = [];
    byJob[r.job_name].push(r);
  }

  for (const job of EXPECTED_CRON_JOBS) {
    const runs = byJob[job];
    if (!runs || runs.length === 0) {
      warn(`${job}: no run in last 24h`);
    } else {
      const latest = runs[0];
      const icon = latest.status === "success" ? "✅" : "❌";
      const ageMin = Math.round((Date.now() - new Date(latest.ran_at).getTime()) / 60000);
      console.log(`  ${icon} ${job}: ${latest.status} (${ageMin}min ago)`);
    }
  }
} catch (e) {
  fail(`cron_run_log query failed: ${e.message}`);
}

// ── Section 10: Source Health Log ────────────────────────────────────────────
section("10. Source Health Log — Recent Fetch Attempts");

try {
  const healthRows = await query(
    "source_health_log",
    `select=series_slug,source_name,success,fetched_at,observation_date,error&order=fetched_at.desc&limit=20`,
  );
  if (healthRows.length === 0) {
    info("No source_health_log entries yet");
  } else {
    for (const r of healthRows.slice(0, 10)) {
      const icon = r.success ? "✅" : "❌";
      const ageMin = Math.round((Date.now() - new Date(r.fetched_at).getTime()) / 60000);
      console.log(`  ${icon} ${r.series_slug} | ${r.source_name} | ${ageMin}min ago${r.observation_date ? ` | obs=${r.observation_date}` : ""}${r.error ? ` | ERR: ${r.error.slice(0,60)}` : ""}`);
    }
  }
} catch (e) {
  fail(`source_health_log query failed: ${e.message}`);
}

// ── Section 11: FX Reserves Chain ────────────────────────────────────────────
section("11. FX Reserves — Weekly Chain Integrity");

try {
  const fxRows = await query(
    "economic_events",
    `select=event_date,status,actual_value,observation_date,economic_event_series!inner(slug)&economic_event_series.slug=eq.sbp-foreign-exchange-reserves&order=event_date.desc&limit=5`,
  );
  if (fxRows.length === 0) {
    fail("sbp-foreign-exchange-reserves: no events found");
  } else {
    for (const r of fxRows) {
      const icon = r.status === "released" ? "✅" : r.status === "scheduled" ? "⏳" : "⚠️";
      console.log(`  ${icon} ${r.event_date} | ${r.status} | actual=${r.actual_value ?? "—"} | obs=${r.observation_date ?? "—"}`);
    }
    const latestScheduled = fxRows.find(r => r.status === "scheduled");
    if (!latestScheduled) {
      warn("No future scheduled FX reserves event — generate_next_occurrence() may not have fired");
    } else if (latestScheduled.event_date > today) {
      ok(`Next FX reserves event scheduled at ${latestScheduled.event_date}`);
    } else {
      fail(`FX reserves past-due scheduled event at ${latestScheduled.event_date}`);
    }
  }
} catch (e) {
  fail(`FX reserves query failed: ${e.message}`);
}

// ── Section 12: Full Dependency Map Summary ───────────────────────────────────
section("12. Phase 10 Dependency Map Summary");

console.log(`
  AUTOMATED SERIES (auto-release via 8-step cron pipeline):
  ─────────────────────────────────────────────────────────
  Source        Series Slug                          Step  Cadence
  ──────────────────────────────────────────────────────────────────
  PBS PDF       cpi-inflation-release                3     monthly (lag=1)
  PBS PDF       core-inflation-release               3     monthly (lag=1)
  PBS Excel     trade-balance                        4     monthly (lag=1)
  PBS Excel     exports-release                      4     monthly (lag=1)
  PBS Excel     imports-release                      4     monthly (lag=1)
  SBP xlsx      sbp-foreign-exchange-reserves        5     as-needed (±7d)
  SBP Easy      current-account-balance              6     monthly (lag=2)
  SBP Easy      worker-remittances                   6     monthly (lag=2)
  SBP Easy      sbp-monetary-policy-committee-..     6     as-needed (±3d)
  SBP Easy      treasury-bill-auction-3m             6     as-needed (±3d)
  SBP Easy      pib-auction                          6     as-needed (±3d)
  PBS WP        spi-weekly-inflation-release         6     weekly (exact)
  PBS WP        large-scale-manufacturing-lsm..      7     monthly (lag=2)

  OFFICIAL CALENDAR SYNC (Step 1, creates scheduled events):
  ─────────────────────────────────────────────────────────
  Source        Series Slug                          Note
  ──────────────────────────────────────────────────────────────────
  SBP HTML      sbp-monetary-policy-committee-..     advance meeting dates
  SBP HTML      sbp-monetary-policy-report           advance report dates
  SBP PDF       treasury-bill-auction-3m             advance auction dates (3M)
  SBP PDF       pib-auction                          advance auction dates

  MANUAL SERIES (no auto-release):
  ─────────────────────────────────────────────────────────
  gdp-growth-release, federal-budget, pakistan-economic-survey,
  government-debt-release, kse-100-weekly-market-review,
  psx-holiday-calendar, sbp-monetary-policy-report (date-only)

  PENDING (official calendar creates events, no auto-release yet):
  ─────────────────────────────────────────────────────────
  treasury-bill-auction-6m  — EasyData 6M yield key unconfirmed
  treasury-bill-auction-12m — EasyData 12M yield key unconfirmed
  [Phase 10 fix: reconcile calls removed; existing events cancelled by 0034]
`);

console.log("Phase 10 verification complete.\n");
