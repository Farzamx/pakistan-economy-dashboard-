-- TEMPORARY, for one-time pipeline verification only — not a feature, not
-- permanent schema. Inserts ONE clearly-fake series + event so the real
-- release -> trigger -> notification_jobs -> worker -> Resend -> webhook
-- pipeline can be exercised end-to-end without touching any real economic
-- indicator. Both rows are unmistakably labeled as test data (slug, title,
-- and source_name all say so) so there's no risk of confusion with real
-- calendar content, and both are safe to delete immediately after
-- verification — see the DELETE statements at the bottom of this file
-- (commented out; run them once you're done).
--
-- This does NOT modify any genuine economic data: it's a new, separate
-- series/event, not an edit to an existing one.

insert into public.economic_event_series (slug, title, category, default_importance, cadence, source_name, source_url, automation_tier, reliability_score, description)
values (
  'test-notification-pipeline-check',
  'TEST — Notification Pipeline Verification (safe to delete)',
  'Financial Markets',
  'Low',
  'irregular',
  'Internal Test — Not A Real Source',
  null,
  'manual',
  1,
  'Synthetic test series created solely to verify the release-to-notification pipeline end-to-end. Not a real economic indicator. Delete after verification.'
)
on conflict (slug) do nothing;

insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, status, importance, description, data_confidence)
values (
  (select id from public.economic_event_series where slug = 'test-notification-pipeline-check'),
  'test-notification-pipeline-check-event',
  'TEST — Notification Pipeline Verification (safe to delete)',
  current_date,
  '12:00',
  null,
  null,
  'scheduled',
  'Low',
  'Synthetic test event. Not real economic data.',
  'confirmed'
)
on conflict (slug) do nothing;

-- ============================================================
-- CLEANUP — run this after verification is complete.
-- Deleting the series cascades to its event (economic_events.series_id has
-- "on delete cascade") and to any notification_jobs row created for that
-- event (notification_jobs.economic_event_id also "on delete cascade").
-- email_log rows reference economic_event_id with "on delete set null", so
-- they survive as history with that column nulled rather than being
-- deleted — harmless, and consistent with email_log being a permanent
-- delivery record.
-- ============================================================
-- delete from public.economic_event_series where slug = 'test-notification-pipeline-check';
