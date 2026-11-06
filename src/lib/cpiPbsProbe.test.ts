// F.2f: the read-only PBS probe. The network is a stub: nothing here makes a request.

import { describe, expect, it, vi } from "vitest";
import { probePbs } from "./cpiPbsProbe";
import { FULL_XML, editSeries } from "@/lib/inflation/__fixtures__/pbsCpiVariants";

const respond = (body: string, status = 200) => vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;

describe("probePbs", () => {
  it("a valid file -> the newest month and PBS's own Prepared time", async () => {
    expect(await probePbs(respond(FULL_XML))).toEqual({ ok: true, latestMonth: "2026-10", preparedAt: "2026-11-03T06:38:35.000Z" });
  });

  it("asks exactly once (a probe that retries would be an ingestion run) and only for the public CPI file", async () => {
    const f = respond(FULL_XML);
    await probePbs(f);
    expect(f).toHaveBeenCalledTimes(1);
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe("https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml");
  });

  it("HTTP errors are 'unreachable', not 'no newer release'", async () => {
    expect(await probePbs(respond("down", 503))).toEqual({ ok: false, error: "HTTP 503" });
  });

  it("a network failure carries its message", async () => {
    const f = vi.fn(async () => { throw new Error("getaddrinfo ENOTFOUND"); }) as unknown as typeof fetch;
    expect(await probePbs(f)).toEqual({ ok: false, error: "getaddrinfo ENOTFOUND" });
  });

  it("a file that FAILS validation is reported as such — never as a newer release the ledger is missing", async () => {
    const bad = editSeries(FULL_XML, "PCPI_CP_04_IX", (m, v) => (m === "2025-06" ? String(Number(v) + 5) : v));
    const r = await probePbs(respond(bad));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/failed validation \(.*laspeyres/);
  });

  it("an HTML error page is not a release", async () => {
    expect((await probePbs(respond("<html>Maintenance</html>"))).ok).toBe(false);
  });

  it("an oversized response is refused unparsed", async () => {
    const r = await probePbs(respond("x".repeat(2_000_001)));
    expect(r).toEqual({ ok: false, error: "the file is larger than expected" });
  });
});
