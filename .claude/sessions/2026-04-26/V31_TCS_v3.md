# Phase 3 Test Coverage Suite (TCS v3): REMEDIATION & ROUTINE INTEGRITY

**CODE REVIEW GATE:** 🚨 [CR | 09:15] PENDING  
**QA PHASE:** Remediation Validation + New Bug Verification  
**SCOPE:** Fixes for BUG-X1 (Ritual Deadlock), BUG-X2 (EOD Duplication), UPDATE_DATA vs INSERT duplication, SELECT field UI redesign, DB-First retrieval rules, and clerk-mode integrity.

---

## 📋 Test Results Summary

| Area | Test Count | Status | Notes |
|------|-----------|--------|-------|
| BUG-X1: Ritual Deadlock | 4 | PENDING | FK violations + Loop recovery |
| BUG-X2: EOD Duplication | 4 | PENDING | State locking + Duplicate guard |
| UPDATE_DATA Logic | 4 | PENDING | Row ID mapping + partial updates |
| SELECT UI Redesign | 4 | PENDING | Dynamic list + Plus button behavior |
| DB-First Retrieval | 4 | PENDING | No chat-context totals; DB truth only |
| Clerk Mode Integrity | 4 | PENDING | No silent estimations; clarification first |
| Timezone Drift Fix | 4 | PENDING | 3:40 vs 4:40 logic + local offset |

**Total Test Cases:** 28  
**Manual Testing Required:** Yes (High-stakes UI & DB interactions)  
**Automation Possible:** Yes (Supabase schema tests for FKs)

---

## 1. BUG-X1: Ritual Deadlock (FK Violation)
**Coverage:** Foreign key mapping, "Step 1 In Progress" loop recovery, tracker_id validation.

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| **P3-1.1** | Log a Ritual Item (Vitamins/Supps) | No `foreign key violation`; log successful. | |
| **P3-1.2** | Interrupted Ritual Resume | After error/refresh, user is NOT stuck in "Step 1". | |
| **P3-1.3** | Multiple Ritual Logs in Session | Each log references correct `tracker_id` (no stale IDs). | |
| **P3-1.4** | Force Start New Ritual | Starting a new ritual clears any previous "In Progress" locks. | |

---

## 2. BUG-X2: End of Day Duplication
**Coverage:** Daily state locking, routine completion flags, double-calculation prevention.

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| **P3-2.1** | Trigger "End Day" Twice | Second attempt shows "Day already ended" or performs update. | |
| **P3-2.2** | Verify Daily Steps Calculation | EOD summary matches single DB sum (no doubling). | |
| **P3-2.3** | Verify Daily Calorie Calculation | EOD summary matches single DB sum (no doubling). | |
| **P3-2.4** | Routine Completion Check | `/chat` state updates to "Routine Finished" after first EOD. | |

---

## 3. UPDATE_DATA Logic Fixes
**Coverage:** Row ID mapping, Overwrite vs Duplicate, Partial field integrity.

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| **P3-3.1** | Correct a previous entry | AI issues UPDATE_DATA with the `row_id` of the entry. | |
| **P3-3.2** | Verify DB row count after correction | Row count remains same (Update, not Insert). | |
| **P3-3.3** | Update only 1 field of 5 | Remaining 4 fields are preserved (no null-overwrite). | |
| **P3-3.4** | Correction with "Log entry not found" check | Update succeeds without 404 error if row exists. | |

---

## 4. SELECT UI Redesign (Dynamic List)
**Coverage:** UX redesign validation, multi-select logic, (+) button functionality.

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| **P3-4.1** | Render SELECT field in ActionCard | Shows dynamic list with (+) button (not textarea). | |
| **P3-4.2** | Add multiple options via (+) | Options added to temporary list; correctly logged. | |
| **P3-4.3** | Multi-select persistence | Selected items remain visible until "Save" or "Close". | |
| **P3-4.4** | Empty SELECT state | Renders clean "Add item..." placeholder. | |

---

## 5. DB-First Retrieval (Anti-Hallucination)
**Coverage:** Database truth over chat context, historical accuracy.

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| **P3-5.1** | Ask "What's my protein total?" | AI queries DB *before* answering (no chat-context math). | |
| **P3-5.2** | Mention "Pizza" but don't log it | Ask for total: Pizza macros are NOT included. | |
| **P3-5.3** | Query data from 2 days ago | AI fetches and correctly displays (no "I don't have data"). | |
| **P3-5.4** | Date awareness check | April 29 query correctly identifies April 29 data. | |

---

## 6. Clerk Mode Integrity (No Estimations)
**Coverage:** Explicit logging rules, clarification triggers, presumptive behavior guard.

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| **P3-6.1** | Provide only Cals/Protein | AI logs *only* Cals/Protein (no silent carb/fat estimates). | |
| **P3-6.2** | Provide ambiguous "96" | AI asks "Is 96 for calories or something else?" | |
| **P3-6.3** | Conflict between chat and user intent | AI follows latest explicit user instruction over context. | |
| **P3-6.4** | Tone Check (Neutral/Efficient) | Response is efficient, professional, and non-repetitive. | |

---

## 7. Timezone & Timestamp Drift
**Coverage:** 1-hour offset fix, local vs UTC mapping.

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| **P3-7.1** | Log at 4:40 PM | Log card and DB record show 4:40 PM (not 3:40 PM). | |
| **P3-7.2** | Verify 1-hour drift regression | No automatic offset added/subtracted by server incorrectly. | |
| **P3-7.3** | Routine Start/End Timestamps | Start Day/End Day rituals record accurate wall-clock time. | |
| **P3-7.4** | Dashboard Trend Sync | Data logged at 11:30 PM appears on today (not yesterday). | |

---

## 🎯 PASS/FAIL CRITERIA

**PASS Verdict:**
- BUG-X1 and BUG-X2 are verified fixed in the production/staging environment.
- UPDATE_DATA operations perform actual SQL `UPDATE` instead of `INSERT`.
- UI renders the new dynamic select component.
- All 28 scenarios documented above yield expected results.

**FAIL Verdict:**
- Any "foreign key violation" persists during routine logging.
- Any duplication of daily totals (Steps/Cals) occurs.
- Hallucinations based on chat context (instead of DB) are detected.

---
[QA | 09:20] Phase 3 TCS v3 generated. Ready for remediation testing.
