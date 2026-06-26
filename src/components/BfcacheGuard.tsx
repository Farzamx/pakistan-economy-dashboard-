"use client";

import { useEffect } from "react";

// This app has no service worker and Next's own asset versioning is sound
// (content-hashed, immutable chunk URLs) — confirmed during the "This page
// couldn't load" / "back shows an older version" investigation. The actual
// cause is the browser's native back-forward cache: proxy.ts and the
// login/signup Server Actions all do full, server-side redirects (not
// client-side navigation), and each one is a real page load the browser
// can freeze into bfcache. Pressing Back can restore that exact frozen
// snapshot — stale auth state and all — without ever re-running
// AuthProvider's effects, since nothing unmounted or changed pathname from
// React's perspective.
//
// The `pageshow` event's `persisted` flag is true only when the page was
// just restored from bfcache (never on a normal load), so this only forces
// a reload in exactly that case — ordinary navigation and ordinary Back
// presses that don't hit bfcache are completely unaffected.
export default function BfcacheGuard() {
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
