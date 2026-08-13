// Transport-layer tests. child_process is mocked throughout, so these never
// touch the network and CI never depends on SBP being reachable — which
// matters here, because SBP is not reachable from CI at all (see
// .github/workflows/sbp-connectivity-probe.yml).

import { describe, it, expect, vi } from "vitest";
import type { SbpTransportError as SbpTransportErrorType } from "@/lib/data/sbpTransport";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  // promisify() reads this symbol to find the promise-returning form, so the
  // mock is consumed exactly as the real execFile would be.
  execFile: Object.assign(execFileMock, {
    [Symbol.for("nodejs.util.promisify.custom")]: execFileMock,
  }),
}));

const { sbpTransportGet, SbpTransportError } = await import("@/lib/data/sbpTransport");

const URL_WITH_SECRET = "https://easydata.sbp.org.pk/api/v1/series/X/data?api_key=SECRET-VALUE&format=json";

/** Temp dirs this module creates are prefixed "peic-sbp-"; used to assert cleanup. */
async function peicTempDirCount(): Promise<number> {
  const entries = await readdir(tmpdir());
  return entries.filter((e) => e.startsWith("peic-sbp-")).length;
}

// No shared reset hook: every test sets its own implementation, and resetting
// between them was interfering with how Vitest tracks rejected mock results.


/** Captures the rejection without .rejects, which unwraps Error.cause and reports the cause instead of the thrown type. */
async function captureRejection(fn: () => Promise<unknown>): Promise<SbpTransportErrorType> {
  try {
    await fn();
  } catch (e) {
    return e as SbpTransportErrorType;
  }
  throw new Error("expected the call to reject, but it resolved");
}

describe("sbpTransportGet", () => {
  it("returns status and body on a successful response", async () => {
    const payload = JSON.stringify({ columns: ["Observation Date"], rows: [["2026-07-31"]] });
    execFileMock.mockResolvedValue({ stdout: `${payload}200`, stderr: "" });

    const result = await sbpTransportGet(URL_WITH_SECRET, 10_000);

    expect(result.status).toBe(200);
    expect(result.body).toBe(payload);
    expect(JSON.parse(result.body).rows).toHaveLength(1);
  });

  it.each([
    ["401 authentication failure", 401],
    ["403 Cloudflare/edge rejection", 403],
    ["429 rate limiting", 429],
    ["500 upstream failure", 500],
  ])("surfaces %s as a status rather than throwing", async (_label, status) => {
    execFileMock.mockResolvedValue({ stdout: `blocked${status}`, stderr: "" });

    const result = await sbpTransportGet(URL_WITH_SECRET, 10_000);

    // Deliberately NOT an exception: the caller decides how to treat a non-200,
    // preserving the behaviour of the fetch-based code this replaced.
    expect(result.status).toBe(status);
  });

  it("throws curl-missing when the binary is absent", async () => {
    execFileMock.mockImplementation(async () => { throw Object.assign(new Error("spawn curl ENOENT"), { code: "ENOENT" }); });

    const err = await captureRejection(() => sbpTransportGet(URL_WITH_SECRET, 10_000));
    expect(err).toBeInstanceOf(SbpTransportError);
    expect(err.kind).toBe("curl-missing");
  });

  it("throws timeout on curl exit code 28", async () => {
    execFileMock.mockImplementation(async () => { throw Object.assign(new Error("timed out"), { code: 28 }); });

    const err = await captureRejection(() => sbpTransportGet(URL_WITH_SECRET, 10_000));
    expect(err).toBeInstanceOf(SbpTransportError);
    expect(err.kind).toBe("timeout");
  });

  it("throws no-response when curl reports HTTP 000", async () => {
    execFileMock.mockResolvedValue({ stdout: "000", stderr: "" });

    const err = await captureRejection(() => sbpTransportGet(URL_WITH_SECRET, 10_000));
    expect(err).toBeInstanceOf(SbpTransportError);
    expect(err.kind).toBe("no-response");
  });

  it("never places the credentialed URL in argv", async () => {
    execFileMock.mockResolvedValue({ stdout: "{}200", stderr: "" });

    await sbpTransportGet(URL_WITH_SECRET, 10_000);

    const [, args] = execFileMock.mock.calls[0];
    const argv = (args as string[]).join(" ");
    expect(argv).not.toContain("SECRET-VALUE");
    expect(argv).not.toContain("api_key");
    expect(argv).toContain("--config"); // credentials travel via the config file
  });

  it("never leaks the URL or key in a transport error message", async () => {
    execFileMock.mockImplementation(async () => { throw Object.assign(new Error(`curl: (60) failed for ${URL_WITH_SECRET}`), { code: 60 }); });

    const err = await captureRejection(() => sbpTransportGet(URL_WITH_SECRET, 10_000));

    expect(err).toBeInstanceOf(SbpTransportError);
    expect(err.message).not.toContain("SECRET-VALUE");
    expect(err.message).not.toContain("api_key");
    expect(err.message).toContain("60"); // exit code is still actionable
  });

  it("removes the temporary credential directory on success", async () => {
    execFileMock.mockResolvedValue({ stdout: "{}200", stderr: "" });
    const before = await peicTempDirCount();

    await sbpTransportGet(URL_WITH_SECRET, 10_000);

    expect(await peicTempDirCount()).toBe(before);
  });

  it("removes the temporary credential directory on failure", async () => {
    execFileMock.mockImplementation(async () => { throw Object.assign(new Error("boom"), { code: 7 }); });
    const before = await peicTempDirCount();

    await sbpTransportGet(URL_WITH_SECRET, 10_000).catch(() => undefined);

    expect(await peicTempDirCount()).toBe(before);
  });

  it("converts the millisecond budget into curl's whole-second --max-time", async () => {
    execFileMock.mockResolvedValue({ stdout: "{}200", stderr: "" });

    await sbpTransportGet(URL_WITH_SECRET, 10_000);

    const [, args] = execFileMock.mock.calls[0];
    const maxTime = (args as string[])[(args as string[]).indexOf("--max-time") + 1];
    expect(maxTime).toBe("10");
  });
});
