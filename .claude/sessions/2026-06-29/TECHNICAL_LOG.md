# Technical Log - 2026-06-29

## Issue 1: Monday-Tuesday Workout Swap
**Root Cause:**
Coaching session adjustments required swapping Monday's workout (Group Class) with Tuesday's approved Open Gym (Workout Overhaul) session. Previously, the database command tool `data/pivot_workout.py` only supported moving a workout to a new date, but not swapping two scheduled dates in a single transaction.

**Resolution:**
1. Modified `data/pivot_workout.py` to add a transaction-backed `swap` command.
2. Added `swap_workouts(date1, date2, reason)` function which fetches both target dates, validates that they exist, handles archiving of the existing records into `coaching_prescribed_workouts_archive`, and performs a safe update swapping the records inside a transaction.
3. Executed `python data/pivot_workout.py swap --date1 2026-06-29 --date2 2026-06-30 --reason "Pivot Monday/Tuesday workout swap requested by coach"` to perform the calendar shift. Monday, June 29 is now `Open Gym` and Tuesday, June 30 is `Group Class`.

---

## Issue 2: Chat Deletion Silently Rollback (RLS Cascade Delete Limitation)
**Root Cause:**
In the database schema, the `chat_messages` table references the `chat_sessions` table with an `ON DELETE CASCADE` constraint. However, the `chat_messages` Row-Level Security (RLS) policy checks session ownership by performing a join query back to the `chat_sessions` table:
```sql
CREATE POLICY "Users own messages through sessions" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  )
```
When a client attempted to delete a parent session, the cascade delete on `chat_messages` was executed. But because the parent session row in `chat_sessions` was already marked for deletion/modified in the transaction state, the subquery in the RLS policy check failed to find the parent session. This triggered a permission denied error, rolling back the transaction silently on the database.

**Resolution:**
1. Modified `deleteSession` and `deleteSessions` in `yaha/src/lib/db/chat.ts` to pre-emptively query and delete matching rows from `chat_messages` first (before deleting the parent session). Because the parent session still exists during the first step, the RLS policy subquery succeeds.
2. Modified the background cleanup script `cleanupStaleTemporarySessions` in `yaha/src/lib/db/chat-cleanup.ts` to apply the same sequence, avoiding background rollback failures.
3. Modified `ChatSidebar.tsx` to wrap deletions in `try...catch` blocks and display real-time browser alerts if any errors occur, instead of failing silently.
4. Deployed changes live to Vercel production. Deletions are now functional and verified on the client.

**How it will be prevented going forward:**
1. **Be mindful of RLS joins on cascade deletions:** When defining foreign key relationships with `ON DELETE CASCADE` on tables protected by RLS policies that join back to the parent table, always perform deletions sequentially from children to parent in application logic.
2. **Expose Server Action rejection paths in UI:** Ensure all server action calls in React components wrap execution in try-catch structures and handle rejected promises explicitly via user-facing alerts.
