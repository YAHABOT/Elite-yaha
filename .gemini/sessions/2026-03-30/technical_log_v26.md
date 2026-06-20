# Technical Log V26 — Scroll Regression Fix

**Task:** V26-1
**Date:** 2026-03-30
**Agent:** [CA | current]

---

## Changes Made

### 1. Chat page — `sessionId === 'new'` branch fix
**File:** `src/app/(app)/chat/[sessionId]/page.tsx`

The `sessionId === 'new'` branch was missing `min-h-0 overflow-hidden` on both wrapper divs, causing the flex column to overflow instead of confining scroll to the chat message area.

- Outer div: `flex h-full` → `flex h-full min-h-0 overflow-hidden`
- Inner div: `flex flex-1 flex-col min-h-0 bg-background` → `flex flex-1 flex-col min-h-0 overflow-hidden bg-background`

Now matches the existing-session branch at line 64.

---

### 2. Journal page — moved out of `(content)` into `(app)` directly

**Root cause:** `(content)/layout.tsx` is `overflow-y-auto`, which means DayView's `h-full` resolved to content height (not viewport height). The whole page scrolled as a unit. The journal header's `sticky top-0` was also broken because an ancestor had `overflow-hidden`, silently killing position sticky.

**Fix:** Moved journal out of `(content)` so it receives `h-full overflow-hidden` from `(app)/layout.tsx`'s `<main>` directly — same parent context as chat.

Files moved:
- `src/app/(app)/(content)/journal/page.tsx` → `src/app/(app)/journal/page.tsx` (content unchanged)
- `src/app/(app)/(content)/journal/loading.tsx` → `src/app/(app)/journal/loading.tsx` (content unchanged)
- `src/app/(app)/(content)/journal/correlations/page.tsx` → `src/app/(app)/journal/correlations/page.tsx` (content unchanged)
- Old `(content)/journal/` directory removed

---

### 3. DayView.tsx — removed `sticky top-0` from journal header

**File:** `src/components/journal/DayView.tsx` (line 181)

Removed `sticky top-0` from the header div. Now that journal is in the correct `h-full overflow-hidden` flex-column context, `flex-shrink-0` is the correct and sufficient approach (same as chat header). The `z-10` layering class was retained.

- Before: `className="sticky top-0 z-10 flex flex-shrink-0 ..."`
- After: `className="z-10 flex flex-shrink-0 ..."`

---

## Build Results

- `npm run lint`: PASS (warnings only — all pre-existing, none introduced by this change)
- `npm run build`: PASS — `/journal` and `/journal/correlations` routes resolved correctly at new path

## Route Map (confirmed in build output)

```
ƒ /journal                  7.16 kB  109 kB
ƒ /journal/correlations      167 B   102 kB
```

[CA | done] V26-1 DONE

---

# Technical Log V26-2 — Day Session Logic Fix

**Task:** V26-2
**Date:** 2026-03-30

---

## Fix A: Relative date resolution in routine prompt builder

**File:** `src/lib/ai/prompt-builder.ts`

**Root cause:** `buildRoutineSystemPrompt` used `GLOBAL_ANTI_HALLUCINATION_RULES` which contains the `{{ACTUAL_TODAY}}` placeholder, but only replaced `{{TODAY}}` (line 279 before fix). When `actualDate` differed from `date` (e.g., day session locked on March 30 but device is March 31), the routine prompt left `{{ACTUAL_TODAY}}` unreplaced — causing the AI to receive a literal template variable instead of the real device date for relative arithmetic.

**Fix:** Added `actualToday` variable derived from `actualDate ?? today` and appended `.replace(/{{ACTUAL_TODAY}}/g, actualToday)` to the rules replacement. Also injected `Actual current date: ${actualToday}` into the routine prompt header for full parity with the health prompt.

Note: `buildHealthSystemPrompt` was already correct — it properly replaced both `{{TODAY}}` and `{{ACTUAL_TODAY}}` on line 182.

---

## Fix B: Block Start Day trigger when active session exists

**File:** `src/app/api/chat/route.ts`

**Root cause:** No guard existed to prevent a second Start Day from triggering while a day session was already open. Both the `routineId` (Dashboard button) and `routineMatchResult` (NL trigger) paths called `markDayStarted` without checking `activeDayState`.

**Fix:** Added a guard in both trigger paths. When `routine.type === 'day_start'` AND `activeDayState !== null`:
1. Saves user message to DB
2. Returns blocking assistant response: `"Start day for [date] is already in progress. Please end yesterday's session first before starting a new one."`
3. Persists assistant message to DB (proper chat history)
4. Returns early — Gemini is never called, no session state is mutated

The `activeDayState` value is already fetched in the parallel `Promise.all` block so this adds zero extra DB round-trips.

---

## Build Results

- `npm run lint`: PASS (warnings only — all pre-existing, none introduced)
- `npm run build`: PASS — compiled successfully in 16.1s, 0 errors

[CA | done] V26-2 DONE

---

# Technical Log V26-3 — Routine State Persistence

**Task:** V26-3
**Date:** 2026-03-30

---

## Analysis

`current_step_index` column already exists in `chat_sessions` (from migration `20260313010000_routine_and_agent_state.sql`, `INTEGER DEFAULT 0`). The route handler already guards against NL re-detection when `session.active_routine_id` is set. The gap was in the client: on `/chat/new?routine=X` page refresh, `initialSession=null`, `initialMessages=[]`, and the trigger effect re-fired the routine from step 0.

---

## Changes Made

### 1. Migration — `supabase/migrations/20260330000000_add_current_routine_step.sql`

Added `current_routine_step INTEGER` (nullable) per task spec. The existing `current_step_index` column already serves this purpose; this migration adds the spec-named column with `IF NOT EXISTS` for forward compatibility.

### 2. `src/lib/db/chat.ts` — `updateRoutineStep` function

Added named function that wraps `updateSession` specifically for step persistence. Provides a clear, intent-signaling API for callers advancing through routine steps. Uses `step ?? 0` to map null to 0 (matching existing column DEFAULT).

### 3. `src/components/chat/ChatInterface.tsx` — triple-lock refresh guard

**Problem path:** User at `/chat/new?routine=X` → routine starts → session saved to DB with `active_routine_id` → URL stays `/chat/new` (intentional, avoids Next.js remount) → page refresh → `triggerSent.current` resets, `messages = []`, trigger fires again → routine restarts from step 0.

**Fix (three-layer guard):**

1. **`session?.active_routine_id` check** — if session state is already hydrated with an active routine (from prior API response), skip trigger. Handles in-session rapid reloads.

2. **sessionStorage session redirect** — after `handleSendInternal` fires with a `routineId`, stores the real DB `sessionId` under `yaha_trigger_session_${routineId}`. On next mount, if this key + TTL key exist within the 30-min window, `router.replace('/chat/[sessionId]')` — loads the real session from DB with `active_routine_id` and `current_step_index` intact.

3. **TTL extended from 5s to 30 minutes** — `ROUTINE_TRIGGER_TTL_MS = 30 * 60 * 1000` (module-level constant). The previous 5s TTL was too short for mid-routine refreshes.

**Cleanup:** On routine completion (detected in `handleSubmit` and `handleSendSilent` session state refresh when `nextSession.active_routine_id` is null), both `yaha_trigger_*` sessionStorage keys are cleared. This ensures the next run of the same routine starts fresh.

---

## What Was Already Correct (no changes needed)

- Route handler NL detection guard: `(!session.active_routine_id && !routineId && message)` — already prevents re-detection when routine is active
- `routineId` explicit path: only enters `else if (routineId)` when `!activeRoutineRaw` — so an active routine prevents re-initialization via direct ID too
- `current_step_index` display in ChatInterface reads from `session` state initialized from `initialSession` — correct on load for existing sessions

---

## Build Results

- `npm run lint`: PASS (warnings only — all pre-existing, none introduced)
- `npm run build`: PASS — compiled successfully, all routes resolved

[CA | done] V26-3 DONE
