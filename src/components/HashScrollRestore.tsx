"use client";

import { useEffect } from "react";

// loading.tsx shows an immediate fallback during a route transition so a
// sidebar click never sits frozen for as long as this page's data takes to
// fetch (see src/app/loading.tsx). The tradeoff: Next.js's own hash-scroll
// logic resolves the URL hash against whatever's mounted at the moment the
// Suspense boundary first settles — which, with a loading.tsx in place, is
// the fallback skeleton, not the real page. The fallback has no matching
// id, so Next never scrolls and never retries once the real content
// streams in. This runs once the *real* page mounts and finishes the job
// Next didn't: scroll to the section the user actually clicked.
export default function HashScrollRestore() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return null;
}
