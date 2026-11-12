// An integrity digest of the stored auction rows, so a hand edit of a single yield in src/data/govSecAuctions.ts cannot go unnoticed.
//
// The generator (scripts/buildGovSecAuctions.ts) computes it from the rows it writes and records it in the file's provenance; a test recomputes it from the
// rows as stored and compares. The rows are JSON values (numbers, strings, nulls), so JSON.stringify is a stable serialisation. Used only by the generator and
// the tests, never by the page.

import { createHash } from "node:crypto";

export function rowsDigest(tbillRows: readonly unknown[], pibRows: readonly unknown[]): string {
  return createHash("sha256").update(JSON.stringify([tbillRows, pibRows])).digest("hex");
}
