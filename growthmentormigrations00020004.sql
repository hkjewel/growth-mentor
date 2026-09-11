-- ===== supabase/migrations/0002_audit_and_constraints.sql =====
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


-- ===== supabase/migrations/0003_owner_rls.sql =====
-- Growth Mentor 0003: lock it down — owner-scoped RLS.
--
-- Rule for every table:
--   * signed-in users read/write ONLY rows where user_id = auth.uid()
--   * anonymous visitors read/write ONLY the shared demo rows (user_id is null),
--     so the demo stays usable without a login wall (see CLAUDE.md rule 6)
-- New rows default user_id to auth.uid(), so a signed-in insert can't land in the demo.

alter table visions alter column user_id set default auth.uid();
alter table goals alter column user_id set default auth.uid();
alter table weekly_scorecards alter column user_id set default auth.uid();

-- visions
drop policy if exists "visions_v1_read" on visions;
drop policy if exists "visions_v1_write" on visions;
drop policy if exists "visions_owner" on visions;
create policy "visions_owner" on visions for all
  using ((auth.uid() is null and user_id is null) or user_id = auth.uid())
  with check ((auth.uid() is null and user_id is null) or user_id = auth.uid());

-- goals
drop policy if exists "goals_v1_read" on goals;
drop policy if exists "goals_v1_write" on goals;
drop policy if exists "goals_owner" on goals;
create policy "goals_owner" on goals for all
  using ((auth.uid() is null and user_id is null) or user_id = auth.uid())
  with check ((auth.uid() is null and user_id is null) or user_id = auth.uid());

-- weekly_scorecards
drop policy if exists "weekly_scorecards_v1_read" on weekly_scorecards;
drop policy if exists "weekly_scorecards_v1_write" on weekly_scorecards;
drop policy if exists "weekly_scorecards_owner" on weekly_scorecards;
create policy "weekly_scorecards_owner" on weekly_scorecards for all
  using ((auth.uid() is null and user_id is null) or user_id = auth.uid())
  with check ((auth.uid() is null and user_id is null) or user_id = auth.uid());

-- scorecard_entries (no user_id column: ownership comes from the parent scorecard).
-- The predicate is spelled out explicitly (not just "parent is visible") so that
-- read-only visibility granted elsewhere (mentors, 0004) never implies write access.
drop policy if exists "scorecard_entries_v1_read" on scorecard_entries;
drop policy if exists "scorecard_entries_v1_write" on scorecard_entries;
drop policy if exists "scorecard_entries_owner" on scorecard_entries;
create policy "scorecard_entries_owner" on scorecard_entries for all
  using (exists (
    select 1 from weekly_scorecards s
    where s.id = scorecard_entries.scorecard_id
      and ((auth.uid() is null and s.user_id is null) or s.user_id = auth.uid())
  ))
  with check (
    exists (
      select 1 from weekly_scorecards s
      where s.id = scorecard_entries.scorecard_id
        and ((auth.uid() is null and s.user_id is null) or s.user_id = auth.uid())
    )
    and exists (
      select 1 from goals g
      where g.id = scorecard_entries.goal_id
        and ((auth.uid() is null and g.user_id is null) or g.user_id = auth.uid())
    )
  );


-- ===== supabase/migrations/0004_mentorships.sql =====
-- Growth Mentor 0004: student team management.
-- A mentor creates an invite code; a student redeems it; the mentor can then
-- READ (never write) the student's visions, goals and scorecards.

create table if not exists mentor_invites (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null default auth.uid(),
  mentor_email text,
  code text not null unique,
  revoked bool not null default false,
  created_at timestamptz not null default now()
);
alter table mentor_invites enable row level security;
drop policy if exists "mentor_invites_owner" on mentor_invites;
create policy "mentor_invites_owner" on mentor_invites for all
  using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid());

create table if not exists mentorships (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null,
  student_id uuid not null,
  mentor_email text,
  student_email text,
  created_at timestamptz not null default now(),
  unique (mentor_id, student_id),
  check (mentor_id <> student_id)
);
alter table mentorships enable row level security;
drop policy if exists "mentorships_read" on mentorships;
create policy "mentorships_read" on mentorships for select
  using (mentor_id = auth.uid() or student_id = auth.uid());
-- Either side can end the relationship. Inserts only happen via accept_mentor_invite().
drop policy if exists "mentorships_delete" on mentorships;
create policy "mentorships_delete" on mentorships for delete
  using (mentor_id = auth.uid() or student_id = auth.uid());

-- Student redeems an invite code. SECURITY DEFINER so the student can look up
-- an invite they don't own; it only ever links auth.uid() as the student.
create or replace function accept_mentor_invite(invite_code text)
returns mentorships
language plpgsql
security definer
set search_path = public
as $$
declare
  inv mentor_invites;
  result mentorships;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a mentor.' using errcode = '28000';
  end if;
  select * into inv from mentor_invites
    where code = upper(trim(invite_code)) and not revoked;
  if not found then
    raise exception 'That invite code is not valid.' using errcode = 'P0002';
  end if;
  if inv.mentor_id = auth.uid() then
    raise exception 'You can''t join your own team.' using errcode = '22023';
  end if;
  insert into mentorships (mentor_id, student_id, mentor_email, student_email)
    values (inv.mentor_id, auth.uid(), inv.mentor_email, auth.jwt() ->> 'email')
    on conflict (mentor_id, student_id) do update set student_email = excluded.student_email
    returning * into result;
  return result;
end;
$$;
revoke all on function accept_mentor_invite(text) from public, anon;
grant execute on function accept_mentor_invite(text) to authenticated;

-- Read-only mentor visibility (policies are OR-ed with the owner policies from 0003).
create or replace function is_mentor_of(student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from mentorships m where m.mentor_id = auth.uid() and m.student_id = student
  );
$$;

drop policy if exists "visions_mentor_read" on visions;
create policy "visions_mentor_read" on visions for select
  using (user_id is not null and is_mentor_of(user_id));

drop policy if exists "goals_mentor_read" on goals;
create policy "goals_mentor_read" on goals for select
  using (user_id is not null and is_mentor_of(user_id));

drop policy if exists "weekly_scorecards_mentor_read" on weekly_scorecards;
create policy "weekly_scorecards_mentor_read" on weekly_scorecards for select
  using (user_id is not null and is_mentor_of(user_id));

drop policy if exists "scorecard_entries_mentor_read" on scorecard_entries;
create policy "scorecard_entries_mentor_read" on scorecard_entries for select
  using (exists (
    select 1 from weekly_scorecards s
    where s.id = scorecard_entries.scorecard_id
      and s.user_id is not null and is_mentor_of(s.user_id)
  ));
