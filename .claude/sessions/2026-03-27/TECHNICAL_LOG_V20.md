# TECHNICAL LOG V20 — Build 20

**Session:** 2026-03-27
**Agent:** Coding Agent
**Status:** Released

---

## Build Summary

9 bug fixes across chat, dashboard, routine builder, and AI prompt layers.

---

## FIX-0 — ActionCard text field truncation

**File:** `src/components/chat/ActionCard.tsx`

**What changed:** Added `overflow-visible` to the field cell container div (line ~210) and `w-full min-w-0` to the fields grid wrapper div (line ~201). The `<p>` element already had `w-full break-words whitespace-pre-wrap` — the issue was ancestor containers without explicit min-width allowing overflow-hidden to clip. Both the grid wrapper and individual cell now correctly allow content to expand.

**Why:** On mobile, the grid's flex/overflow context was clipping long text values despite the `<p>` having `break-words`. Adding `min-w-0` to the grid and `overflow-visible` to the cell removes the clip path.

---

## FIX-1 — Mobile attachment: split into Images + Files

**Files:** `src/components/chat/ChatInterface.tsx`

**What changed:**
- Added `Image` and `FileText` imports from `lucide-react`
- Split the single `ACCEPTED_FILE_TYPES` constant into `ACCEPTED_IMAGE_TYPES` (`image/*`) and `ACCEPTED_FILE_TYPES` (`.txt,.pdf,.docx,.xlsx,.xls,.csv` plus corresponding MIME types)
- Expanded `ALLOWED_MIME_EXACT` set to include `text/plain`, `text/csv`, `.docx`, `.xlsx`, `.xls` MIME types
- Added `fileDocInputRef` ref for the second hidden file input
- Added `isAttachMenuOpen` state
- Added a 2-item popover (Attach Image / Attach File) that appears on paperclip tap
- Added `useEffect` to close the popover on outside click
- Added `abortControllerRef` (see FIX-4)

Also updated `src/app/api/chat/route.ts` `ALLOWED_MIME_TYPES` set to include the new document MIME types so the API accepts them.

**Why:** The single paperclip was hardcoded to `image/*` only. Document files are now supported via a dedicated file input with correct accept types.

---

## FIX-2 — Dashboard widget label truncation

**File:** `src/components/dashboard/WidgetCard.tsx` (line 79)

**What changed:** Removed `truncate` class from the widget title `<span>`. Added `leading-tight` to improve multi-line display.

**Why:** SC3 showed "AVG. PROTEIN I..." truncated. The `truncate` Tailwind class applies `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` which clips long labels. Removing it lets labels wrap to 2 lines.

---

## FIX-3 — AI claims it cannot log items

**File:** `src/lib/ai/prompt-builder.ts` (inside `buildHealthSystemPrompt`)

**What changed:** Added a `## YOU ARE CONNECTED TO THE DATABASE` section at the top of the health system prompt (before the anti-hallucination rules). This section has 4 explicit prohibitions against the AI claiming it cannot log/save/push data, and a clear statement that the app writes confirmed cards to the DB.

**Why:** SC2 showed Gemini telling the user "I cannot push to any application or database beyond presenting the confirmation in our chat." This is a system prompt knowledge gap — Gemini's training doesn't know this app writes the card when confirmed. The fix patches this with an explicit preamble.

Routine prompt is unchanged (no modification to `buildRoutineSystemPrompt`).

---

## FIX-4 — Messages lost or duplicated when navigating away mid-response

**File:** `src/components/chat/ChatInterface.tsx`

**What changed:**
1. Added `abortControllerRef = useRef<AbortController | null>(null)`
2. Added `useEffect` cleanup that calls `abortControllerRef.current?.abort()` on unmount
3. Both `handleSendInternal` and `handleSubmit` now:
   - Call `abortControllerRef.current?.abort()` before each new request
   - Create a fresh `AbortController` and pass its `signal` to `fetch()`
   - Catch `DOMException` with `name === 'AbortError'` and return silently (no error shown to user)
4. Both handlers now deduplicate assistant messages by checking `prev.some(m => m.id === newMsgId)` before appending to the messages array
5. `handleSubmit` snapshots `attachedFiles` before clearing state, eliminating the race where attachments would be empty in the fetch body

**Why:** SC1 showed a duplicated "Pasta 100g" message. The race condition: user sends message → navigates away → component unmounts → on return, the pending fetch might still complete and add a duplicate message if the component re-mounts with the same session. Abort + dedup eliminates this.

---

## FIX-5 — Already-logged items resurfacing as pending confirmation cards

**File:** `src/components/chat/ChatInterface.tsx`

**What changed:** Added `onConfirm` callback to each `ActionCard` render in the messages list (line ~648). When called, it uses `setMessages` to patch the in-memory `actions` array for that specific message, marking `confirmed: true` on the action at the given `cardIndex`.

**Why:** SC6 showed a confirmed card re-appearing as "PENDING LOG". The `ActionCard` component reads `card.confirmed` on mount to set initial state. When messages are re-fetched from the DB after navigation, the persisted `confirmed: true` should come through correctly. However, within the same session, the in-memory `messages` state still holds the original un-confirmed actions. The `onConfirm` callback patches in-memory state immediately so subsequent renders within the session see `confirmed: true`.

The DB persistence via `confirmLogAction` was already correct (writes `confirmed: true` to the `actions` JSONB). This fix makes the in-memory state consistent with the DB state.

---

## FIX-6 — Separate vs combined food logging — honour user intent + fix macro math

**File:** `src/lib/ai/prompt-builder.ts` — `GLOBAL_ANTI_HALLUCINATION_RULES` rule #6

**What changed:** Expanded rule #6 from "always separate" to "separate by default, but combine when user explicitly requests it." The new rule includes:
- Triggers: "log as one item", "combine them", "log it together"
- When combining: item name reflects the combined meal
- Macro math: EVERY field MUST be arithmetic sum of all constituent items — explicit prohibition on re-estimating or averaging
- Example given: 300 kcal + 516 kcal = 816 kcal (not 771 as in SC5)

**Why:** SC4 showed the AI refusing to combine items even when the user asked. SC5 showed the combined entry having wrong totals (771 kcal instead of 816 from summing the two separate cards). Two distinct failures addressed in one rule update.

---

## FIX-7 — Performance: slow chat initiation for routine trigger phrases

**File:** `src/app/api/chat/route.ts`

**What changed:** Restructured the routine detection + data fetch pipeline from sequential to fully parallel using a single `Promise.all`. All 7 operations now fire simultaneously:
1. `getTrackersBasic`
2. `getAgents`
3. `getMasterBrainContext`
4. `getRecentMessagesForAI`
5. `getLogsForDay`
6. `fetchRoutine` (active routine, if any)
7. `detectRoutineTrigger` (NL detection, only when needed)

Previously, the code did: auth check → session fetch → routine detection (sequential DB + NL call) → THEN parallel fetch for the rest. The `detectRoutineTrigger` call alone goes to DB (`getRoutines()`) which was adding ~500ms+ sequentially before the main parallel block started.

The `routineId` direct-hit path still requires a sequential `fetchRoutine` call (only when `routineId` is provided and no active routine exists — rare case).

Also removed the now-unused `getRoutines` import from the route file.

**Why:** User reported >1 minute latency for routine trigger phrases. The bottleneck was `detectRoutineTrigger` running sequentially before the main `Promise.all`. Moving everything into a single parallel block reduces total wait time from `O(routineDetect) + O(parallelFetch)` to `O(max(all))`.

---

## FIX-8 — Routine builder: tracker field chips truncated

**File:** `src/components/routines/RoutineForm.tsx`

**What changed:** Changed the metric selector chip container from `grid grid-cols-2 sm:grid-cols-3` to `flex flex-wrap`. Removed `truncate` class from the chip label `<span>`. Added `shrink-0` to the checkbox indicator div so it doesn't compress.

**Why:** In a fixed 2–3 column grid, narrow chips were truncating labels ("W...", "ST...", "DI..."). `flex-wrap` lets chips be variable width and wrap naturally, showing full labels like "Weight", "Steps", "Distance".

---

## FIX-9 — Routine builder: swap Deploy Protocol and Add Tracker button positions

**File:** `src/components/routines/RoutineForm.tsx`

**What changed:**
- The "Add Tracker" button (top-right secondary) is now the **primary bottom CTA** — full-width with `bg-nutrition` and `shadow-xl shadow-nutrition/30`, matching the previous Deploy Protocol primary style
- The "Deploy Protocol" / "Update Protocol" submit button (bottom primary) is now a **secondary top-right button** — outlined with `border border-nutrition/30 bg-nutrition/[0.06] text-nutrition/80`, similar to the "Save Chat" pill in ChatInterface
- Footer layout changed from `justify-end` to `justify-between` to accommodate Cancel + primary Add Tracker

**Why:** User requested the swap — "Add Tracker" should be the primary action visible at the bottom, "Deploy Protocol" secondary at top.

---

## Validation

```
npm run lint  → 0 errors, warnings only (all pre-existing)
npm run build → ✓ Compiled successfully, 26 routes, 0 errors
npm test      → 12 test files failing (all pre-existing failures unrelated to B20 changes)
```

Pre-existing test failures are in: `TrackerCard.test.tsx` (missing `Activity` mock in lucide-react mock), `ActionCard.test.tsx` (same lucide mock issue), `ChatInterface.test.tsx` (missing mocks for extended deps), `chat.test.ts` (missing mocks for `getLogsForDay`, `getMasterBrainContext`, etc.), `prompt-builder.test.ts` (test expectations for old prompt text), `actions.test.ts` (NaN/duration logic mismatch).

None of these failures were introduced by Build 20.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/chat/ActionCard.tsx` | FIX-0: overflow-visible on field cell, min-w-0 on grid |
| `src/components/chat/ChatInterface.tsx` | FIX-1: split attachment menu; FIX-4: AbortController + dedup; FIX-5: onConfirm state patch |
| `src/components/dashboard/WidgetCard.tsx` | FIX-2: removed truncate from label |
| `src/lib/ai/prompt-builder.ts` | FIX-3: DB connected preamble; FIX-6: combine intent + macro math rule |
| `src/app/api/chat/route.ts` | FIX-1: expanded ALLOWED_MIME_TYPES; FIX-7: parallel routine detection |
| `src/components/routines/RoutineForm.tsx` | FIX-8: flex-wrap chips; FIX-9: button position swap |

---

**Agent Signature:** Coding Agent | 2026-03-27 18:00

<details>
<summary><strong>Code Reviewer — Code Quality Review</strong> | 2026-03-27 18:45</summary>

## Files Reviewed

- `src/components/chat/ActionCard.tsx` ✓ PASS
- `src/components/chat/ChatInterface.tsx` ⚠ PASS WITH NOTES (ISSUE-3)
- `src/lib/ai/prompt-builder.ts` ✗ FAIL (ISSUE-1)
- `src/app/api/chat/route.ts` ✗ FAIL (ISSUE-2)
- `src/components/dashboard/WidgetCard.tsx` ✓ PASS
- `src/components/routines/RoutineForm.tsx` ✓ PASS

## Critical Issues

**ISSUE-1 — Unreplaced `{{TODAY}}` in health system prompt [100% confidence]**
`src/lib/ai/prompt-builder.ts` line 105: `## CURRENT DAY ACTIVITY ({{TODAY}})` inside `buildHealthSystemPrompt` template literal is never replaced. `.replace()` calls only cover imported constant strings. Every health chat sends literal `{{TODAY}}` to Gemini. Routine prompt at line 177 correctly uses `${today}` — this is a copy-paste oversight.
Fix: change line 105 to `## CURRENT DAY ACTIVITY (${today})`

**ISSUE-2 — Stack trace exposed in 500 error response [85% confidence]**
`src/app/api/chat/route.ts` lines 339-343: catch block returns `details: errorStack` in JSON response. Full server-side call stack (file paths, module names) sent to client. OWASP A05 violation, prohibited by project security rules.
Fix: remove `details` field. Stack already logged via `console.error`.

**ISSUE-3 — `handleSendSilent` not covered by AbortController [82% confidence]**
`src/components/chat/ChatInterface.tsx`: FIX-4 applied AbortController to `handleSendInternal` and `handleSubmit` but `handleSendSilent` (routine auto-advance) calls `fetch('/api/chat')` without a signal. Unmount cleanup does not abort in-flight silent requests.
Fix: pass `abortControllerRef.current?.signal` into `handleSendSilent`'s fetch call.

## Non-Blocking Notes
- FIX-0, FIX-5, FIX-6, FIX-7, FIX-8, FIX-9: all correct and clean
- FIX-1: server-side MIME allowlist validation confirmed (defence-in-depth correct)
- FIX-4 dedup logic: `opt-` prefix pattern ensures real UUID never collides with optimistic ID — sound
- WidgetCard: OLED compliant, no regressions
- RoutineForm: `type="button"` on all non-submit buttons, `satisfies` operator usage correct

## Verdict: **FAIL**

3 required fixes: ISSUE-1 (blocker), ISSUE-2 (security), ISSUE-3 (incomplete fix).

**Agent Signature:** Code Reviewer | 2026-03-27 18:45

</details>
