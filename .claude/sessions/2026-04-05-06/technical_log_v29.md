# Technical Log V29

## Files Changed

### Task V29-A — Day Session State Machine

- `src/app/api/chat/route.ts` — Removed auto-end-on-clock-advance block (lines 174-181). Sessions now stay ACTIVE indefinitely until user explicitly ends or skips. `finalActiveDayState` is now a direct alias of `activeDayState`.
- `src/lib/db/day-state.ts` — Added `skipStartDay(date)` and `skipEndDay(activeDate)` functions. Both delegate to existing `markDayStarted`/`markDayEnded` — identical DB semantics, no routine steps.
- `src/app/actions/day-state.ts` — Added `skipStartDayAction(date)` and `skipEndDayAction(activeDate)` server actions. Both call `getSafeUser()` for auth, invoke the DB helpers, and call `revalidatePath('/dashboard')`.
- `src/components/dashboard/DashboardClient.tsx` — Added:
  - `getLocalDateStr()` helper for device-local YYYY-MM-DD
  - `sessionIsForPastDate` flag (ACTIVE session date < localToday)
  - `endDayTimeGatePassed` flag (hour >= 19 OR past date)
  - Cross-day locked banner with inline "Skip End Day" button when session is for a past date
  - Start Day row: RoutineBanner + "Skip Morning Routine" ghost button (NEUTRAL state only)
  - End Day row: RoutineBanner + "Skip Evening Routine" ghost button (ACTIVE + time gate + not past-date)
  - Imported `skipStartDayAction`, `skipEndDayAction`, `Lock` icon

### Task V29-B — Pull-to-Refresh Nuclear Fix

- `src/app/globals.css` — Added `html { overflow: hidden; overscroll-behavior: none; height: 100%; }` in `@layer base`. Changed body `overscroll-behavior-y: contain` to `overscroll-behavior: none`.
- `src/app/(app)/(content)/layout.tsx` — Changed `overscroll-y-contain` to `overscroll-y-none`.
- `src/components/chat/ChatInterface.tsx` — Changed `overscroll-y-contain` on messages div to `overscroll-y-none`.
- `src/components/journal/DayView.tsx` — Added `overscroll-y-none` to all three `overflow-y-auto` elements: sidebar date list inner div, desktop aside, and main content scrollable div.

### Task V29-C — Chat Header + Input Pinning

- `src/app/(app)/layout.tsx` — Changed root div from `h-dvh overflow-hidden` to `fixed inset-0 overflow-hidden`. This anchors the shell to the real viewport independent of any height chain.
- `src/app/(app)/chat/[sessionId]/page.tsx` — Removed `h-full` from both outer wrapper divs (kept `flex min-h-0 overflow-hidden`).
- `src/app/(app)/chat/page.tsx` — Removed `h-full` from outer wrapper div (kept `flex min-h-0 overflow-hidden`).
- `src/components/chat/ChatInterface.tsx` — Root div already correct (`relative flex flex-1 min-h-0 flex-col overflow-hidden`); no change needed.
- `src/components/chat/MobileChatHome.tsx` — Verified no breaking change; component uses `flex flex-1 min-h-0 flex-col overflow-hidden` which fills available space from `fixed inset-0` parent correctly.

## Hotfix — 2026-04-07 (commit `83fe026`)

### Regression found on first user test
Chat home input floating mid-screen; chat session not filling viewport. V29-C incorrectly removed `h-full` from chat page root divs.

**Root cause:** `main` in app layout is a block container (`h-full overflow-hidden`), not flex. Block children do not inherit height without explicit `h-full`. V29-C assumed `fixed inset-0` → `h-full` on main would cascade to grandchildren — it doesn't.

**Fix 1 (83fe026):**
- `src/app/(app)/chat/page.tsx` — root div `flex min-h-0` → `flex h-full min-h-0`
- `src/app/(app)/chat/[sessionId]/page.tsx` — same on both wrapper divs
- Result: floating input fixed ✓. Header still gone + no scroll.

**Fix 2 (69635e1) — root cause found:**
`fixed inset-0` on Android Chrome anchors to the layout viewport (behind the address bar), pushing content up and hiding the header. `h-dvh` (dynamic viewport height) tracks the visual viewport correctly.
- `src/app/(app)/layout.tsx` — `fixed inset-0 overflow-hidden` → `h-dvh overflow-hidden`
- Combined with Fix 1 h-full restorations, this is the correct final state (matches V28 pre-V29C)

**Result:** FAIL — header disappears on scroll, no scroll, input floating.

**Fix 3 (56ddb91):**
- `src/app/globals.css` — removed `html { overflow: hidden; overscroll-behavior: none; height: 100% }` (V29-B introduced this; breaks all nested scroll containers on Android Chrome)
- `src/app/(app)/chat/[sessionId]/page.tsx` — inner wrapper reverted to `flex-1 flex-col` (flex item in row, not block child)
- `src/components/chat/ChatInterface.tsx` — root changed back to `h-full min-h-0 flex-col` (V27 state)

**Result:** FAIL — still no scroll, header gone on scroll.

**Fix 4 (1b3fba2) — actual root cause:**
The real session path in `chat/[sessionId]/page.tsx` (line 64) had `flex min-h-0` without `h-full`. The "new chat" path (line 25) had `h-full` — so new chats worked but existing sessions collapsed. This was the missing piece all along.
- `src/app/(app)/chat/[sessionId]/page.tsx` line 64 — `flex min-h-0` → `flex h-full min-h-0`

**Build:** ✓ exit 0
**Deployed:** https://yaha-flame.vercel.app (`1b3fba2`)
**Status:** ✓ CONFIRMED — chat layout finally stable on Android Chrome (2026-04-09)

---

## Final Manual Test Results — 2026-04-09

| TC | Result |
|----|--------|
| TC-1 PTR Chat | ✓ PASS |
| TC-2 PTR Journal | ✓ PASS |
| TC-3 Chat header pinned | ✓ PASS |
| TC-4 Chat input pinned | ✓ PASS |
| TC-5 Neutral state buttons | ✓ PASS |
| TC-6 Skip Start Day | ⏳ DEFERRED |
| TC-7 No End Day before 7pm | ✓ PASS |
| TC-8 End Day after 7pm | ✗ FAIL → V30-A |
| TC-9 Skip End Day | ⏳ DEFERRED |
| TC-13–16 Chat layout (hotfix TCs) | ✓ ALL PASS |
| R1 KCAL no duplicate | ✓ PASS |
| R2 Correlator label | ~ PARTIAL → V30-B |
| R3 View button logic | ✗ FAIL → V30 backlog |
| R5 Journal TODAY badge | ✗ FAIL → V30-B |

**Overall: BUILD FAIL** — V30 task created. See `.claude/sessions/2026-04-09/SESSION_LOG.md`

---

## Build Result

```
npm run lint  → 0 errors, pre-existing warnings only
npm run build → ✓ Generating static pages (20/20) — exit 0
```

[CA | 14:45] V29 delivered
