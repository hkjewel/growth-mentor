# Growth Mentor — Data Model

## visions
| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| user_id | uuid | nullable (auth later) |
| title | text | e.g. "Become a leader in AI education" |
| description | text | detailed vision statement |
| horizon_years | int | default 10 |
| created_at | timestamptz | default now() |

## goals
| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| user_id | uuid | nullable |
| vision_id | uuid | FK → visions.id |
| title | text | e.g. "Run 3x per week" |
| category | text | health \| soft_skill \| education |
| timeframe | text | short_term \| long_term |
| target_metric | text | e.g. "150 min/week" |
| is_active | bool | default true |
| created_at | timestamptz | |

## weekly_scorecards
| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| user_id | uuid | nullable |
| week_start_date | date | Monday of that week |
| overall_score | numeric | avg of entries, computed on save |
| ai_summary | text | AI-generated (later) — value+source+confidence+review_status |
| ai_summary_source | text | |
| ai_summary_confidence | numeric | |
| ai_summary_review_status | text | default 'unreviewed' |
| notes | text | user's reflection |
| created_at | timestamptz | |

## scorecard_entries
| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| scorecard_id | uuid | FK → weekly_scorecards.id |
| goal_id | uuid | FK → goals.id |
| progress_rating | int | 1–10 |
| note | text | optional per-goal note |
| created_at | timestamptz | |

## Relationships
- Vision 1→many Goals
- Weekly Scorecard 1→many Scorecard Entries
- Scorecard Entry N→1 Goal

## RLS / Permissions
All tables: permissive v1 (anonymous read/write). Lock-down sprint replaces with `auth.uid() = user_id` policies. Weekly scorecard unique constraint on (user_id, week_start_date) — one per week.