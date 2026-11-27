// Proof that query strings and fragments (and so the unsubscribe token) are never handed to Google Analytics.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { GA_TRANSPORT_FILTER, analyticsPath, analyticsUrl, gaBootstrapScript } from "./pageLocation";
import { sanitize } from "./events";

const TOKEN = "unsub-7f3c9a1e-SECRET";
const MANAGE = `https://www.pakeconintel.com/subscriptions/manage?token=${TOKEN}#frag`;
const LOGIN = `https://www.pakeconintel.com/login?redirect=${encodeURIComponent(`/subscriptions/manage?token=${TOKEN}`)}`;

describe("analyticsUrl / analyticsPath", () => {
  it("keep origin and path only", () => {
    expect(analyticsUrl(MANAGE)).toBe("https://www.pakeconintel.com/subscriptions/manage");
    expect(analyticsUrl(LOGIN)).toBe("https://www.pakeconintel.com/login");
    expect(analyticsUrl("https://www.pakeconintel.com/reset-password?code=abc&type=recovery")).toBe("https://www.pakeconintel.com/reset-password");
    expect(analyticsUrl("https://www.google.com/")).toBe("https://www.google.com/");
    expect(analyticsPath(`/subscriptions/manage?token=${TOKEN}`)).toBe("/subscriptions/manage");
    expect(analyticsPath("/a#b")).toBe("/a");
    expect(analyticsPath("/plain")).toBe("/plain");
  });

  it("return nothing for empty, malformed or non-web values", () => {
    for (const v of [undefined, null, "", "not a url", "javascript:alert(1)", "data:text/plain,x"]) expect(analyticsUrl(v)).toBe("");
  });
});

describe("the GA bootstrap script", () => {
  it("rejects anything that is not a GA4 measurement ID (it is inlined into a script)", () => {
    expect(() => gaBootstrapScript("G-ABC123")).not.toThrow();
    for (const bad of ["", "UA-123-1", "G-abc", "G-ABC'); alert(1); ('", "G-" + "A".repeat(30)]) expect(() => gaBootstrapScript(bad), bad).toThrow();
  });

  it("never reads the full URL, the query or the fragment, and turns off GA's automatic page view", () => {
    const s = gaBootstrapScript("G-ABC123");
    expect(s).not.toMatch(/location\.href|location\.search|location\.hash|document\.location|document\.URL/);
    expect(s).toMatch(/send_page_view: false/);
  });

  it.each([
    ["the unsubscribe page", MANAGE, "https://www.pakeconintel.com/overview?x=1"],
    ["the login redirect", LOGIN, MANAGE],
  ])("run on %s with a token in the URL and the referrer, puts no token, query or fragment into GA's queue", (_, href, referrer) => {
    const url = new URL(href);
    const sandbox: Record<string, unknown> = {
      URL,
      Date,
      location: { href, origin: url.origin, pathname: url.pathname, search: url.search, hash: url.hash },
      document: { referrer, title: "Manage subscription" },
    };
    sandbox.window = sandbox;
    vm.runInNewContext(gaBootstrapScript("G-ABC123"), sandbox);
    const queue = JSON.stringify((sandbox.dataLayer as IArguments[]).map((a) => Array.from(a)));
    expect(queue).not.toContain(TOKEN);
    expect(queue).not.toContain(encodeURIComponent(TOKEN));
    expect(queue).not.toMatch(/\?|#/);
    expect(queue).toContain(`"page_location":"${url.origin}${url.pathname}"`);
    // the first page view is sent with the sanitised fields
    expect(queue).toMatch(/"event","page_view",\{"page_location":"https:\/\/www\.pakeconintel\.com\/(subscriptions\/manage|login)"/);
  });
});

describe("the wire-level guard (GA_TRANSPORT_FILTER): GA's own history-change page views cannot carry the query either", () => {
  // What gtag.js really sent from the Production container on a replaceState (captured in a browser with the request aborted), with a token added.
  const ORIGIN = "https://www.pakeconintel.com";
  const leakyQs = `v=2&tid=G-ABC123&en=page_view&dl=${encodeURIComponent(`${ORIGIN}/overview?q=abc&token=${TOKEN}#x`)}&dr=${encodeURIComponent(MANAGE)}&dt=Overview&ep.link=${encodeURIComponent(`${ORIGIN}/login?redirect=x`)}&ep.other=${encodeURIComponent("https://example.com/?keep=1")}`;
  const HIT = `https://region1.google-analytics.com/g/collect?${leakyQs}`;
  const BODY = `en=page_view&dl=${encodeURIComponent(LOGIN)}\nen=scroll&dr=${encodeURIComponent(MANAGE)}`;

  function install() {
    const sent: { via: string; url: string; body?: unknown }[] = [];
    class FakeXhr {
      url = "";
      open(_m: string, u: string) { this.url = u; }
      send(b?: unknown) { sent.push({ via: "xhr", url: this.url, body: b }); }
      abort() { sent.push({ via: "xhr-aborted", url: this.url }); }
    }
    class FakeImg {}
    Object.defineProperty(FakeImg.prototype, "src", { configurable: true, get() { return ""; }, set(v: string) { sent.push({ via: "img", url: v }); } });
    const sandbox: Record<string, unknown> = {
      URL, Promise, Object, Array, String, decodeURIComponent, encodeURIComponent,
      Response: class { constructor(public body: unknown, public init: unknown) {} },
      location: { origin: ORIGIN, pathname: "/overview" },
      navigator: { sendBeacon: (url: string, body?: unknown) => { sent.push({ via: "beacon", url, body }); return true; } },
      fetch: (url: string, init?: { body?: unknown }) => { sent.push({ via: "fetch", url: String(url), body: init?.body }); return Promise.resolve("sent"); },
      XMLHttpRequest: FakeXhr,
      HTMLImageElement: FakeImg,
    };
    sandbox.window = sandbox;
    vm.runInNewContext(GA_TRANSPORT_FILTER, sandbox);
    return { w: sandbox as Record<string, any>, sent }; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  const clean = (s: string) => {
    const d = decodeURIComponent(s);
    expect(d).not.toContain(TOKEN);
    expect(d).not.toMatch(/q=abc|redirect=|#x|#frag/);
  };

  it("cuts dl, dr and own-site URL values at ? or # on every transport, and keeps everything else", async () => {
    const { w, sent } = install();
    w.navigator.sendBeacon(HIT, BODY);
    await w.fetch(HIT, { method: "POST", body: BODY, keepalive: true });
    const x = new w.XMLHttpRequest(); x.open("POST", HIT); x.send(BODY);
    new w.HTMLImageElement().src = HIT;
    expect(sent.map((s) => s.via)).toEqual(["beacon", "fetch", "xhr", "img"]);
    for (const s of sent) {
      clean(s.url);
      if (s.body !== undefined) clean(String(s.body));
      const q = new URL(s.url).searchParams;
      expect(q.get("dl")).toBe(`${ORIGIN}/overview`);
      expect(q.get("dr")).toBe(`${ORIGIN}/subscriptions/manage`);
      expect(q.get("ep.link")).toBe(`${ORIGIN}/login`);
      expect(q.get("ep.other")).toBe("https://example.com/?keep=1"); // not this site: untouched
      expect(q.get("tid")).toBe("G-ABC123");
      expect(q.get("dt")).toBe("Overview");
    }
    expect(String(sent[0].body)).toBe(`en=page_view&dl=${encodeURIComponent(`${ORIGIN}/login`)}\nen=scroll&dr=${encodeURIComponent(`${ORIGIN}/subscriptions/manage`)}`);
  });

  it("covers every Google collection host, and drops a hit whose body it cannot read rather than send it unchecked", async () => {
    const { w, sent } = install();
    for (const host of ["www.google-analytics.com", "analytics.google.com", "www.google.com", "stats.g.doubleclick.net"]) w.navigator.sendBeacon(`https://${host}/g/collect?${leakyQs}`);
    expect(sent).toHaveLength(4);
    for (const s of sent) clean(s.url);
    expect(w.navigator.sendBeacon(HIT, { blob: true })).toBe(true);
    await w.fetch(HIT, { body: { blob: true } });
    const x = new w.XMLHttpRequest(); x.open("POST", HIT); x.send({ blob: true });
    expect(sent.slice(4).map((s) => s.via)).toEqual(["xhr-aborted"]);
  });

  it("leaves every other request exactly as it was", async () => {
    const { w, sent } = install();
    const own = `${ORIGIN}/api/x?token=${TOKEN}`;
    w.navigator.sendBeacon(own, "a=1?b");
    await w.fetch(own, { body: "a=1?b" });
    await w.fetch("https://www.googletagmanager.com/gtag/js?id=G-ABC123");
    const x = new w.XMLHttpRequest(); x.open("GET", "https://evil-google.com.example/g/collect?dl=" + encodeURIComponent(MANAGE)); x.send();
    expect(sent.map((s) => s.url)).toEqual([own, own, "https://www.googletagmanager.com/gtag/js?id=G-ABC123", "https://evil-google.com.example/g/collect?dl=" + encodeURIComponent(MANAGE)]);
    expect(sent[0].body).toBe("a=1?b");
  });

  it("is the first thing the bootstrap runs, before gtag.js can load", () => {
    expect(gaBootstrapScript("G-ABC123").startsWith(GA_TRANSPORT_FILTER)).toBe(true);
  });
});

describe("custom event parameters", () => {
  it("path parameters lose their query string and fragment", () => {
    expect(sanitize("internal_nav", { block: "related", from_path: `/subscriptions/manage?token=${TOKEN}`, to_path: "/overview#home-indicators" })).toEqual({
      block: "related",
      from_path: "/subscriptions/manage",
      to_path: "/overview",
    });
    expect(sanitize("csv_download", { file: "x.csv", page_path: `/login?redirect=${encodeURIComponent(`/subscriptions/manage?token=${TOKEN}`)}` }).page_path).toBe("/login");
  });
});

describe("wiring", () => {
  const read = (p: string) => fs.readFileSync(path.resolve(p), "utf8");

  it("the app uses the privacy wrapper, and nothing else loads GA or sends to it directly", () => {
    expect(read("src/components/AppShell.tsx")).toMatch(/<PrivacyGoogleAnalytics measurementId=\{GA_MEASUREMENT_ID\} \/>/);
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.ts$/.test(e.name)) files.push(p);
      }
    };
    walk(path.resolve("src"));
    const offenders = files.filter((f) => /@next\/third-parties\/google|sendGAEvent|googletagmanager\.com\/gtag/.test(fs.readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(process.cwd(), f).replace(/\\/g, "/"))).toEqual(["src/components/PrivacyGoogleAnalytics.tsx"]);
  });

  it("the route-change page views use the sanitiser and never read the query or fragment", () => {
    const src = read("src/components/PrivacyGoogleAnalytics.tsx");
    expect(src).toMatch(/analyticsUrl\(window\.location\.href\)/);
    expect(src).not.toMatch(/location\.search|location\.hash|useSearchParams/);
  });
});
