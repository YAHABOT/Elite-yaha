# YAHA V31 Manual Test Report (Remediation Audit)

**Status:** IN PROGRESS — Browser agent rate-limited. Resuming manually or in next session.
**Environment:** Local Dev (localhost:3000)
**Session Date:** 2026-04-27
**Tests Completed:** ~28 / 67

---

## 1. Phase 1: Core Integrity (Data Model & Logic)

| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1-1.1** | SELECT field visibility (Manual Form) | **FAIL** | [SC_P1_1.1_FAIL.png](screenshots/SC_P1_1.1_FAIL.png) | SELECT input is invisible in manual log form. `LogForm.tsx` missing `case 'select'`. |
| **P1-1.2** | Multi-select creation in tracker editor | **PASS** | — | Tracker saved successfully with multi-select enabled. |
| **P1-1.3** | Value matching via AI Chat | **PASS** | — | Logged "Good" successfully via chat. |
| **P1-1.5** | Yes/No String Fix (Bug 29) | **PASS** | — | "No" logged as a select value, not a raw string. |
| **P1-2.1** | UPDATE_DATA Merging | **FAIL** | [SC_P1_2.1_FAIL.png](screenshots/SC_P1_2.1_FAIL.png) | AI failed to generate UPDATE card; created duplicate LOG instead. AI can't retrieve previous entry `id`. |
| **P1-2.2** | Duplicate Row Guard | **PASS** | — | Manual click guard works; AI merge still fails. |
| **P1-3.1** | Message Filtering (Current Day) | **PASS** | — | Correctly retrieved today's logs without leaking other data. |
| **P1-3.6** | Session Isolation (New Chat) | **FAIL** | [SC_P1_3_6_FAIL_SessionLeak.png](screenshots/SC_P1_3_6_FAIL_SessionLeak.png) | AI retained context from previous session after clicking "New Chat". |
| **P1-4.1** | Routine with SELECT field | **FAIL** | [SC_P1_4_1_FAIL_SelectField.png](screenshots/SC_P1_4_1_FAIL_SelectField.png) | SELECT values render as "—", validation fails, Log Entry button stays disabled. |
| **P1-Math** | Nutritional Calculation (EVOWHEY 45g) | **PASS** | [SC_P1_Math_PASS.png](screenshots/SC_P1_Math_PASS.png) | 45g @ 30g base: 165 kcal, 34.65g Protein. Matched pantry.txt exactly. |
| **P1-Math-Beef** | Complex Scaling (150g / 301g total) | **PASS** | [SC_Math_PASS_ComplexBeef.png](screenshots/SC_Math_PASS_ComplexBeef.png) | ~179.7 kcal, 24.4g Protein. Scaling math is accurate. |

---

## 2. Phase 2: Logic Fixes & UX

| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-1.1** | Current Timestamp (Bug 7) | **PASS** | — | Logs recorded at actual wall-clock time, not 7:00 PM. |
| **P2-1.2** | Yesterday Backdated Timestamp | **PASS** | — | Backdated entry uses current wall-clock time, not noon UTC. |
| **P2-1.4** | March 15th Entry Timestamp | **PASS** | — | Entry logged at 3:59 PM (current time), date correctly March 15. |
| **P2-2.1** | SELECT Field Container Width | **PASS (partial)** | [SC_P2_2.1_PASS_Width_FAIL_Render.png](screenshots/SC_P2_2.1_PASS_Width_FAIL_Render.png) | Container spans full width ✓. But value is still invisible (same root bug as P1-1.1). |
| **P2-Delete** | Deletion Logic (UX) | **PASS** | [SC_Journal_No_Delete.png](screenshots/SC_Journal_No_Delete.png) | No delete button in Journal. Delete ONLY in Tracker History (trash icons). |
| **P2-3.1** | Relative Date "2 days ago" | **PASS** | — | "I had a burger 2 days ago" correctly identified as April 25. |
| **P2-4.1** (via Agent) | Persona Identity | **PASS** | — | Correctly identifies as "YAHA Assistant" under "NEUTRAL PROTOCOL". |
| **P2-5.1** (via Agent) | Anti-Hallucination (Weather) | **PASS** | — | Correctly rejected real-time weather query. |

---

## 3. Pending Tests (Not Yet Run — Rate Limit Hit)

### Phase 2 Remaining (~39 tests outstanding)
| Set | Tests | Key Focus |
| :--- | :--- | :--- |
| P2-2.2–2.6 | 5 tests | Long value wrapping, numeric 2-col layout, mobile width, UpdateDataCard, time fields |
| P2-3.2–3.6 | 5 tests | "Day before", "How did I do", "Totals for", "What did I", today ≠ historical |
| P2-4.1–4.6 | 6 tests | Yes/No field: "No", "Skip", "Nope/nah", "Yeah/yep", text field "no" |
| P2-5.1–5.6 | 6 tests | Root redirect to /chat, /dashboard still works, login redirect, logout, nav, back button |
| P2-6.1–6.6 | 6 tests | Dual output (text+card), macro estimates sanity, Big Mac query, tone, conciseness |
| P2-7.1–7.6 | 6 tests | Human-readable field names in responses (no fld_xxx IDs) |
| P2-8.1–8.6 | 6 tests | Macro totaling accuracy, null handling, real-time update, no cross-day bleed |
| P2-9.1–9.6 | 6 tests | Anti-hallucination: estimation, tracker scope, food invention, double-log guard |
| P2-10.1–10.4 | 4 tests | Integration: historical+persona, totaling+de-obfuscation, routing+timestamp, SELECT+YES_NO+width |

---

## 4. Global Observations

### 4.1 Dashboard Empty State
The Dashboard shows "No widgets yet" despite active trackers. Possibly a widget configuration issue.

### 4.2 Navigation Default
App defaults to Dashboard on load. `/` may not redirect to `/chat` (P2-5.1 pending).

### 4.3 SELECT Rendering — Root Cause Confirmed
All SELECT-related failures (P1-1.1, P1-4.1, P2-2.1 partial) share the same root bug:
- **`LogForm.tsx`** (lines ~190-238): Missing `case 'select'` block in the form renderer.
- **`ActionCard.tsx`**: Defaults all inputs to `type="text"`, so dropdowns don't render as selects in chat.

### 4.4 UPDATE_DATA — Root Cause Confirmed
AI cannot retrieve the `id` of a previous log entry from context, so `updateLogAction` is never called with the correct target. Results in a second `LOG_DATA` instead of an update.

### 4.5 Session Isolation Leak
"New Chat" does not fully clear the LLM context window. Prior session data leaks into the new chat.

---

## 5. Known Regressions (Confirmed FAILs)

| # | Regression | TC | Severity |
| :--- | :--- | :--- | :--- |
| 1 | SELECT field invisible in Manual Form | P1-1.1 | 🔴 Critical |
| 2 | UPDATE_DATA creates duplicate LOG instead | P1-2.1 | 🔴 Critical |
| 3 | Routine SELECT field: value "—", Log disabled | P1-4.1 | 🔴 Critical |
| 4 | Session context leaks across New Chat | P1-3.6 | 🟡 Major |

---

## 6. Screenshot Index

| File | TC | Status |
| :--- | :--- | :--- |
| [SC_P1_1.1_FAIL.png](screenshots/SC_P1_1.1_FAIL.png) | P1-1.1 | SELECT invisible in form |
| [SC_P1_2.1_FAIL.png](screenshots/SC_P1_2.1_FAIL.png) | P1-2.1 | UPDATE → duplicate LOG |
| [SC_P1_Math_PASS.png](screenshots/SC_P1_Math_PASS.png) | P1-Math | EVOWHEY scaling ✓ |
| [SC_P1_Math_FAIL_Mixed_Bowl.png](screenshots/SC_P1_Math_FAIL_Mixed_Bowl.png) | Math-Mixed | Mixed bowl multi-item |
| [SC_P1_3_6_FAIL_SessionLeak.png](screenshots/SC_P1_3_6_FAIL_SessionLeak.png) | P1-3.6 | Session context leak |
| [SC_P1_4_1_FAIL_SelectField.png](screenshots/SC_P1_4_1_FAIL_SelectField.png) | P1-4.1 | Routine SELECT disabled |
| [SC_Math_PASS_ComplexBeef.png](screenshots/SC_Math_PASS_ComplexBeef.png) | Math-Beef | Complex scaling ✓ |
| [SC_P2_2.1_PASS_Width_FAIL_Render.png](screenshots/SC_P2_2.1_PASS_Width_FAIL_Render.png) | P2-2.1 | Width OK, render broken |
| [SC_Journal_No_Delete.png](screenshots/SC_Journal_No_Delete.png) | P2-Delete | No delete in Journal ✓ |
