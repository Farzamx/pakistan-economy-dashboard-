// What counts as a FAILURE of the two external providers the Inflation page
// depends on at render time (PBS's CPI file and the World Bank).
//
// Pure, so every rule is unit-tested. The page's data loader calls this once,
// after both providers have answered, and hands the result to the failure
// policy (providerFailurePolicy.ts), which decides between rendering the
// labelled "unavailable" state (build) and refusing to render (runtime).
//
// A provider that ANSWERED BUT IS UNUSABLE is a failure exactly like one that
// did not answer. The rules deliberately err toward "failure", because the cost
// of a false alarm at runtime is only that the previous page stays up a little
// longer, whereas the cost of a false pass is a thinner page replacing a full
// one:
//   - PBS: the file must have parsed AND passed every integrity check (12
//     groups, one month set, constant weights, Laspeyres identity) AND hold
//     enough months to decompose year-on-year. A file truncated to a few months
//     is internally consistent but would silently shrink the analytics.
//   - World Bank: the response must parse AND contain every country the page
//     compares. A response that drops one country would turn a four-country
//     comparison into a three-country one without saying so.

export interface ProviderFailure {
  /** Plain name of the provider, safe to log and show. */
  provider: "PBS CPI file" | "World Bank";
  /** Why, in words. Never contains a URL with credentials (neither provider uses any). */
  reason: string;
}

export interface ProviderHealthInput {
  /** Did the PBS file parse and pass every integrity check? */
  panelLoaded: boolean;
  /** The parser's own explanation when it did not. */
  panelIssues: readonly string[];
  /** Did the group model build, i.e. is there at least one full year-on-year decomposition? */
  groupsBuilt: boolean;
  /** The parsed World Bank response, or null. */
  intl: { series: Record<string, readonly { year: number; value: number | null }[]> } | null;
  /** Country codes the page compares; each must have at least one real value. */
  expectedCountries: readonly string[];
}

export function evaluateRequiredProviders(input: ProviderHealthInput): ProviderFailure[] {
  const failures: ProviderFailure[] = [];

  if (!input.panelLoaded) {
    failures.push({ provider: "PBS CPI file", reason: input.panelIssues.join(" ") || "No usable data was returned." });
  } else if (!input.groupsBuilt) {
    failures.push({ provider: "PBS CPI file", reason: "The file holds too few months to compute a year-on-year decomposition." });
  }

  if (!input.intl) {
    failures.push({ provider: "World Bank", reason: "The request failed or returned no usable data." });
  } else {
    const missing = input.expectedCountries.filter((code) => !(input.intl as NonNullable<ProviderHealthInput["intl"]>).series[code]?.some((p) => p.value !== null));
    if (missing.length > 0) failures.push({ provider: "World Bank", reason: `No data returned for: ${missing.join(", ")}.` });
  }

  return failures;
}
