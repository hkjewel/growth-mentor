# Growth Mentor — PRD

## Problem
Productivity tools optimize for marginal improvement, keeping users in safe, linear cycles. People need a system anchored to a 10-year vision that forces exponential (10x) thinking — then translates that into weekly, measurable action.

## Target User
The builder and their students — individuals seeking personal growth coaching without paying for an expensive mentor.

## Core Objects
- **Vision** — a 10-year north-star statement; the system's primary constraint.
- **Goal** — short-term or long-term objective tied to a vision, categorized as health, soft-skill, or education. Each has a target metric.
- **Weekly Scorecard** — one per week; aggregates progress across all active goals.
- **Scorecard Entry** — per-goal weekly progress rating (1–10) with a short note.

## MVP (v1) — must-haves
- [ ] Create/edit a 10-year Vision
- [ ] Create/edit Goals (short/long-term, category, target metric)
- [ ] Generate a weekly scorecard with one entry per active goal
- [ ] Rate each goal 1–10 + note; see an overall weekly score
- [ ] View scorecard history (past weeks)
- [ ] All CRUD persists to the database; no dead buttons
- [ ] App renders with seed data for anonymous visitors (no login wall)

## Non-goals (v1)
- No AI-driven coaching suggestions or nudges
- No human mentor review/approval
- No authentication or per-user isolation (later sprint)
- No social or team features
- No payments or billing

## Success Criteria
A user opens the app, creates a 10-year vision, adds two goals (one health, one education), starts a weekly scorecard, rates both goals 1–10, and sees an overall weekly score — all persisted and visible in scorecard history on refresh.