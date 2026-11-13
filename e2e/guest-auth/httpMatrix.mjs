// Raw-HTTP matrix against the ISOLATED local server (Supabase = the loopback mock): every page and route handler that exists, as a guest, with a forged session and
// with a valid session; plus framework headers and data endpoints. No browser, so nothing here can be "helped" by client-side code.
//   PEIC_E2E_BASE=http://localhost:3100 node e2e/guest-auth/httpMatrix.mjs
import fs from "node:fs";
import path from "node:path";
import { ADMIN_TEST_USER_ID } from "./constants.mjs";

const BASE = process.env.PEIC_E2E_BASE ?? "http://localhost:3100";
const APP = path.resolve(import.meta.dirname, "..", "..", "src", "app");
function collect(dir = APP, parts = []) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith("@") || e.name.startsWith("_")) continue;
      const group = /^\(.*\)$/.test(e.name);
      const seg = group ? null : /^\[\[?\.\.\./.test(e.name) ? "x/y" : /^\[.+\]$/.test(e.name) ? "x" : e.name;
      out.push(...collect(full, seg === null ? parts : [...parts, seg]));
    } else if (e.name === "page.tsx" || e.name === "route.ts") out.push({ kind: e.name === "page.tsx" ? "page" : "handler", url: "/" + parts.join("/") });
  }
  return out;
}
const ROUTES = collect();
const OPEN_PAGES = new Set(["/", "/home", "/overview", "/login", "/signup", "/forgot-password", "/reset-password"]);
const OPEN_HANDLERS = new Set(["/api/admin/diagnostics", "/api/admin/global-markets-freshness", "/api/admin/health", "/api/admin/sbp-freshness", "/api/assistant", "/api/assistant/translate", "/api/cron/global-markets-freshness", "/api/cron/macro-intelligence-snapshot", "/api/cron/process-notification-jobs", "/api/cron/sbp-ingestion-watchdog", "/api/cron/sync-economic-calendar", "/api/cron/weekly-intelligence", "/api/revalidate-fx", "/api/subscribers/unsubscribe", "/api/subscribers/verify", "/api/webhooks/resend", "/auth/callback"]);

let ok = 0; const bad = [];
const check = (c, l) => { if (c) ok++; else bad.push(l); };
const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const now = () => Math.floor(Date.now() / 1000);
const USER = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "member@peic.test" };
const sessionCookie = (token) => `sb-127-auth-token=base64-${b64u({ access_token: token, token_type: "bearer", expires_in: 3600, expires_at: now() + 3600, refresh_token: "mock-refresh", user: USER })}`;
const GOOD = sessionCookie(`${b64u({ alg: "HS256" })}.${b64u({ sub: USER.id, exp: now() + 3600 })}.mocksig`);
const FORGED = sessionCookie(`${b64u({ alg: "HS256" })}.${b64u({ sub: USER.id, exp: now() + 3600 })}.forged`);
const get = (p, init = {}) => fetch(BASE + p, { redirect: "manual", ...init });
const loc = (r) => { const l = r.headers.get("location"); return l ? new URL(l, BASE) : null; };

// 1. GUEST, every page
const pages = ROUTES.filter((r) => r.kind === "page");
let guestRedirects = 0, guestOpen = 0, leaks = 0;
for (const p of pages) {
  const r = await get(p.url); const text = await r.text();
  if (OPEN_PAGES.has(p.url)) { check(r.status === 200, `guest open page ${p.url} -> ${r.status}`); guestOpen++; continue; }
  const l = loc(r);
  const good = r.status === 307 && l?.pathname === "/login" && l.searchParams.get("redirect") === p.url;
  check(good, `guest ${p.url} -> ${r.status} ${l?.pathname}${l?.search}`);
  if (good) guestRedirects++;
  // Next writes the redirect target as the body of a 307; that is the ONLY thing allowed in it (no page content), and the response must not be cacheable.
  if (text !== (l ? l.pathname + l.search : "") || r.headers.get("cache-control") !== "no-store") { leaks++; check(false, `guest ${p.url}: body is not just the redirect target, or the response is cacheable`); }
}
console.log(`pages: ${pages.length} | open (200): ${guestOpen} | guest redirected to /login?redirect=<page>: ${guestRedirects} | bodies/caching problems: ${leaks}`);

// 2. GUEST, every route handler
const handlers = ROUTES.filter((r) => r.kind === "handler");
const ok401 = [], openOnes = [];
for (const h of handlers) {
  const r = await get(h.url); const t = await r.text();
  if (OPEN_HANDLERS.has(h.url)) { openOnes.push(`${h.url}=${r.status}`); check(!(r.status === 401 && t.includes("login_required")) && !(r.status === 307 && loc(r)?.searchParams.has("redirect")), `open handler ${h.url} must not be gated by login (${r.status})`); continue; }
  check(r.status === 401 && t.includes("login_required"), `guest ${h.url} -> ${r.status} (wanted 401 login_required)`);
  if (r.status === 401) ok401.push(h.url);
}
console.log(`handlers: ${handlers.length} | members-only answered 401 to a guest: ${ok401.length} | open by design: ${openOnes.length}`);
console.log("  open handlers (status without a session):", openOnes.map((x) => x.replace("/api/", "")).join(" "));

// 3. framework headers / credentials do not help a guest
const variants = [{ rsc: "1" }, { rsc: "1", "next-router-prefetch": "1" }, { "x-nextjs-data": "1" }, { "x-middleware-prefetch": "1" }, { "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy" }, { authorization: "Bearer anything" }, { "x-forwarded-host": "www.pakeconintel.com" }, { cookie: "peic_after_auth=/overview" }, { cookie: "sb-127-auth-token=" }];
let hdrOk = 0;
for (const h of variants) for (const p of ["/budget", "/pakistan-bond-yields?_rsc=abc", "/download-datasets", "/budget.rsc"]) { const r = await get(p, { headers: h }); const good = r.status === 307 && loc(r)?.pathname === "/login"; check(good, `guest + ${JSON.stringify(h)} ${p} -> ${r.status}`); if (good) hdrOk++; }
for (const m of ["POST", "PUT", "DELETE", "PATCH", "OPTIONS"]) { const r = await get("/pakistan-interest-rate", { method: m, body: ["POST", "PUT", "PATCH"].includes(m) ? "{}" : undefined }); check(r.status === 307 && loc(r)?.pathname === "/login", `guest ${m} /pakistan-interest-rate -> ${r.status}`); }
console.log(`framework/credential header variants refused: ${hdrOk}/${variants.length * 4}`);

// 4. a forged / unreadable session is a guest
for (const p of ["/budget", "/pakistan-bond-yields", "/download-datasets"]) { const r = await get(p, { headers: { cookie: FORGED } }); check(r.status === 307 && loc(r)?.pathname === "/login", `forged session ${p} -> ${r.status}`); }
{ const r = await get("/api/datasets/sbp-policy-rate", { headers: { cookie: FORGED } }); check(r.status === 401, `forged session API -> ${r.status}`); }
{ const r = await get("/budget", { headers: { cookie: "sb-127-auth-token=base64-@@@not-json" } }); check(r.status === 307, `garbled session cookie -> ${r.status}`); }
console.log("forged / garbled sessions: refused");

// 5. a valid session opens the protected pages and data routes
const memberPages = ["/fed-funds-rate", "/pakistan-core-inflation", "/pakistan-food-inflation", "/budget/where-does-tax-money-go", "/budget/debt-servicing-vs-defence", "/budget", "/pakistan-bond-yields", "/download-datasets", "/macro-intelligence", "/comparisons", "/inflation-rate-pakistan", "/economic-calendar", "/decision-support-lab", "/pakistan-interest-rate"];
let memberOk = 0;
for (const p of memberPages) { const r = await get(p, { headers: { cookie: GOOD } }); check(r.status === 200, `member ${p} -> ${r.status}`); if (r.status === 200) memberOk++; }
for (const p of ["/api/datasets/sbp-policy-rate", "/api/comparisons/series?a=x&b=y"]) { const r = await get(p, { headers: { cookie: GOOD } }); check(r.status !== 401 && r.status !== 307, `member ${p} reaches the route (${r.status})`); }
console.log(`member pages opened (200): ${memberOk}/${memberPages.length}`);
const metaTarget = async (q) => { const r = await get("/login?redirect=" + q, { headers: { cookie: GOOD } }); const t = await r.text(); return { form: /name="password"/.test(t), to: (t.match(/http-equiv="refresh" content="[0-9]+;url=([^"]+)"/) || [])[1] }; };
{ const m = await metaTarget("%2Fbudget"); check(!m.form && m.to === "/budget", `signed-in member visiting /login?redirect=/budget is sent on to /budget, no form (${m.to})`); }
{ const m = await metaTarget("https%3A%2F%2Fevil.example"); check(!m.form && m.to === "/overview", `member + external redirect value is sent to /overview, not off-site (${m.to})`); }

// 6. server-to-server and e-mail-link routes keep their own authentication
for (const p of ["/api/cron/weekly-intelligence", "/api/cron/sync-economic-calendar", "/api/revalidate-fx", "/api/admin/health"]) { const r = await get(p); check(r.status === 401 && !(await r.text()).includes("login_required"), `${p} without its secret -> ${r.status} (own 401, not the login gate)`); }
{ const r = await get("/api/subscribers/verify"); check(r.status === 400, `/api/subscribers/verify without a token -> ${r.status} (its own 400)`); }
{ const r = await get("/api/subscribers/unsubscribe"); check(r.status === 400, `/api/subscribers/unsubscribe without a token -> ${r.status} (its own 400)`); }
{ const r = await get("/api/subscribers/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "x@y.test" }) }); check(r.status === 401, `/api/subscribers/subscribe as a guest -> ${r.status}`); }
{ const r = await fetch(BASE + "/api/webhooks/resend", { method: "POST", body: "{}" }); check([400, 401, 403].includes(r.status), `webhook unsigned -> ${r.status}`); }
{ const r = await fetch(BASE + "/api/assistant", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" }); check(r.status === 403, `assistant foreign origin -> ${r.status}`); }

// 7. sitemap, robots
const sm = await (await get("/sitemap.xml")).text(); const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check(locs.length === 2, `sitemap URLs ${JSON.stringify(locs)}`);
console.log("sitemap:", JSON.stringify(locs));

// 8. session lifecycle (refresh) and the administrator check
// The isolated build's ADMIN_USER_ID is ADMIN_TEST_USER_ID (constants.mjs). The mock reads the user id, the e-mail and the confirmed flag out of the token it signed, so a
// test can present an administrator, an unconfirmed administrator, an ordinary member, or an impostor who registered the administrator's e-mail address (another id).
const tokenFor = (email, exp, { sub = USER.id, confirmed = true } = {}) => `${b64u({ alg: "HS256" })}.${b64u({ sub, email, exp, confirmed })}.mocksig`;
const cookieWith = (token, expiresAt, refresh = "mock-refresh") => `sb-127-auth-token=base64-${b64u({ access_token: token, token_type: "bearer", expires_in: 3600, expires_at: expiresAt, refresh_token: refresh, user: USER })}`;
{ // expired access token + a valid refresh token: the proxy refreshes the session and hands the browser a new cookie
  const c = cookieWith(tokenFor("member@peic.test", now() - 100), now() - 100);
  const r = await get("/budget", { headers: { cookie: c } }); const sc = r.headers.get("set-cookie") || "";
  check(r.status === 200 && /sb-127-auth-token/.test(sc), `expired access token + valid refresh token: the session is refreshed (${r.status}, new session cookie: ${/sb-127-auth-token/.test(sc)})`);
}
{ // expired access token + a refresh token Supabase does not know: a guest
  const c = cookieWith(tokenFor("member@peic.test", now() - 100), now() - 100, "revoked-refresh");
  const r = await get("/budget", { headers: { cookie: c } }); const a = await get("/api/datasets/sbp-policy-rate", { headers: { cookie: c } });
  check(r.status === 307 && loc(r)?.pathname === "/login" && a.status === 401, `expired access token + revoked refresh token: refused (page ${r.status}, API ${a.status})`);
}
{ // administrator: signed in + CONFIRMED e-mail + user id equal to ADMIN_USER_ID
  const exp = now() + 3600;
  const who = {
    admin: cookieWith(tokenFor("boss@peic.test", exp, { sub: ADMIN_TEST_USER_ID }), exp),
    unconfirmedAdmin: cookieWith(tokenFor("boss@peic.test", exp, { sub: ADMIN_TEST_USER_ID, confirmed: false }), exp),
    // someone who registered the administrator's e-mail address (the old check would have let this account in) but has a different id
    impostor: cookieWith(tokenFor("boss@peic.test", exp, { sub: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }), exp),
    member: GOOD,
  };
  const body = async (p, cookie) => { const r = await get(p, cookie ? { headers: { cookie } } : {}); return { status: r.status, text: r.status === 307 ? "" : await r.text(), loc: loc(r) }; };
  // The words "could not be found" are serialised into EVERY page's data payload (the layout's not-found boundary), and a streamed notFound() is drawn by the browser, so
  // neither is a usable marker in raw HTML. What distinguishes the denied response is the payload's NEXT_HTTP_ERROR_FALLBACK;404 marker, and that none of the page's own
  // VISIBLE content is present. The administrator's pages show their heading, or (with the mock's empty database) their own "Error loading series" state.
  const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const ADMIN_CONTENT = /System Health|Sync Status|Internal diagnostics|Error loading series/;
  const DENIED_MARKER = /NEXT_HTTP_ERROR_FALLBACK;404/;
  const isAdminPage = (t) => ADMIN_CONTENT.test(visible(t)) && !DENIED_MARKER.test(t);
  const notFound = (t) => DENIED_MARKER.test(t) && !ADMIN_CONTENT.test(visible(t));
  for (const p of ["/admin/system-health", "/admin/sync-status"]) {
    const g = await body(p); check(g.status === 307 && g.loc?.pathname === "/login" && g.loc.searchParams.get("redirect") === p, `guest ${p} -> /login?redirect=${p} (${g.status})`);
    for (const [name, label] of [["member", "ordinary registered user"], ["unconfirmedAdmin", "administrator with an UNCONFIRMED e-mail"], ["impostor", "user with the administrator's e-mail but another id"]]) {
      const r = await body(p, who[name]); check(notFound(r.text), `${label}: ${p} shows the not-found page and no admin content`);
    }
    const a = await body(p, who.admin); check(a.status === 200 && isAdminPage(a.text), `the confirmed administrator opens ${p} (${a.status}, the page's own content is shown and it is not the not-found page: ${isAdminPage(a.text)})`);
    check(!a.text.includes(ADMIN_TEST_USER_ID), `${p} does not print the administrator's id in the page`);
  }
}
console.log("session refresh and administrator checks done");

console.log(`\nchecks passed: ${ok}; failed: ${bad.length}`); bad.slice(0, 40).forEach((b) => console.log("  FAIL:", b));
process.exit(bad.length ? 1 : 0);
