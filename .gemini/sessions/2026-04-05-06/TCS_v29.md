# V29 Test Cases

**Build:** `39a3941` — deployed https://yaha-flame.vercel.app
**Device:** Android Chrome (primary test target)

---

## TC-1: Pull-to-Refresh — Chat
**Steps:** Open any chat session → scroll to top → swipe DOWN
**Expected:** Nothing happens — browser pull-to-refresh is fully blocked
**Fail condition:** Page reloads or spinner appears at top

## TC-2: Pull-to-Refresh — Journal
**Steps:** Open Journal → scroll to top of any day view → swipe DOWN
**Expected:** Nothing happens — blocked
**Fail condition:** Page reloads or spinner appears

## TC-3: Chat Header Pinned
**Steps:** Open a chat session with several messages → scroll messages up
**Expected:** Top header bar (with chat title, hamburger) stays fixed at top
**Fail condition:** Header scrolls up and disappears

## TC-4: Chat Input Bar Pinned
**Steps:** Open a chat session → scroll messages up
**Expected:** Input bar at the bottom stays pinned at all times
**Fail condition:** Input bar scrolls away or disappears

## TC-5: Dashboard — Neutral State Buttons
**Setup:** No active day session (or End Day was completed)
**Steps:** Open Dashboard
**Expected:** `[Start Day]` + `[Skip]` buttons visible. No End Day buttons.
**Fail condition:** End Day button shows, or Skip button missing

## TC-6: Skip Start Day
**Setup:** Dashboard in NEUTRAL state
**Steps:** Tap "Skip" next to Start Day
**Expected:** Dashboard moves to ACTIVE state (as if Start Day routine completed). No routine runs. Start/Skip buttons disappear.
**Fail condition:** Nothing changes, error occurs, or routine starts

## TC-7: Dashboard — Active State Before 7pm
**Setup:** Active day session open, device time < 19:00
**Steps:** Open Dashboard
**Expected:** NO End Day button, NO Skip button. Just the locked/active state indicator.
**Fail condition:** End Day or Skip End Day button is visible before 7pm

## TC-8: Dashboard — Active State After 7pm
**Setup:** Active day session open, device time >= 19:00
**Steps:** Open Dashboard
**Expected:** `[End Day]` + `[Skip]` buttons visible
**Fail condition:** End Day buttons don't appear after 7pm

## TC-9: Skip End Day
**Setup:** Active session, time >= 19:00
**Steps:** Tap "Skip" next to End Day
**Expected:** Session closes (NEUTRAL state). No routine runs. Start Day buttons reappear.
**Fail condition:** Nothing changes, error occurs, or routine starts

## TC-10: Session Persists Past Midnight
**Setup:** Start a day session (or Skip Start Day). Do NOT end it. Leave it overnight / wait past midnight.
**Steps:** Next day, open Dashboard
**Expected:** Session is still ACTIVE. End Day / Skip buttons show (since it's past 7pm on the original session date — or a locked cross-day banner).
**Fail condition:** Session auto-closed on its own

## TC-11: Cross-Day Locked Banner
**Setup:** Active session from a PAST date (yesterday or earlier). Open Dashboard today.
**Steps:** Open Dashboard
**Expected:** Locked banner: "Complete [past date]'s session first" with a Skip End Day option inline. No Start Day button.
**Fail condition:** Start Day button is accessible, or no locked banner shown

## TC-12: Start Day Blocked Cross-Day
**Setup:** Active session from yesterday. Try to start today.
**Steps:** In chat, type "start day" or press Start Day
**Expected:** Blocked — message or UI prevents it, points to ending yesterday first
**Fail condition:** New day session opens while yesterday is still active

---

## Previously Failing — Regression Check
These were passing in V28 or earlier and must not have regressed:

| # | Check |
|---|-------|
| R1 | KCAL unit shows inline (not duplicate badge) |
| R2 | "Correlate" button full label in journal header |
| R3 | View button navigates to correlations page |
| R4 | Settings toggle for refresh confirmation is visible |
| R5 | Journal journal TODAY badge shows correct date |

---

## Post-V29 Hotfix Additions (2026-04-07 / 2026-04-08)

Four hotfixes were applied to fix chat layout regressions introduced by V29-B and V29-C. Final deployed commit: `1b3fba2`.

### What was broken and what was fixed

| Hotfix | Commit | Change | Fixes |
|--------|--------|--------|-------|
| HF-1 | `83fe026` | Restored `h-full` on chat page root wrappers | Floating input |
| HF-2 | `69635e1` | Reverted layout root `fixed inset-0` → `h-dvh` | Header hidden behind Android address bar |
| HF-3 | `56ddb91` | Removed `html { overflow: hidden }` from globals.css; reverted inner wrapper to `flex-1` | Scroll blocked on Android Chrome |
| HF-4 | `1b3fba2` | Added `h-full` to real-session path outer wrapper (line 64) | Header scrolling away, no scroll in existing sessions |

### New TCs to run (in addition to TC-1 through TC-12 and R1–R5)

**TC-13: Chat Header Stays Pinned on Scroll — Existing Session**
Steps: Open an existing chat session (not "New Chat") with several messages → scroll messages up
Expected: Header (hamburger + YAHA Assistant title) stays pinned at top throughout scroll
Fail condition: Header scrolls away / disappears as messages move up

**TC-14: Chat Messages Scroll — Existing Session**
Steps: Open an existing chat session → send enough messages to fill screen → swipe up
Expected: Messages area scrolls smoothly, header and input bar stay fixed
Fail condition: Whole page scrolls or nothing scrolls at all

**TC-15: Input Bar Stays Pinned — Existing Session**
Steps: Same as TC-14 — scroll messages up as far as they go
Expected: Input bar stays at the bottom at all times
Fail condition: Input bar moves or disappears

**TC-16: New Chat vs Existing Chat consistency**
Steps: Open /chat (new chat home) → verify layout → open an existing session → verify layout
Expected: Both behave identically — header pinned, messages scroll, input pinned
Fail condition: New chat works but existing session is broken (or vice versa)

---

## FINAL RESULTS — 2026-04-09 (commit `1b3fba2`)

| TC | Result | Notes |
|----|--------|-------|
| TC-1 | ✓ PASS | |
| TC-2 | ✓ PASS | |
| TC-3 | ✓ PASS | Resolved after 4 hotfixes |
| TC-4 | ✓ PASS | |
| TC-5 | ✓ PASS | |
| TC-6 | ✓ PASS | Tested 2026-04-09 |
| TC-7 | ✓ PASS | |
| TC-8 | ✗ FAIL | Cross-day banner showing by default; End Day button removed → V30-A |
| TC-9 | ⏳ DEFERRED | Not tested but expected PASS (same logic as TC-6) |
| TC-10 | NOT TESTED | |
| TC-11 | ~ PARTIAL | Banner shows but also shows by default (wrong) |
| TC-12 | ~ PARTIAL | Blocked correctly but wrong wording → V30-A |
| TC-13 | ✓ PASS | |
| TC-14 | ✓ PASS | |
| TC-15 | ✓ PASS | |
| TC-16 | ✓ PASS | |
| R1 | ✓ PASS | |
| R2 | ~ PARTIAL | Says "Correlate" not "Correlator", not on own line → V30-B |
| R3 | ✗ FAIL | Logic never applied → V30 backlog |
| R4 | NOT TESTED | |
| R5 | ✗ FAIL | Yesterday showing as TODAY on load → V30-B |

**Overall: BUILD FAIL** — V30 task open.

---

## ⚠️ NEXT SESSION INSTRUCTIONS

**On next session open, the orchestrator MUST:**
1. Read `.claude/sessions/2026-04-05-06/technical_log_v29.md` (full hotfix history)
2. Read this file — `.claude/sessions/2026-04-05-06/TCS_v29.md` (all test cases including TC-13–TC-16)
3. Read `.claude/sessions/2026-04-07/SESSION_LOG.md` (full hotfix log + current status)
4. **First task: assign manual testing to user** — ask them to run ALL TCs (TC-1 through TC-16 + R1–R5) on Android Chrome against `1b3fba2` deployed at https://yaha-flame.vercel.app
5. Record results in session log → triage any failures → create V30 task if needed
