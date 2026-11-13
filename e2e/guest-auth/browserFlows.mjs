// Real-browser (Chromium) coverage of the guest / member experience, against the ISOLATED local server whose Supabase is the loopback mock (mockAuth.mjs).
// It is NOT part of `npm test` (it needs a built server): see README.md for the three steps. Nothing here talks to a real Supabase project.
//
//   PEIC_E2E_BASE=http://localhost:3100 node e2e/guest-auth/browserFlows.mjs <width> <height> <name> <dark|light> <desktop|mobile>
//
// Covers: complete navigation for guests (desktop menus and the mobile drawer, including the restored entries), the sign-in dialog (open, close by Escape / the
// close button / the backdrop, Log in and Sign up buttons, destination carried), GlobalSearch for protected destinations (mouse and Enter), direct protected URLs,
// invalid login, login returning to the requested page, open-redirect attempts, logout (desktop menu and mobile drawer) and the guest dialog afterwards,
// a member's direct access, admin pages (ADMIN_EMAIL) and the open pages.
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..", "..");
const require = createRequire(path.join(REPO, "package.json"));
const { chromium } = require("playwright-core");
const [w = "1440", h = "900", name = "run", scheme = "dark", kind = "desktop"] = process.argv.slice(2);
const BASE = process.env.PEIC_E2E_BASE ?? "http://localhost:3100";
const OUT = path.join(process.env.PEIC_E2E_OUT ?? path.join(os.tmpdir(), "peic-e2e"), name);
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.PEIC_E2E_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const NAV_JSON = process.env.PEIC_E2E_NAV_JSON ?? path.join(process.env.PEIC_E2E_OUT ?? path.join(os.tmpdir(), "peic-e2e"), "nav-links.json");
const NAV = fs.existsSync(NAV_JSON) ? JSON.parse(fs.readFileSync(NAV_JSON, "utf8")).map((x) => x.split("#")[0]).filter((x) => x && x !== "/home") : [];
const MEMBER = { email: "member@peic.test", password: "correct-horse-1" };
const RESTORED = ["/pakistan-core-inflation", "/pakistan-food-inflation", "/fed-funds-rate", "/budget/where-does-tax-money-go", "/budget/debt-servicing-vs-defence"];
const NAMED = ["/overview", "/pakistan-bond-yields", "/budget", "/download-datasets", "/macro-intelligence", "/comparisons", "/decision-support-lab", "/economic-calendar", "/pakistan-interest-rate", ...RESTORED];

let ok = 0; const bad = []; const errors = [];
const check = (cond, label) => { if (cond) ok++; else bad.push(label); console.log(`${cond ? "  ok  " : "  FAIL"} ${label}`); };
const isMobile = kind === "mobile";
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const newCtx = async () => {
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, colorScheme: scheme, reducedMotion: "reduce" });
  await ctx.addInitScript((s) => { try { localStorage.setItem("dashboard-theme", s); localStorage.setItem("peic-mobile-welcome-dismissed", "1"); sessionStorage.setItem("peic-mobile-welcome-dismissed", "1"); } catch { /* storage blocked */ } }, scheme);
  await ctx.route(/google-analytics\.com|googletagmanager\.com|doubleclick\.net/, (r) => r.abort());
  return ctx;
};
const open = async (ctx, url = "/overview") => {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const r = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.locator("h1").first().waitFor({ timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(2200);
  const b = page.getByRole("button", { name: /Continue on Mobile/i }); if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(250); }
  return { page, response: r };
};
const pathOf = (page) => new URL(page.url()).pathname;
const fullPath = (page) => new URL(page.url()).pathname + new URL(page.url()).search;
const dialogOf = (page) => page.getByRole("dialog", { name: /Log in to continue/i });

// ── navigation helpers ──
async function expandAllDrawerSections(drawer) {
  const sections = drawer.locator("button[aria-expanded]");
  for (let i = 0; i < (await sections.count()); i++) { const b = sections.nth(i); if ((await b.getAttribute("aria-expanded")) === "false") await b.click().catch(() => {}); }
}
async function openDrawer(page) {
  await page.locator('header button[aria-haspopup="dialog"]').first().click(); await page.waitForTimeout(500);
  const drawer = page.locator('[role="dialog"]').first(); await expandAllDrawerSections(drawer); await page.waitForTimeout(300);
  return drawer;
}
/** Every href the visitor can reach through the navigation (all desktop menus opened one by one, or the whole mobile drawer). */
async function collectNavHrefs(page) {
  const seen = new Set();
  if (isMobile) {
    const drawer = await openDrawer(page);
    for (const hf of await drawer.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) seen.add(hf.split("#")[0]);
    await page.screenshot({ path: `${OUT}/nav_drawer.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  } else {
    const buttons = page.locator("header nav button[aria-expanded]");
    const n = await buttons.count();
    for (let i = 0; i < n; i++) {
      await buttons.nth(i).click(); await page.waitForTimeout(350);
      for (const hf of await page.locator("header a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) seen.add(hf.split("#")[0]);
      if (i === 0) await page.screenshot({ path: `${OUT}/nav_menu_open.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    }
    for (const hf of await page.locator("header a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) seen.add(hf.split("#")[0]);
  }
  return seen;
}
/** Click a navigation entry (desktop: open the menu that holds it first; mobile: through the drawer). */
async function clickNav(page, href) {
  if (isMobile) {
    const drawer = await openDrawer(page);
    const link = drawer.locator(`a[href="${href}"]`).first(); await link.scrollIntoViewIfNeeded(); await link.click();
  } else {
    const buttons = page.locator("header nav button[aria-expanded]");
    for (let i = 0; i < (await buttons.count()); i++) {
      await buttons.nth(i).click(); await page.waitForTimeout(300);
      const link = page.locator(`header a[href="${href}"]`).first();
      if (await link.isVisible().catch(() => false)) { await link.click(); return; }
      await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    }
    throw new Error(`navigation entry ${href} not found in any desktop menu`);
  }
}
/** The search box (mobile: opened from the header's search button). */
async function searchBox(page) {
  // The header holds two search boxes: the desktop one (hidden below the lg breakpoint) and the one in the panel that the mobile search button opens.
  if (isMobile && (await page.locator("#app-header-search").count()) === 0) {
    await page.locator('button[aria-controls="app-header-search"]').click();
    await page.locator("#app-header-search").waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
  }
  return page.locator('input[type="search"][role="combobox"]:visible').first();
}
const resultLink = (page, href) => page.locator(`[role="listbox"] a[href="${href}"]`).first();

// ═════════ 1. GUEST: the navigation is complete ═════════
{
  const ctx = await newCtx(); const { page, response } = await open(ctx);
  check(response.status() === 200 && pathOf(page) === "/overview", "guest: /overview opens (200, no redirect)");
  const seen = await collectNavHrefs(page);
  const wantedAll = NAV.length ? NAV : NAMED;
  const missing = wantedAll.filter((x) => !seen.has(x));
  check(missing.length === 0, `guest (${kind}): the navigation lists ${wantedAll.length - missing.length}/${wantedAll.length} registry destinations${missing.length ? " — missing: " + missing.join(", ") : ""}`);
  const missingNamed = NAMED.filter((x) => !seen.has(x));
  check(missingNamed.length === 0, `guest (${kind}): the named destinations are all visible${missingNamed.length ? " — missing: " + missingNamed.join(", ") : ""}`);
  const missingRestored = RESTORED.filter((x) => !seen.has(x));
  check(missingRestored.length === 0, `guest (${kind}): the five restored entries (Core Inflation, Food Inflation, Fed Funds, Tax Money, Debt vs Defence) are visible`);
  check((await page.locator('header a[href^="/login"], header a[href^="/signup"]').count()) >= 1 || isMobile, `guest (${kind}): Log in / Sign up are offered`);
  await ctx.close();
}

// ═════════ 2. GUEST: the sign-in dialog — open, name the section, close three ways, buttons ═════════
{
  const ctx = await newCtx(); const { page } = await open(ctx);
  await clickNav(page, "/pakistan-bond-yields"); await page.waitForTimeout(800);
  const dialog = dialogOf(page);
  check(await dialog.isVisible().catch(() => false), "clicking Bond Yields as a guest opens the login dialog");
  check(pathOf(page) === "/overview", "…and the browser stays on the Overview (the protected page is not opened)");
  const text = (await dialog.innerText().catch(() => "")) || "";
  check(/registered members/i.test(text) && /Bond Yields/i.test(text), "the dialog explains that login is required and names the section");
  const login = dialog.locator('a[data-cta="login"]'), signup = dialog.locator('a[data-cta="signup"]');
  check((await login.count()) === 1 && (await signup.count()) === 1, "the dialog offers Log in and Sign up");
  check((await login.getAttribute("href")) === "/login?redirect=%2Fpakistan-bond-yields" && (await signup.getAttribute("href")) === "/signup?redirect=%2Fpakistan-bond-yields", "both buttons carry the destination");
  await page.screenshot({ path: `${OUT}/dialog_open.png` });
  const overflowLocked = await page.evaluate(() => document.body.style.overflow);
  check(overflowLocked === "hidden", "while open, the page behind does not scroll");

  // close three ways, each followed by a re-open
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  check(!(await dialog.isVisible().catch(() => false)) && pathOf(page) === "/overview", "Escape closes the dialog");
  check((await page.evaluate(() => document.body.style.overflow)) === "", "…and the page scrolls again");
  await clickNav(page, "/pakistan-bond-yields"); await page.waitForTimeout(700);
  check(await dialog.isVisible().catch(() => false), "the dialog opens again");
  await dialog.getByRole("button", { name: "Close" }).click(); await page.waitForTimeout(500);
  check(!(await dialog.isVisible().catch(() => false)), "the Close button closes the dialog");
  await clickNav(page, "/budget"); await page.waitForTimeout(700);
  check(await dialog.isVisible().catch(() => false), "a different section (Budget Tracker) opens it again");
  check(/Budget Tracker/i.test((await page.getByTestId("guest-modal-destination").innerText().catch(() => "")) || ""), "…naming Budget Tracker this time");
  await page.mouse.click(4, 4); await page.waitForTimeout(500);
  check(!(await dialog.isVisible().catch(() => false)) && pathOf(page) === "/overview", "clicking the backdrop closes the dialog");

  // Sign up button
  await clickNav(page, "/fed-funds-rate"); await page.waitForTimeout(700);
  await dialog.locator('a[data-cta="signup"]').click();
  await page.waitForURL((u) => u.pathname === "/signup", { timeout: 60000, waitUntil: "commit" }); await page.waitForTimeout(1200);
  check(fullPath(page) === "/signup?redirect=%2Ffed-funds-rate", "Sign up opens /signup with the destination");
  check(await page.getByTestId("login-required-notice").isVisible().catch(() => false) && /Fed Funds/i.test((await page.getByTestId("login-required-notice").innerText().catch(() => "")) || ""), "…which says login is required and names the Fed Funds Rate");
  check((await page.locator("[role=dialog]").count()) === 0, "…and the dialog is gone on the sign-up page (it must not block the form)");
  check((await page.locator('input[name="email"]').isEnabled()) && (await page.locator('a[href^="/login?redirect="]').count()) >= 1, "the sign-up form is usable and links back to Log in with the destination");
  await ctx.close();
}

// ═════════ 3. GUEST: search finds protected destinations; selecting one shows the dialog ═════════
{
  const ctx = await newCtx(); const { page } = await open(ctx);
  const cases = [
    ["bond yields", "/pakistan-bond-yields", /Bond Yields/i], ["fed funds", "/fed-funds-rate", /Fed Funds/i], ["tax money", "/budget/where-does-tax-money-go", /Tax Money/i],
    ["debt vs defence", "/budget/debt-servicing-vs-defence", /Defence/i], ["download datasets", "/download-datasets", /Dataset/i], ["macro intelligence", "/macro-intelligence", /Macro/i],
    ["budget tracker", "/budget", /Budget Tracker/i], ["core inflation", "/pakistan-core-inflation", /Core/i],
  ];
  for (const [q, href, label] of cases) {
    let box = await searchBox(page); await box.fill(q); await page.waitForTimeout(500);
    const link = resultLink(page, href);
    check((await link.count()) >= 1, `search "${q}" lists ${href} for a guest`);
    if (q === "bond yields") await page.screenshot({ path: `${OUT}/search_results.png` });
    if ((await link.count()) < 1) continue;
    if (q === "download datasets") { await box.press("Enter"); } else { await link.click(); }
    await page.waitForTimeout(700);
    check(await dialogOf(page).isVisible().catch(() => false) && pathOf(page) === "/overview", `selecting it (${q === "download datasets" ? "Enter key" : "click"}) opens the login dialog and does not navigate`);
    check(label.test((await page.getByTestId("guest-modal-destination").innerText().catch(() => "")) || ""), `…naming "${q}"`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  }
  const box = await searchBox(page); await box.fill("zzzz-no-such-page"); await page.waitForTimeout(400);
  check((await page.locator('[role="listbox"] a').count()) === 0, "a query that matches nothing lists nothing");
  await box.fill("inflation"); await page.waitForTimeout(400);
  const visible = await page.locator('[role="listbox"] a').count();
  check(visible >= 1 && visible <= 8, `a broad query lists at most 8 results (${visible})`);
  const resultText = await page.locator('[role="listbox"]').innerText();
  check(resultText.length < 600 && !/\d{1,3}(\.\d+)?\s?%/.test(resultText), "search results carry only labels: no figures or page data");
  await ctx.close();
}

// ═════════ 4. GUEST: direct URLs, then login returns to the page asked for; invalid login; open-redirect attempts ═════════
{
  const ctx = await newCtx(); const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  for (const p of ["/budget?tab=sankey", "/pakistan-bond-yields", "/fed-funds-rate", "/budget/where-does-tax-money-go", "/download-datasets"]) {
    await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 240000 }); await page.waitForTimeout(900);
    const to = new URL(page.url());
    check(to.pathname === "/login" && to.searchParams.get("redirect") === p, `guest typing ${p} lands on /login with the destination kept`);
  }
  const html = await page.content();
  check(!/Sankey|auction|yield curve/i.test(html.replace(/redirect=[^"']*/g, "")), "the login page carries no content of the protected workshops");
  await page.screenshot({ path: `${OUT}/direct_url_login.png` });

  // invalid login
  await page.goto(`${BASE}/login?redirect=${encodeURIComponent("/budget?tab=sankey")}`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(MEMBER.email); await page.locator('input[name="password"]').fill("wrong-password");
  await page.locator('button[type="submit"]').click(); await page.waitForTimeout(2200);
  check(pathOf(page) === "/login" && /invalid login credentials/i.test(await page.locator("body").innerText()), "an invalid login shows an error and stays on /login");
  check((await ctx.cookies()).filter((c) => /^sb-.*-auth-token/.test(c.name)).length === 0, "…and sets no session cookie");
  check((await page.locator('input[name="email"]').count()) === 1 && /redirect=%2Fbudget%3Ftab%3Dsankey/.test(page.url()), "…and keeps the requested destination in the address");
  // valid login returns to the typed URL, query included
  await page.locator('input[name="email"]').fill(MEMBER.email); await page.locator('input[name="password"]').fill(MEMBER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => u.pathname === "/budget", { timeout: 120000, waitUntil: "commit" }); await page.waitForTimeout(1500);
  check(fullPath(page) === "/budget?tab=sankey", "a successful login returns to /budget?tab=sankey (path and query)");
  await ctx.close();

  for (const evil of ["https://evil.example/x", "//evil.example", "/\\evil.example", "javascript:alert(1)"]) {
    const c2 = await newCtx(); const p2 = await c2.newPage();
    await p2.goto(`${BASE}/login?redirect=${encodeURIComponent(evil)}`, { waitUntil: "domcontentloaded", timeout: 240000 });
    await p2.locator('input[name="email"]').fill(MEMBER.email); await p2.locator('input[name="password"]').fill(MEMBER.password);
    await p2.locator('button[type="submit"]').click();
    await p2.waitForURL((u) => u.pathname !== "/login", { timeout: 120000, waitUntil: "commit" }).catch(() => {});
    await p2.waitForTimeout(800);
    const u = new URL(p2.url());
    check(u.origin === BASE && u.pathname === "/overview", `redirect=${evil.slice(0, 22)} stays on this site, at /overview`);
    await c2.close();
  }
}

// ═════════ 5. dialog -> login -> destination; member access; search as a member; logout; guest again ═════════
{
  const ctx = await newCtx(); const { page } = await open(ctx);
  // guest picks a restored entry from the search, logs in from the dialog, and lands on it
  const box = await searchBox(page); await box.fill("tax money"); await page.waitForTimeout(500);
  await resultLink(page, "/budget/where-does-tax-money-go").click(); await page.waitForTimeout(700);
  await dialogOf(page).locator('a[data-cta="login"]').click();
  await page.waitForURL((u) => u.pathname === "/login", { timeout: 60000, waitUntil: "commit" }); await page.waitForTimeout(1200);
  check(/Tax Money/i.test((await page.getByTestId("login-required-notice").innerText().catch(() => "")) || ""), "search -> dialog -> Log in: the login page names 'Where Does the Tax Money Go?'");
  check((await page.locator("[role=dialog]").count()) === 0, "…and no dialog is left open over the sign-in form");
  await page.screenshot({ path: `${OUT}/login_from_search.png` });
  await page.locator('input[name="email"]').fill(MEMBER.email); await page.locator('input[name="password"]').fill(MEMBER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => u.pathname === "/budget/where-does-tax-money-go", { timeout: 120000, waitUntil: "commit" });
  await page.locator("h1").first().waitFor({ timeout: 120000 }); await page.waitForTimeout(1500);
  check(pathOf(page) === "/budget/where-does-tax-money-go" && !(await page.getByTestId("login-required-notice").isVisible().catch(() => false)), "after login the member lands on the page chosen in search");
  await page.screenshot({ path: `${OUT}/member_landed.png` });

  // a member's direct access, including the restored pages and an admin page
  for (const p of ["/fed-funds-rate", "/pakistan-core-inflation", "/pakistan-food-inflation", "/budget/debt-servicing-vs-defence", "/pakistan-bond-yields", "/download-datasets", "/macro-intelligence"]) {
    const r = await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 240000 });
    check(r.status() === 200 && pathOf(page) === p, `member: direct URL ${p} opens (${r.status()})`);
  }
  const adm = await page.goto(BASE + "/admin/system-health", { waitUntil: "domcontentloaded", timeout: 240000 });
  // The page calls notFound() for anyone but ADMIN_EMAIL. Next streams that, so the status line can be 200 while the body is the not-found page (as before
  // G.14): what matters is that none of the admin content is sent.
  await page.waitForTimeout(800);
  const admBody = await page.locator("body").innerText();
  check(/could not be found|404/i.test(admBody) && !/System Health|Recommendations|Internal diagnostics/i.test(admBody) && (await page.content()).includes("noindex"), `member (not the admin): /admin/system-health shows the not-found page and no admin content (status ${adm.status()}): the ADMIN_EMAIL restriction holds`);

  // as a member, a search result opens the page directly, with no dialog
  await page.goto(BASE + "/overview", { waitUntil: "domcontentloaded" }); await page.locator("h1").first().waitFor({ timeout: 120000 }); await page.waitForTimeout(1800);
  const b2 = await searchBox(page); await b2.fill("fed funds"); await page.waitForTimeout(500);
  await resultLink(page, "/fed-funds-rate").click();
  await page.waitForURL((u) => u.pathname === "/fed-funds-rate", { timeout: 120000, waitUntil: "commit" }); await page.waitForTimeout(1200);
  check(pathOf(page) === "/fed-funds-rate" && (await dialogOf(page).count()) === 0, "as a member, choosing a search result opens the page directly (no dialog)");
  check((await page.locator('header a[href^="/login"]').count()) === 0, "member: no Log in link in the header");

  // log out
  await page.goto(BASE + "/overview", { waitUntil: "domcontentloaded" }); await page.locator("h1").first().waitFor({ timeout: 120000 }); await page.waitForTimeout(1800);
  if (isMobile) {
    await page.locator('header button[aria-haspopup="dialog"]').first().click(); await page.waitForTimeout(500);
    await page.locator('[role="dialog"] button[data-cta="logout"]').first().click();
  } else {
    await page.locator('header [aria-label^="Account"]').first().click(); await page.waitForTimeout(300);
    await page.getByRole("button", { name: /Sign out/i }).first().click();
  }
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /^Log Out$/ }).last().click();
  await page.waitForTimeout(2800);
  check((await ctx.cookies()).filter((c) => /^sb-.*-auth-token/.test(c.name) && c.value).length === 0, "logout clears the session cookie");
  await page.goto(BASE + "/pakistan-bond-yields", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(900);
  check(pathOf(page) === "/login" && /redirect=%2Fpakistan-bond-yields/.test(page.url()), "after logout, Bond Yields redirects to the login page again");
  const r2 = await page.goto(BASE + "/fed-funds-rate", { waitUntil: "domcontentloaded" });
  check(pathOf(page) === "/login", "…and so does the Fed Funds Rate");
  await page.goto(BASE + "/overview", { waitUntil: "domcontentloaded" }); await page.locator("h1").first().waitFor({ timeout: 120000 }); await page.waitForTimeout(1800);
  await clickNav(page, "/budget"); await page.waitForTimeout(800);
  check(await dialogOf(page).isVisible().catch(() => false), "after logout, clicking a protected entry opens the login dialog again");
  const api = await page.request.get(BASE + "/api/datasets/sbp-policy-rate");
  check(api.status() === 401, `after logout, the datasets API answers 401 (${api.status()})`);
  void r2;
  await ctx.close();
}

// ═════════ 6. admin pages for a guest, and the open pages ═════════
{
  const ctx = await newCtx(); const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(BASE + "/admin/system-health", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(800);
  check(pathOf(page) === "/login" && /redirect=%2Fadmin%2Fsystem-health/.test(page.url()), "guest: an admin page redirects to login (and, once signed in, ADMIN_EMAIL still decides)");
  const land = await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  check(land.status() === 200 && pathOf(page) === "/", "guest: the landing page / opens (200)");
  const sm = await (await page.request.get(BASE + "/sitemap.xml")).text();
  check([...sm.matchAll(/<loc>/g)].length === 2, "the sitemap lists only the two open pages");
  await page.goto(BASE + "/overview", { waitUntil: "domcontentloaded" }); await page.locator("h1").first().waitFor({ timeout: 120000 });
  const kb = await page.evaluate(async () => { const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "What is inflation?", context: {}, history: [] }) }); const j = await r.json(); return [r.status, j.modelUsed]; });
  check(kb[0] === 200 && kb[1] === "knowledge-base", `the assistant still answers a guest on the Overview through its guard (${kb.join(" ")})`);
  await ctx.close();
}

// ═════════ 7. account lifecycle against the mock: sign-up -> confirmation link, password reset, session persistence ═════════
// The mock stands in for Supabase Auth, so these prove the APP's side of each flow (cookies, destinations, validation, refusal of bad codes). They do not prove the
// real Supabase project's settings or the delivery of real e-mails: see README "Manual release tests".
const MOCK_BASE = `http://127.0.0.1:${process.env.PEIC_E2E_MOCK_PORT ?? "54329"}`;
const sessionCookies = async (ctx) => (await ctx.cookies()).filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name) && c.value);
const verifierCookies = async (ctx) => (await ctx.cookies()).filter((c) => /code-verifier/.test(c.name));
const notes = [];
async function fillSubmit(page, fields) {
  for (const [name, value] of Object.entries(fields)) await page.locator(`input[name="${name}"]`).fill(value);
  await page.locator('button[type="submit"]').click();
}
async function requestResetEmail(ctx, email = "member@peic.test") {
  const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "domcontentloaded", timeout: 240000 }); await page.waitForTimeout(1200);
  await fillSubmit(page, { email });
  await page.getByText(/reset link is on its way/i).waitFor({ timeout: 30000 }).catch(() => {});
  return page;
}
{ // 7a. sign-up (confirmation required): redirect to login with the notice, the destination remembered, the link then signs in and lands on the destination
  const ctx = await newCtx(); const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/signup?redirect=${encodeURIComponent("/pakistan-bond-yields")}`, { waitUntil: "domcontentloaded", timeout: 240000 }); await page.waitForTimeout(1200);
  await fillSubmit(page, { email: "new@peic.test", password: "a-long-password-1", confirmPassword: "a-long-password-1" });
  await page.waitForURL((u) => u.pathname === "/login", { timeout: 60000, waitUntil: "commit" }); await page.waitForTimeout(1500);
  check(fullPath(page) === "/login?confirm=1&redirect=%2Fpakistan-bond-yields", "sign-up: redirects to /login?confirm=1 and keeps the requested destination");
  check(/check your email/i.test(await page.locator("body").innerText()), "sign-up: the login page tells the new member to confirm by e-mail");
  const after = (await ctx.cookies()).find((c) => c.name === "peic_after_auth");
  check(!!after && decodeURIComponent(after.value) === "/pakistan-bond-yields" && after.httpOnly === true && after.sameSite === "Lax", "sign-up: the destination is remembered in an httpOnly, SameSite=Lax cookie");
  check((await sessionCookies(ctx)).length === 0, "sign-up: no session exists before the e-mail is confirmed");
  check((await verifierCookies(ctx)).length >= 1, "sign-up: the PKCE code-verifier cookie is set (the confirmation link can only be completed in this browser)");
  // the confirmation e-mail link
  await page.goto(`${BASE}/auth/callback?code=mock-valid-code`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForURL((u) => u.pathname === "/pakistan-bond-yields", { timeout: 120000, waitUntil: "commit" }); await page.locator("h1").first().waitFor({ timeout: 120000 }).catch(() => {}); await page.waitForTimeout(1200);
  check(pathOf(page) === "/pakistan-bond-yields" && (await sessionCookies(ctx)).length >= 1, "confirmation link: signs the new member in and lands on the page originally requested");
  check(!(await ctx.cookies()).some((c) => c.name === "peic_after_auth"), "…and the remembered-destination cookie is used up (deleted)");
  const rec = await (await fetch(`${MOCK_BASE}/__mock/redirects`)).json();
  check(rec.some((r) => r.flow === "signup" && r.redirect_to === `${BASE}/auth/callback`), "sign-up asks Supabase to redirect the confirmation link to <site>/auth/callback (exact URL for the allow-list)");
  await ctx.close();
}
{ // 7b. the same link opened in ANOTHER browser (no code-verifier cookie), and a wrong code
  const ctx = await newCtx(); const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/callback?code=mock-valid-code`, { waitUntil: "domcontentloaded", timeout: 240000 }); await page.waitForTimeout(1500);
  check(pathOf(page) === "/login" && /error=auth-callback-failed/.test(page.url()), "confirmation link opened in another browser: sent to /login?error=auth-callback-failed");
  check((await sessionCookies(ctx)).length === 0 && (await page.locator('input[name="email"]').isEnabled()), "…without a session, and the login form is usable");
  const failedNotice = page.getByTestId("login-notice-callback-failed");
  check(await failedNotice.isVisible().catch(() => false) && /invalid, has expired, or was opened in a different browser/i.test((await failedNotice.innerText().catch(() => "")) || ""), "…and the login page explains it: the link is invalid, expired or was opened in a different browser");
  check(!/auth-callback-failed|invalid flow state|code_verifier|pkce/i.test((await failedNotice.innerText().catch(() => "")) || ""), "…without exposing the error code or any authentication detail");
  await page.screenshot({ path: `${OUT}/callback_failed_notice.png` });
  // only the exact value the app sends produces the message; other text in the query does nothing
  await page.goto(`${BASE}/login?error=%3Cscript%3Ealert(1)%3C%2Fscript%3E&reset=yes`, { waitUntil: "domcontentloaded", timeout: 240000 }); await page.waitForTimeout(1000);
  check((await page.locator('[data-testid^="login-notice-"]').count()) === 0 && !(await page.content()).includes("<script>alert(1)"), "an arbitrary error or reset value shows no notice and is never echoed into the page");
  await ctx.close();
  const c2 = await newCtx(); const rp = await requestResetEmail(c2);
  await rp.goto(`${BASE}/auth/callback?code=wrong-code&next=/reset-password`, { waitUntil: "domcontentloaded", timeout: 240000 }); await rp.waitForTimeout(1500);
  check(pathOf(rp) === "/login" && /error=auth-callback-failed/.test(rp.url()) && (await sessionCookies(c2)).length === 0, "a wrong or used code is refused (login with error, no session)");
  await c2.close();
}
{ // 7c. password reset: request, link, mismatch, success, signed in afterwards
  const ctx = await newCtx(); const page = await requestResetEmail(ctx);
  check(await page.getByText(/reset link is on its way/i).isVisible().catch(() => false), "forgot password: shows the neutral 'a link is on its way' message");
  const rec = await (await fetch(`${MOCK_BASE}/__mock/redirects`)).json();
  check(rec.some((r) => r.flow === "recover" && r.redirect_to === `${BASE}/auth/callback?next=/reset-password`), "forgot password asks Supabase to redirect the reset link to <site>/auth/callback?next=/reset-password (exact URL for the allow-list)");
  check((await verifierCookies(ctx)).length >= 1, "forgot password: the PKCE code-verifier cookie is set");
  await page.goto(`${BASE}/auth/callback?code=mock-valid-code&next=/reset-password`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForURL((u) => u.pathname === "/reset-password", { timeout: 120000, waitUntil: "commit" }); await page.waitForTimeout(1500);
  check(pathOf(page) === "/reset-password" && (await sessionCookies(ctx)).length >= 1, "reset link: lands on /reset-password with a (recovery) session");
  await fillSubmit(page, { password: "new-password-123", confirmPassword: "different-pass-456" }); await page.waitForTimeout(1500);
  check(pathOf(page) === "/reset-password" && /do not match/i.test(await page.locator("body").innerText()), "reset: mismatched passwords are refused with a message");
  await fillSubmit(page, { password: "new-password-123", confirmPassword: "new-password-123" });
  await page.waitForURL((u) => u.pathname !== "/reset-password", { timeout: 60000, waitUntil: "commit" }); await page.waitForTimeout(2500);
  check(fullPath(page) === "/login?reset=1", "reset: a valid new password is accepted and the member is taken to /login?reset=1");
  const updated = page.getByTestId("login-notice-password-updated");
  check(await updated.isVisible().catch(() => false) && /password has been updated/i.test((await updated.innerText().catch(() => "")) || ""), "…where a confirmation says the password has been updated");
  await page.screenshot({ path: `${OUT}/password_updated_notice.png` });
  check((await sessionCookies(ctx)).length === 0, "…and the reset session has ended (no session cookie): the member logs in with the new password");
  await page.goto(`${BASE}/budget`, { waitUntil: "domcontentloaded", timeout: 240000 }); await page.waitForTimeout(800);
  check(pathOf(page) === "/login" && /redirect=%2Fbudget/.test(page.url()), "…and a protected page asks for that login (with the destination)");
  await ctx.close();
  const c2 = await newCtx(); const p2 = await c2.newPage();
  await p2.goto(`${BASE}/reset-password`, { waitUntil: "domcontentloaded", timeout: 240000 }); await p2.waitForTimeout(1200);
  await fillSubmit(p2, { password: "new-password-123", confirmPassword: "new-password-123" }); await p2.waitForTimeout(2000);
  check(pathOf(p2) === "/reset-password" && /session missing|not authenticated|sign in|expired/i.test(await p2.locator("body").innerText()), "reset page without a reset session: refused (the password cannot be changed by a guest)");
  await c2.close();
}
for (const evil of ["https://evil.example/x", "//evil.example", "/\\evil.example"]) { // 7d. the callback's own destination guard
  const ctx = await newCtx(); const page = await requestResetEmail(ctx);
  await page.goto(`${BASE}/auth/callback?code=mock-valid-code&next=${encodeURIComponent(evil)}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForURL((u) => u.origin === BASE && u.pathname !== "/auth/callback", { timeout: 120000, waitUntil: "commit" }).catch(() => {}); await page.waitForTimeout(1500);
  check(new URL(page.url()).origin === BASE && pathOf(page) === "/overview", `callback next=${evil.slice(0, 22)} stays on this site, at /overview`);
  await ctx.close();
}
{ // 7e. session persistence
  const ctx = await newCtx(); const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 240000 }); await page.waitForTimeout(1200);
  await fillSubmit(page, { email: MEMBER.email, password: MEMBER.password, });
  await page.waitForURL((u) => u.pathname !== "/login", { timeout: 120000, waitUntil: "commit" }); await page.waitForTimeout(1500);
  const sc = await sessionCookies(ctx);
  const longLived = sc.length > 0 && sc.every((c) => c.expires > Date.now() / 1000 + 30 * 86400);
  check(longLived, "the session cookie outlives the browser session (expires in more than 30 days)");
  check(sc.every((c) => c.sameSite === "Lax" && c.path === "/"), "the session cookie is SameSite=Lax, path /");
  notes.push(`NOTE: session cookie attributes in this run: httpOnly=${sc[0]?.httpOnly}, secure=${sc[0]?.secure} (http://localhost), sameSite=${sc[0]?.sameSite}.`);
  await page.close();
  const again = await ctx.newPage(); const r = await again.goto(`${BASE}/download-datasets`, { waitUntil: "domcontentloaded", timeout: 240000 });
  check(r.status() === 200 && new URL(again.url()).pathname === "/download-datasets", "a new tab in the same browser is still signed in");
  await ctx.close();
}
notes.forEach((n) => console.log(n));

check(errors.length === 0, `no uncaught page errors (${errors.length})${errors[0] ? ": " + errors[0] : ""}`);
console.log(`\nSUMMARY ${kind} ${w}x${h} ${scheme}: ${ok} passed, ${bad.length} failed`); bad.forEach((b) => console.log("  FAIL:", b));
console.log(`screenshots: ${OUT}`);
await browser.close();
process.exit(bad.length ? 1 : 0);
