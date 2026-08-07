import { NextResponse } from "next/server";
import { logCronRun, getCronRunHistory } from "@/lib/cronLogging";

// TEMPORARY — Phase 6A.5 fetch-origin validation. Records whether a raw
// HTTP probe against easydata.sbp.org.pk (no API key required — Cloudflare's
// bot challenge happens before SBP's own auth check, so reachability alone
// is what's being tested here) from wherever POSTs to this route looks like
// a Cloudflare challenge or a real API response. Reuses the existing
// cron_run_log table/logCronRun() — no new schema. Auth: same CRON_SECRET
// bearer token every other /api/admin/* route uses (already present in both
// Vercel and GitHub Actions secrets — no new secret needed).
// Delete this whole file once the fetch-origin question is answered.
export const dynamic = "force-dynamic";

const JOB_NAME = "network-diag-probe";

function authOk(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!authOk(request)) return new NextResponse("Unauthorized", { status: 401 });
  const history = await getCronRunHistory(JOB_NAME, 10);
  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  if (!authOk(request)) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const origin = typeof body.origin === "string" ? body.origin : "unknown";
  const encoded = typeof body.encoded === "string" ? body.encoded : "";
  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    decoded = "(could not decode base64 payload)";
  }

  const isCfChallenge = /cf-mitigated|Just a moment|cloudflare/i.test(decoded);
  const httpCodeMatch = decoded.match(/^HTTP\/\S+\s+(\d+)/m);
  const httpCode = httpCodeMatch ? httpCodeMatch[1] : "n/a";
  const reachable = !isCfChallenge && httpCode !== "n/a";

  const startedAt = new Date();
  await logCronRun(
    JOB_NAME,
    startedAt,
    reachable ? "success" : "failure",
    `origin=${origin} httpCode=${httpCode} cfChallenge=${isCfChallenge} raw(first 600)=${decoded.slice(0, 600)}`,
  );

  return NextResponse.json({ recorded: true, origin, httpCode, isCfChallenge, reachable });
}
