# Growth Mentor — Tasks

## Gantt
```
Sprint 1: [DB + Vision + Goals + Scorecard + Dashboard + History]
Sprint 2: [Auth + RLS Lock-down + AI Summaries]
Sprint 3: [Nudges + Predictions + Polish]
         ↑ v1 functional milestone (end of Sprint 1)
```

## Sprint 1 — Core Engine (v1 functional)
**Goal:** Full CRUD app working end-to-end, viewable without login.
- [x] Create Supabase tables + permissive RLS + seed data (visions, goals, weekly_scorecards, scorecard_entries)
- [x] Build `lib/data/` data-access layer for all CRUD
- [x] Vision page: create/edit/list visions
- [x] Goals page: create/edit/list goals (category, timeframe, target_metric, link to vision)
- [x] Scorecard page: "Start this week" → auto-generate entries per active goal; rate 1–10 + note; save
- [x] Compute overall_score on save (average of entries)
- [x] History page: list past scorecards with overall scores
- [x] Dashboard: latest week summary + trend delta
- [x] Sidebar nav (desktop) + hamburger (mobile)
- [x] Empty/error/loading states for all pages

**Definition of Done:** User creates a vision, adds two goals, starts a weekly scorecard, rates both goals, sees overall score persisted, navigates to history and sees the scorecard — all on refresh, no login required.

## Sprint 2 — Lock It Down + AI
**Goal:** Secure the app and add smart summaries.
- [x] Add Supabase auth (email/password)
- [x] Replace permissive RLS with owner-scoped `auth.uid() = user_id` policies
- [x] Add user_id assignment on all inserts
- [x] AI weekly summary draft (value+source+confidence+review_status) with user approval
- [x] Scorecard notes field populated by AI draft, user-edited before save

**Definition of Done:** Logged-in user sees only their own data; AI summary appears on scorecard with review_status field.

## Sprint 3 — Growth Features
**Goal:** Expand beyond core.
- [x] Nudge/reminder to fill weekly scorecard
- [x] Goal achievement predictions
- [x] Category-level trend charts
- [x] Student team management (invite students, view their scorecards)

**Definition of Done:** User receives a nudge if scorecard not started by Friday; trend charts render per category.