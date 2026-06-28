-- Corrects two economic_event_series.automation_tier values that drifted
-- from the codebase's own stated contract (see SERIES_META's comment in
-- scripts/generateEconomicCalendarSeed.ts): "automated" means a real
-- SYNC_TARGETS entry in syncFromSbpEasyData.ts exists, backed by a live
-- src/lib/data/sbp.ts indicator — not aspirational.
--
-- 1. spi-weekly-inflation-release was marked 'automated' with no
--    corresponding SbpIndicatorKey or SYNC_TARGETS entry anywhere in the
--    codebase — a false claim of automation found during a full pre-deploy
--    audit. Corrected to 'semi_automated' (a real official source exists;
--    nothing currently reads it automatically).
-- 2. sbp-monetary-policy-committee-meeting was marked 'semi_automated' but
--    is now genuinely wired into automated actual-value sync via SBP's
--    live policyRate indicator (see syncFromSbpEasyData.ts). Upgraded to
--    'automated' to match.
--
-- Idempotent: safe to re-run.

update public.economic_event_series set automation_tier = 'semi_automated', updated_at = now() where slug = 'spi-weekly-inflation-release';
update public.economic_event_series set automation_tier = 'automated', updated_at = now() where slug = 'sbp-monetary-policy-committee-meeting';
