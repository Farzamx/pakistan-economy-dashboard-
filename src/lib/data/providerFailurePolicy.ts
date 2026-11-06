// What the Inflation page does when a required external provider fails.
//
// THE PROBLEM THIS SOLVES
// The page reads PBS's CPI file and the World Bank while it renders. It used to
// catch every failure and render a page with "unavailable" sections. That is
// right while BUILDING, but wrong while REGENERATING in production: a render that
// completes is a success, so Next replaces the last good page with the degraded
// one for the whole revalidation window. Next's documented behaviour is that if
// regeneration THROWS, the last successfully generated page keeps being served
// and the next request retries (docs: Incremental Static Regeneration → "Error
// handling and revalidation").
//
// THE POLICY
//   build / dev server  -> "degrade": render the labelled unavailable states, so
//                          a transient outage can neither fail a deploy nor
//                          break local development (there is no earlier page to
//                          protect in either).
//   everything else     -> "throw":   refuse to render, so ISR keeps the last
//                          good page.
//
// "Everything else" is deliberate. Only the two phases listed above are
// recognised as safe to degrade in; a missing, unknown or future phase value
// falls through to "throw", so an environment that does not set the variable the
// way we expect fails SAFE (an older page stays up) and never fails open (a
// degraded page replaces a good one).
//
// HOW BUILD IS DETECTED
// NEXT_PHASE compared with PHASE_PRODUCTION_BUILD from "next/constants". Next
// assigns it before spawning the static-generation workers (next/dist/build/
// index.js) and exports the constants as public API (they are what next.config
// functions and adapters receive). The page-level test in
// inflationFailurePolicy.test.ts pins both branches; the build itself was also
// run with a deliberately failing provider to confirm the workers see the value.
//
// This file contains policy only: no fetching, no page knowledge.

import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";
import type { ProviderFailure } from "@/lib/inflation/providerHealth";

export type FailureMode = "degrade" | "throw";

/** The mode for a given Next phase. Defaults to the current process's phase. */
export function failureModeFor(phase: string | undefined = process.env.NEXT_PHASE): FailureMode {
  return phase === PHASE_PRODUCTION_BUILD || phase === PHASE_DEVELOPMENT_SERVER ? "degrade" : "throw";
}

/**
 * Thrown when a required provider failed and the page must not be regenerated.
 * The message names the providers and reasons so the platform's error log
 * explains why the previous page is still being served.
 */
export class ProviderUnavailableError extends Error {
  readonly failures: readonly ProviderFailure[];

  constructor(failures: readonly ProviderFailure[]) {
    super(`Inflation page not regenerated; keeping the last good page. ${failures.map((f) => `${f.provider}: ${f.reason}`).join(" | ")}`);
    this.name = "ProviderUnavailableError";
    this.failures = failures;
  }
}

/**
 * Applies the policy to a set of failures. Returns normally when there are none,
 * or when the mode is "degrade" (the caller then renders its unavailable
 * states); throws ProviderUnavailableError otherwise.
 */
export function enforceProviderPolicy(failures: readonly ProviderFailure[], mode: FailureMode = failureModeFor()): void {
  if (failures.length === 0) return;
  if (mode === "degrade") return;
  throw new ProviderUnavailableError(failures);
}
