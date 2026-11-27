// Analytics privacy in a real browser (docs/analytics-privacy.md): no URL query string, fragment or token reaches Google Analytics. NOT part of `npm test`;
// run it against the ISOLATED build made with a GA ID (README.md):
//
//   PEIC_E2E_GA_ID=G-PEICE2ETEST npx tsx --tsconfig tsconfig.json e2e/guest-auth/isolatedRun.mts build --copy      (then `start --copy --port 3100`)
//   PEIC_E2E_BASE=http://localhost:3100 node e2e/guest-auth/gaPrivacy.mjs
//
// gtag.js (the public library) is loaded so its real behaviour is exercised, but EVERY other request leaving the machine — every Google collection hit —
// is recorded and ABORTED in the browser: nothing is ever sent to any GA property.
//
// Optional: PEIC_E2E_GA_CONTAINER_ID=<a GA4 measurement ID, e.g. the Production one, which is public in every page's HTML> swaps that ID into the pages IN
// THE BROWSER ONLY, so gtag.js loads that property's real container settings (enhanced measurement: history-change page views, which read the full URL
// themselves). Hits are still all aborted. This is the case the wire-level guard (GA_TRANSPORT_FILTER) exists for.
import { createRequire } from "node:module";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..", "..");
const require = createRequire(path.join(REPO, "package.json"));
const { chromium } = require("playwright-core");
const BASE = process.env.PEIC_E2E_BASE ?? "http://localhost:3100";
const CHROME = process.env.PEIC_E2E_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BUILD_ID = process.env.PEIC_E2E_GA_ID ?? "G-PEICE2ETEST"; // the ID compiled into the isolated build
const CONTAINER = process.env.PEIC_E2E_GA_CONTAINER_ID ?? "";
for (const id of [BUILD_ID, CONTAINER].filter(Boolean)) if (!/^G-[A-Z0-9]{4,16}$/.test(id)) throw new Error(`not a GA4 measurement ID: ${id}`);
const MEMBER = { email: "member@peic.test", password: "correct-horse-1" };
const SECRET = "SECRETtok3n9f8e7d";
const FRAG = "fragSECRET42";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let fails = 0;
const check = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`); };
const hits = [];
const local = (u) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u);

async function newCtx(container = "") {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("peic-mobile-welcome-dismissed", "1"); sessionStorage.setItem("peic-mobile-welcome-dismissed", "1"); } catch { /* storage off */ } });
  if (container) {
    await ctx.route((u) => local(u.toString()), async (route) => {
      const r = await route.fetch();
      if (!/html|javascript|x-component/.test(r.headers()["content-type"] ?? "")) return route.fulfill({ response: r });
      return route.fulfill({ response: r, body: (await r.text()).split(BUILD_ID).join(container) });
    });
  }
  await ctx.route((u) => !local(u.toString()), (route) => {
    const req = route.request();
    if (/^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+$/.test(req.url()) && req.method() === "GET") return route.continue(); // the library only
    hits.push({ url: req.url(), body: req.postData() ?? "" }); // recorded, never sent
    return route.abort();
  });
  return ctx;
}
const queue = (page) => page.evaluate(() => JSON.stringify(window.dataLayer ?? [], (_k, v) => (v instanceof Date ? "date" : v)));
const LEAK_MARKERS = [SECRET, FRAG, "token=", "utm_source", "redirect=", "q=abc", "tok-"];
const leaks = (s) => LEAK_MARKERS.filter((x) => s.includes(x));
const wire = (from) => hits.slice(from).map((h) => { try { return decodeURIComponent(h.url) + "\n" + decodeURIComponent(h.body); } catch { return h.url + "\n" + h.body; } }).join("\n");
const collects = (from) => hits.slice(from).filter((h) => /\/collect/.test(h.url));
const flush = async (page) => { await page.goto("about:blank"); await page.waitForTimeout(1500); }; // pagehide sends gtag's batched hits

console.log(`GA privacy against ${BASE} (build ID ${BUILD_ID})`);
{ // 1. a guest follows the e-mail unsubscribe link: sent to /login?redirect=%2Fsubscriptions%2Fmanage%3Ftoken%3D...
  const ctx = await newCtx(); const page = await ctx.newPage(); const h0 = hits.length;
  await page.goto(`${BASE}/subscriptions/manage?token=${SECRET}#${FRAG}`, { waitUntil: "load", timeout: 240000 });
  await page.waitForTimeout(9000);
  const at = new URL(page.url());
  check(at.pathname === "/login" && at.search.includes(SECRET), "guest: the unsubscribe link lands on /login with the token in the address (the case under test)");
  const q = await queue(page);
  check(q.includes(`"page_location":"${BASE}/login"`) && /"page_view"/.test(q), "guest: a page_view is queued with page_location = origin + /login");
  check(leaks(q).length === 0, `guest: GA's queue holds no token, query or fragment ${leaks(q).join(" ")}`);
  await flush(page);
  check(collects(h0).length > 0 && leaks(wire(h0)).length === 0, `guest: ${collects(h0).length} collection hits captured, none carries the token, query or fragment`);
  await ctx.close();
}
{ // 2. landing with tracking parameters, an in-app navigation, then URL changes made by script
  const ctx = await newCtx(); const page = await ctx.newPage(); const h0 = hits.length;
  await page.goto(`${BASE}/overview?utm_source=newsletter&token=${SECRET}#${FRAG}`, { waitUntil: "load", timeout: 240000 });
  await page.waitForTimeout(4000);
  await page.locator('a[href="/inflation-rate-pakistan"]:visible, a[href="/site-map"]:visible').first().click();
  await page.waitForTimeout(4000);
  const q = await queue(page);
  check((q.match(/"page_view"/g) ?? []).length >= 2, "an in-app navigation sends a second page_view");
  check(q.includes(`"page_referrer":"${BASE}/overview"`), "its referrer is the sanitised /overview");
  await page.evaluate((s) => history.pushState(null, "", `${location.pathname}?token=${s}#x`), SECRET); await page.waitForTimeout(2500);
  await page.evaluate(() => history.replaceState(null, "", `${location.pathname}?q=abc`)); await page.waitForTimeout(1500);
  check(leaks(await queue(page)).length === 0, "pushState / replaceState with a query: GA's queue still clean");
  await flush(page);
  check(collects(h0).length > 0 && leaks(wire(h0)).length === 0, `landing, navigation and script URL changes: ${collects(h0).length} hits, none carries a query, fragment or token`);
  await ctx.close();
}
{ // 3. a signed-in member opens the unsubscribe link: the page itself renders, token in the address bar
  const ctx = await newCtx(); const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.locator('input[name="email"]').fill(MEMBER.email); await page.locator('input[name="password"]').fill(MEMBER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => u.pathname !== "/login", { timeout: 120000, waitUntil: "commit" }); await page.waitForTimeout(1500);
  const h0 = hits.length;
  await page.goto(`${BASE}/subscriptions/manage?token=${SECRET}#${FRAG}`, { waitUntil: "load", timeout: 240000 });
  await page.waitForTimeout(9000);
  check(new URL(page.url()).pathname === "/subscriptions/manage", "member: the manage page itself renders");
  const q = await queue(page);
  check(q.includes(`"page_location":"${BASE}/subscriptions/manage"`) && leaks(q).length === 0, "member: page_location is /subscriptions/manage, no token anywhere in GA's queue");
  await flush(page);
  check(collects(h0).length > 0 && leaks(wire(h0)).length === 0, `member: ${collects(h0).length} hits captured, none carries the token`);
  await ctx.close();
}
if (CONTAINER) { // 4. the real property's container (enhanced measurement history page views), every hit still aborted
  const ctx = await newCtx(CONTAINER); const page = await ctx.newPage(); const h0 = hits.length;
  await page.goto(`${BASE}/overview?utm_source=x&token=${SECRET}#frag`, { waitUntil: "load", timeout: 240000 });
  await page.waitForTimeout(4000);
  check(await page.evaluate((id) => !!(window.google_tag_manager && window.google_tag_manager[id]), CONTAINER), `the ${CONTAINER} container loaded`);
  await page.evaluate((s) => history.pushState(null, "", `/overview?token=${s}#x`), SECRET); await page.waitForTimeout(2500);
  await page.evaluate(() => history.replaceState(null, "", "/overview?q=abc")); await page.waitForTimeout(1500);
  await page.locator('a[href="/inflation-rate-pakistan"]:visible').first().click(); await page.waitForTimeout(4000);
  await page.evaluate((s) => { location.hash = `tok-${s}`; }, SECRET); await page.waitForTimeout(2000);
  await flush(page);
  const w = wire(h0);
  check(/en=page_view/.test(w), `real container: page views still sent (${collects(h0).length} hits, all aborted)`);
  check(leaks(w).length === 0, `real container: no hit carries a query, fragment or token ${leaks(w).join(" ")}`);
  await ctx.close();
}
await browser.close();
const dlValues = hits.filter((h) => /\/collect/.test(h.url)).flatMap((h) => [h.url, ...h.body.split("\n")]).map((s) => { const m = /(?:^|[?&])dl=([^&\s]*)/.exec(s); return m ? decodeURIComponent(m[1]) : null; }).filter(Boolean);
console.log(`${hits.length} third-party requests recorded and aborted; page locations sent: ${[...new Set(dlValues)].join(", ")}`);
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
