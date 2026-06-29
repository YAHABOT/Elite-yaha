# Session Log - 2026-06-29

## Summary of Changes
- **Database Workout Swap Capability**: Added a `swap` CLI command and command subparser to `data/pivot_workout.py` to allow safe, transactional, and archived session swaps.
- **Monday-Tuesday Workout Swap**: Swapped Monday, June 29 (Group Class) with Tuesday, June 30 (Open Gym / Workout Overhaul) in the database schedule, with full automatic archival backups to `coaching_prescribed_workouts_archive`.
- **Chat Session Deletion Fix**: Resolved a silent database transaction rollback bug during chat session deletions. Added pre-emptive deletion of child messages in `chat_messages` before deleting the parent session from `chat_sessions` in both `deleteSession` / `deleteSessions` (`yaha/src/lib/db/chat.ts`) and background cleanups (`yaha/src/lib/db/chat-cleanup.ts`), bypassing PostgreSQL RLS policy join constraints on cascaded deletes.
- **Real-time UI Delete Feedback**: Modified the `ChatSidebar.tsx` client component delete handlers to wrap deletions in `try...catch` blocks and display real-time error alert popups, eliminating silent failures.
- **Telegram Bot Token Rotation & Security Hardening**: Removed hardcoded Bot Token from `coaching.ts`, migrated next.js API alerts to load securely from `process.env.TELEGRAM_BOT_TOKEN`, configured production env variables on Vercel, and rotated/updated the token inside the local automation python scripts in `data/`.
- **Food Bank Priority & Precedence Fixes**: Refactored the food lookup system prompt in `prompt-builder.ts` to enforce that food bank entries always take absolute precedence over USDA. Added strict exact shortcut matching to prevent incorrect category mapping (e.g. mapping `froyo` shortcut to `sfic`), and added a UI-attached food bank check in `route.ts` to pass `isFoodBankAttached` for high-priority prompt overrides when the UI button is clicked.
- **Fitness Screenshot Field Mapping & Classification**: Extended system prompt guidelines (`prompt-builder.ts`) to enforce strict mapping of structured metrics (like `Training Load`, `Pace`, `Cadence`, `Avg HR`, `Max HR`, and zones) from fitness app screenshots directly into their corresponding tracker fields, preventing them from being dumped into the notes field. Added rules to keep values in the user's natural display format (pace maps directly as a decimal e.g. `5:31` -> `5.31`, duration zones map directly as strings e.g. `"23:40"`) rather than converting them to mathematical decimal minutes or raw seconds, letting the UI display them cleanly. Also added explicit run vs. workout tracker classification.


## Verified Status
- Database verification queries confirm that Monday and Tuesday workouts are successfully swapped and marked as `Pivot-Shifted`.
- Next.js production build (`npm run build`) completed with 0 errors.
- Chat interface test suite (`src/__tests__/chat/`) ran and 110/110 tests passed successfully.
- Direct Vercel production deployment succeeded, and chat deletion is confirmed working.
- Vercel env variable updated, secure build deployed, and rotated bot token tested successfully.
- Food bank priority checks, strict shortcut matching, and workout screenshot mapping changes successfully built, tested, and deployed to production.
