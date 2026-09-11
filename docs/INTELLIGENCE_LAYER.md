# Growth Mentor — Intelligence Layer

## Messy Inputs
- Free-text vision descriptions (verbose, unstructured)
- Free-text goal titles and target metrics (inconsistent units)
- Weekly scorecard notes (unstructured reflections)

## Auto-Structure Schema
```json
{
  "vision_id": "uuid",
  "week": "2025-01-13",
  "categories": ["health", "education"],
  "avg_score": 7.2,
  "trend": "improving",
  "weakest_goal": "uuid",
  "suggested_focus": "Increase running frequency"
}
```

## Events to Track
- Scorecard created
- Entry rated (per goal, per week)
- Goal created/deactivated
- Vision updated

## Scoring Rules (v1, rule-based)
- `overall_score = AVG(entry.progress_rating)` — stored on save
- `trend = compare current overall_score to previous week`
- `weakest_goal = entry with lowest rating`
- `category_avg = AVG(rating) GROUP BY category`

## What Gets Ranked
- Goals by category average score (which area needs attention)
- Weeks by overall score (trend over time)

## v1 vs Later
- **v1:** Rule-based overall_score, trend delta, weakest-goal flag — all computed in `lib/data/`.
- **Later:** AI-generated weekly summary text (stored with source/confidence/review_status), goal achievement predictions, personalized focus suggestions.