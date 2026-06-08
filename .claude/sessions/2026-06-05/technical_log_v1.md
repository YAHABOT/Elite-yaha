# Technical Log V1 — 2026-06-05
## T50: Duration Display Fix + Routine Step Double-Ask Guard

**Status:** COMPLETE ✓
**Commit:** `28b1434`
**Deployed:** `yaha-flame.vercel.app` ✓

---

## Bug 1 — ActionCard Raw Seconds Display

### Symptom
Sleep tracker action cards showed raw seconds: `28320`, `26700`, `1620`, `6360`, `16320`, `3420` instead of formatted durations.

### Root Cause
`src/components/chat/ActionCard.tsx` display path (non-edit mode) did `String(value)` unconditionally. No check for `fieldDefinitions[key].type === 'duration'`. Duration fields store seconds as integers in the `fields` JSONB.

Known gotcha (CLAUDE.md): _"ActionCard duration display: use `fieldDefinitions[key].type === 'duration'` not `unit === 'hrs'`"_

### Fix — `src/components/chat/ActionCard.tsx`

Added helper at top of file:
```typescript
function formatDuration(seconds: number): string {
  const total = Math.round(Math.abs(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
```

Call site in display path:
```typescript
const isDuration = card.fieldDefinitions?.[key]?.type === 'duration'
const numValue = typeof value === 'number' && !isNaN(value)
  ? value
  : typeof value === 'string' ? parseFloat(value) : NaN

// Render:
isDuration && !isNaN(numValue)
  ? formatDuration(numValue)   // → "7:52:00"
  : String(value)              // original path
```

Unit pill suppressed for duration fields (H:MM:SS already communicates the unit).

---

## Bug 2A — Stale "Step 1 In Progress" Badge

### Symptom
After routine step 1 completes and step 2 begins, badge in chat header remained "Step 1 In Progress".

### Root Cause
`handleSendInternal` (the path for user-typed messages) never refreshed `session` state after receiving a response. Only `handleSendSilent` did the refresh. So `session.current_step_index` in React state stayed at 0 regardless of what the server advanced to.

### Fix — `src/components/chat/ChatInterface.tsx`

Added post-SSE session refresh in `handleSendInternal`, after the `for(;;)` reader loop, before `finally`:
```typescript
if (finalSessionId && finalSessionId !== 'new') {
  const sessRes = await fetch(`/api/chat/sessions/${finalSessionId}`)
  if (sessRes.ok) {
    const nextSession = await sessRes.json()
    if (!isMountedRef.current) return
    setSession(nextSession)
    if (nextSession.active_routine_id) {
      const routRes = await fetch(`/api/routines/${nextSession.active_routine_id}`)
      if (routRes.ok && isMountedRef.current) setCurrentRoutine(await routRes.json())
    } else {
      setCurrentRoutine(null)
    }
  }
}
```

---

## Bug 2B — Step 2 Asked Again After Completion

### Symptom
After user answered step 2 and got "Logged Successfully", the routine asked step 2 again in the next message.

### Root Cause (multi-factor)

1. **Stale auto-advance timer**: `shouldAutoPromptNextStep=true` fires a 600ms `setTimeout` calling `handleSendSilentRef.current?.('continue', ...)`. If the user manually typed a message during those 600ms, `isLoading=true` so the timer bails. But if the user typed AFTER the 600ms elapsed and `isLoading` was false again, the timer could fire at any point after and re-send "continue" for an already-answered step.

2. **`capturedStepIndex` stale**: The step index used for the guard was captured from `session?.current_step_index` at `done` SSE event time — BEFORE the post-SSE session refresh. So the guard compared against the pre-advance value, weakening its effectiveness.

3. **`handleSendSilent` didn't chain `shouldAutoPromptNextStep`**: After step 1 auto-advanced via silent message, the chain broke. User had to manually type to proceed with step 2+, which created the double-trigger scenario.

### Fix — `src/components/chat/ChatInterface.tsx`

**1. `autoAdvanceStepRef` guard (new ref)**
```typescript
const autoAdvanceStepRef = useRef<number>(-1)
```

**2. Reset on user send** (top of `handleSendInternal`):
```typescript
autoAdvanceStepRef.current = -1  // cancels any pending timer for same step
```

**3. Timer scheduling with guard** (in `handleSendInternal` `done` block):
```typescript
// Capture AFTER session refresh so index is post-advance value
const capturedStepIndex = (nextSession as { current_step_index?: number }).current_step_index ?? 0
autoAdvanceStepRef.current = capturedStepIndex

setTimeout(() => {
  if (isMountedRef.current && autoAdvanceStepRef.current === capturedStepIndex) {
    void handleSendSilentRef.current?.('continue', capturedSessionId)
    setIsAutoPrompting(false)
  } else {
    setIsAutoPrompting(false)
  }
}, 600)
```

**4. `handleSendSilent` chains `shouldAutoPromptNextStep`**

`handleSendSilent` now reads `shouldAutoPromptNextStep` from its own SSE `done` event and schedules the next silent advance with the same guard. This keeps the entire routine flowing silently without user needing to type manually between steps.

---

# T52 — User Feedback Popup + Insights Dashboard Section
**Commit:** `e67fc2f`

## What was built
- `supabase/migrations/20260605000001_feedback_responses.sql` — table + RLS (⚠️ needs manual apply)
- `src/app/actions/feedback.ts` — `checkFeedbackEligibility()` (5-day interval, excluded emails: armaan1993, violetmikulchik, 1993armaan) + `submitFeedback()`
- `src/components/feedback/FeedbackModal.tsx` — mounts in app layout; shows after 4s OR on `yaha:log-confirmed` event; sessionStorage dismiss; 3 response buttons (very_helpful/helpful_needs_work/not_helpful) + comment textarea
- `src/lib/db/analytics.ts` — `getFeedbackInsights()` + `FeedbackInsights` type wired into `getAdminInsights()`
- `src/components/admin/InsightsDashboard.tsx` — User Feedback section: 3 stat cards + comments feed + response rate

---

# T53 — Item Name Colon-Append Fix
**Commit:** `814d3f8`
**File:** `src/lib/ai/prompt-builder.ts`

## Bug
AI wrote "Snack: Pão de Alfarroba, Cottage Cheese, Honey" in Item Name field.

## Fix
Added explicit rule in MEAL NOTES section: Item Name = short label only. No colon. No ingredient list appended. All ingredient detail goes in Notes/Meal Notes field only.

---

# T54 — Meal Notes Always-On + Attach File Direct Picker
**Commit:** `8ab96d7`
**Files:** `src/lib/ai/prompt-builder.ts`, `src/components/chat/ChatInterface.tsx`

## Bug 1 — MEAL_NOTES_RULE not firing on text-only messages
`MEAL_NOTES_RULE` was inside `VISION_CAPABILITY` constant — only injected when `hasImage = true`. Text-only or file-only messages never received the rule.

**Fix:** Extracted as standalone `const MEAL_NOTES_RULE` injected unconditionally after `GLOBAL_ANTI_HALLUCINATION_RULES` in the prompt template.

## Bug 2 — Attach File showed Android intent chooser
`ACCEPTED_FILE_TYPES` included `audio/ogg, audio/mpeg, audio/mp4, audio/wav, audio/flac, audio/aac` — Android saw audio capability and showed Camera/Voice Recorder/Files chooser instead of going straight to files.

**Fix:** Removed all audio MIME types from `ACCEPTED_FILE_TYPES`.

---

# T55 — Duration Sleep AI Output + Image Types + Tracker Name
**Commit:** `cc9fd9f`
**Files:** `src/lib/ai/prompt-builder.ts`, `src/components/chat/ChatInterface.tsx`, `src/components/trackers/TrackerCard.tsx`

## Bug 1 — AI outputting hour digit instead of seconds for sleep
Sleep confirmation card showed `0:00:07` (7 seconds) instead of `7:14:00`. AI extracted "7h 14min" and output `7` (just hours digit) rather than `26040` seconds.

**Fix:** Added explicit sleep conversion examples to `DURATION_FORMAT_RULE`:
- `7h 14min = 26040 seconds (NOT 7)`
- `0h 48min = 2880 seconds (NOT 0 or 48)`
- `1h 45min = 6300 seconds (NOT 1 or 105)`

## Bug 2 — Attach File still showed Camera on Android
Even after removing audio types, `image/jpeg, image/png, image/webp, image/gif` in `ACCEPTED_FILE_TYPES` still triggered Android's Camera intent.

**Fix:** Removed all image types from Attach File input. Now: `.txt,.pdf,.csv,application/pdf,text/plain,text/csv` only. Images go via Photo Library button.

## Bug 3 — Tracker name cutoff
`h3` had `truncate` class → "HYROX BENCHMARK" cut to "HYROX BENCHM..."

**Fix:** Removed `truncate`, added 3-line `-webkit-line-clamp`. Reduced `p-4→p-3`, `gap-3→gap-2`, icon `h-10→h-9`. Buttons `px-3 py-1.5→px-2.5 py-1`.

---

# T56 — Routine Auto-Advance Root Cause Fix
**Commit:** `8eefca9`
**File:** `src/components/chat/ChatInterface.tsx`

## Root Cause
Day End step 1 (Overview) always produces LOG_DATA action cards. The previous mechanism set `shouldAutoPromptNextStep = true` and fired "continue" via a 600ms timer — BEFORE the user confirmed the action card. The "continue" request raced the pending card state:
- "continue" → server processes with step_index=1 → AI asks step 2 question
- Meanwhile the step 1 action card was still pending
- User confused — didn't see or missed the step 2 question
- Day Start worked because those steps either have no action card, or the timer arrived after confirmation

## Fix
Added `pendingRoutineAdvanceSessionRef = useRef<string | null>(null)`.

**In SSE done handler:** when `shouldAutoPromptNextStep = true` AND response has LOG_DATA cards:
- Set `pendingRoutineAdvanceSessionRef.current = finalSessionId`
- Do NOT schedule 600ms timer

**Timer path kept** for skip flow (no action cards).

**`onConfirmed` restored** on ActionCard:
```typescript
onConfirmed={() => {
  const pendingSessId = pendingRoutineAdvanceSessionRef.current
  if (pendingSessId) {
    pendingRoutineAdvanceSessionRef.current = null
    void handleSendSilentRef.current?.('continue', pendingSessId)
  }
}}
```

"continue" now fires exactly when user taps Log Entry — clean sequencing.

`pendingRoutineAdvanceSessionRef` is cleared on manual user send to prevent stale fires.

---

# T57 — App Cold Start Warmup
**Commits:** `5d63994`, `5928dd7`
**Files:** `src/app/api/warmup/route.ts`, `vercel.json`

## Problem
20-second black screen on app open after idle. Vercel serverless function cold start.

## Fix
- Created `/api/warmup` GET endpoint — returns `{ ok: true, ts: Date.now() }` instantly, no DB calls
- Vercel Hobby plan blocks sub-daily crons so `*/5 * * * *` was removed from vercel.json
- **External fix needed:** [cron-job.org](https://cron-job.org) → `https://yaha-flame.vercel.app/api/warmup` → every 5 min

---

## Production Status
All commits deployed to `yaha-flame.vercel.app` ✓
Latest: `5928dd7` — target: production — created: 2026-06-06

---

## Code Review Findings (CR)

| Severity | Finding | Resolution |
|----------|---------|------------|
| Medium | `formatDuration` no NaN/fractional guard | Fixed: `Math.round(Math.abs(seconds))` |
| Medium | `capturedStepIndex` from pre-refresh stale value | Fixed: moved capture to after `setSession(nextSession)` |
| Low | `handleSendSilent` race window after early `setIsLoading(false)` | Noted, acceptable — low probability window |
| Info | String-typed durations fall through to raw display | Fixed: `parseFloat` fallback at call site |

**Verdict: PASS** (after fixes applied)

---

## QA

| Test | Result |
|------|--------|
| Sleep tracker action card shows H:MM:SS | ✅ User confirmed |
| Build passes (`npm run lint && npm run build`) | ✅ Zero new errors |
| Deployed to production | ✅ `yaha-flame.vercel.app` |

---

[CA | session] Delivered
[CR | session] PASS WITH NOTES → PASS after fixes
[QA | user] PASS ✓

---

# T51 — Duration Edit Mode Fix

**Commit:** `fca2d40`
**File:** `src/components/chat/ActionCard.tsx`

## Bug
Hitting the edit (pencil) button on an ActionCard reverted duration fields from H:MM:SS back to raw seconds (3751, 785, 160).

## Root Cause
`editableFields` initializer checked `unit.toLowerCase() === 'hrs'` to detect duration fields. This was the old format (decimal hours → HH:MM). The unit strings no longer match `'hrs'`, so duration fields fell through to `return [key, value]` — raw seconds in the input.

## Fixes

**1. `editableFields` init — correct type check:**
```typescript
if (card.fieldDefinitions?.[key]?.type === 'duration') {
  const numVal = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
  if (!isNaN(numVal)) return [key, formatDuration(numVal)]  // → "1:02:31"
}
```

**2. `parseDuration` helper — H:MM:SS → seconds:**
```typescript
function parseDuration(str: string): number | null {
  const parts = str.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60
  return null
}
```

**3. `handleConfirm` — convert back to seconds before saving:**
```typescript
const fieldsToConfirm = Object.fromEntries(
  Object.entries(editableFields).map(([key, val]) => {
    if (card.fieldDefinitions?.[key]?.type === 'duration' && typeof val === 'string' && val.includes(':')) {
      const secs = parseDuration(val)
      return [key, secs ?? val]
    }
    return [key, val]
  })
)
```

**4. Analytics comparison fix:**
Duration fields previously always flagged as "user changed" because `String(3751) !== "1:02:31"`. Now compares `parseDuration(edited) !== Math.round(original)`.

[CA | session] Delivered — build PASS
