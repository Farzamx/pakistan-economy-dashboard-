// What Google Analytics may learn about the page a visitor is on: the origin and the path, nothing else.
//
// Why: query strings can carry secrets. The e-mail unsubscribe link is /subscriptions/manage?token=<unsubscribe token>; a guest who follows it is sent to
// /login?redirect=%2Fsubscriptions%2Fmanage%3Ftoken%3D...; password-reset and sign-in flows carry codes and messages. GA4's automatic page view reports the
// full URL (page_location) and the full referrer (page_referrer; same-origin referrers include the query), so every query string and fragment is removed
// before anything is sent. Campaign (utm_*) parameters are removed too: they are not secret, but an allow-list of "safe" parameters is one edit away from
// leaking a secret one, and organic-search attribution does not need them (it uses the referrer's origin).

/** origin + pathname of an absolute URL; "" for anything that is not an http(s) URL (an empty referrer stays empty). */
export function analyticsUrl(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return `${u.origin}${u.pathname}`;
  } catch {
    return "";
  }
}

/** A path without its query string or fragment ("/a/b?x=1#y" -> "/a/b"). */
export function analyticsPath(raw: string | null | undefined): string {
  if (!raw) return "";
  const cut = raw.search(/[?#]/);
  return cut === -1 ? raw : raw.slice(0, cut);
}

/**
 * The wire-level guard, installed before gtag.js loads. Setting page_location is NOT enough on its own: GA4's enhanced measurement ("page changes based on
 * browser history events", a property setting that is on in Production) sends its own page_view on every pushState/replaceState, reading the full URL
 * itself (dl) and the previous full URL (dr), so a query string or token reached Google even with page_location overridden (verified in a browser against
 * the Production container with every hit aborted, 27 Nov 2026). This wraps the four ways gtag.js sends a hit (sendBeacon, fetch, XHR, image) and, for
 * Google collection requests only (host google-analytics.com / analytics.google.com / google.com / doubleclick.net, path ending in /collect), cuts `dl`,
 * `dr` and any value that is a URL on this site at its first "?" or "#". A collection request whose body cannot be read synchronously is dropped rather
 * than sent unchecked. Every other request passes through untouched, and any failure here leaves the page working. Plain ES5.
 */
export const GA_TRANSPORT_FILTER = `(function () {
  try {
    var O = location.origin;
    var isHit = function (u) {
      var m = /^https:\\/\\/([^\\/?#]+)(\\/[^?#]*)/.exec(String(u));
      return !!m && /(^|\\.)(google-analytics\\.com|analytics\\.google\\.com|google\\.com|doubleclick\\.net)$/i.test(m[1]) && /\\/collect$/.test(m[2]);
    };
    var cut = function (v) { var i = v.search(/[?#]/); return i < 0 ? v : v.slice(0, i); };
    var cleanParams = function (qs) {
      return qs.split('&').map(function (kv) {
        var j = kv.indexOf('='); if (j < 1) return kv;
        var k = kv.slice(0, j), v;
        try { v = decodeURIComponent(kv.slice(j + 1).replace(/\\+/g, ' ')); } catch (e) { return k + '='; }
        if (k === 'dl' || k === 'dr' || v.indexOf(O) === 0) return k + '=' + encodeURIComponent(cut(v));
        return kv;
      }).join('&');
    };
    var cleanUrl = function (u) { u = String(u); var i = u.indexOf('?'); return i < 0 ? u : u.slice(0, i + 1) + cleanParams(u.slice(i + 1)); };
    var cleanBody = function (b) { return String(b).split('\\n').map(cleanParams).join('\\n'); };
    var nav = window.navigator;
    if (nav && typeof nav.sendBeacon === 'function') {
      var sb = nav.sendBeacon;
      nav.sendBeacon = function (u, d) {
        if (!isHit(u)) return sb.apply(nav, arguments);
        if (d != null && typeof d !== 'string') return true;
        return sb.call(nav, cleanUrl(u), d == null ? d : cleanBody(d));
      };
    }
    if (typeof window.fetch === 'function') {
      var f = window.fetch;
      window.fetch = function (input, init) {
        var u = typeof input === 'string' ? input : (input && typeof input.href === 'string' ? input.href : input && input.url);
        if (!u || !isHit(u)) return f.apply(window, arguments);
        var drop = function () { return Promise.resolve(new Response(null, { status: 204 })); };
        if (typeof input !== 'string' && typeof input.href !== 'string') return drop();
        var o = {}; if (init) for (var k in init) o[k] = init[k];
        if (o.body != null) { if (typeof o.body !== 'string') return drop(); o.body = cleanBody(o.body); }
        return f.call(window, cleanUrl(u), o);
      };
    }
    if (window.XMLHttpRequest) {
      var XP = window.XMLHttpRequest.prototype, xo = XP.open, xs = XP.send;
      XP.open = function (m, u) {
        this.__peicHit = isHit(u);
        if (!this.__peicHit) return xo.apply(this, arguments);
        var a = Array.prototype.slice.call(arguments); a[1] = cleanUrl(u); return xo.apply(this, a);
      };
      XP.send = function (b) {
        if (!this.__peicHit || b == null) return xs.apply(this, arguments);
        if (typeof b !== 'string') { try { this.abort(); } catch (e) {} return; }
        return xs.call(this, cleanBody(b));
      };
    }
    if (window.HTMLImageElement) {
      var IP = window.HTMLImageElement.prototype, d = Object.getOwnPropertyDescriptor(IP, 'src');
      if (d && d.set) Object.defineProperty(IP, 'src', { configurable: true, enumerable: d.enumerable, get: d.get, set: function (v) { d.set.call(this, isHit(v) ? cleanUrl(v) : v); } });
    }
  } catch (e) {}
})();`;

/**
 * The inline bootstrap that runs before gtag.js loads: the wire-level guard above, then the GA queue. It never reads location.href, location.search or
 * location.hash: only origin + pathname. `send_page_view: false` turns off GA's automatic page view (which would use the full URL); the app sends its own
 * page views with sanitised fields (PrivacyGoogleAnalytics.tsx).
 */
export function gaBootstrapScript(measurementId: string): string {
  if (!/^G-[A-Z0-9]{4,16}$/.test(measurementId)) throw new Error("invalid GA4 measurement ID");
  return [
    GA_TRANSPORT_FILTER,
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag = gtag;",
    "var __peicLoc = location.origin + location.pathname;",
    "var __peicRef = '';",
    "try { if (document.referrer) { var __r = new URL(document.referrer); if (__r.protocol === 'http:' || __r.protocol === 'https:') __peicRef = __r.origin + __r.pathname; } } catch (e) {}",
    "gtag('js', new Date());",
    "gtag('set', { page_location: __peicLoc, page_referrer: __peicRef });",
    `gtag('config', '${measurementId}', { send_page_view: false, page_location: __peicLoc, page_referrer: __peicRef });`,
    // The first page view of the visit, with the sanitised fields (later in-app navigations are sent by PrivacyGoogleAnalytics).
    "gtag('event', 'page_view', { page_location: __peicLoc, page_referrer: __peicRef, page_title: document.title });",
  ].join("\n");
}
