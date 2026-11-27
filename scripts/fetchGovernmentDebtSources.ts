// Source acquisition for the Pakistan Government Debt dataset. READ-ONLY toward every external system: HTTP GETs against the State Bank of Pakistan's
// EasyData API and website and the Ministry of Finance's website; files are written into one local directory. No database, no ingestion, no ledger.
//
//   npx tsx scripts/fetchGovernmentDebtSources.ts --retrieved 2026-11-27 [--out data/sources/government-debt]
//
// What it writes (all under --out):
//   easydata/TS_GP_BAM_PKDLP_Q.csv   SBP "Pakistan's Debt and Liabilities Summary", every series of the dataset, verbatim (value and status as printed)
//   sbp/Summary.pdf                  SBP's published summary table (latest five quarters, revision flags, definitions): independent check
//   mof/Annual_Debt_Review_FY26.pdf  Ministry of Finance Annual Debt Review FY-26: the government's own reported figures (kept as a separate series)
//   manifest.json                    institution, URL (never the API key), retrieval date, SHA-256, size and row count for every file
//
// The EasyData key comes from the environment the project's guarded loader provides (enterScript: refuses under any test harness, then loads .env.local).
// It travels only inside sbpTransport's private curl --config file: never printed, never written, never part of a recorded URL.
//
// Importing this module does nothing: main() runs only through runIfEntryPoint() (src/lib/providers/scriptEntry.ts), like every credential script.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sbpTransportGet, sbpTransportGetBinary } from "@/lib/data/sbpTransport";
import { enterScript, runIfEntryPoint } from "@/lib/providers/scriptEntry";
import { EASYDATA_BASE, EASYDATA_START, easydataRows, looksLike, toCsv, type ManifestEntry } from "./fetchInterestRateSources";

export const DEBT_DATASET = "TS_GP_BAM_PKDLP_Q";
/** Every series EasyData lists for the dataset (from its catalogue page, 27 Nov 2026), including the empty spacer rows, so nothing is selected by hand. */
export const DEBT_SERIES = [
  "PDLS00010", "PDLS00020", "PDLS00030", "PDLS00040", "PDLS00050", "PDLS00060", "PDLS00070", "PDLS00080", "PDLS00090", "PDLS00100", "PDLS00110",
  "PDLS00120", "PDLS00130", "PDLS00140", "PDLS00150", "PDLS00160", "PDLS00170", "PDLS00180", "PDLS00190", "PDLS00200", "PDLS00210", "PDLS00220",
  "PDLS00230", "PDLS00240", "PDLS00250", "PDLS00260", "PDLS00280",
] as const;

export const DEBT_FILES = [
  { file: "sbp/Summary.pdf", url: "https://www.sbp.org.pk/assets/document/Summary.pdf", institution: "State Bank of Pakistan", kind: "pdf", description: "Pakistan's Debt and Liabilities - Summary (latest five quarters, definitions, P/R flags)" },
  { file: "mof/Annual_Debt_Review_FY26.pdf", url: "https://finance.gov.pk/dpco/Annual_Debt_Review_FY26.pdf", institution: "Ministry of Finance", kind: "pdf", description: "Annual Debt Review FY-26 (Debt Policy Coordination Office)" },
] as const;

const TIMEOUT_MS = 120_000;
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

export interface Args {
  retrieved: string;
  out: string;
}

export function parseArgs(argv: string[]): Args | string {
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
  };
  const retrieved = get("--retrieved");
  if (!retrieved) return "Usage: tsx scripts/fetchGovernmentDebtSources.ts --retrieved YYYY-MM-DD [--out <dir>]";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) return `--retrieved must be YYYY-MM-DD, got "${retrieved}"`;
  return { retrieved, out: get("--out") ?? "data/sources/government-debt" };
}

type DebtManifestEntry = Omit<ManifestEntry, "institution"> & { institution: "State Bank of Pakistan" | "Ministry of Finance" };

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (typeof args === "string") {
    console.error(args);
    return 2;
  }
  const key = process.env.SBP_EASYDATA_API_KEY;
  if (!key) throw new Error("SBP_EASYDATA_API_KEY is not set (expected in .env.local)");
  const manifestPath = path.join(args.out, "manifest.json");
  const previous: DebtManifestEntry[] = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { files: DebtManifestEntry[] }).files : [];
  const entries = new Map(previous.map((e) => [e.path, e]));

  for (const f of DEBT_FILES) {
    // The SBP host needs the curl transport (Cloudflare); the Finance Ministry host is plain HTTPS but the same transport works for both.
    const { status, body } = await sbpTransportGetBinary(f.url, TIMEOUT_MS);
    if (status !== 200) throw new Error(`${f.url} returned HTTP ${status}; nothing substituted`);
    if (!looksLike(f.kind, body)) throw new Error(`${f.url} did not return a ${f.kind} file; nothing substituted`);
    mkdirSync(path.dirname(path.join(args.out, f.file)), { recursive: true });
    writeFileSync(path.join(args.out, f.file), body);
    entries.set(f.file, { path: f.file, institution: f.institution, url: f.url, description: f.description, retrievedOn: args.retrieved, sha256: sha256(body), bytes: body.length });
    console.log(`${f.file.padEnd(34)} ${body.length} bytes`);
  }

  const rows: string[][] = [];
  for (const code of DEBT_SERIES) {
    const seriesKey = `${DEBT_DATASET}.${code}`;
    const params = new URLSearchParams({ api_key: key, start_date: EASYDATA_START, format: "json" });
    const { status, body } = await sbpTransportGet(`${EASYDATA_BASE}/${seriesKey}/data?${params.toString()}`, TIMEOUT_MS);
    if (status !== 200) throw new Error(`EasyData returned HTTP ${status} for ${seriesKey}; nothing substituted`);
    const got = easydataRows(body, seriesKey);
    rows.push(...got);
    console.log(`easydata ${seriesKey.padEnd(30)} ${got.length} rows`);
  }
  const csv = toCsv(rows);
  const rel = `easydata/${DEBT_DATASET}.csv`;
  mkdirSync(path.join(args.out, "easydata"), { recursive: true });
  writeFileSync(path.join(args.out, rel), csv, "utf8");
  entries.set(rel, {
    path: rel,
    institution: "State Bank of Pakistan",
    url: `${EASYDATA_BASE}/${DEBT_DATASET}.{${DEBT_SERIES.join(",")}}/data?start_date=${EASYDATA_START}&format=json (API key omitted)`,
    description: `SBP EasyData dataset ${DEBT_DATASET} (Pakistan Debt and Liabilities Summary), every series, verbatim`,
    retrievedOn: args.retrieved,
    sha256: sha256(csv),
    bytes: Buffer.byteLength(csv),
    rows: rows.length,
  });

  const files = [...entries.values()].sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(manifestPath, JSON.stringify({ purpose: "Official source files behind the Pakistan Government Debt dataset. Verified by scripts/buildGovernmentDebt.ts before any parsing.", files }, null, 2) + "\n", "utf8");
  console.log(`wrote ${manifestPath} (${files.length} files)`);
  return 0;
}

runIfEntryPoint({ filename: __filename, requireMain: typeof require !== "undefined" && require.main === module }, () => {
  enterScript("fetch:government-debt-sources");
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error(`fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    },
  );
});
