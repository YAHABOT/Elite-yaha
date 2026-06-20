# Technical Log — V27 User Testing Results
**Date:** 2026-04-06 | **Tester:** User (manual, mobile)
**Build:** V27 @ da72b9c | **URL:** https://yaha-flame.vercel.app

---

## V27 Test Verdict: FAIL

5/15 pass. Core day session logic, date accuracy, and UI polish all failed.

---

## PASS

| # | Test |
|---|------|
| 6 | Journal scroll pinned |
| 7 | Routine resume on refresh |
| 8 | Today vs yesterday (different dates, neutral state) |
| 11 | File attachment indicator (.txt) |
| 14 | Settings toggle visible in Preferences |

---

## FAIL — Detailed Findings

### F1: Neutral state / day lock auto-ends — LOGIC WRONG
**What happened:** V27-P0-A implemented auto-end on physical date advance but the neutral state definition is wrong in the implementation.
**Correct definition:** Neutral state = ONLY after End Day completes, OR if user never set up Start/End Day routines at all. Physical date advance should NOT auto-close an active session silently.
**Impact:** Journal shows wrong TODAY badge, dashboard state misleading.

### F2: End Day button appears too early
**What happened:** End Day appeared on dashboard right after Start Day completed (before 7pm). V27-P0-B fix removed time-based hiding but the button now appears at the wrong time — it should only appear AFTER Start Day is fully complete AND during the active window.
**Note:** It did stay past 7pm (that part works).

### F3: Cross-day Start Day guard broken (V27-P0-C partially failed)
**What happened:** Same-day guard works (blocked correctly on 05/04). But on 06/04 with 05/04 session still open, Start Day went through without blocking.
**Root cause theory:** The auto-end-day logic (V27-P0-A) fired when user attempted to log for 06/04 while in 05/04 session. This silently closed 05/04 session, so by the time Start Day was triggered for 06/04, no active session existed and guard passed.
**Impact:** User can start a new day without ending the previous one if any cross-day log attempt is made first.

### F4: Action card date wrong — Chicken & Egg Baguette
**What happened:** This specific food item keeps logging to April 3 (or March 4). AI reasoning shows it knows the correct date but the logged_at in the action card is wrong.
**Pattern:** This is the SAME item that was wrong in V26. Possible the AI has a training memory associating this Vietnamese dish with a specific date, OR the item name triggers a specific code path.
**Also:** KCAL / CALORIES double unit still rendering on action card (V28-3).

### F5: Chat scroll still broken
**What happened:** Input bar not pinned on some chat loads. Intermittent.

### F9: Correlations button truncated
**What happened:** Journal header shows "Cor." instead of "Correlations". The chip is too narrow — text gets cut off. V26-2 moved journal route but never fixed the button label.

### F10: View button
**What happened:** Related to journal header layout — needs investigation.

### F12: KCAL double unit
**What happened:** Action card renders both the field label "CALORIES" and a unit badge "KCAL" — both visible, overlapping. V27-P0-E fixed the date but not the label rendering.

### F13: Pull-to-refresh fires on mobile scroll-up
**What happened:** Swiping up in chat or journal triggers browser pull-to-refresh. Must be blocked app-wide with `overscroll-behavior-y: contain` or `touch-action` on root.

### F15: Page refresh confirmation broken entirely
**What happened:** Toggle is visible in Settings but warning never fires — not even mid-routine. The beforeunload listener is either not attaching or being removed. Additionally, needs to be app-wide not just ChatInterface.

---

## Additional Bugs Found During Testing

### A1: Day advancement side effect from cross-day log attempt
When user tried to log for 06/04 while active session was 05/04, the system appears to have auto-closed 05/04 session. This is wrong — a date mismatch in a log attempt should NOT close the active session. Only physical clock advance should trigger auto-end, and even then this is debatable per F1.

### A2: Journal TODAY badge wrong
Journal shows "5 Apr TODAY" on 06/04. The TODAY badge uses the active session date, not the physical device date. When session is stale (05/04 session open on 06/04), TODAY is misleading.

### A3: Journal date gap (4 Mar)
Log history jumps from 30 Mar → 4 Mar. Gap of ~26 days. Related to date mismatch bugs from earlier sessions — some logs were saved to wrong dates.

---

## Root Cause Summary

Most V27 failures trace to ONE core issue: **the day session state machine is under-specified.** Multiple components (route.ts, dashboard, journal, prompt-builder) each have their own interpretation of what "active", "neutral", and "ended" mean. Until a single source of truth is established and enforced, date bugs will keep recurring.
