// The administrator check (G.23): signed in + CONFIRMED e-mail + user id equal to the server-side ADMIN_USER_ID. Every combination is tested, plus the wiring of both
// admin pages and the rule that the administrator's id never reaches client code.

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ user: null as unknown, calls: [] as string[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }) }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { h.calls.push(`redirect:${to}`); throw Object.assign(new Error("NEXT_REDIRECT"), { to }); },
  notFound: () => { h.calls.push("notFound"); throw new Error("NEXT_NOT_FOUND"); },
}));

import { configuredAdminUserId, decideAdminAccess, requireAdmin, type AdminCandidate } from "./adminAccess";

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CONFIRMED = "2026-01-01T00:00:00Z";
const admin = (over: Partial<AdminCandidate> = {}): AdminCandidate => ({ id: ADMIN_ID, email: "boss@example.test", email_confirmed_at: CONFIRMED, ...over });

describe("configuredAdminUserId", () => {
  it("accepts a UUID, trimmed and lower-cased", () => {
    expect(configuredAdminUserId(ADMIN_ID)).toBe(ADMIN_ID);
    expect(configuredAdminUserId(`  ${ADMIN_ID.toUpperCase()}  `)).toBe(ADMIN_ID);
  });
  it.each([undefined, "", "   ", "admin@example.test", "not-a-uuid", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaaa", "dead-admin_user_id", "*", "null", "undefined"])("rejects %j (fails closed)", (v) => {
    expect(configuredAdminUserId(v)).toBeNull();
  });
});

describe("decideAdminAccess", () => {
  it("a guest (no user) is a guest, whatever is configured", () => {
    expect(decideAdminAccess(null, ADMIN_ID)).toEqual({ outcome: "guest" });
    expect(decideAdminAccess(undefined, null)).toEqual({ outcome: "guest" });
  });

  it("the confirmed administrator is allowed", () => {
    expect(decideAdminAccess(admin(), ADMIN_ID)).toEqual({ outcome: "allowed" });
  });

  it("the id comparison ignores case", () => {
    expect(decideAdminAccess(admin({ id: ADMIN_ID.toUpperCase() }), ADMIN_ID)).toEqual({ outcome: "allowed" });
  });

  it("the id must match IN FULL: an id that shares a prefix, or differs only in its last character, is denied", () => {
    const sharesPrefix = ADMIN_ID.slice(0, 8) + "-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const lastCharDiffers = ADMIN_ID.slice(0, -1) + "b";
    const firstCharDiffers = "b" + ADMIN_ID.slice(1);
    const truncated = ADMIN_ID.slice(0, -4);
    const extended = ADMIN_ID + "0";
    for (const id of [sharesPrefix, lastCharDiffers, firstCharDiffers, truncated, extended, ""]) {
      expect(decideAdminAccess(admin({ id }), ADMIN_ID), JSON.stringify(id)).toEqual({ outcome: "denied", reason: "not-administrator" });
    }
  });

  it("an ordinary registered user is denied", () => {
    expect(decideAdminAccess(admin({ id: OTHER_ID, email: "member@example.test" }), ADMIN_ID)).toEqual({ outcome: "denied", reason: "not-administrator" });
  });

  it("the administrator's e-mail address does NOT grant access to another account (the old email-only check is gone)", () => {
    // someone who registered the administrator's address but has a different id
    expect(decideAdminAccess(admin({ id: OTHER_ID, email: "boss@example.test" }), ADMIN_ID)).toEqual({ outcome: "denied", reason: "not-administrator" });
  });

  it("an administrator whose e-mail is not confirmed is denied", () => {
    expect(decideAdminAccess(admin({ email_confirmed_at: null }), ADMIN_ID)).toEqual({ outcome: "denied", reason: "email-unconfirmed" });
    expect(decideAdminAccess(admin({ email_confirmed_at: undefined }), ADMIN_ID)).toEqual({ outcome: "denied", reason: "email-unconfirmed" });
    expect(decideAdminAccess(admin({ email_confirmed_at: "" }), ADMIN_ID)).toEqual({ outcome: "denied", reason: "email-unconfirmed" });
  });

  it("an administrator with no e-mail address at all is denied", () => {
    expect(decideAdminAccess(admin({ email: null }), ADMIN_ID).outcome).toBe("denied");
    expect(decideAdminAccess(admin({ email: "" }), ADMIN_ID).outcome).toBe("denied");
  });

  it("a user without an id is denied", () => {
    expect(decideAdminAccess({ email: "boss@example.test", email_confirmed_at: CONFIRMED }, ADMIN_ID)).toEqual({ outcome: "denied", reason: "not-administrator" });
    expect(decideAdminAccess(admin({ id: null }), ADMIN_ID).outcome).toBe("denied");
  });

  it("with no administrator configured, NOBODY is an administrator (fails closed), even a user that looks right", () => {
    expect(decideAdminAccess(admin(), null)).toEqual({ outcome: "denied", reason: "not-configured" });
  });

  it("uses the environment by default, and a malformed value configures nobody", () => {
    vi.stubEnv("ADMIN_USER_ID", ADMIN_ID);
    expect(decideAdminAccess(admin())).toEqual({ outcome: "allowed" });
    vi.stubEnv("ADMIN_USER_ID", "boss@example.test");
    expect(decideAdminAccess(admin())).toEqual({ outcome: "denied", reason: "not-configured" });
    vi.stubEnv("ADMIN_USER_ID", "");
    expect(decideAdminAccess(admin())).toEqual({ outcome: "denied", reason: "not-configured" });
    vi.unstubAllEnvs();
  });
});

describe("requireAdmin (what an admin page does)", () => {
  beforeEach(() => { h.calls.length = 0; h.user = null; vi.stubEnv("ADMIN_USER_ID", ADMIN_ID); });

  it("sends a guest to the login page, with the page as the return destination", async () => {
    await expect(requireAdmin("/admin/system-health")).rejects.toMatchObject({ to: "/login?redirect=%2Fadmin%2Fsystem-health" });
    expect(h.calls).toEqual(["redirect:/login?redirect=%2Fadmin%2Fsystem-health"]);
  });

  it("gives an ordinary registered user the ordinary not-found page", async () => {
    h.user = admin({ id: OTHER_ID });
    await expect(requireAdmin("/admin/sync-status")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.calls).toEqual(["notFound"]);
  });

  it("gives an unconfirmed administrator the not-found page", async () => {
    h.user = admin({ email_confirmed_at: null });
    await expect(requireAdmin("/admin/system-health")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("gives everyone not-found when ADMIN_USER_ID is not set", async () => {
    vi.stubEnv("ADMIN_USER_ID", "");
    h.user = admin();
    await expect(requireAdmin("/admin/system-health")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lets the confirmed administrator through and returns only their e-mail, never the id", async () => {
    h.user = admin();
    const r = await requireAdmin("/admin/system-health");
    expect(r).toEqual({ email: "boss@example.test" });
    expect(JSON.stringify(r)).not.toContain(ADMIN_ID);
    expect(h.calls).toEqual([]);
  });
});

describe("the administrator pages and the id's confinement to the server", () => {
  const SRC = path.resolve(__dirname, "..");
  const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");
  /** Source without comments, so that prose about a variable is not mistaken for code that reads it. */
  const code = (f: string) =>
    fs
      .readFileSync(f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/([^:])\/\/.*$/gm, "$1");
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
    }
    return out;
  };

  it.each(["app/admin/system-health/page.tsx", "app/admin/sync-status/page.tsx"])("%s is gated by requireAdmin and no longer by the e-mail address", (f) => {
    const src = read(f);
    expect(src).toMatch(/requireAdmin\("\/admin\/(system-health|sync-status)"\)/);
    expect(src).not.toMatch(/ADMIN_EMAIL|adminEmail|user\.email !==/);
    // the guard runs before anything is fetched for the page
    expect(src.indexOf("requireAdmin(")).toBeLessThan(src.indexOf("getSystemHealthSnapshot()") === -1 ? Number.MAX_SAFE_INTEGER : src.indexOf("getSystemHealthSnapshot()"));
  });

  it("ADMIN_USER_ID is read in exactly one source file, and is never a NEXT_PUBLIC variable", () => {
    const files = walk(SRC).filter((f) => !/\.test\.tsx?$/.test(f));
    const readers = files.filter((f) => /ADMIN_USER_ID/.test(code(f))).map((f) => path.relative(SRC, f).replace(/\\/g, "/"));
    expect(readers).toEqual(["lib/adminAccess.ts"]);
    for (const f of files) expect(code(f), f).not.toMatch(/NEXT_PUBLIC_ADMIN/);
  });

  it("no client component imports the administrator module", () => {
    for (const f of walk(SRC).filter((x) => !/\.test\.tsx?$/.test(x))) {
      const src = fs.readFileSync(f, "utf8");
      if (/^\s*["']use client["']/.test(src)) expect(src, path.relative(SRC, f)).not.toMatch(/adminAccess/);
    }
  });

  it("the administrator module logs nothing and returns no id", () => {
    const src = read("lib/adminAccess.ts");
    expect(src).not.toMatch(/console\./);
    expect(src).toMatch(/return \{ email: user\?\.email \?\? "" \}/);
  });

  it("ADMIN_EMAIL is still used by the alert recipient only (not for authorization)", () => {
    const users = walk(SRC).filter((f) => !/\.test\.tsx?$/.test(f) && /ADMIN_EMAIL/.test(code(f))).map((f) => path.relative(SRC, f).replace(/\\/g, "/"));
    expect(users.sort()).toEqual(["lib/ingestionWatchdog.ts", "lib/testUtils/productionIsolation.ts"]);
  });
});
