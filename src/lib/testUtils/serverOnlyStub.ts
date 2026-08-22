// Test-only stub for the "server-only" package, which isn't installed in
// this repo's node_modules (see feedback in prior phases — ingestionWatchdog.ts
// and sbpCanonicalStore.ts avoid the tag entirely for this exact reason).
// comparisonData.ts genuinely needs the real tag in production (it's the
// build-time guard against leaking SBP credentials into a client bundle,
// enforced by Next.js's own bundler) — this stub only lets Vitest's Node
// environment resolve the bare "server-only" import; it has no effect on the
// real Next.js build, which resolves the actual "server-only" package.
export {};
