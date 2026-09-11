# Growth Mentor — Test Plan

## v1 Success Scenario (manual)
1. Open app (no login) → Dashboard loads with seed data, sidebar visible
2. Go to Vision → click "New Vision" → enter "Lead AI education globally" → save → appears in list
3. Go to Goals → click "New Goal" → title "Run 3x/week", category "health", timeframe "short_term", target_metric "150 min/week", link to vision → save → appears in list
4. Add second goal: "Read 1 book/month", category "education", timeframe "long_term"
5. Go to Weekly Scorecard → click "Start this week" → two entries appear (one per goal)
6. Rate goal 1: 8/10, note "Ran twice, close to target"; rate goal 2: 6/10, note "Behind on reading"
7. Click "Save scorecard" → overall_score shows 7.0 → persisted
8. Refresh page → scorecard still visible with scores
9. Go to History → see the scorecard in the list with date and score

## Empty States
- Vision page with no visions: shows "No vision yet. Create your 10-year vision to start."
- Goals page with no goals: shows "No goals yet. Add a goal linked to your vision."
- Scorecard page with no active goals: shows "Add goals first to generate a scorecard."
- History page with no past scorecards: shows "No scorecards yet. Start your first weekly review."

## Error States
- Supabase unreachable: scorecard save shows "Could not save — please try again" with retry button
- Invalid rating (0 or 11): form validation prevents submission, shows "Rating must be 1–10"
- Duplicate week scorecard: shows "A scorecard already exists for this week"