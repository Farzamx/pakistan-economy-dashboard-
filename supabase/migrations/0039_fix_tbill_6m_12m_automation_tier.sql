-- Production-hardening audit, 2026-07-18: treasury-bill-auction-6m and
-- treasury-bill-auction-12m are marked 'semi_automated' but have ZERO
-- automation anywhere in the codebase — periodValidation is explicitly
-- `undefined` in SERIES_PUBLICATION_META (seriesPublicationConfig.ts),
-- there is no SYNC_TARGETS entry in syncFromSbpEasyData.ts, and there is no
-- SbpIndicatorKey for either tenor in src/lib/data/sbp.ts (confirmed absent
-- from sbpFreshnessAudit.ts's ALL_INDICATOR_KEYS list too — not even the
-- dashboard KPI side is automated). See PENDING_AUTOMATION_REGISTRY in
-- seriesPublicationConfig.ts: both are blocked on an unconfirmed SBP
-- EasyData series ID, tracked since 2026-07-03.
--
-- 'semi_automated' implies partial machine verification exists; it does
-- not, for either series. Corrected to 'manual' so the new
-- AutomationStatusBadge renders "Manual Update Required" rather than
-- "Partial Automation" — the same standard applied in migration 0006.
--
-- Idempotent: safe to re-run.

update public.economic_event_series set automation_tier = 'manual', updated_at = now() where slug = 'treasury-bill-auction-6m';
update public.economic_event_series set automation_tier = 'manual', updated_at = now() where slug = 'treasury-bill-auction-12m';
