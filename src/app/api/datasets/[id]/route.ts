import { NextResponse, type NextRequest } from "next/server";
import { getDataset, DATASETS } from "@/lib/datasets/datasetRegistry";
import { loadDataset, type LoadedDataset } from "@/lib/datasets/datasetLoader";
import { buildBulkWorkbook, buildSingleWorkbook, toFileName } from "@/lib/datasets/datasetWorkbook";
import { applyDateRange, buildBulkCsv, buildSingleCsv, frequencyOfLoaded } from "@/lib/datasets/datasetExport";
import { FREQUENCY_LABEL, describeRange, isFrequencyId, unavailableFrequencyMessage, validateRange, type FrequencyId } from "@/lib/datasets/datasetFrequency";

// Dataset download endpoint.
//
// Public, like the indicator pages whose data it serves — it exposes exactly
// the published series a visitor can already read on those pages, and no
// admin, internal or credentialed content. It reads through the project's
// existing canonical data functions, so it inherits their caching rather
// than opening a new path to the providers.
//
//   /api/datasets/<id>                         one dataset, as .xlsx (default)
//   /api/datasets/<id>?format=csv              the same, as .csv
//   /api/datasets/all                          every dataset in one workbook, one sheet each; every sheet keeps the frequency its source publishes
//   /api/datasets/all?frequency=monthly        only the monthly datasets (xlsx or csv)
//
// Optional query parameters, all validated:
//   format      xlsx | csv                     (default xlsx)
//   frequency   yearly | quarterly | monthly | weekly | as-announced
//               On a single dataset this is a CHECK, not a conversion: if the series is not published at that frequency the request is refused.
//   from, to    YYYY | YYYY-MM | YYYY-MM-DD   restrict to a date range (only ever removes observations)
//
// INTEGRITY: no request can make this route convert, aggregate, repeat or interpolate observations. A frequency the source does not publish is
// reported as unavailable; it is never manufactured.

/** Serverless budget: the bulk workbook loads ~30 cached series and writes one file. */
export const maxDuration = 60;

/**
 * The underlying series are daily-to-annual and all sit behind their own
 * caches; an hour keeps repeat downloads cheap without serving a visibly
 * old file.
 */
export const revalidate = 3600;

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CACHE = "public, max-age=0, s-maxage=3600";

function fileResponse(body: Buffer | string, filename: string, contentType: string) {
  return new NextResponse(typeof body === "string" ? body : new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": CACHE,
    },
  });
}

function problem(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = request.nextUrl.searchParams;

  const format = (sp.get("format") ?? "xlsx").toLowerCase();
  if (format !== "xlsx" && format !== "csv") return problem(400, 'Unknown format. Use "xlsx" or "csv".');

  const frequencyParam = sp.get("frequency");
  if (frequencyParam !== null && !isFrequencyId(frequencyParam)) {
    return problem(400, 'Unknown frequency. Use "yearly", "quarterly", "monthly", "weekly" or "as-announced".');
  }
  const frequency: FrequencyId | null = frequencyParam as FrequencyId | null;

  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  const range = validateRange(from, to);
  if (!range.ok) return problem(400, range.error);

  const today = new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const ext = format;

  // ── every dataset ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (id === "all") {
    if (!frequency && format === "csv") {
      return problem(400, "A single CSV cannot hold series of different frequencies. Choose a frequency (for example ?frequency=monthly), or download the workbook, which keeps one sheet per series.");
    }
    const loaded = await Promise.all(DATASETS.map(loadDataset));
    const chosen = frequency ? loaded.filter((d) => frequencyOfLoaded(d) === frequency) : loaded;
    if (frequency && chosen.length === 0) return problem(404, unavailableFrequencyMessage(frequency), { frequency });

    const sliced: LoadedDataset[] = chosen.map((d) => applyDateRange(d, from, to));
    if ((from || to) && sliced.every((d) => d.rows.length === 0) && chosen.some((d) => d.rows.length > 0)) {
      return problem(422, "No observations fall inside the selected date range for the selected frequency.");
    }
    const stem = frequency ? `all-${frequency}-datasets` : "all-datasets";
    if (format === "csv") return fileResponse(buildBulkCsv(sliced.filter((d) => d.rows.length > 0)), toFileName(stem, ext, today), "text/csv; charset=utf-8");
    return fileResponse(
      buildBulkWorkbook(sliced, generatedAt, { frequency: frequency ? FREQUENCY_LABEL[frequency] : undefined, from, to }),
      toFileName(stem, ext, today),
      XLSX_TYPE,
    );
  }

  // ── one dataset ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const definition = getDataset(id);
  if (!definition) return problem(404, "Unknown dataset");

  const dataset = await loadDataset(definition);

  // The requested frequency is checked against the series, never imposed on it.
  if (frequency) {
    const actual = frequencyOfLoaded(dataset);
    if (actual !== frequency) {
      return problem(422, unavailableFrequencyMessage(frequency, "indicator"), { requested: frequency, availableFrequency: actual });
    }
  }

  const sliced = applyDateRange(dataset, from, to);
  if ((from || to) && sliced.rows.length === 0 && dataset.rows.length > 0) {
    return problem(422, `No observations fall inside the selected date range. This series covers ${describeRange(dataset.rows)}.`, { coverage: describeRange(dataset.rows) });
  }

  if (format === "csv") {
    // A CSV has no place for an explanatory note, so a series that could not be read is reported as an error instead of an empty file.
    if (dataset.error) return problem(503, dataset.error);
    return fileResponse(buildSingleCsv(sliced), toFileName(definition.id, ext, today), "text/csv; charset=utf-8");
  }
  // A series that failed to load still produces a workbook — with zero rows
  // and the reason in its provenance block — rather than an opaque error, so
  // the reader learns what happened instead of getting a broken download.
  return fileResponse(buildSingleWorkbook(sliced, generatedAt), toFileName(definition.id, ext, today), XLSX_TYPE);
}
