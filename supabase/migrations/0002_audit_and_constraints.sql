-- Growth Mentor 0002: audit log + data-integrity constraints
-- Safe to run more than once.

-- ── Audit log (append-only; see docs/AGENTIC_LAYER.md) ─────────────────────
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  actor text not null default 'user',          -- user | system
  action text not null,                        -- e.g. scorecard.created
  target_table text not null,
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_user_created on audit_logs (user_id, created_at desc);
alter table audit_logs enable row level security;

-- Anonymous demo visitors share the demo log (user_id null); signed-in users see their own.
drop policy if exists "audit_logs_read" on audit_logs;
create policy "audit_logs_read" on audit_logs for select
  using ((auth.uid() is null and user_id is null) or user_id = auth.uid());
drop policy if exists "audit_logs_insert" on audit_logs;
create policy "audit_logs_insert" on audit_logs for insert
  with check ((auth.uid() is null and user_id is null) or user_id = auth.uid());
-- No update/delete policies: the app can never rewrite or remove history.

-- ── Constraints ────────────────────────────────────────────────────────────
do $$ begin
  alter table scorecard_entries add constraint scorecard_entries_rating_1_10
    check (progress_rating between 1 and 10);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table goals add constraint goals_category_valid
    check (category in ('health', 'soft_skill', 'education'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table goals add constraint goals_timeframe_valid
    check (timeframe in ('short_term', 'long_term'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table weekly_scorecards add constraint weekly_scorecards_review_status_valid
    check (ai_summary_review_status in ('unreviewed', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;

-- One scorecard per owner per week (null owner = shared demo data).
create unique index if not exists weekly_scorecards_owner_week
  on weekly_scorecards (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), week_start_date);

-- One entry per goal per scorecard.
create unique index if not exists scorecard_entries_card_goal
  on scorecard_entries (scorecard_id, goal_id);
