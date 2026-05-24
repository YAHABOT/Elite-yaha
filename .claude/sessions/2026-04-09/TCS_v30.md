# V30 Test Cases

**Build:** `ecd34e1` — deployed https://yaha-flame.vercel.app
**Device:** Android Chrome (primary test target)
**Branch:** master

---

## Day Session Logic

### TC-1: End Day Button Shows After 7pm
**Setup:** Active day session open. Device time >= 19:00.
**Steps:** Open Dashboard
**Expected:** `[End Day]` + `[Skip]` buttons visible
**Fail condition:** Buttons missing, or locked banner showing instead

### TC-2: No End Day Button Before 7pm
**Setup:** Active day session open. Device time < 19:00.
**Steps:** Open Dashboard
**Expected:** Neither End Day nor Skip End Day visible — just active state indicator
**Fail condition:** End Day or Skip visible before 7pm

### TC-3: Cross-Day Locked Banner — Only in Chat, Not on Dashboard
**Setup:** Active session from a PAST date (yesterday or earlier).
**Steps 1:** Open Dashboard
**Expected 1:** No locked banner by default — End Day + Skip visible (since it's past 7pm and a past date)
**Steps 2:** In chat, type a message that would start a new day (e.g. "Good morning" / "start day")
**Expected 2:** Chat responds with blocked message — "Session for [past date] is still active. Complete your End Day routine before starting [today]. Head to the Dashboard or type your End Day trigger phrase."
**Fail condition:** Banner showing on Dashboard by default; or chat block message says "Start day already complete"

### TC-4: Skip Start Day
**Setup:** Dashboard in NEUTRAL state (no active session)
**Steps:** Tap Skip next to Start Day
**Expected:** Dashboard moves to ACTIVE state. No routine runs. Start/Skip buttons disappear. End Day button appears after 7pm.
**Fail condition:** Nothing changes, error occurs, or routine starts

### TC-5: Skip End Day → NEUTRAL
**Setup:** Active session, time >= 19:00
**Steps:** Tap Skip next to End Day
**Expected:** Session closes → NEUTRAL state. Start Day buttons reappear.
**Fail condition:** Nothing changes or error occurs

---

## Chat — Historical Data Access

### TC-6: "Log same item from yesterday"
**Setup:** Have at least one food/item logged yesterday.
**Steps:** In chat, type: "Log the same [item name] from yesterday"
**Expected:** AI retrieves yesterday's log, presents an action card pre-filled with the same values for confirmation
**Fail condition:** AI says it has no record / asks you to provide details manually

### TC-7: "Summarise my sleep last week"
**Setup:** Have sleep logs from the past 7 days.
**Steps:** In chat, type: "Summarise my sleep last week" or "How was my sleep last week?"
**Expected:** AI provides a summary using actual logged data (scores, durations, patterns)
**Fail condition:** AI says it cannot access historical data / hallucinates values

### TC-8: Non-historical message — no DB fetch delay
**Steps:** Send a normal message in chat (e.g. "Log 2L of water")
**Expected:** Normal response — no extra delay from historical lookup
**Fail condition:** Noticeably slower than pre-V30 for simple non-historical messages

---

## Chat — SSE Streaming

### TC-9: First Message Response Starts Immediately
**Setup:** Start a new chat from the home page input bar
**Steps:** Type a message and send
**Expected:** AI response text begins appearing within 1-2 seconds — words stream in progressively, not all at once after a long wait
**Fail condition:** Long blank pause before any text appears (buffered response)

### TC-10: Agent Switch Works
**Steps:** In chat, tap the agent selector (the dot/badge near the input) → switch to a different agent
**Expected:** Confirmation message appears in chat that agent was switched. No console error.
**Fail condition:** Nothing appears in chat after switching; or error shown

---

## Journal

### TC-11: TODAY Badge Shows Correct Date
**Setup:** Open app fresh (first load, no prior navigation)
**Steps:** Go to Journal
**Expected:** TODAY badge is on the actual current date (device date). Not yesterday, not tomorrow.
**Fail condition:** TODAY badge on wrong date on initial load (1-day stale)

### TC-12: Future Date — Forward Nav Disabled
**Steps:** In Journal, navigate to today's date entry
**Expected:** Forward (>) navigation button is disabled — cannot navigate past today
**Fail condition:** Forward button enabled on today's date

### TC-13: Past Date — Forward Nav Enabled
**Steps:** In Journal, navigate to any past date (e.g. yesterday)
**Expected:** Forward (>) button is enabled and navigates forward one day
**Fail condition:** Forward button disabled on a past date

---

## Tracker UI

### TC-14: Correlator Label + Layout
**Steps:** Open any tracker that has correlations set up → open the log card actions
**Expected:** Button/chip shows "Correlator" (not "Correlate") and is on its own line (not inline with View button)
**Fail condition:** Still says "Correlate"; or label is inline with View button

---

## Yes/No Field Logging

### TC-15: "No" Logs False, Not Skip
**Setup:** Be in an active routine with a yes/no field step (e.g. "Did you do benchmark today? (yes/no)")
**Steps:** When AI asks the yes/no question, respond: "no"
**Expected:** AI logs the value as No/false and moves to next step (or confirms)
**Fail condition:** AI treats "no" as wanting to skip the step entirely — step is skipped without logging a value

### TC-16: "Skip" Still Skips
**Setup:** Same as TC-15
**Steps:** When AI asks the yes/no question, respond: "skip"
**Expected:** Step is skipped without logging
**Fail condition:** Step logs "skip" as a value instead of skipping

---

## Regression Checks (must not have broken)

| # | Check |
|---|-------|
| R1 | Pull-to-refresh blocked in Chat |
| R2 | Pull-to-refresh blocked in Journal |
| R3 | Chat header pinned on scroll |
| R4 | Chat input pinned at bottom |
| R5 | Dashboard KCAL no duplicate badge |
| R6 | Start Day buttons visible in NEUTRAL state |
| R7 | Page navigation — not slower than V29 |

---

## ⚠️ NEXT SESSION INSTRUCTIONS

**On next session open, the orchestrator MUST:**
1. Read `.claude/sessions/2026-04-09/SESSION_LOG.md` — full V30 build history + status
2. Read `.claude/sessions/2026-04-09/technical_log_v30.md` — all changes across V30/V30.1 + CR + QA results
3. Read this file — TCS_v30.md — all test cases (TC-1 through TC-16 + R1–R7)
4. **First task:** Assign full TCS_v30 manual test to user on Android Chrome against latest commit on https://yaha-flame.vercel.app
5. Record results → triage failures → create V31 task if needed
6. Deferred from V29: TC-9 (Skip End Day → NEUTRAL) — include in V30 test run as TC-5 above
