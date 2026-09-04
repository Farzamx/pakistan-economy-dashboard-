// Phase 10.6 — trigger-route tests for the revalidation fix. The cycle
// itself is mocked (already covered by macroIntelligenceSnapshotCompute.test.ts);
// these tests exist to prove the HTTP boundary and, specifically, that
// revalidatePath("/macro-intelligence") is called exactly when a genuinely
// new snapshot was persisted — never on a skip (nothing changed) and never
// on a failure (nothing to show). No live Supabase, no real cache.

import { describe, it, expect, vi, beforeEach } from "vitest";

const runCycleMock = vi.hoisted(() => vi.fn());
const logCronRunMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/macroIntelligenceSnapshotCompute", () => ({ runMacroIntelligenceSnapshotCycle: runCycleMock }));
vi.mock("@/lib/cronLogging", () => ({ logCronRun: logCronRunMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { GET } = await import("./route");

const CRON_SECRET = "test-cron-secret";
const WORKER_SECRET = "test-worker-secret";

function req(auth?: string) {
  const headers = new Headers();
  if (auth !== undefined) headers.set("authorization", auth);
  return new Request("https://app.example.com/api/cron/macro-intelligence-snapshot", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.NOTIFICATION_WORKER_SECRET = WORKER_SECRET;
});

describe("GET /api/cron/macro-intelligence-snapshot", () => {
  it("rejects a request with no Authorization header — never reaches the cycle", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(runCycleMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong bearer token", async () => {
    const res = await GET(req("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(runCycleMock).not.toHaveBeenCalled();
  });

  it("a genuinely new persisted snapshot (success, not skipped) revalidates /macro-intelligence exactly once", async () => {
    runCycleMock.mockResolvedValue({ success: true, skipped: false, dimensionCount: 7 });
    const res = await GET(req(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    expect(revalidatePathMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/macro-intelligence");
  });

  it("a skipped write (idempotency guard already had today's snapshot) does NOT revalidate — nothing changed for the page to show", async () => {
    runCycleMock.mockResolvedValue({ success: true, skipped: true, dimensionCount: 7 });
    const res = await GET(req(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("a failed cycle does NOT revalidate — nothing new exists to show", async () => {
    runCycleMock.mockResolvedValue({ success: false, skipped: false, error: "db unreachable" });
    const res = await GET(req(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(500);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("missing NOTIFICATION_WORKER_SECRET fails closed before ever calling the cycle or revalidating", async () => {
    delete process.env.NOTIFICATION_WORKER_SECRET;
    const res = await GET(req(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(500);
    expect(runCycleMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
