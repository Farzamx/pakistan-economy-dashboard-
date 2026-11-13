// The server side of every account flow, driven directly with a faked Supabase client (no network, no real project): login, wrong password, sign-up and the
// remembered destination, password reset, password change, logout, and the e-mail-link callback. The redirect URLs asserted here are the exact values that the
// Supabase "Redirect URLs" allow-list must accept (docs/authentication.md).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface CookieRecord { value: string; options?: Record<string, unknown> }
const h = vi.hoisted(() => ({
  jar: new Map<string, { value: string; options?: Record<string, unknown> }>(),
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
    exchangeCodeForSession: vi.fn(),
  },
  headers: { host: "www.pakeconintel.com", "x-forwarded-proto": "https" } as Record<string, string>,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (h.jar.has(name) ? { name, value: h.jar.get(name)!.value } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) => void h.jar.set(name, { value, options }),
    delete: (name: string) => void h.jar.delete(name),
    getAll: () => [...h.jar.entries()].map(([name, c]) => ({ name, value: c.value })),
  }),
  headers: async () => new Headers(h.headers),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { to });
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: h.auth }) }));

import { requestPasswordReset, signIn, signOutAction, signUp, updatePassword } from "./actions";
import { GET as callback } from "./callback/route";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
/** Runs an action that ends in redirect(): returns where it redirected (or null if it returned normally). */
async function redirectedTo(run: () => Promise<unknown>): Promise<{ to: string | null; result: unknown }> {
  try {
    const result = await run();
    return { to: null, result };
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") return { to: (e as Error & { to: string }).to, result: undefined };
    throw e;
  }
}
const INIT = { error: null };
const cookie = (name: string): CookieRecord | undefined => h.jar.get(name);

beforeEach(() => {
  h.jar.clear();
  for (const fn of Object.values(h.auth)) fn.mockReset();
  h.auth.signInWithPassword.mockResolvedValue({ error: null });
  h.auth.signUp.mockResolvedValue({ error: null });
  h.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  h.auth.updateUser.mockResolvedValue({ error: null });
  h.auth.signOut.mockResolvedValue({ error: null });
  h.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("login (signIn)", () => {
  it("a wrong password returns Supabase's message, does not redirect and sets no destination cookie", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const r = await redirectedTo(() => signIn(INIT, form({ email: "a@b.test", password: "nope", redirectTo: "/pakistan-bond-yields" })));
    expect(r.to).toBeNull();
    expect(r.result).toEqual({ error: "Invalid login credentials" });
    expect(h.jar.size).toBe(0);
  });

  it("a correct login redirects to the page the member asked for, query included", async () => {
    const r = await redirectedTo(() => signIn(INIT, form({ email: "a@b.test", password: "right", redirectTo: "/budget?tab=sankey" })));
    expect(r.to).toBe("/budget?tab=sankey");
    expect(h.auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.test", password: "right" });
  });

  it("a missing destination goes to the Overview", async () => {
    expect((await redirectedTo(() => signIn(INIT, form({ email: "a@b.test", password: "right" })))).to).toBe("/overview");
  });

  it.each(["https://evil.example/", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/login", "/signup?redirect=/budget", "", "   "])("a destination of %j never leaves the site (goes to /overview)", async (evil) => {
    const r = await redirectedTo(() => signIn(INIT, form({ email: "a@b.test", password: "right", redirectTo: evil })));
    expect(r.to).toBe("/overview");
  });
});

describe("sign-up (signUp)", () => {
  const good = { email: "new@b.test", password: "a-long-password", confirmPassword: "a-long-password" };

  it("refuses mismatched or short passwords before calling Supabase", async () => {
    expect((await signUp(INIT, form({ ...good, confirmPassword: "different" }))).error).toBe("Passwords do not match.");
    expect((await signUp(INIT, form({ email: "n@b.test", password: "short", confirmPassword: "short" }))).error).toBe("Password must be at least 8 characters.");
    expect(h.auth.signUp).not.toHaveBeenCalled();
    expect(h.jar.size).toBe(0);
  });

  it("asks Supabase to send the confirmation link to exactly <site>/auth/callback (the allow-list entry)", async () => {
    await redirectedTo(() => signUp(INIT, form(good)));
    expect(h.auth.signUp).toHaveBeenCalledWith({ email: "new@b.test", password: "a-long-password", options: { emailRedirectTo: "https://www.pakeconintel.com/auth/callback" } });
  });

  it("remembers the requested page in a short-lived httpOnly SameSite=Lax cookie and sends the member to the login page with the notice", async () => {
    const r = await redirectedTo(() => signUp(INIT, form({ ...good, redirectTo: "/pakistan-bond-yields" })));
    expect(r.to).toBe("/login?confirm=1&redirect=%2Fpakistan-bond-yields");
    expect(cookie("peic_after_auth")?.value).toBe("/pakistan-bond-yields");
    expect(cookie("peic_after_auth")?.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
  });

  it("the cookie is Secure in production only", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await redirectedTo(() => signUp(INIT, form({ ...good, redirectTo: "/budget" })));
    expect(cookie("peic_after_auth")?.options?.secure).toBe(true);
  });

  it("a hostile destination is replaced by /overview in both the cookie and the redirect", async () => {
    const r = await redirectedTo(() => signUp(INIT, form({ ...good, redirectTo: "https://evil.example" })));
    expect(r.to).toBe("/login?confirm=1&redirect=%2Foverview");
    expect(cookie("peic_after_auth")?.value).toBe("/overview");
  });

  it("a Supabase error is returned and no cookie is set", async () => {
    h.auth.signUp.mockResolvedValue({ error: { message: "User already registered" } });
    const r = await redirectedTo(() => signUp(INIT, form({ ...good, redirectTo: "/budget" })));
    expect(r.to).toBeNull();
    expect(r.result).toEqual({ error: "User already registered" });
    expect(h.jar.size).toBe(0);
  });

  it("the link's origin follows the request, so previews and production each get their own address", async () => {
    h.headers.host = "preview-abc.vercel.app";
    await redirectedTo(() => signUp(INIT, form(good)));
    expect(h.auth.signUp.mock.calls[0][0].options.emailRedirectTo).toBe("https://preview-abc.vercel.app/auth/callback");
    h.headers.host = "www.pakeconintel.com";
  });
});

describe("password reset", () => {
  it("asks Supabase to send the reset link to exactly <site>/auth/callback?next=/reset-password (the allow-list entry)", async () => {
    const r = await requestPasswordReset(INIT, form({ email: "member@b.test" }));
    expect(h.auth.resetPasswordForEmail).toHaveBeenCalledWith("member@b.test", { redirectTo: "https://www.pakeconintel.com/auth/callback?next=/reset-password" });
    expect(r).toEqual({ error: null, success: true });
  });

  it("returns the same success whether or not the account exists (Supabase does not report it)", async () => {
    expect(await requestPasswordReset(INIT, form({ email: "nobody@b.test" }))).toEqual({ error: null, success: true });
  });

  it("surfaces a Supabase error (for example a rate limit)", async () => {
    h.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "email rate limit exceeded" } });
    expect(await requestPasswordReset(INIT, form({ email: "member@b.test" }))).toEqual({ error: "email rate limit exceeded" });
  });

  it("updatePassword refuses mismatched and short passwords without calling Supabase", async () => {
    expect((await updatePassword(INIT, form({ password: "new-password-1", confirmPassword: "other-password-1" }))).error).toBe("Passwords do not match.");
    expect((await updatePassword(INIT, form({ password: "short", confirmPassword: "short" }))).error).toBe("Password must be at least 8 characters.");
    expect(h.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updatePassword changes the password, ENDS the reset session, then redirects to /login?reset=1 (which confirms the change)", async () => {
    const order: string[] = [];
    h.auth.updateUser.mockImplementation(async () => { order.push("updateUser"); return { error: null }; });
    h.auth.signOut.mockImplementation(async () => { order.push("signOut"); return { error: null }; });
    const r = await redirectedTo(() => updatePassword(INIT, form({ password: "new-password-1", confirmPassword: "new-password-1" })));
    expect(h.auth.updateUser).toHaveBeenCalledWith({ password: "new-password-1" });
    expect(order).toEqual(["updateUser", "signOut"]);
    expect(r.to).toBe("/login?reset=1");
  });

  it("a failed password change does not sign the member out", async () => {
    h.auth.updateUser.mockResolvedValue({ error: { message: "New password should be different" } });
    await redirectedTo(() => updatePassword(INIT, form({ password: "new-password-1", confirmPassword: "new-password-1" })));
    expect(h.auth.signOut).not.toHaveBeenCalled();
  });

  it("updatePassword without a reset session returns Supabase's error and does not redirect", async () => {
    h.auth.updateUser.mockResolvedValue({ error: { message: "Auth session missing!" } });
    const r = await redirectedTo(() => updatePassword(INIT, form({ password: "new-password-1", confirmPassword: "new-password-1" })));
    expect(r.to).toBeNull();
    expect(r.result).toEqual({ error: "Auth session missing!" });
  });
});

describe("logout (signOutAction)", () => {
  it("signs out on the server (which clears the session cookies) and leaves navigation to the caller", async () => {
    expect(await signOutAction()).toBeUndefined();
    expect(h.auth.signOut).toHaveBeenCalledTimes(1);
  });
});

describe("the e-mail link (/auth/callback)", () => {
  const get = (qs: string) => callback(new Request(`https://www.pakeconintel.com/auth/callback${qs}`));
  const loc = (r: Response) => r.headers.get("location");

  it("exchanges the code and lands on the page remembered at sign-up, then uses the cookie up", async () => {
    h.jar.set("peic_after_auth", { value: "/pakistan-bond-yields" });
    const r = await get("?code=abc");
    expect(h.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(loc(r)).toBe("https://www.pakeconintel.com/pakistan-bond-yields");
    expect(h.jar.has("peic_after_auth")).toBe(false);
  });

  it("with no remembered page and no next it lands on the Overview", async () => {
    expect(loc(await get("?code=abc"))).toBe("https://www.pakeconintel.com/overview");
  });

  it("the password-reset link lands on /reset-password (the one sign-in page accepted as `next`)", async () => {
    expect(loc(await get("?code=abc&next=/reset-password"))).toBe("https://www.pakeconintel.com/reset-password");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/login", "javascript:alert(1)"])("next=%s never leaves the site", async (evil) => {
    const l = loc(await get(`?code=abc&next=${encodeURIComponent(evil)}`));
    expect(l).toBe("https://www.pakeconintel.com/overview");
  });

  it("a hostile remembered cookie is not followed either", async () => {
    h.jar.set("peic_after_auth", { value: "https://evil.example" });
    expect(loc(await get("?code=abc"))).toBe("https://www.pakeconintel.com/overview");
  });

  it("a code Supabase refuses (wrong, used, expired, other browser) goes to /login?error=auth-callback-failed and keeps the remembered cookie", async () => {
    h.auth.exchangeCodeForSession.mockResolvedValue({ error: { message: "invalid flow state" } });
    h.jar.set("peic_after_auth", { value: "/budget" });
    const r = await get("?code=bad");
    expect(loc(r)).toBe("https://www.pakeconintel.com/login?error=auth-callback-failed");
    expect(h.jar.has("peic_after_auth")).toBe(true);
  });

  it("no code at all goes to the same failure page without calling Supabase", async () => {
    const r = await get("");
    expect(loc(r)).toBe("https://www.pakeconintel.com/login?error=auth-callback-failed");
    expect(h.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
