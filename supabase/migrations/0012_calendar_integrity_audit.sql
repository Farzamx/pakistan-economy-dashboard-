-- Full Economic Calendar integrity audit — corrects dates, recurrence
-- assumptions, automation tiers, and source attribution found to be wrong
-- against primary official sources (SBP, PBS, PSX, Ministry of Finance).
-- See the audit report delivered alongside this migration for the full
-- evidence trail and sources per item. Highlights:
--
-- 1. SBP Foreign Exchange Reserves was scheduled on FOUR CONSECUTIVE SUNDAYS
--    going forward (fx-reserves-2026-07-05 through 08-02) — Pakistan's
--    weekend, when SBP never publishes. Multiple independent financial-press
--    reports (Dawn, Business Recorder, Arab News, Profit/Pakistan Today)
--    consistently confirm SBP's weekly reserves statement is published on
--    THURSDAYS. Corrected to a clean weekly-Thursday sequence.
-- 2. SPI was anchored to Thursday (with one Saturday outlier) but PBS's own
--    release pages show the reference week ends Wednesday and the report is
--    published the FOLLOWING FRIDAY — corrected to Friday.
-- 3. CPI/Core Inflation were dated the 10th of the month but PBS publishes
--    on the 1st-2nd of the month following the reference period (confirmed
--    via PBS's own press release filenames/bylines across 5 sampled
--    months) — corrected to the 1st, shifted to the next business day when
--    the 1st falls on a weekend (the exact pattern PBS itself follows: e.g.
--    Feb 2026 data, due Mar 1 (Sun), was actually released Mar 2 (Mon)).
-- 4. Trade Balance was dated the 3rd/31st but PBS's "Advance Release on
--    Foreign Trade Statistics" publishes ~mid-month (observed: May 2026
--    data released Jun 16, 2026) — corrected to ~15th-17th, weekend-shifted.
-- 5. Worker Remittances was dated the 18th but SBP's press releases show a
--    consistent 8-11 day lag after month-end across 6 sampled months —
--    corrected to ~9th-10th, weekend-shifted.
-- 6. Treasury Bill and PIB auction dates are now the REAL, primary-source
--    dates read directly from SBP DMMD's live rolling 3-month advance
--    auction calendar (sbp.org.pk/ecodata/auction-treasurybills.pdf /
--    auction-bond.pdf) — both previously closer to guesses than the
--    official schedule. PIB's "monthly" cadence claim is also corrected to
--    "irregular" (~4-6 weeks, no fixed weekday) per that same calendar.
-- 7. "KSE-100 Weekly Market Review" is not an official PSX release at all —
--    confirmed (via PSX's own analysis-reports page, which carries no such
--    weekly product) to be brokerage research (Topline Securities/AKD
--    Research), republished by financial press. Reclassified automation
--    tier to 'manual' and removed from headline status; description now
--    discloses this explicitly rather than implying an official figure.
-- 8. PSX's 2026 holiday calendar is officially published
--    (psx.com.pk/psx/file/268947-1.pdf) — added the two remaining confirmed
--    fixed-date holidays still ahead of today (Allama Iqbal Day Nov 9,
--    Quaid-e-Azam Day Dec 25); Independence Day Aug 14 was already correct.
-- 9. Federal Budget/Economic Survey 2027 dates are not officially
--    announced yet (re-confirmed live against finance.gov.pk/na.gov.pk —
--    Article 80 sets no fixed date) and were sitting on a weekend
--    (Jun 5-6, 2027 are Sat/Sun) — shifted to a weekday placeholder
--    consistent with the historical "second week of June" pattern, still
--    marked 'estimated'.
-- 10. SBP MPC's FY27 calendar was re-verified live against
--     sbp.org.pk/m_policy/mp-calendar.asp just now — all 8 dates are
--     unchanged and correct (migration 0005 remains valid, no action here).
--
-- Also adds two new columns this audit's classification scheme needs:
-- economic_event_series.is_headline (previously a mock-data-only field with
-- no Supabase equivalent — meant "Major Upcoming Events" would have quietly
-- gone empty the moment the calendar's true source of truth moved to
-- Supabase) and economic_events.date_time_classification (the four-way
-- Confirmed / Official Date Only / Estimated / Manual scheme; the existing
-- data_confidence column is binary and conflates date-certainty with
-- actual-value-certainty — kept as-is for the actual-value meaning it
-- already has, this is a separate, additive field).

-- ============================================================
-- 1. Schema additions
-- ============================================================

alter table public.economic_event_series add column if not exists is_headline boolean not null default false;

alter table public.economic_events add column if not exists date_time_classification text not null default 'estimated'
  check (date_time_classification in ('confirmed', 'official_date_only', 'estimated', 'manual'));

-- ============================================================
-- 2. Series-level corrections
-- ============================================================

update public.economic_event_series set is_headline = true, updated_at = now()
  where slug in (
    'trade-balance', 'sbp-foreign-exchange-reserves', 'cpi-inflation-release',
    'current-account-balance', 'worker-remittances', 'sbp-monetary-policy-committee-meeting',
    'gdp-growth-release', 'pakistan-economic-survey', 'federal-budget',
    'core-inflation-release', 'government-debt-release'
  );

-- KSE-100 "Weekly Market Review" is brokerage research, not an official PSX
-- release — demoted from headline status and from semi_automated (which
-- implied a real source feed exists) to manual, with a description that
-- discloses this rather than presenting a single number as authoritative.
update public.economic_event_series set
  automation_tier = 'manual',
  is_headline = false,
  reliability_score = 2,
  source_name = 'Brokerage research (e.g. Topline Securities, AKD Research) — not an official PSX release',
  description = 'A weekly wrap-up of PSX''s benchmark KSE-100 index performance, as estimated and published by brokerage research desks (not an official PSX release) and then carried by financial press — different brokerages can report slightly different week-on-week figures for the same week.',
  updated_at = now()
  where slug = 'kse-100-weekly-market-review';

-- PIB auctions are not strictly monthly — SBP's live rolling auction
-- calendar shows fixed-rate PIB auctions roughly every 4-6 weeks with no
-- fixed weekday (irregular), distinct from the fortnightly, Wednesday-
-- anchored T-Bill cadence.
update public.economic_event_series set
  cadence = 'irregular',
  source_url = 'https://www.sbp.org.pk/ecodata/auction-bond.pdf',
  description = 'SBP''s Pakistan Investment Bond auction, scheduled via SBP''s rolling advance auction calendar (DMMD) roughly every 4-6 weeks, not on a fixed day of the week — the cut-off yield reflects investor expectations for inflation and rates further out than T-Bills.',
  updated_at = now()
  where slug = 'pib-auction';

update public.economic_event_series set
  source_url = 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf',
  description = 'SBP''s fortnightly 3-month Treasury Bill auction, per SBP''s published advance auction calendar (bidding 1000-1200hrs, results same day) — the cut-off yield is the clearest live read on what the market expects from the next SBP policy rate decision.',
  updated_at = now()
  where slug = 'treasury-bill-auction';

update public.economic_event_series set
  source_url = 'https://www.sbp.org.pk/ecodata/Balancepayment_BPM6.pdf',
  description = 'SBP''s monthly current account balance (BPM6 basis), typically published 15-17 days after month-end — the broadest measure of money flowing in versus out of Pakistan internationally, and a key driver of reserve and currency stability.',
  updated_at = now()
  where slug = 'current-account-balance';

update public.economic_event_series set
  description = 'SBP''s monthly worker remittance inflows, typically published 8-11 days after month-end per SBP''s dated press releases — money sent home by overseas Pakistanis, a major source of foreign exchange alongside exports.',
  updated_at = now()
  where slug = 'worker-remittances';

update public.economic_event_series set
  description = 'PBS''s headline Consumer Price Index, published 1st-2nd of the month for the prior month''s data (shifted to the next business day when the 1st falls on a weekend) — the most-watched single inflation number, and the figure SBP weighs most heavily when setting the policy rate.',
  updated_at = now()
  where slug = 'cpi-inflation-release';

update public.economic_event_series set
  description = 'PBS''s core (Urban NFNE) inflation, released the same day as headline CPI (1st-2nd of the month for the prior month''s data) — CPI with volatile food and energy prices stripped out, the measure SBP weighs most heavily for the underlying, persistent inflation trend.',
  updated_at = now()
  where slug = 'core-inflation-release';

update public.economic_event_series set
  description = 'PBS''s monthly goods trade balance ("Advance Release on Foreign Trade Statistics") — exports minus imports, published roughly mid-month for the prior month''s data — one of the clearest signals of pressure on the Rupee and reserves.',
  updated_at = now()
  where slug = 'trade-balance';

update public.economic_event_series set
  source_url = 'https://www.pbs.gov.pk/weekly-sensitive-price-indicator-spi',
  description = 'PBS''s weekly Sensitive Price Indicator — reference week ends Wednesday, published the following Friday — a fast-moving read on prices for a basket of essential, frequently-purchased items, well ahead of the monthly CPI print.',
  updated_at = now()
  where slug = 'spi-weekly-inflation-release';

-- ============================================================
-- 3. PSX Holiday Calendar — add the remaining confirmed fixed-date 2026
--    holidays still ahead of today, per PSX's official 2026 holiday notice.
-- ============================================================

insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, source_url, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'psx-holiday-calendar'), 'psx-holiday-2026-11-09', 'PSX Holiday Calendar (Allama Iqbal Day)', '2026-11-09', '00:00', null, null, null, 'scheduled', 'Low', 'Pakistan Stock Exchange is closed for trading — no KSE-100 session today.', 'https://www.psx.com.pk/psx/exchange/general/calendar-holidays', 'confirmed', 'confirmed'),
  ((select id from public.economic_event_series where slug = 'psx-holiday-calendar'), 'psx-holiday-2026-12-25', 'PSX Holiday Calendar (Quaid-e-Azam Day)', '2026-12-25', '00:00', null, null, null, 'scheduled', 'Low', 'Pakistan Stock Exchange is closed for trading — no KSE-100 session today.', 'https://www.psx.com.pk/psx/exchange/general/calendar-holidays', 'confirmed', 'confirmed')
on conflict (slug) do update set event_date = excluded.event_date, title = excluded.title, description = excluded.description, source_url = excluded.source_url, data_confidence = excluded.data_confidence, date_time_classification = excluded.date_time_classification, updated_at = now();

-- ============================================================
-- 4. Delete the incorrectly-dated SCHEDULED instances being replaced below.
--    Only ever deletes status='scheduled' rows (never a released/historical
--    record) — each one is immediately replaced by a corrected row for the
--    same series via upsert in the next section.
-- ============================================================

delete from public.economic_events where slug in (
  'fx-reserves-2026-06-29', 'fx-reserves-2026-07-05', 'fx-reserves-2026-07-12', 'fx-reserves-2026-07-19', 'fx-reserves-2026-07-26', 'fx-reserves-2026-08-02',
  'spi-2026-06-27', 'spi-2026-07-02', 'spi-2026-07-09', 'spi-2026-07-16', 'spi-2026-07-23', 'spi-2026-07-30',
  'cpi-2026-07-10', 'cpi-2026-08-10',
  'core-inflation-2026-07-10',
  'trade-balance-2026-07-03', 'trade-balance-2026-07-31',
  'remittances-2026-07-18',
  'current-account-2026-07-15', 'current-account-2026-08-14',
  'tbill-auction-2026-07-02',
  'pib-auction-2026-07-24',
  'economic-survey-2027-06-05',
  'federal-budget-2027-06-06'
) and status = 'scheduled';

-- ============================================================
-- 5. Re-insert with corrected dates (and, where research turned up better
--    primary-source values, corrected source_url / classification too).
-- ============================================================

-- SBP Foreign Exchange Reserves — weekly, Thursday (was landing on Sunday).
insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'sbp-foreign-exchange-reserves'), 'fx-reserves-2026-07-02', 'SBP Foreign Exchange Reserves (Weekly)', '2026-07-02', '16:30', '$11.2B', '$11.4B', null, 'scheduled', 'Medium', 'The State Bank''s weekly statement of liquid foreign reserves — the buffer available to defend the Rupee and meet external obligations.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'sbp-foreign-exchange-reserves'), 'fx-reserves-2026-07-09', 'SBP Foreign Exchange Reserves (Weekly)', '2026-07-09', '16:30', '$11.4B', '$11.5B', null, 'scheduled', 'Medium', 'The State Bank''s weekly statement of liquid foreign reserves — the buffer available to defend the Rupee and meet external obligations.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'sbp-foreign-exchange-reserves'), 'fx-reserves-2026-07-16', 'SBP Foreign Exchange Reserves (Weekly)', '2026-07-16', '16:30', '$11.5B', '$11.6B', null, 'scheduled', 'Medium', 'The State Bank''s weekly statement of liquid foreign reserves — the buffer available to defend the Rupee and meet external obligations.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'sbp-foreign-exchange-reserves'), 'fx-reserves-2026-07-23', 'SBP Foreign Exchange Reserves (Weekly)', '2026-07-23', '16:30', '$11.6B', '$11.7B', null, 'scheduled', 'Medium', 'The State Bank''s weekly statement of liquid foreign reserves — the buffer available to defend the Rupee and meet external obligations.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'sbp-foreign-exchange-reserves'), 'fx-reserves-2026-07-30', 'SBP Foreign Exchange Reserves (Weekly)', '2026-07-30', '16:30', '$11.7B', '$11.8B', null, 'scheduled', 'Medium', 'The State Bank''s weekly statement of liquid foreign reserves — the buffer available to defend the Rupee and meet external obligations.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'sbp-foreign-exchange-reserves'), 'fx-reserves-2026-08-06', 'SBP Foreign Exchange Reserves (Weekly)', '2026-08-06', '16:30', '$11.8B', '$11.9B', null, 'scheduled', 'Medium', 'The State Bank''s weekly statement of liquid foreign reserves — the buffer available to defend the Rupee and meet external obligations.', 'estimated', 'estimated')
on conflict (slug) do update set event_date = excluded.event_date, data_confidence = excluded.data_confidence, date_time_classification = excluded.date_time_classification, updated_at = now();

-- SPI — weekly, Friday (was anchored to Thursday/Saturday).
insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'spi-weekly-inflation-release'), 'spi-2026-06-26', 'SPI Weekly Inflation Release', '2026-06-26', '12:00', '+0.31% WoW', '+0.25% WoW', null, 'scheduled', 'Low', 'PBS''s weekly Sensitive Price Indicator — a fast-moving read on prices for a basket of essential, frequently-purchased items, well ahead of the monthly CPI print.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'spi-weekly-inflation-release'), 'spi-2026-07-03', 'SPI Weekly Inflation Release', '2026-07-03', '12:00', '+0.25% WoW', '+0.20% WoW', null, 'scheduled', 'Low', 'PBS''s weekly Sensitive Price Indicator — a fast-moving read on prices for a basket of essential, frequently-purchased items, well ahead of the monthly CPI print.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'spi-weekly-inflation-release'), 'spi-2026-07-10', 'SPI Weekly Inflation Release', '2026-07-10', '12:00', '+0.20% WoW', '+0.18% WoW', null, 'scheduled', 'Low', 'PBS''s weekly Sensitive Price Indicator — a fast-moving read on prices for a basket of essential, frequently-purchased items, well ahead of the monthly CPI print.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'spi-weekly-inflation-release'), 'spi-2026-07-17', 'SPI Weekly Inflation Release', '2026-07-17', '12:00', '+0.18% WoW', '+0.15% WoW', null, 'scheduled', 'Low', 'PBS''s weekly Sensitive Price Indicator — a fast-moving read on prices for a basket of essential, frequently-purchased items, well ahead of the monthly CPI print.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'spi-weekly-inflation-release'), 'spi-2026-07-24', 'SPI Weekly Inflation Release', '2026-07-24', '12:00', '+0.15% WoW', '+0.14% WoW', null, 'scheduled', 'Low', 'PBS''s weekly Sensitive Price Indicator — a fast-moving read on prices for a basket of essential, frequently-purchased items, well ahead of the monthly CPI print.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'spi-weekly-inflation-release'), 'spi-2026-07-31', 'SPI Weekly Inflation Release', '2026-07-31', '12:00', '+0.14% WoW', '+0.12% WoW', null, 'scheduled', 'Low', 'PBS''s weekly Sensitive Price Indicator — a fast-moving read on prices for a basket of essential, frequently-purchased items, well ahead of the monthly CPI print.', 'estimated', 'estimated')
on conflict (slug) do update set event_date = excluded.event_date, data_confidence = excluded.data_confidence, date_time_classification = excluded.date_time_classification, updated_at = now();

-- CPI / Core Inflation — 1st-2nd of month (was the 10th), covers prior month.
insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'cpi-inflation-release'), 'cpi-2026-07-01', 'CPI Inflation Release (June 2026)', '2026-07-01', '12:00', '6.8% YoY', '6.4% YoY', null, 'scheduled', 'High', 'PBS''s headline Consumer Price Index — the most-watched single inflation number, and the figure SBP weighs most heavily when setting the policy rate.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'cpi-inflation-release'), 'cpi-2026-08-03', 'CPI Inflation Release (July 2026)', '2026-08-03', '12:00', '6.4% YoY', '6.1% YoY', null, 'scheduled', 'High', 'PBS''s headline Consumer Price Index — the most-watched single inflation number, and the figure SBP weighs most heavily when setting the policy rate.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'core-inflation-release'), 'core-inflation-2026-07-01', 'Core Inflation Release (June 2026)', '2026-07-01', '12:00', '9.8% YoY', '9.5% YoY', null, 'scheduled', 'High', 'PBS''s core (Urban NFNE) inflation — CPI with volatile food and energy prices stripped out, the measure SBP weighs most heavily for the underlying, persistent inflation trend.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'core-inflation-release'), 'core-inflation-2026-08-03', 'Core Inflation Release (July 2026)', '2026-08-03', '12:00', '9.5% YoY', '9.3% YoY', null, 'scheduled', 'High', 'PBS''s core (Urban NFNE) inflation — CPI with volatile food and energy prices stripped out, the measure SBP weighs most heavily for the underlying, persistent inflation trend.', 'estimated', 'estimated')
on conflict (slug) do update set event_date = excluded.event_date, data_confidence = excluded.data_confidence, date_time_classification = excluded.date_time_classification, updated_at = now();

-- Trade Balance — ~15th-17th of the month (was the 3rd/31st), covers prior month.
insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'trade-balance'), 'trade-balance-2026-07-15', 'Trade Balance (June 2026)', '2026-07-15', '17:00', '-$2.1B', '-$1.9B', null, 'scheduled', 'Medium', 'PBS''s monthly goods trade balance — exports minus imports — one of the clearest signals of pressure on the Rupee and reserves.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'trade-balance'), 'trade-balance-2026-08-17', 'Trade Balance (July 2026)', '2026-08-17', '17:00', '-$1.9B', '-$2.0B', null, 'scheduled', 'Medium', 'PBS''s monthly goods trade balance — exports minus imports — one of the clearest signals of pressure on the Rupee and reserves.', 'estimated', 'estimated')
on conflict (slug) do update set event_date = excluded.event_date, data_confidence = excluded.data_confidence, date_time_classification = excluded.date_time_classification, updated_at = now();

-- Worker Remittances — ~9th-10th of month (was the 18th), covers prior month.
insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'worker-remittances'), 'remittances-2026-07-09', 'Worker Remittances (June 2026)', '2026-07-09', '16:00', '$3.1B', '$3.2B', null, 'scheduled', 'Medium', 'SBP''s monthly worker remittance inflows — money sent home by overseas Pakistanis, a major source of foreign exchange alongside exports.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'worker-remittances'), 'remittances-2026-08-10', 'Worker Remittances (July 2026)', '2026-08-10', '16:00', '$3.2B', '$3.3B', null, 'scheduled', 'Medium', 'SBP''s monthly worker remittance inflows — money sent home by overseas Pakistanis, a major source of foreign exchange alongside exports.', 'estimated', 'estimated')
on conflict (slug) do update set event_date = excluded.event_date, data_confidence = excluded.data_confidence, date_time_classification = excluded.date_time_classification, updated_at = now();

-- Current Account — minor shift (15th/14th -> 16th/17th) to match the
-- confirmed ~15-17 day lag after month-end more precisely.
insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'current-account-balance'), 'current-account-2026-07-16', 'Current Account Balance (June 2026)', '2026-07-16', '17:00', '-$0.4B', '-$0.2B', null, 'scheduled', 'Medium', 'SBP''s monthly current account balance — the broadest measure of money flowing in versus out of Pakistan internationally, and a key driver of reserve and currency stability.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'current-account-balance'), 'current-account-2026-08-17', 'Current Account Balance (July 2026)', '2026-08-17', '17:00', '-$0.2B', '-$0.3B', null, 'scheduled', 'Medium', 'SBP''s monthly current account balance — the broadest measure of money flowing in versus out of Pakistan internationally, and a key driver of reserve and currency stability.', 'estimated', 'estimated')
on conflict (slug) do update set event_date = excluded.event_date, data_confidence = excluded.data_confidence, date_time_classification = excluded.date_time_classification, updated_at = now();

-- Treasury Bill / PIB auctions — real dates read directly from SBP DMMD's
-- live rolling 3-month advance auction calendar (Confirmed: date AND time
-- both officially published for T-Bills; PIB date confirmed via the same
-- calendar, time not independently confirmed for PIBs specifically).
insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, source_url, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'treasury-bill-auction'), 'tbill-auction-2026-07-08', 'Treasury Bill Auction (3M)', '2026-07-08', '12:00', '11.20%', '11.10%', null, 'scheduled', 'Medium', 'SBP''s fortnightly 3-month Treasury Bill auction — bidding 1000-1200hrs, results same day, per SBP''s published advance auction calendar.', 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf', 'confirmed', 'confirmed'),
  ((select id from public.economic_event_series where slug = 'treasury-bill-auction'), 'tbill-auction-2026-07-22', 'Treasury Bill Auction (3M)', '2026-07-22', '12:00', '11.10%', null, null, 'scheduled', 'Medium', 'SBP''s fortnightly 3-month Treasury Bill auction — bidding 1000-1200hrs, results same day, per SBP''s published advance auction calendar.', 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf', 'confirmed', 'confirmed'),
  ((select id from public.economic_event_series where slug = 'treasury-bill-auction'), 'tbill-auction-2026-08-05', 'Treasury Bill Auction (3M)', '2026-08-05', '12:00', null, null, null, 'scheduled', 'Medium', 'SBP''s fortnightly 3-month Treasury Bill auction — bidding 1000-1200hrs, results same day, per SBP''s published advance auction calendar.', 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf', 'confirmed', 'confirmed'),
  ((select id from public.economic_event_series where slug = 'pib-auction'), 'pib-auction-2026-07-02', 'PIB Auction (Fixed Rate)', '2026-07-02', '12:00', '12.10%', '12.00%', null, 'scheduled', 'Medium', 'SBP''s Pakistan Investment Bond auction, per SBP''s published advance auction calendar — the cut-off yield on longer-dated government debt, reflecting investor expectations for inflation and rates further out than T-Bills.', 'https://www.sbp.org.pk/ecodata/auction-bond.pdf', 'estimated', 'official_date_only'),
  ((select id from public.economic_event_series where slug = 'pib-auction'), 'pib-auction-2026-08-04', 'PIB Auction (Fixed Rate)', '2026-08-04', '12:00', null, null, null, 'scheduled', 'Medium', 'SBP''s Pakistan Investment Bond auction, per SBP''s published advance auction calendar — the cut-off yield on longer-dated government debt, reflecting investor expectations for inflation and rates further out than T-Bills.', 'https://www.sbp.org.pk/ecodata/auction-bond.pdf', 'estimated', 'official_date_only')
on conflict (slug) do update set event_date = excluded.event_date, source_url = excluded.source_url, data_confidence = excluded.data_confidence, date_time_classification = excluded.date_time_classification, updated_at = now();

-- Federal Budget / Economic Survey 2027 — not yet officially announced
-- (re-confirmed live: no fixed constitutional date, Article 80 only
-- requires an annual budget statement); shifted off a weekend onto a
-- weekday placeholder consistent with the historical "second week of June"
-- pattern. Still explicitly 'estimated' on both fields.
insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'pakistan-economic-survey'), 'economic-survey-2027-06-08', 'Pakistan Economic Survey 2026-27', '2027-06-08', '15:00', 'Economic Survey 2025-26', null, null, 'scheduled', 'High', 'The Ministry of Finance''s annual stock-take of the economy — growth, inflation, fiscal and external accounts — released the day before the federal budget and used to frame it. Exact date not yet officially announced (typically confirmed only days in advance); placeholder follows the historical early-June pattern.', 'estimated', 'estimated'),
  ((select id from public.economic_event_series where slug = 'federal-budget'), 'federal-budget-2027-06-09', 'Federal Budget 2027-28 Presentation', '2027-06-09', '17:00', 'Federal Budget 2026-27', null, null, 'scheduled', 'High', 'The federal government''s annual budget speech in the National Assembly — next year''s tax measures, spending allocations, and fiscal targets, all set in this single sitting. Exact date is set by government/National Assembly discretion each year (no fixed constitutional date) and is not yet officially announced; placeholder follows the historical "second week of June" pattern.', 'estimated', 'estimated')
on conflict (slug) do update set event_date = excluded.event_date, description = excluded.description, data_confidence = excluded.data_confidence, date_time_classification = excluded.date_time_classification, updated_at = now();

-- ============================================================
-- 6. Classification backfill for every remaining event not touched above —
--    SBP MPC (Confirmed, official date+time both published and re-verified
--    live), KSE-100 (Manual — no official issuer), everything else not
--    already set explicitly above (Estimated, the existing default).
-- ============================================================

update public.economic_events set date_time_classification = 'confirmed', updated_at = now()
  where series_id = (select id from public.economic_event_series where slug = 'sbp-monetary-policy-committee-meeting');

update public.economic_events set date_time_classification = 'manual', updated_at = now()
  where series_id = (select id from public.economic_event_series where slug = 'kse-100-weekly-market-review');

update public.economic_events set date_time_classification = 'confirmed', updated_at = now()
  where series_id = (select id from public.economic_event_series where slug = 'psx-holiday-calendar');
