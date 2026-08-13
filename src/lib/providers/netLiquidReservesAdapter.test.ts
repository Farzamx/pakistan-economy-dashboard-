// Phase 8.10B tests for the Net Liquid FX Reserves adapter. Transport is
// mocked (sbpTransportGetBinary) -- no real curl invocation, no network,
// no live SBP request. Fixture workbooks are built with real XLSX bytes
// via XLSX.write(), so the magic-byte/XLSX-authenticity check is exercised
// against genuine ZIP/OOXML data, not a stand-in.

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";

const sbpTransportGetBinaryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/sbpTransport", () => ({
  sbpTransportGetBinary: sbpTransportGetBinaryMock,
}));

import { fetchNetLiquidReservesSeries, netLiquidReservesAdapter, NET_LIQUID_RESERVES_INDICATOR_KEY, NET_LIQUID_RESERVES_PROVIDER_ID } from "./netLiquidReservesAdapter";
import { validateNormalizedObservation } from "./providerAdapter";
import { FOREX_ARCH_URL } from "@/lib/economicCalendar/automation/syncFxReservesFromSbpExcel";

function serialFor(dateIso: string): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const excelEpoch = Date.UTC(1899, 11, 30);
  return Math.round((ms - excelEpoch) / 86_400_000);
}

/** Builds genuine XLSX bytes (real ZIP/OOXML, via XLSX.write) matching Forex_Arch.xlsx's documented layout. */
function buildRealXlsxBytes(dataRows: (string | number)[][]): Buffer {
  const aoa = [
    ["Pakistan's Foreign Exchange Reserves", null, null, null],
    ["END PERIOD", "NET RESERVES WITH SBP", "NET RESERVES WITH BANKS", "TOTAL LIQUID FX RESERVES"],
    ...dataRows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Week-end");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const REAL_ROWS = [
  [serialFor("2026-07-17"), 11000.5, 500, 11500.5],
  [serialFor("2026-07-24"), 11050.2, 510, 11560.2],
  [serialFor("2026-07-31"), 11123.4, 520, 11643.4],
];

beforeEach(() => {
  sbpTransportGetBinaryMock.mockReset();
});

describe("9/10/11. normalization, provenance, credential-free source_reference", () => {
  it("maps every row to a valid NormalizedObservation with the documented provenance", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: buildRealXlsxBytes(REAL_ROWS) });

    const observations = await fetchNetLiquidReservesSeries();

    expect(observations).toHaveLength(3);
    for (const obs of observations) {
      expect(validateNormalizedObservation(obs)).toEqual({ valid: true });
      expect(obs.indicatorKey).toBe(NET_LIQUID_RESERVES_INDICATOR_KEY);
      expect(obs.indicatorKey).toBe("sbp-forex-arch:netLiquidReserves"); // exact registry-matching literal
      expect(obs.provider).toBe(NET_LIQUID_RESERVES_PROVIDER_ID);
      expect(obs.cadence).toBe("weekly");
      expect(obs.qualityStatus).toBe("official");
      expect(obs.sourceSeriesId).toBe("Forex_Arch.xlsx:NET RESERVES WITH SBP");
      expect(obs.releaseDate).toBeNull(); // never fabricated -- source exposes none
      expect(obs.sourceUpdatedAt).toBeNull(); // never fabricated -- source exposes none
      expect(obs.methodology).toBeNull();
    }
  });

  it("preserves USD millions unconverted -- no scaling, no drift", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: buildRealXlsxBytes(REAL_ROWS) });
    const observations = await fetchNetLiquidReservesSeries();
    const latest = observations.find((o) => o.observationPeriod === "2026-07-31")!;
    expect(latest.value).toBe(11123.4); // exact source value, not /1000
    expect(latest.unit).toBe("Million USD");
  });

  it("source_reference contains only the public endpoint -- no credential, since none exists for this source", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: buildRealXlsxBytes(REAL_ROWS) });
    const [obs] = await fetchNetLiquidReservesSeries();
    expect(obs.sourceReference).toEqual({ endpoint: FOREX_ARCH_URL });
    expect(JSON.stringify(obs.sourceReference)).not.toMatch(/key|token|bearer/i);
  });

  it("preserves the genuine period-end week-ending date, no start/end conversion", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: buildRealXlsxBytes(REAL_ROWS) });
    const observations = await fetchNetLiquidReservesSeries();
    expect(observations.map((o) => o.observationPeriod)).toEqual(["2026-07-17", "2026-07-24", "2026-07-31"]);
  });
});

describe("17. transport HTTP failure handling", () => {
  it("throws a clear error on a non-200 transport status (e.g. the historically-observed 403)", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 403, body: Buffer.from("<!DOCTYPE html>...") });
    await expect(fetchNetLiquidReservesSeries()).rejects.toThrow(/HTTP 403/);
  });

  it("propagates a transport-layer exception (e.g. curl-missing/timeout) unchanged", async () => {
    sbpTransportGetBinaryMock.mockRejectedValueOnce(new Error("SBP request timed out after 20s"));
    await expect(fetchNetLiquidReservesSeries()).rejects.toThrow(/timed out/);
  });
});

describe("18. genuine XLSX vs HTML Cloudflare response detection", () => {
  it("rejects a 200 response that is actually an HTML block page, before ever calling XLSX.read()", async () => {
    const htmlBody = Buffer.from("<!DOCTYPE html><html><body>Cloudflare challenge</body></html>", "utf-8");
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: htmlBody });
    await expect(fetchNetLiquidReservesSeries()).rejects.toThrow(/not a genuine XLSX/);
  });

  it("accepts a genuine XLSX (real PK zip signature)", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: buildRealXlsxBytes(REAL_ROWS) });
    await expect(fetchNetLiquidReservesSeries()).resolves.toHaveLength(3);
  });

  it("rejects a truncated/corrupt response that is too short to even check", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: Buffer.from([0x50, 0x4b]) });
    await expect(fetchNetLiquidReservesSeries()).rejects.toThrow(/not a genuine XLSX/);
  });
});

describe("ProviderAdapter contract", () => {
  it("providerId matches the registered provider", () => {
    expect(netLiquidReservesAdapter.providerId).toBe("sbp-forex-arch");
  });

  it("rejects an unsupported indicatorKey without attempting a fetch", async () => {
    await expect(netLiquidReservesAdapter.fetchObservations({ indicatorKey: "sbp-forex-arch:somethingElse" })).rejects.toThrow(/unsupported indicatorKey/);
    expect(sbpTransportGetBinaryMock).not.toHaveBeenCalled();
  });

  it("ignores sinceDate and always fetches full history (documented decision, matching worldBankAdapter.ts)", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: buildRealXlsxBytes(REAL_ROWS) });
    const result = await netLiquidReservesAdapter.fetchObservations({ indicatorKey: NET_LIQUID_RESERVES_INDICATOR_KEY, sinceDate: "2026-07-30" });
    expect(result).toHaveLength(3); // not filtered down to "since" 2026-07-30
  });
});

describe("security", () => {
  it("never constructs a URL or reference containing a credential-shaped value", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: buildRealXlsxBytes(REAL_ROWS) });
    const observations = await fetchNetLiquidReservesSeries();
    for (const obs of observations) {
      const result = validateNormalizedObservation(obs);
      expect(result.valid).toBe(true);
    }
  });

  it("the transport call site passes only the public URL, matching FOREX_ARCH_URL", async () => {
    sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: buildRealXlsxBytes(REAL_ROWS) });
    await fetchNetLiquidReservesSeries();
    expect(sbpTransportGetBinaryMock).toHaveBeenCalledWith(FOREX_ARCH_URL, expect.any(Number));
  });
});
