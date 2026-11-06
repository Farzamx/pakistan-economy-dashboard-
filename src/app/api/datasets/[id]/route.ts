import { NextResponse } from "next/server";
import { getDataset, DATASETS } from "@/lib/datasets/datasetRegistry";
import { loadDataset } from "@/lib/datasets/datasetLoader";
import { buildBulkWorkbook, buildSingleWorkbook, toFileName } from "@/lib/datasets/datasetWorkbook";

// Dataset download endpoint.
//
// Public, like the indicator pages whose data it serves — it exposes exactly
// the published series a visitor can already read on those pages, and no
// admin, internal or credentialed content. It reads through the project's
// existing canonical data functions, so it inherits their caching rather
// than opening a new path to the providers.
//
// `/api/datasets/all` returns every dataset in one workbook; any other id
// returns that single dataset.

/** Serverless budget: the bulk workbook loads ~30 cached series and writes one file. */
export const maxDuration = 60;

/**
 * The underlying series are daily-to-annual and all sit behind their own
 * caches; an hour keeps repeat downloads cheap without serving a visibly
 * old file.
 */
export const revalidate = 3600;

function fileResponse(body: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const today = new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

  if (id === "all") {
    const datasets = await Promise.all(DATASETS.map(loadDataset));
    return fileResponse(buildBulkWorkbook(datasets, generatedAt), toFileName("all-datasets", "xlsx", today));
  }

  const definition = getDataset(id);
  if (!definition) {
    return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });
  }

  const dataset = await loadDataset(definition);
  // A series that failed to load still produces a workbook — with zero rows
  // and the reason in its provenance block — rather than an opaque error, so
  // the reader learns what happened instead of getting a broken download.
  return fileResponse(buildSingleWorkbook(dataset, generatedAt), toFileName(definition.id, "xlsx", today));
}
