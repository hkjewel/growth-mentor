# Growth Mentor — Security

## Secret Handling
- Supabase service key stays server-side only — never in client bundle.
- Use Supabase anon key for client reads/writes (permissive v1 policies).
- All DB writes go through `lib/data/` server actions, never inline in UI.
- Environment variables in `.env.local`, never committed.

## Permission Model
- **v1:** Permissive RLS — anonymous read/write (demo-first, no login wall).
- **Lock-down sprint:** Replace all policies with `auth.uid() = user_id` for owner-scoped access.
- Agent inherits the user's permissions — no elevated access.

## Approved Tools Rule
- Only named functions in `lib/data/` may touch the database.
- No raw SQL or dynamic queries from UI components.
- No `run_any` or `send_any` — only typed, named operations.

## Audit Principle
- Every meaningful write (scorecard created, entry rated, goal added) is logged to audit_logs with actor, action, target, and timestamp.
- Audit logs are append-only — never deleted by the app.

## Honest Note
Per-user data isolation and production-grade RLS requires the lock-down sprint before real student data goes in. v1 demo data is intentionally open.