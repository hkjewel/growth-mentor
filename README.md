# Growth Mentor

Anchor your growth to a 10-year vision, break it into goals across **health, soft skills and education**, and
score your progress every week — a personal growth coach without the expensive mentor.

**Core loop:** Vision → Goals → *Start this week* (one entry per active goal) → rate each goal 1–10 + note →
overall weekly score → Dashboard trend + History.

## Features

| Area | What you can do |
|---|---|
| Vision | Create / edit / delete 10-year visions (the dashboard's north star) |
| Goals | Create / edit / pause / resume / delete; category, timeframe, target metric, linked vision; per-goal history + prediction |
| Weekly scorecard | Start this week, rate 1–10 with notes, weekly reflection, overall score on save, add/remove goals, backfill past weeks, delete a week |
| Dashboard | Latest score + trend vs last review, weakest / strongest goal, category averages, streak, coach's note, Friday nudge |
| History | Every week with score chart, trend and "needs attention" goal |
| Insights | Category trend chart, where-to-focus ranking, goal predictions, best/toughest weeks, CSV export |
| Coach summary | Draft a weekly summary (Claude when `ANTHROPIC_API_KEY` is set, rule engine otherwise) → approve / edit / reject / use as reflection |
| Accounts | Email + password; anonymous visitors use a shared demo, signed-in users get private data |
| Team | Mentors create invite codes; students join; mentors get a read-only view of each student's progress |
| Activity log | Append-only audit trail of every meaningful change |

## Stack

Next.js 15 (App Router, server actions) · Supabase (Postgres + Auth + RLS) · Tailwind v4 · Vercel.
All database access goes through named functions in `lib/data/` (see `docs/SECURITY.md`).

## Local development

```bash
npm install
npx vercel link            # once
npx vercel env pull .env.local
npm run dev                # http://localhost:3000
npm test                   # unit tests for the scoring / trend / prediction / nudge rules
```

Optional: set `ANTHROPIC_API_KEY` (locally in `.env.local`, and in Vercel → Settings → Environment Variables)
to have Claude draft the weekly coach summary. Without it the app uses the built-in rule engine.

## Database

Migrations live in `supabase/migrations/` and are applied in order. `0001` is the original schema + seed data.

| File | Purpose |
|---|---|
| `0002_audit_and_constraints.sql` | `audit_logs` table, rating 1–10 check, one scorecard per owner per week |
| `0003_owner_rls.sql` | Owner-scoped RLS: signed-in users see only their rows; anonymous visitors only the demo rows |
| `0004_mentorships.sql` | Mentor invites + mentorships, read-only mentor access to students' data |

Apply them in the Supabase dashboard → **SQL Editor** (paste each file, run, in order), or with the Supabase CLI:
`npx supabase link --project-ref <ref>` then `npx supabase db push`.

The app degrades gracefully until they're applied (activity log and teams show a setup notice; data is still
scoped per user by the app itself).

**Auth settings:** in Supabase → Authentication → URL Configuration, set *Site URL* to your production URL and add
`https://<your-domain>/auth/callback` to *Redirect URLs* so confirmation emails land back in the app.

## Deploy

Commit and push to `main`; Vercel builds from GitHub. See `CLAUDE.md` for project conventions.
