# Growth Mentor — Architecture

## Stack
Next.js (App Router) + Supabase (Postgres) + Vercel. TailwindCSS for UI.

## Build Now vs Later
- **Now:** Vision CRUD, Goal CRUD, Weekly Scorecard generation + entry rating, scorecard history, dashboard summary.
- **Later:** AI scorecard summaries & trend analysis, goal achievement predictions, auth + per-user data isolation, nudges/reminders, team/student management.

## Key User Action Flow (Weekly Scorecard)
1. User opens weekly scorecard page → sees current week's scorecard or empty state.
2. Clicks "Start this week" → one entry created per active goal.
3. User rates each goal 1–10, adds a note per entry.
4. On save, overall weekly score is calculated (average of entries).
5. Scorecard appears in history; dashboard updates.

## Responsive Nav Shell
Left sidebar on desktop (sections: Dashboard, Vision, Goals, Weekly Scorecard, History). Collapses to hamburger on mobile. Current section highlighted.

## Layer Plan
1. **Data layer** — Supabase tables, RLS policies (permissive v1), seed data.
2. **App logic** — data-access functions in `lib/data/`, server actions for CRUD.
3. **Smart features** — `lib/ai/` for scorecard summaries (later sprint).

## Why Core Works Without AI
The core engine (vision → goals → weekly scorecard → rating → history) is pure CRUD + calculation. No AI dependency. AI adds summaries/insights later.

## Repo Structure
```
app/
  dashboard/page.tsx
  vision/page.tsx
  goals/page.tsx
  scorecard/page.tsx
  history/page.tsx
components/
  Sidebar.tsx
  VisionForm.tsx
  GoalForm.tsx
  ScorecardForm.tsx
  GoalList.tsx
lib/
  data/
    visions.ts
    goals.ts
    scorecards.ts
    entries.ts
  ai/
    summaries.ts  (later)
types/
  index.ts
__tests__/
```

## Module Map
| Module | Responsibility | Data owned | Build order |
|---------|---------------|------------|-------------|
| Vision | CRUD 10-year vision | visions | 1 |
| Goals | CRUD goals linked to vision | goals | 1 |
| Scorecard | Generate + rate weekly scorecard | weekly_scorecards, scorecard_entries | 1 |
| Dashboard | Summary view of latest week + trends | (reads all) | 1 |
| History | Browse past scorecards | weekly_scorecards | 1 |
| Auth | Login/signup + per-user RLS | (alter) | 2 (later) |