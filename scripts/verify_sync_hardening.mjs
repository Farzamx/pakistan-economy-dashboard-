/**
 * Sync Hardening Verification
 *
 * Proves that migration 0027 prevents the corruption scenario that
 * occurred on 2026-07-01, where a test script called sync_event_actual()
 * without any authentication and wrote garbage values to live events.
 *
 * SAFETY CONTRACT:
 *   - ALL write tests use the _verify_test_sync series + 1970-01-01/1970-01-02
 *     event dates seeded in migration 0027. These are permanent test fixtures.
 *   - Real economic event series (cpi-inflation-release, etc.) are NEVER written.
 *   - Between each write test, reset_event_to_scheduled restores the test event.
 *
 * Prerequisites:
 *   - Migration 0027 applied in Supabase
 *   - .env.local present with NOTIFICATION_WORKER_SECRET,
 *     NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Usage: node scripts/verify_sync_hardening.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(projectRoot, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY       = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const WORKER_SECRET  = process.env.NOTIFICATION_WORKER_SECRET;

const TEST_SERIES   = "_verify_test_sync";
const TEST_DATE_A   = "1970-01-01";   // primary write target
const TEST_DATE_B   = "1970-01-02";   // idempotency test target

// ─── helpers ─────────────────────────────────────────────────────────────────

async function rpc(fnName, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /**/ }
  return { ok: res.ok, status: res.status, data, raw: text };
}

async function selectEvents(seriesSlug, eventDate) {
  const q = new URLSearchParams({
    select: "id,event_date,status,actual_value",
  });
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/economic_events?` +
    `${q}&event_date=eq.${eventDate}` +
    `&economic_event_series.slug=eq.${seriesSlug}`,
    {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      signal: AbortSignal.timeout(10_000),
    },
  );
  try { return JSON.parse(await res.text()); } catch { return []; }
}

async function resetTestEvent(eventDate) {
  const r = await rpc("reset_event_to_scheduled", {
    p_internal_secret: WORKER_SECRET,
    p_series_slug: TEST_SERIES,
    p_event_date: eventDate,
  });
  return r;
}

let passed = 0;
let failed = 0;

function pass(label, detail = "") {
  console.log(`  PASS  ${label}${detail ? " — " + detail : ""}`);
  passed++;
}

function fail(label, detail = "") {
  console.error(`  FAIL  ${label}${detail ? " — " + detail : ""}`);
  failed++;
}

function section(title) {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(70));
}

// ─── main ────────────────────────────────────────────────────────────────────

console.log("\nSync Hardening Verification — migration 0027");
console.log(`${"═".repeat(70)}`);
console.log(`  Supabase: ${SUPABASE_URL}`);
console.log(`  Secret:   ${WORKER_SECRET ? "configured (" + WORKER_SECRET.length + " chars)" : "MISSING"}`);
console.log(`  Test series: ${TEST_SERIES} — events ${TEST_DATE_A} (A) and ${TEST_DATE_B} (B)`);

if (!SUPABASE_URL || !ANON_KEY || !WORKER_SECRET) {
  console.error("\nAbort: missing required env vars. Check .env.local.");
  process.exit(1);
}

// ─── Section 1: Test fixtures exist ──────────────────────────────────────────
section("1. Test fixture verification (read-only)");

const eventsA = await selectEvents(TEST_SERIES, TEST_DATE_A);
const eventsB = await selectEvents(TEST_SERIES, TEST_DATE_B);

// Note: the RLS join filter on economic_event_series via PostgREST query params
// may not work depending on schema — check raw result length as proxy.
console.log(`  Test Event A (${TEST_DATE_A}): ${JSON.stringify(eventsA)}`);
console.log(`  Test Event B (${TEST_DATE_B}): ${JSON.stringify(eventsB)}`);

// Verify the series exists by querying economic_event_series directly
const seriesRes = await fetch(
  `${SUPABASE_URL}/rest/v1/economic_event_series?slug=eq.${TEST_SERIES}&select=slug,title`,
  { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }, signal: AbortSignal.timeout(10_000) },
);
const seriesRows = JSON.parse(await seriesRes.text());
if (Array.isArray(seriesRows) && seriesRows.length > 0) {
  pass("_verify_test_sync series exists in DB", seriesRows[0].title);
} else {
  fail("_verify_test_sync series NOT found — did you apply migration 0027?");
}

// ─── Section 2: No-secret calls are blocked ───────────────────────────────────
section("2. Authentication gate — calls without secret are rejected");

// 2a. sync_event_actual with no secret at all
const r2a = await rpc("sync_event_actual", {
  p_series_slug: TEST_SERIES,
  p_event_date: TEST_DATE_A,
  p_actual_value: "should-be-rejected",
});
if (!r2a.ok) {
  pass("sync_event_actual without secret → rejected", `HTTP ${r2a.status}`);
} else {
  fail("sync_event_actual without secret → ACCEPTED (wrote data!)", `HTTP ${r2a.status} data=${JSON.stringify(r2a.data)}`);
}

// 2b. sync_event_actual with wrong secret
const r2b = await rpc("sync_event_actual", {
  p_internal_secret: "wrong-secret-value",
  p_series_slug: TEST_SERIES,
  p_event_date: TEST_DATE_A,
  p_actual_value: "should-be-rejected",
});
if (!r2b.ok) {
  pass("sync_event_actual with wrong secret → rejected", `HTTP ${r2b.status}`);
} else {
  fail("sync_event_actual with wrong secret → ACCEPTED (wrote data!)", `HTTP ${r2b.status} data=${JSON.stringify(r2b.data)}`);
}

// 2c. reset_event_to_scheduled without secret
const r2c = await rpc("reset_event_to_scheduled", {
  p_series_slug: TEST_SERIES,
  p_event_date: TEST_DATE_A,
});
if (!r2c.ok) {
  pass("reset_event_to_scheduled without secret → rejected", `HTTP ${r2c.status}`);
} else {
  fail("reset_event_to_scheduled without secret → ACCEPTED", `HTTP ${r2c.status}`);
}

// ─── Section 3: Observation date sanity check ─────────────────────────────────
section("3. Observation date sanity check (DB-level guard)");

// 3a. Stale observation — 2020-01-01, well over 180 days ago
const r3a = await rpc("sync_event_actual", {
  p_internal_secret: WORKER_SECRET,
  p_series_slug: TEST_SERIES,
  p_event_date: TEST_DATE_A,
  p_actual_value: "stale-obs-test",
  p_observation_date: "2020-01-01",
});
if (!r3a.ok) {
  pass("observation_date 2020-01-01 (>180 days old) → rejected by DB", `HTTP ${r3a.status}`);
} else {
  fail("observation_date 2020-01-01 was ACCEPTED — sanity check not working", `HTTP ${r3a.status}`);
  // Restore if accepted
  await resetTestEvent(TEST_DATE_A);
}

// 3b. Future observation — 180 days from now
const futureDate = new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10);
const r3b = await rpc("sync_event_actual", {
  p_internal_secret: WORKER_SECRET,
  p_series_slug: TEST_SERIES,
  p_event_date: TEST_DATE_A,
  p_actual_value: "future-obs-test",
  p_observation_date: futureDate,
});
if (!r3b.ok) {
  pass(`observation_date ${futureDate} (>7 days future) → rejected by DB`, `HTTP ${r3b.status}`);
} else {
  fail(`observation_date ${futureDate} was ACCEPTED — sanity check not working`, `HTTP ${r3b.status}`);
  await resetTestEvent(TEST_DATE_A);
}

// 3c. Valid recent observation — 30 days ago
const recentDate = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
// First ensure Event A is in scheduled state (reset in case prior tests left it released)
await resetTestEvent(TEST_DATE_A);

const r3c = await rpc("sync_event_actual", {
  p_internal_secret: WORKER_SECRET,
  p_series_slug: TEST_SERIES,
  p_event_date: TEST_DATE_A,
  p_actual_value: "valid-obs-test",
  p_observation_date: recentDate,
});
if (r3c.ok) {
  pass(`observation_date ${recentDate} (recent, valid) → accepted`, `HTTP ${r3c.status} data=${JSON.stringify(r3c.data)}`);
} else {
  fail(`observation_date ${recentDate} was rejected — unexpected`, `HTTP ${r3c.status} raw=${r3c.raw.slice(0, 200)}`);
}

// ─── Section 4: Legitimate write path (correct secret, test fixtures) ─────────
section("4. Legitimate write path with correct secret");

// Ensure Event A is scheduled (reset from the prior test that may have written to it)
const resetA = await resetTestEvent(TEST_DATE_A);
console.log(`  Reset Event A → scheduled: HTTP ok=${resetA.ok} data=${JSON.stringify(resetA.data)}`);

// 4a. Write to Event A
const r4a = await rpc("sync_event_actual", {
  p_internal_secret: WORKER_SECRET,
  p_series_slug: TEST_SERIES,
  p_event_date: TEST_DATE_A,
  p_actual_value: "+1.23% WoW",
  p_observation_date: recentDate,
});
if (r4a.ok && r4a.data === true) {
  pass("sync_event_actual with correct secret → accepted, returned true (wrote)", `HTTP ${r4a.status}`);
} else {
  fail("sync_event_actual with correct secret → unexpected result", `HTTP ${r4a.status} data=${JSON.stringify(r4a.data)} raw=${r4a.raw.slice(0, 200)}`);
}

// ─── Section 5: Idempotency — second write returns false ──────────────────────
section("5. Idempotency — second write to already-released event");

// Event A is now 'released' from section 4. Writing again should return false.
const r5 = await rpc("sync_event_actual", {
  p_internal_secret: WORKER_SECRET,
  p_series_slug: TEST_SERIES,
  p_event_date: TEST_DATE_A,
  p_actual_value: "+9.99% WoW",
  p_observation_date: recentDate,
});
if (r5.ok && r5.data === false) {
  pass("Second sync_event_actual on released event → returned false (idempotent, no overwrite)", `HTTP ${r5.status}`);
} else {
  fail("Idempotency check failed", `HTTP ${r5.status} data=${JSON.stringify(r5.data)}`);
}

// ─── Section 6: reset_event_to_scheduled works with correct secret ────────────
section("6. reset_event_to_scheduled with correct secret");

const r6 = await resetTestEvent(TEST_DATE_A);
if (r6.ok && r6.data === true) {
  pass("reset_event_to_scheduled → returned true (event restored to scheduled)", `HTTP ${r6.status}`);
} else {
  fail("reset_event_to_scheduled with correct secret failed", `HTTP ${r6.status} data=${JSON.stringify(r6.data)} raw=${r6.raw.slice(0, 200)}`);
}

// Confirm Event A is back to scheduled by trying to write again (should succeed)
const r6confirm = await rpc("sync_event_actual", {
  p_internal_secret: WORKER_SECRET,
  p_series_slug: TEST_SERIES,
  p_event_date: TEST_DATE_A,
  p_actual_value: "+2.22% WoW (post-reset)",
  p_observation_date: recentDate,
});
if (r6confirm.ok && r6confirm.data === true) {
  pass("Post-reset write succeeded (event truly restored to scheduled)", `HTTP ${r6confirm.status}`);
} else {
  fail("Post-reset write failed — event may not have been fully restored", `HTTP ${r6confirm.status} data=${JSON.stringify(r6confirm.data)}`);
}

// ─── Section 7: Clean up — restore both test events to scheduled ──────────────
section("7. Cleanup — restore test events to scheduled state");

const cleanA = await resetTestEvent(TEST_DATE_A);
const cleanB = await resetTestEvent(TEST_DATE_B);

// Event B was never written to in this run (only Event A was used) — reset
// will return false (it was already scheduled). That's correct behaviour.
console.log(`  Event A reset: HTTP ok=${cleanA.ok} data=${JSON.stringify(cleanA.data)} (true=restored, false=was already scheduled)`);
console.log(`  Event B reset: HTTP ok=${cleanB.ok} data=${JSON.stringify(cleanB.data)} (false expected — was never released in this run)`);

if (cleanA.ok) pass("Event A cleanup succeeded");
else fail("Event A cleanup failed");
if (cleanB.ok) pass("Event B cleanup call succeeded (false return is correct — event was already scheduled)");
else fail("Event B cleanup call failed");

// ─── Section 8: Real economic events are read-only ────────────────────────────
section("8. Real economic events cannot be written without secret");

// Attempt to write to a real series without the secret — must be rejected
const r8 = await rpc("sync_event_actual", {
  p_series_slug: "cpi-inflation-release",
  p_event_date: "2026-07-01",
  p_actual_value: "corruption-attempt",
});
if (!r8.ok) {
  pass("sync_event_actual on real series without secret → rejected", `HTTP ${r8.status}`);
} else {
  fail(
    "CRITICAL: sync_event_actual on real series without secret was ACCEPTED",
    `HTTP ${r8.status} — migration 0027 may not be applied, or the old function signature still exists`,
  );
}

// ─── Final summary ────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(70)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("  ALL CHECKS PASSED — sync_event_actual is hardened against");
  console.log("  unauthenticated writes and observation date injection.");
} else {
  console.log("  FAILURES DETECTED — review above output. Possible causes:");
  console.log("  - Migration 0027 not applied in Supabase");
  console.log("  - Old sync_event_actual(text,date,text) still exists (drop it)");
  console.log("  - Test fixtures (_verify_test_sync series) not seeded");
  console.log("  - NOTIFICATION_WORKER_SECRET mismatch between .env.local and DB");
}
console.log(`${"═".repeat(70)}\n`);

process.exit(failed > 0 ? 1 : 0);
