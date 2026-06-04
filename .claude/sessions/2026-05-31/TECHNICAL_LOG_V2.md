# TECHNICAL LOG V2 — Three Bug Fixes

**Date:** 2026-06-01
**Build:** PASS (zero TypeScript errors, zero new lint errors)

---

## Bug SC1 — Duration fields show raw seconds in ActionCard

**File:** `src/components/chat/ActionCard.tsx`

**Root cause:** `editableFields` initialization only checked `unit.toLowerCase() === 'hrs'` for duration conversion. Sleep tracker fields with `type: 'duration'` store values as raw seconds (e.g., `7020`) but their `fieldUnits` is not 'HRS', so the branch was never taken.

**Fix applied:**
1. Added a `fieldType === 'duration'` check BEFORE the `hrs` unit check. Converts raw seconds → `HH:MM:SS` using `card.fieldDefinitions?.[key]?.type`.
2. Updated `isStringValue` regex from `/^\d{2}:\d{2}$/` to `/^\d{2}:\d{2}(:\d{2})?$/` so HH:MM:SS strings don't trigger `col-span-2` layout.

**Lines changed:** `ActionCard.tsx:88-102` (duration type check added), `ActionCard.tsx:231` (regex updated for `isStringValue` in the ActionCard fields grid).

---

## Bug SC2 — Step 2 never appears after Step 1 completes

**File:** `src/components/chat/ChatInterface.tsx`

**Root cause:** The `done` event handler set a 600ms timeout calling `handleSendSilent('continue')`. The closure captured `currentSessionId` from the current render. On the very first message of a new session, `setCurrentSessionId(finalSessionId)` was just called but React hadn't re-rendered yet — `currentSessionId` was still `'new'`. The silent send 600ms later used `{ sessionId: 'new' }`, creating a fresh session with no `active_routine_id`, so Gemini returned a generic response instead of Step 2.

Secondary issue: `return () => { clearTimeout(timeoutId); setIsAutoPrompting(false) }` was useEffect cleanup syntax incorrectly inside an async function — it didn't clean up anything, it just returned early from `handleSendInternal` after the for-loop iteration.

**Fix applied:**
1. Added optional `sessionIdOverride?: string` parameter to `handleSendSilent`. Inside, `const sessId = sessionIdOverride ?? currentSessionId` is used everywhere instead of reading `currentSessionId` directly.
2. In the `done` handler, captured `const capturedSessionId = finalSessionId` before the timeout, then called `void handleSendSilent('continue', capturedSessionId)`.
3. Removed the `return () => { clearTimeout(timeoutId); setIsAutoPrompting(false) }` lines — replaced with a plain `setTimeout` (no return). The outer `for(;;)` reader loop continues to natural `done: true` break.

**Lines changed:** `ChatInterface.tsx:324-417` (handleSendSilent signature + sessId usage), `ChatInterface.tsx:511-527` (done handler timeout).

---

## Bug 3 — Orphaned day_state blocks future Start Day triggers

**File:** `src/app/api/chat/route.ts`

**Root cause:** When "Start Day" was triggered from the dashboard, `markDayStarted(today)` was called fire-and-forget before AI response. If the stream dropped or the user navigated away, `day_state.day_started_at` was set but no routine steps ran (orphaned state). The subsequent trigger check tested `day_started_at && !day_ended_at`, which was true for orphaned state — so it blocked the user with "Start day already complete" permanently.

**Fix applied — two guard locations updated:**

**Guard 1 — `routineId` path (line ~285):** Replaced single `finalActiveDayState !== null` block with three explicit checks:
- `!isSameDay` → block (different day still open)
- `isDayEnded` → block (day already completed)
- `isRoutineActive` (`!!finalActiveDayState.active_routine_id`) → block (routine in progress)
- Falls through on orphaned state (same day, not ended, no active routine) with a log message.

**Guard 2 — text guard (line ~385):** Replaced `day_started_at && !day_ended_at` with `!isSameDay || isDayEnded || isRoutineActive`. Orphaned state (same day, not ended, no active routine) falls through and allows re-trigger. `markDayStarted` called again is idempotent (upsert updates `day_started_at` timestamp only).

**Lines changed:** `route.ts:285-296` (routineId guard), `route.ts:385-397` (text guard).

---

## Build Verification

```
npm run build → PASS
✓ Compiled successfully
✓ Types valid
✓ 20/20 static pages generated
Zero new TypeScript errors introduced
```

Pre-existing warnings (not introduced by this change):
- `ChevronRight` imported but unused in ChatInterface.tsx
- `isAutoPrompting` assigned but never read in JSX (was already present)

[CA | 09:15] Delivered V2
