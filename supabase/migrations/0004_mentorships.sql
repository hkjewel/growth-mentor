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
