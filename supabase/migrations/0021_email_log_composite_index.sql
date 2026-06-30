-- Database performance review (Final Production Hardening follow-up).
-- Every real query against email_log (get_pending_email_log_batch,
-- record_email_batch_results — see migrations 0007/0011) filters by
-- notification_job_id together with status; status is never filtered
-- standalone. The two existing single-column indexes
-- (email_log_job_idx, email_log_status_idx) let Postgres satisfy this via
-- a BitmapAnd, which works but isn't the targeted index for the actual
-- access pattern. A composite index serves it directly.
--
-- Not a replacement for the single-column indexes: email_log_job_idx
-- alone still serves the job-id-only count queries efficiently, and
-- email_log_message_idx (resend_message_id) is unrelated. Left as-is.

create index if not exists email_log_job_status_idx
  on public.email_log (notification_job_id, status);

-- Cleanup: orphaned rows from manual verification of the new cron-history
-- mechanism (Final Production Hardening Part 5) under a job_name that was
-- never a real scheduled job and will never be re-inserted, so the
-- per-job-name retention trim in log_cron_run() would never remove them.
delete from public.cron_run_log where job_name = 'test-job';
