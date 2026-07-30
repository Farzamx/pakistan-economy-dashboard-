import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The homepage's Server Component (src/app/page.tsx) does extensive
  // build-time data aggregation — ~17 live SBP indicator fetches, a news
  // aggregation pass, two OpenRouter AI-narrative calls (2-5s latency
  // each), and a 12-source global markets/FX freshness audit. On Vercel's
  // constrained single-worker build machine this occasionally exceeds
  // Next's default 60s staticPageGenerationTimeout. When that happens,
  // Next's export worker (node_modules/next/dist/export/worker.js) races
  // the page render against a timeout via Promise.race and retries on
  // timeout — but Promise.race never cancels the losing (timed-out)
  // render, so the abandoned attempt keeps running in the background and
  // can later write its page output artifacts on top of the retried
  // attempt's, unsynchronized. That produces a corrupted JSON file (valid
  // JSON followed by leftover bytes from the other write), which crashes
  // the build during "Finalizing page optimization" with
  // "SyntaxError: Unexpected non-whitespace character after JSON" —
  // confirmed against a real failed Vercel deployment log showing
  // "Failed to build /page: / (attempt 1 of 3) because it took more than
  // 60 seconds. Retrying again shortly." immediately before the crash.
  // Raising the timeout well above the observed worst case (~100s) keeps
  // the homepage inside its single, uninterrupted render attempt, so the
  // retry path — and the race it triggers — is never entered.
  staticPageGenerationTimeout: 180,
  // The Personal Inflation Calculator moved into the Decision Support Lab
  // (PEIC v4 Phase 1) — permanent redirect so any existing bookmark/share
  // link to its original standalone route still resolves.
  async redirects() {
    return [
      {
        source: "/tools/personal-inflation",
        destination: "/decision-support-lab/personal-inflation",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
