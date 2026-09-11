-- Growth Mentor: domain schema (demo-first, permissive v1)

create table if not exists visions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text,
  horizon_years int not null default 10,
  created_at timestamptz not null default now()
);
alter table visions enable row level security;
drop policy if exists "visions_v1_read" on visions;
create policy "visions_v1_read" on visions for select using (true);
drop policy if exists "visions_v1_write" on visions;
create policy "visions_v1_write" on visions for all using (true) with check (true);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  vision_id uuid references visions(id) on delete cascade,
  title text not null,
  category text not null default 'health',
  timeframe text not null default 'short_term',
  target_metric text,
  is_active bool not null default true,
  created_at timestamptz not null default now()
);
alter table goals enable row level security;
drop policy if exists "goals_v1_read" on goals;
create policy "goals_v1_read" on goals for select using (true);
drop policy if exists "goals_v1_write" on goals;
create policy "goals_v1_write" on goals for all using (true) with check (true);

create table if not exists weekly_scorecards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  week_start_date date not null,
  overall_score numeric,
  ai_summary text,
  ai_summary_source text,
  ai_summary_confidence numeric,
  ai_summary_review_status text not null default 'unreviewed',
  notes text,
  created_at timestamptz not null default now()
);
alter table weekly_scorecards enable row level security;
drop policy if exists "weekly_scorecards_v1_read" on weekly_scorecards;
create policy "weekly_scorecards_v1_read" on weekly_scorecards for select using (true);
drop policy if exists "weekly_scorecards_v1_write" on weekly_scorecards;
create policy "weekly_scorecards_v1_write" on weekly_scorecards for all using (true) with check (true);

create table if not exists scorecard_entries (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid references weekly_scorecards(id) on delete cascade,
  goal_id uuid references goals(id) on delete cascade,
  progress_rating int not null default 5,
  note text,
  created_at timestamptz not null default now()
);
alter table scorecard_entries enable row level security;
drop policy if exists "scorecard_entries_v1_read" on scorecard_entries;
create policy "scorecard_entries_v1_read" on scorecard_entries for select using (true);
drop policy if exists "scorecard_entries_v1_write" on scorecard_entries;
create policy "scorecard_entries_v1_write" on scorecard_entries for all using (true) with check (true);

-- Seed data
insert into visions (id, user_id, title, description, horizon_years) values
  ('a0000000-0000-0000-0000-000000000001', null, 'Become a leader in AI education', 'Transform how people learn AI by building accessible, practical courses that reach 100,000 students worldwide.', 10),
  ('a0000000-0000-0000-0000-000000000002', null, 'Achieve elite physical health', 'Build sustainable health habits that let me perform at peak energy every day for the next decade.', 10)
on conflict (id) do nothing;

insert into goals (id, user_id, vision_id, title, category, timeframe, target_metric, is_active) values
  ('b0000000-0000-0000-0000-000000000001', null, 'a0000000-0000-0000-0000-000000000001', 'Run 3 times per week', 'health', 'short_term', '150 min/week', true),
  ('b0000000-0000-0000-0000-000000000002', null, 'a0000000-0000-0000-0000-000000000001', 'Read one book per month', 'education', 'long_term', '12 books/year', true),
  ('b0000000-0000-0000-0000-000000000003', null, 'a0000000-0000-0000-0000-000000000002', 'Practice active listening daily', 'soft_skill', 'short_term', '15 min/day', true),
  ('b0000000-0000-0000-0000-000000000004', null, 'a0000000-0000-0000-0000-000000000002', 'Sleep 7+ hours nightly', 'health', 'long_term', '7 hours/night', true)
on conflict (id) do nothing;

insert into weekly_scorecards (id, user_id, week_start_date, overall_score, notes) values
  ('c0000000-0000-0000-0000-000000000001', null, '2025-01-06', 7.5, 'Good week overall — running was consistent, reading fell behind.'),
  ('c0000000-0000-0000-0000-000000000002', null, '2025-01-13', 8.0, 'Strong progress across the board.')
on conflict (id) do nothing;

insert into scorecard_entries (id, scorecard_id, goal_id, progress_rating, note) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 9, 'Ran three times, hit 160 min'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 6, 'Only read half a book'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 8, 'Practiced most days'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 9, 'Consistent again'),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 7, 'Read one full book')
on conflict (id) do nothing;