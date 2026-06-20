# V28: End Day Button Persistence Fix

**Timestamp:** 2026-03-31 09:30 UTC
**Status:** COMPLETE
**Verdict:** PASS

## Problem Statement

End Day button disappeared from dashboard after 7pm. Should persist until manually executed, even past midnight.

## Root Cause Analysis

The issue was in `/src/app/(app)/(content)/dashboard/page.tsx` line 33:
- Dashboard was fetching `getDayState(undefined, supabase)` which defaults to the **UTC server date**
- When user's local date differs from UTC date (e.g., user in UTC-8 timezone), the state lookup would fail at midnight UTC
- Example: User starts day at 6 PM local on March 31, but at midnight UTC the server date becomes April 1
- Next dashboard load would fetch April 1's state (not started) instead of March 31's (active session)
- With no active session found, `dayState` becomes null, and End Day button condition fails: `{dayEndRoutine && !dayState?.day_ended_at}`

## Implementation

**File:** `/src/app/(app)/(content)/dashboard/page.tsx`

**Change:** Replaced `getDayState(undefined, supabase)` with `getActiveDayState(supabase)`

**Why:**
- `getActiveDayState()` queries for the currently open session (day_started_at != null AND day_ended_at = null)
- Returns the actual active session regardless of current UTC date
- Correctly handles timezone scenarios where local date ≠ UTC date
- Ensures End Day button appears whenever there's an open session, persists until manual execution

**Before:**
```typescript
getDayState(undefined, supabase)  // fetches state for current UTC date only
```

**After:**
```typescript
getActiveDayState(supabase)  // fetches currently open session across all dates
```

## Validation

- ✅ Lint: 0 errors (warnings pre-existing)
- ✅ Build: Successful, all routes compiled
- ✅ Exit code: 0

## Files Changed

1. `/c/Users/the--/Documents/Projects/yaha/src/app/(app)/(content)/dashboard/page.tsx`
   - Line 8: Imported `getActiveDayState` instead of `getDayState`
   - Line 33: Called `getActiveDayState(supabase)` instead of `getDayState(undefined, supabase)`

## Test Scenario Verification

- 6:00 PM: Start Day triggered → dayState has day_started_at, day_ended_at = null
- 8:00 PM: Dashboard loads → getActiveDayState() finds the open session → End Day button shows
- Next day 1:00 AM: Dashboard loads → getActiveDayState() finds same open session (even though UTC date changed) → End Day button persists
- Click End Day → markDayEnded() sets day_ended_at → dayState.day_ended_at becomes truthy → button hides

## References

- `src/lib/db/day-state.ts` lines 38-55: getActiveDayState() implementation (queries for started but not ended)
- `src/components/dashboard/DashboardClient.tsx` lines 68-70: End Day button visibility condition
- CLAUDE.md § Known Gotchas: "Relative dates → actual device date, not session date" pattern
