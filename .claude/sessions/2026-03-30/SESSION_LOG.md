# SESSION LOG — 2026-03-30

**Status:** Catch-up complete. V25 deployed. Awaiting test execution.

---

## Handoff from 2026-03-28 → V25 (Latest)

### V25 Fixes Deployed
| Fix | What | Files |
|-----|------|-------|
| **V25-1** | Critical timezone date bug — `getLocalDateStr()` sends local date from browser, all 3 chat API call sites updated | `ChatInterface.tsx`, `MobileChatHome.tsx` |
| **V25-2** | `chat/route.ts` uses client date as `today` instead of UTC server date | `route.ts` |
| **V25-3** | `prompt-builder.ts` was ignoring the client date and recalculating UTC — fixed to use `params.date` | `prompt-builder.ts` |
| **V25-4** | `formatDateHeading` in TrackerHistoryView — UTC string comparison instead of local `setHours()` | `TrackerHistoryView.tsx` |
| **V25-5** | Journal header two-line layout, removed `max-w-[160px]` truncation | `DayView.tsx` |
| **V25-6** | Action card label overflow — `isLarge` for long labels, flex-wrap chip row | `ActionCard.tsx` |
| **V25-7** | Chat scroll fix (TC27-28) — `overflow-hidden` on page wrappers | `chat/page.tsx`, `[sessionId]/page.tsx` |
| **V25-8** | Sign Out button (TC31) — removed nested `<form>`, direct onClick | `SettingsForm.tsx` |
| **V25-9** | Enter key sends instead of newline — `e.shiftKey` condition fixed | `ChatInterface.tsx`, `MobileChatHome.tsx` |
| **V25-10** | Editable timestamp in log entry edit mode — `datetime-local` input, saves to DB | `LogEntryCard.tsx` |
| **V25-11** | Day Session system — `getActiveDayState()`, trigger-based `markDayStarted`, auto-close stale sessions, `loggingDate` vs `actualDate` split, neutral-state date confirmation | `day-state.ts`, `route.ts`, `prompt-builder.ts` |

---

## Next Session Test Plan — V25

**Critical tests to run:**

1. **Day Session flow** — trigger Start Day routine → verify chat logs default to that date → physically advance the clock past midnight → confirm logs still go to the started day → run End Day → confirm system goes neutral → send a log → confirm AI asks to confirm date
2. **Relative dates** — with an active session open on 7/3 while it's physically 8/3, say "log sushi for yesterday" → should log to 7/3 (yesterday of actual today 8/3), not 6/3
3. **New Start Day overrides old session** — with 7/3 session open, trigger Start Day on 8/3 → confirm 7/3 session gets closed and 8/3 becomes active
4. **Action card always appears** — in neutral state, say "log this for yesterday" → should get action card immediately, no confirmation question
5. **Regressions:** TC27-28 chat scroll, TC31 sign out, journal header, action card overflow

---

## Agent Configs Cached ✓
- [CA] Coding Agent — `claude-sonnet-4-6`
- [CR] Code Reviewer — `claude-sonnet-4-6`
- [QA] QA Agent — `claude-sonnet-4-6`
- [RA] Research Agent — `claude-sonnet-4-6`
- [SR] Security Reviewer — `claude-opus-4-6` (on-demand only)

All agents reference MEMORY.md (no re-reads).

---

## Testing Complete — V25

**Timestamp:** 2026-03-30 | **Status:** Test execution finished

### Results Summary
- **PASS:** 4/12 (TC-01, TC-10, TC-11, TC-12)
- **CRITICAL FAIL:** 1 (TC-09 chat/journal scroll — intermittent)
- **DEFERRED:** 4 (TC-02, TC-03, TC-07, TC-08 — require End Day flow)
- **LOGIC ERRORS:** 2 (TC-04, TC-05 — relative date backwards)
- **PROCESS ERROR:** 1 (TC-06 — End Day enforcement missing)
- **CRITICAL BUG:** 1 (Routine refresh state corruption)

### Key Findings
1. **Relative dates logic backwards** — explicit dates must be relative to actual device date, not active session
2. **End Day not enforced** — system allows Start Day trigger while active session exists
3. **Chat/Journal header scroll regression** — intermittent issue (race condition suspected)
4. **Routine refresh corrupts state** — page reload re-triggers trigger phrase, breaks routine
5. **User requests:** Page refresh confirmation modal + settings toggle

### Documents Updated
- ✅ SESSION_LOG.md (current)
- ✅ MEMORY.md (agent configs cached)
- ✅ TECHNICAL_LOG_v25.md (detailed test results + findings)
- ✅ CLAUDE.md (§ Known Gotchas added — 4 V25 learnings)

### Deferred Tests (Must Run Next Session)
- TC-V25-02: Advance clock past midnight → logs still go to session date
- TC-V25-03: End Day → neutral state → date confirmation
- TC-V25-07: Neutral state + relative date → action card appears
- TC-V25-08: Neutral state + absolute date → action card appears

---

## V26 Build Plan

### Task V26-1: Scroll regression fix
**Ref:** MEMORY.md § Coding Agent | Config cached: ✓
**What:** Fix broken scroll layout in chat (new-session wrapper missing `min-h-0 overflow-hidden`) and journal (DayView inside `(content)/layout.tsx`'s `overflow-y-auto` breaks its own internal scrolling — journal must move out of `(content)` into `(app)` so `h-full` resolves to viewport height, not content height).
**Root cause detail:**
- Chat: `chat/[sessionId]/page.tsx` "new" path uses `<div className="flex h-full">` — missing `min-h-0 overflow-hidden`. Existing session path is correct. Explains intermittency (only breaks on `/chat/new` before first message is sent and URL changes).
- Journal: `(content)/layout.tsx` is `overflow-y-auto` — DayView's `h-full` resolves to content height, making the whole page scroll. `sticky top-0` on journal header is non-functional (parent has `overflow-hidden`); header only stays due to `flex-shrink-0` which is fragile in this context. Fix: move journal route out of `(content)` into `(app)`.
**Files:**
- `src/app/(app)/chat/[sessionId]/page.tsx` — add `min-h-0 overflow-hidden` to "new" session wrapper divs
- `src/app/(app)/(content)/journal/page.tsx` → move to `src/app/(app)/journal/page.tsx`
- `src/components/journal/DayView.tsx` — remove `sticky top-0` from header (use `shrink-0` only, consistent with chat pattern), verify flex chain
**Validate:** `npm run lint && npm run build`

---

### Task V26-2: Day Session logic fix
**Ref:** MEMORY.md § Coding Agent | Config cached: ✓
**What:** Two logic fixes — (a) relative/explicit dates must resolve against `params.date` (actual device date), not active session date; (b) Start Day trigger must be rejected if an active session already exists.
**Root cause detail:**
- Relative date: `prompt-builder.ts` resolves "yesterday"/"today" against session date when a session is active. Must always use `params.date` for any explicit date reference; only fall back to session date when user gives NO date at all.
- End Day enforcement: `chat/route.ts` processes Start Day trigger without checking `getActiveDayState()`. Must check and return blocking message: *"Start day for [date] already complete. End yesterday's session first."*
**Files:**
- `src/lib/ai/prompt-builder.ts` — fix relative date resolution to use `params.date`
- `src/app/api/chat/route.ts` — add `getActiveDayState()` guard before Start Day trigger processing
**Validate:** `npm run lint && npm run build`

---

### Task V26-3: Routine state persistence
**Ref:** MEMORY.md § Coding Agent | Config cached: ✓
**What:** Persist `activeDayState` + `currentRoutineStep` to DB so page refreshes mid-routine resume correctly instead of re-firing the trigger phrase.
**Root cause detail:** Active routine state lives only in React state + sessionStorage. Page refresh clears it, causing route.ts to treat the first message after reload as a fresh start, re-triggering the trigger phrase and corrupting the AI context.
**Files:**
- `src/lib/db/day-state.ts` — add `persistRoutineStep()` and `getRoutineState()` DB functions
- `src/app/api/chat/route.ts` — on load, check DB for active routine step; never re-fire trigger phrase; clear only on successful completion
- `supabase/migrations/` — new migration to add `current_step` + `routine_state` columns to `day_sessions` (or equivalent)
**Validate:** `npm run lint && npm run build`

---

### Task V26-4: Page refresh confirmation modal
**Ref:** MEMORY.md § Coding Agent | Config cached: ✓
**What:** Add beforeunload confirmation modal that warns user when refreshing during an active routine. Add settings toggle "Confirm on page refresh" (default: on).
**Files:**
- `src/components/chat/ChatInterface.tsx` — add `beforeunload` listener, show modal when routine is active
- `src/app/(app)/(content)/settings/page.tsx` — add toggle
- `src/lib/db/users.ts` or `src/app/actions/settings.ts` — persist toggle preference
**Validate:** `npm run lint && npm run build`

---

**Execution order:** V26-1 → V26-2 → V26-3 → V26-4 (each goes through full CA → CR → QA cycle before next starts)

---

## V26 Build Complete ✓

All 4 tasks delivered. CR verdicts: all PASS WITH NOTES (no FAILs). Build: PASS.

### Files Modified (V26)
| Task | Files |
|------|-------|
| V26-1 | `chat/[sessionId]/page.tsx`, `journal/page.tsx` (moved), `journal/loading.tsx` (moved+fixed), `journal/correlations/page.tsx` (moved), `DayView.tsx` |
| V26-2 | `prompt-builder.ts`, `chat/route.ts` |
| V26-3 | `ChatInterface.tsx`, `chat.ts` (db), `20260330000000_add_current_routine_step.sql` |
| V26-4 | `settings.ts` (actions), `SettingsForm.tsx`, `ChatInterface.tsx`, `chat/[sessionId]/page.tsx`, `users.ts` |

### CR Carry-Forwards → V27
| Priority | Finding | File |
|----------|---------|------|
| P1 | `markDayStarted` fire-and-forget — guard bypass on DB failure | `route.ts` |
| P1 | Active-routine resume path missing Start Day guard | `route.ts` |
| P2 | JSONB `stats` clobber on partial upsert | `users.ts` → `upsertUserProfile` |
| P3 | Shared `useTransition` between toggle and form submit | `SettingsForm.tsx` |

### QA Test Cases Ready — V26

**V26-1 Scroll fix:** TC-V26-01 through TC-V26-07
**V26-2 Day Session logic:** TC-V26-08 through TC-V26-14
**V26-3 Routine state persistence:** TC-V26-15 through TC-V26-19 (+ sessionStorage supplementary check)
**V26-4 Page refresh modal:** TC-V26-20 through TC-V26-25

**Total: 25 test cases**

---

## V27 Build Plan — Issues Found During V26 Testing

**Status:** V26 testing COMPLETE. Ready for V27.

**Screenshots:** `Screenshots of previous build - Food logging limitations.png` (project root)

### Bugs (from user testing 2026-03-30 ~15:48–15:50)

| Priority | Type | Description | Suspected Root Cause |
|----------|------|-------------|----------------------|
| P0-CRITICAL | Wrong date | Food logged to March 4 instead of March 30. AI correctly identified it needed March 30 in its reasoning, but the final action card / save used the wrong date. | Possibly V26-2 fix not yet hit the active prod session, OR action card date field not wired to `logged_at` correctly. Investigate `route.ts` action card date path. |
| P1 | Missing UI indicator | .txt file attached to chat message — no visual attachment indicator shown. Images show an indicator; other file types do not. | `ChatInterface.tsx` likely only renders attachment preview for `image/*` MIME types. |
| P2 | Action card regression | "CALORIES" label displays "360 KCAL" with a separate "G" badge overlapping — "KCAL" unit text interferes with the badge chip. Appears KCAL and the unit badge are both rendering. | `ActionCard.tsx` label chip rendering logic — possibly unit shown twice (once as part of label, once as badge suffix). |

---

## V27 Consolidated Issue List (Final — ready for build planning)

### P0 — Data Integrity / Core Flow Broken

| ID | Issue | Source | Files to Investigate |
|----|-------|--------|----------------------|
| P0-A | **Active day lock never auto-ends** — physical date crosses midnight but session stays locked to previous day forever. Journal, AI date resolution, and Start/End Day buttons all break in this state. Root of D2–D5. | D2–D5 | `route.ts`, `chat.ts` (db), `dashboard` |
| P0-B | **End Day button missing from dashboard** after 7pm — regression. Should persist until manually executed regardless of clock. | D1 | Dashboard component |
| P0-C | **Start Day button appears while previous session open** — D5 shows it appeared at 12pm on 31/3 with 30/3 session active. Should be fully suppressed until End Day. | D5, TC-12 | Dashboard component, `route.ts` Start Day guard |
| P0-D | **Settings refresh confirmation toggle completely missing** from deployed app — TC-20 through TC-24 all fail. V26-4 shipped broken in prod. | TC-20–24 | `SettingsForm.tsx`, possibly Vercel env/build |
| P0-E | **Wrong date logged** — food logged to March 4 instead of March 30 (earlier screenshot). | Earlier SC | `route.ts` action card log insert, `logged_at` wiring |

### P1 — Visible Regression (Works Incorrectly)

| ID | Issue | Source | Files to Investigate |
|----|-------|--------|----------------------|
| P1-A | **Chat + journal scroll intermittent failure** — header disappears and input loses pin randomly across ALL routes including `/chat/new`. Not path-specific. V26-1 fix was real but insufficient — the deeper cause is a race condition or hydration timing issue. Must investigate mount order, `useEffect` layout timing, or CSS calc dependence on JS-measured heights. | TC-01, 03, 06, 07 | `chat/[sessionId]/page.tsx`, `(app)/journal/page.tsx`, `ChatInterface.tsx`, `DayView.tsx` — inspect mount timing |
| P1-C | **Routine step state lost on refresh** — AI re-prompts from scratch instead of resuming. V26-3 fix incomplete. | TC-15 | `ChatInterface.tsx` resume logic, `chat.ts` `updateRoutineStep` |
| P1-D | **"Today" and "yesterday" both resolve to same date** when session is locked and physical date has advanced. Logically contradictory to user. | D3, D4 | `prompt-builder.ts` relative date logic |
| P1-E | **7pm timestamp on all logs** — reported during TC-15 testing. NOT confirmed by SC1 (which shows correct timestamps on 31/3). Investigate if this was a transient issue or specific to certain paths. | TC-15 session | `route.ts` log insert, action confirm handler |
| P1-F | **Wrong date in March 4 case** — dates of 4 Mar appearing in journal (SC2 shows gap from March 27 back to March 4). Related to P0-A / date mismatch across sessions. | SC2 | `journal/page.tsx`, `DayView.tsx` date filtering |

### P2 — UI / UX Issues

| ID | Issue | Source |
|----|-------|--------|
| P2-A | "Correlations" button text truncated in journal header — needs own line below "View" button | TC-04 |
| P2-B | File attachment (.txt etc.) has no visual indicator in chat — images do | Earlier SC |
| P2-C | Action card: "CALORIES 360 KCAL" + "G" badge — double unit render | Earlier SC |
| P2-D | Mobile pull-to-refresh fires on scroll-up — `overscroll-behavior-y: contain` on scroll container | TC-01 |

### P3 — Code Quality / CR Carry-Forwards

### CR Carry-Forwards (from V26 — must address in V27)

| Priority | Finding | File |
|----------|---------|------|
| P1 | `markDayStarted` fire-and-forget — guard bypass window on DB failure | `route.ts` |
| P1 | Active-routine resume path missing Start Day guard | `route.ts` |
| P2 | JSONB `stats` clobber on partial upsert | `users.ts` → `upsertUserProfile` |
| P3 | Shared `useTransition` between toggle and form submit | `SettingsForm.tsx` |

**Execution order (when V27 starts):** See "V27 Consolidated Issue List" below — prioritised by severity after full test run.

---

## V26 Final Test Results (COMPLETE — 2026-03-31)

**Screenshots (deferred findings):** Provided by user 2026-03-31 morning. Referenced inline below.

### Full TC Results

| TC | Scope | Result | Notes |
|----|-------|--------|-------|
| TC-V26-01 | Scroll | FAIL (intermittent) | **Root cause revised:** behaviour is RANDOM. Header gone + input not pinned on new chats too, not just existing sessions. Sometimes correct, sometimes broken — same route, same device. Not a path-specific bug. Likely a race condition on mount or React hydration timing issue. Pull-to-refresh noted as separate side effect. |
| TC-V26-02 | Scroll | NOT TESTED | No saved chats available to test. |
| TC-V26-03 | Scroll | FAIL (intermittent) | Same intermittent failure as TC-01 — journal header. |
| TC-V26-04 | Scroll | PASS ⚠️ | Journal loads. New UI issue: "Correlations" button text truncated — needs own line below "View". |
| TC-V26-05 | Scroll | NOT UNDERSTOOD | TC description unclear to user. Rewrite for V27. |
| TC-V26-06 | Scroll | FAIL (intermittent) | Same intermittent failure. |
| TC-V26-07 | Scroll | FAIL (intermittent) | Same intermittent failure. |
| TC-V26-08 | Day Session | DEFERRED | Requires clock/date manipulation |
| TC-V26-09 | Day Session | DEFERRED | Requires clock/date manipulation |
| TC-V26-10 | Day Session | DEFERRED | Requires End Day run |
| TC-V26-11 | Day Session | PASS | AI rejects duplicate log |
| TC-V26-12 | Day Session | FAIL | Start Day re-trigger NOT blocked when triggered via chat phrase on same day — V26-2 guard does not cover this path |
| TC-V26-13 | Day Session | PASS | Fine |
| TC-V26-14 | Day Session | DEFERRED | Requires End Day run |
| TC-V26-15 | Routine State | FAIL | Refresh mid-step lost step state. On reload: empty bubble (photo only, no text). AI re-prompted from scratch. Log saved correctly but resume failed. |
| TC-V26-16 | Routine State | PASS | ✓ |
| TC-V26-17 | Routine State | DEFERRED | Requires End Day run |
| TC-V26-18 | Routine State | PASS | ✓ |
| TC-V26-19 | Routine State | DEFERRED | Requires End Day run |
| TC-V26-20 | Refresh Modal | FAIL | Settings toggle not present in deployed app |
| TC-V26-21 | Refresh Modal | FAIL | Toggle not present |
| TC-V26-22 | Refresh Modal | FAIL | Toggle not present |
| TC-V26-23 | Refresh Modal | FAIL | Toggle not present |
| TC-V26-24 | Refresh Modal | FAIL | Toggle not present |
| TC-V26-25 | Refresh Modal | DEFERRED | Assumed fail given TC-20–24 |

**PASS: 5 | FAIL: 10 | PASS ⚠️: 2 | NOT TESTED: 2 | DEFERRED: 6**

---

### Deferred Findings (Tested 2026-03-31, End Day never done for 30/3)

| # | Finding | Screenshots | Severity |
|---|---------|-------------|----------|
| D1 | End Day button **missing from dashboard** after 7pm — should show until executed, even past midnight | — | P0 |
| D2 | Active day lock persists past midnight — journal shows "30 Mar" as TODAY on 31/3. Session never ends without manual End Day. (SC2) | SC2 | P0 |
| D3 | "Today" in chat logs to 2026-03-30 (session locked) even when physical date is 31/3 — AI is correct by session rules but wrong from user perspective (SC3) | SC3 | P0 |
| D4 | "Yesterday" correctly resolves to 2026-03-30 from physical 31/3 — but this makes "today" and "yesterday" **both = 2026-03-30**, which is logically contradictory (SC4) | SC4 | P0 |
| D5 | Start Day button appeared at 12:00pm on 31/3 **despite 30/3 session never ended** — should be fully blocked until End Day executes | — | P0 |

> **Root cause (D2–D5):** No auto-end-day enforced when physical date crosses midnight past the active session date. The system allows indefinite lock without End Day. The entire date resolution system breaks in this state.

---

## SESSION CLOSED — 2026-03-31

**V26 verdict: FAIL.** Build delivered but multiple features broken in production.

**Handoff to next session:**

> ⚠️ DO NOT start coding immediately. On session start, read this full file and write up the V27 requirements document first (task definitions per the SOP), then kick off the build.

### What the next session must do first:
1. Read `.claude/sessions/2026-03-30/SESSION_LOG.md` (this file) — full V26 test report + V27 consolidated issue list
2. Write V27 task definitions in the new session's SESSION_LOG, scoped by priority (P0 first)
3. Then execute the build per SOP: CA → CR → QA per task

### V27 scope summary (from this session's findings):
- **P0:** Active day lock / auto-end-day · End Day button regression · Start Day suppression · Settings toggle missing in prod · Wrong date in log insert
- **P1:** Scroll intermittent (race condition / hydration) · Routine resume on refresh · "today"+"yesterday" same-date contradiction · 7pm timestamp (investigate)
- **P2:** Correlator button truncation · File attachment indicator · Action card label double-unit · Pull-to-refresh (`overscroll-behavior`)
- **P3:** CR carry-forwards (markDayStarted, stats clobber, useTransition)
