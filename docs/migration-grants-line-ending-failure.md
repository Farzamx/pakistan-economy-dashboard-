# `migrationGrants.test.ts`: the Windows-only failure

Investigated 27 Nov 2026 (Stage 2 remediation E). **Diagnosis only: no migration, test or Git setting was changed.**

## Symptom

On this Windows checkout one test fails, and the other 3,486 tests pass:

```
FAIL src/lib/migrationGrants.test.ts > the repository's migrations >
     guard mutant: the known-table existence check moved after the row-level-security check
```

It fails identically on `main` and on `feat/seo-growth-engine`. Neither the test nor the migration differs between the two branches, so the failure is not caused by Stage 2.

## Cause: line endings in the working copy, not in the repository

| Copy of `supabase/migrations/0054_explicit_privileges.sql` | Line endings |
|---|---|
| Committed blob (`git show HEAD:…`) | LF only |
| This Windows working tree (`core.autocrlf=true`, no `.gitattributes` rule for `supabase/`) | CRLF only |

The failing case is a *guard mutant*:
- It rewrites the migration, moving the D0 known-table check after the D6 row-level-security check.
- It then expects the guard to notice.

Its rewrite pattern ends in a literal `end if;\n` (`src/lib/migrationGrants.test.ts:443`). On CRLF text that line ends `end if;\r\n`, so:
- the pattern never matches;
- the "mutated" migration is identical to the original;
- the test correctly reports that the mutation did not apply.

The sibling mutants use `\s*` or `[\s\S]*?` where this one uses `\n`, which is why only this one fails.

**Verified:** replaying the same mutant on the committed (LF) content applies the edit, and the guard detects it. On Linux CI, and in Vercel builds, which check out LF, the test passes. The migration itself is correct.

## Options (not applied; for the owner to choose)

1. **Make the test line-ending tolerant (recommended):** change `\n` to `\r?\n` in that one pattern. This is a one-line test-only change, and no migration file is touched.
2. **Pin migrations to LF in every checkout:** add `supabase/migrations/** text eol=lf` to `.gitattributes`, then re-checkout. The SQL becomes byte-identical to the repository everywhere. This rewrites every migration in each Windows working tree on the next checkout. That is harmless, but it is a repository-wide change, so it was not made here.
3. Leave it, and treat that one failure as a known Windows-only false negative.

As instructed, no migration file was modified to make the Windows run pass.
