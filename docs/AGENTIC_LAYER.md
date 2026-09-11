# Growth Mentor — Agentic Layer

## Risk Levels

### Low (auto, no approval) — v1
- Compute overall weekly score from entry ratings
- Flag weakest goal and trend direction
- Sort goals by category average

### Medium (light approval) — later
- **Draft AI summary** of the week's performance → user reviews before saving
- **Draft goal adjustments** (e.g. "consider increasing target metric") → user approves

### High (always approval) — later
- **Send weekly recap email/notification** → user confirms before send
- **Create next week's scorecard automatically** → user confirms

### Critical (human-only) — never automated
- Delete a vision or goal
- Delete scorecard history
- Any data export or sharing

## Named Tools
- `compute_weekly_score(scorecard_id)` — calculates + persists overall_score
- `flag_weakest_goal(scorecard_id)` — marks lowest entry
- `draft_weekly_summary(scorecard_id)` — AI text draft (later), stored as ai_summary with review_status='unreviewed'

## Audit Log Fields
| Field | Type |
|------|------|
| id | uuid |
| actor | text (user/system) |
| action | text |
| target_table | text |
| target_id | uuid |
| detail | jsonb |
| created_at | timestamptz |

## v1 vs Later
- **v1:** Low-risk auto-computations only (score, trend, weakest goal). No agentic actions.
- **Later:** Draft summaries (medium), auto-create next scorecard (high), notifications (high).