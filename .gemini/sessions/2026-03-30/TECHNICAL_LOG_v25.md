# TECHNICAL LOG — V25 Test Execution

**Date:** 2026-03-30
**Build:** V25 (deployed 2026-03-28 16:13)
**Status:** Testing complete — 4 PASS, 1 CRITICAL FAIL, 4 DEFERRED, 2 LOGIC ERRORS, 1 PROCESS ERROR

---

## Test Execution Results

### ✅ PASS: TC-V25-01
**Start Day trigger → logs default to session date**
- User triggered Start Day routine on March 30
- AI logged data with `loggingDate = March 30`
- Verified in Supabase `tracker_logs`
- Status: ✅ PASS

### ✅ PASS: TC-V25-10
**Sign Out button works**
- Settings page button visible
- Click Sign Out → user logged out, redirected to `/login`
- Session cleared verified
- Status: ✅ PASS

### ✅ PASS: TC-V25-11
**Journal header full date, no truncation**
- Desktop: full date displays without truncation
- Mobile: date on two lines, no truncation
- Hamburger menu visible on mobile
- **Future enhancement:** center-align action buttons in header (not critical now)
- Status: ✅ PASS

### ✅ PASS: TC-V25-12
**Action card labels don't overflow**
- Long field names wrap correctly
- No truncation observed
- Mobile 375px width: labels render without cutoff
- Status: ✅ PASS

---

### ❌ CRITICAL FAIL: TC-V25-09
**Chat & Journal header scrolling regression**

**Observed behavior:**
- Chat header sometimes disappears when scrolling (should be sticky)
- Chat input box also scrolls away in some instances
- Journal header scrolls away (should be sticky)
- **Issue is intermittent** — not consistently reproducible
  - Sometimes header is sticky and works correctly
  - Other times header scrolls away
  - Suggests race condition or state-dependent bug

**Root cause analysis:**
- Regression from build 19+ (was working, broke later)
- Likely caused by CSS changes in V23-V25 to `overflow-*` classes
- Sticky positioning chain may have been broken by wrapper changes

**Files to investigate:**
- `src/app/(app)/chat/page.tsx` — check `overflow-hidden` on wrappers
- `src/app/(app)/chat/[sessionId]/page.tsx` — same issue
- `src/components/journal/DayView.tsx` — header should be `sticky top-0 z-10`
- `src/components/chat/ChatInterface.tsx` — input wrapper positioning

**Fix required:** Restore sticky positioning chain, verify all parent wrappers have correct `overflow` values

**Status:** ❌ CRITICAL FAIL — Blocks release until fixed

---

### ⏸️ DEFERRED: TC-V25-02, TC-V25-03, TC-V25-07, TC-V25-08
**Cannot execute in current session — require End Day flow**

**TC-V25-02:** Advance clock past midnight → logs still go to session date
- Blocked: Requires device clock manipulation (not possible in current test environment)
- Schedule for tomorrow's session

**TC-V25-03:** End Day → system goes neutral → new log asks for date
- Blocked: Requires End Day workflow to be working
- Schedule for tomorrow after End Day flow is verified

**TC-V25-07:** Neutral state + relative date → action card appears immediately
- Blocked: Requires system to be in neutral state (needs End Day to complete)
- Schedule for tomorrow

**TC-V25-08:** Neutral state + absolute date → action card appears immediately
- Blocked: Requires system to be in neutral state
- Schedule for tomorrow

---

## Logic Errors & Process Errors

### ❌ LOGIC ERROR: TC-V25-04 & TC-V25-05 — Relative Date Interpretation Backwards

**Expected behavior:**
- User in active session of March 30, actual device date is March 31
- User says "log yesterday" → should log to **March 30** (yesterday relative to ACTUAL date, not session date)
- User says "log today" → should log to **March 31** (literal actual date, not session date)
- **ONLY** when no date specified → default to active session date

**Current behavior (incorrect):**
- "log yesterday" → logs to March 29 (yesterday relative to session)
- "log today" → logs to March 30 (session date)

**Why this matters:**
- **Data accuracy:** User in Oct 29 session on Oct 30 morning logs weight for "today"
  - Current: logs to Oct 29 (historically inaccurate)
  - Should be: logs to Oct 30 (factually correct)
- Explicit relative dates must be relative to actual device date, not session date

**What user verified (working correctly):**
- "log sleep for yesterday" in March 30 session → correctly logged to March 29 ✓
- "log sleep for 4 days ago" in March 30 session → correctly logged to March 26 ✓
- **Note:** These tests were in neutral state, suggesting logic error only manifests in active session state

**Fix location:** `src/lib/ai/prompt-builder.ts` and/or `src/app/api/chat/route.ts`
- Parse explicit relative dates against `params.date` (actual device date)
- Only use active session date when NO explicit date is specified

---

### ❌ PROCESS ERROR: TC-V25-06 — End Day Enforcement Missing

**Expected workflow:**
1. Active session exists (e.g., March 30)
2. Actual date is now March 31
3. User tries to trigger "Start Day" (regardless of whether End Day routine is running)
4. **System must block it** with message:
   - *"Start day process for March 30 already complete. If you want to start the day for March 31, please end yesterday's session first."*
5. User must either:
   - Click End Day button in dashboard, OR
   - Type trigger phrase in chat (e.g., "end day", "close routine")
6. Once End Day routine completes → system goes neutral → Start Day button appears

**Current behavior (incorrect):**
- No guardrails preventing Start Day while active session exists
- End Day button may not persist if user doesn't explicitly trigger it

**Fix required:**
- `src/app/api/chat/route.ts` — add state machine check before processing Start Day trigger
- Dashboard UI — End Day button must remain visible until either clicked or trigger phrase completes routine
- AI response logic — must reject Start Day trigger with guidance message if active session exists

---

## Critical Bug: Routine Refresh State Corruption

**What happened:**
1. User in active End Day routine (step 2)
2. Page refreshed mid-routine
3. **Bug:** System re-triggered the same trigger phrase (e.g., "end day")
4. **Result:**
   - AI got confused about routine state
   - Routine flow broken
   - "Step 2 in process" banner persisted even after manual step completion
   - Start Day button still visible (should be gone after End Day completes)

**Root cause:**
- Active routine state not persisted across page reloads
- On page refresh, system doesn't resume from saved step — it re-triggers the trigger phrase
- Causes state machine to reset and confuse AI

**Impact:**
- Any routine can be corrupted by page refresh (Start Day, End Day, custom routines)
- User loses progress and must restart

**Fix required:**
- Persist `activeDayState` + `currentRoutineStep` to DB (new `day_sessions` table or extend existing)
- On page load, check for active routine and resume from last step
- Do NOT re-trigger the trigger phrase on page load
- Clear routine state only after successful completion

**Files to modify:**
- `src/lib/db/day-state.ts` — add persistence logic
- `src/app/api/chat/route.ts` — check for active routine on load, resume from step
- `src/components/routines/RoutineForm.tsx` — display "Resuming routine from step X"

---

## User Requests for V26

1. **Page refresh confirmation modal**
   - Add modal confirmation before page refresh
   - "You're about to refresh. This will interrupt any active routine. Continue?"
   - Prevent accidental refresh during scroll

2. **Settings toggle: "Confirm on page refresh"**
   - Allow user to disable the confirmation modal if preferred
   - Default: enabled

3. **Chat/Journal header scroll regression fix**
   - Investigate V23-V25 CSS changes
   - Restore sticky positioning for chat header, input, and journal header
   - Test intermittent nature (may be race condition)

---

## Summary for V26 Build Plan

**Critical (P0):**
1. Fix chat/journal header scroll regression (TC-09)
2. Fix routine refresh state corruption (deferred during testing)
3. Fix relative date logic (TC-04, TC-05)

**High Priority (P1):**
4. Enforce End Day before Start Day (TC-06)
5. Add page refresh confirmation modal + settings toggle

**Deferred Testing (next session):**
6. TC-02, TC-03, TC-07, TC-08 — require End Day flow setup

---

**Agent Signature:** [Main Agent | 2026-03-30 — Test Summary]
