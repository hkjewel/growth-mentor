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
