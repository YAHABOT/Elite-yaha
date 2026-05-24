# V31 Human-Led Health System Audit
**Status:** Audit Complete (Remediation Required)
**Tester:** Armaan (Human-Authoritative)
**Report Date:** 2026-04-29

---

## 📋 Phase 1: CORE FUNCTIONALITY (21 tests)

### P1-1: UI & SELECT INPUT (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1-1.1** | Multi-option entry with Enter key | **FAIL** | — | **CRITICAL:** Enter key does not trigger new line/option in textarea. Blocked. |
| **P1-1.2** | Dynamic Option Add UI (+) | **FAIL** | — | **RE-DESIGN REQUESTED:** Replace textarea with dynamic list + plus button. |
| **P1-1.3** | Custom select option creation | **Blocked** | — | Cannot test due to 1.1 blocker. |
| **P1-1.4** | Multi-select toggle persistence | **Blocked** | — | — |
| **P1-1.5** | SELECT option logging accuracy | **Blocked** | — | — |
| **P1-1.6** | Switching away from SELECT clears options | **PASS** | — | Works as expected. |

### P1-2: UPDATE_DATA LOGIC (5 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1-2.1** | AI produces UPDATE_DATA card on correction | **FAIL** | [SC_P1_2.1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P1_2.1_1_FAIL.png) | **FAIL:** Creates duplicate row (INSERT) instead of UPDATE. |
| **P1-2.2** | UPDATE_DATA creates no duplicate row | **FAIL** | — | Logged as regression. |
| **P1-2.3** | Partial field update preserves others | **FAIL** | [SC_P1_2.3](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P1_2.3_FAIL.png) | **FAIL:** Shows "Log entry not found" error during partial updates. |
| **P1-2.4** | Double update (Overwrite) | **FAIL** | — | Feature broken. |
| **P1-2.5** | LOG_DATA still creates new rows | **PASS** | — | Normal logging works. |

### P1-3: MESSAGE HISTORY & CONTEXT (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1-3.1** | Yesterday's messages don't pollute today's context | **Partial PASS** | [SC_P1_3.1_CHAT](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P1_3.1_FAIL_CHAT.png), [SC_P1_3.1_JOURNAL](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P1_3.1_FAIL_JOURNAL.png) | **Partial PASS:** Context isolation worked, but timestamps were hallucinated. |
| **P1-3.2** | AI sees today's messages within same session | **PASS** | — | Works correctly. |
| **P1-3.3** | Historical query still works after filtering | **PASS** | [SC_P1_3.3_FORMAT](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P1_3.3_FORMATTING.png) | **PASS** (History works), but **formatting is off**. Indentation requested for sub-items. |
| **P1-3.4** | Routine doesn't reference yesterday's stale data | **PASS** | — | Works correctly. |
| **P1-3.5** | Cross-user isolation | `N/A` | — | Single account user. |
| **P1-3.6** | New chat session clean context | **FAIL** | [SC_P1_3.6_CONTEXT](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P1_3.6_CONTEXT.png) | **FAIL** (Context persists), but **USER DESIRED BEHAVIOR**. Do not change. |

### P1-4: INTEGRATION (4 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1-4.1** | Full routine flow with SELECT fields | **Blocked** | — | Options don't work in UI. |
| **P1-4.2** | Update within routine (mid-flow correction) | **FAIL** | — | Update log feature is broken globally. |
| **P1-4.3** | SELECT options persist across sessions | **Blocked** | — | Select tracker not functioning. |
| **P1-4.4** | UPDATE_DATA and LOG_DATA coexist correctly | **Blocked** | — | Feature doesn't work. |

---

## 📋 Phase 2: LOGIC & LLM INTELLIGENCE (57 tests)

### P2-1: 7:00 PM TIMESTAMP FIX (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-1.1** | Normal entry timestamp is NOT 7:00 PM | **PASS** | — | Verified: No 7 PM or wrong timestamps seen. |
| **P2-1.2** | Backdated entry uses wall-clock time | **PASS** | [SC_P2_1.2_H1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_1.2_HALLUCINATION_1.png), [SC_P2_1.2_H2](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_1.2_HALLUCINATION_2.png), [SC_P2_1.2_H3](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_1.2_HALLUCINATION_3.png) | **PASS** (Timestamp correct), but highlighted **new regression**: AI hallucinates values for unspecified fields and asks excessive follow-up questions. |
| **P2-1.3** | Multiple entries same day sequential | **PASS** | — | Works correctly. |
| **P2-1.4** | Entry logged for specific past date | **PASS** | — | Works correctly. |
| **P2-1.5** | Today's entry timestamp is accurate | **PASS** | — | Works correctly. |
| **P2-1.6** | Timestamp at legitimate 7:00 PM | `SKIP` | — | — |

### P2-2: TEXT FIELD WIDTH (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-2.1** | Action card SELECT value spans full width | **Blocked** | — | Cannot log SELECT fields due to UI blocker. |
| **P2-2.2** | Long select option value wraps correctly | **Blocked** | — | — |
| **P2-2.3** | Numeric fields still use compact 2-column | **PASS** | — | Correctly uses 2-column grid. |
| **P2-2.4** | Text input field expands on mobile | **FAIL** | [SC_P2_2.4_WIDTH](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_2.4_WIDTH_FAIL.png) | **FAIL:** Text input doesn't expand; looks narrow and wraps awkwardly. |
| **P2-2.5** | UpdateDataCard correct field widths | **Blocked** | — | Update feature doesn't work. |
| **P2-2.6** | Time-format values stay compact | `SKIP` | — | — |

### P2-3: HISTORICAL CONTEXT REGEX (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-3.1** | "Yesterday" trigger | **PASS** | — | Works correctly. |
| **P2-3.2** | "Day before" trigger | **FAIL** | [SC_P2_3.2_1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_3.2_LYING_1.png), [SC_P2_3.2_2](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_3.2_LYING_2.png), [SC_P2_3.2_3](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_3.2_LYING_3.png) | **FAIL:** AI pretends it doesn't have data for 2 days ago even when it's in the DB. "Triples down on lies." |
| **P2-3.3** | "How did I do" trigger | **PASS** | — | Works correctly. |
| **P2-3.4** | "Totals for" trigger | **FAIL** | — | Same as 3.2: pretends no data past yesterday. |
| **P2-3.5** | "What did I" trigger | **PASS** | — | **PASS** (Correlated lunch hours correctly), but got the time wrong (hallucination). |
| **P2-3.6** | Today's questions logic | **PASS** | — | **PASS**, but noted same wrong timestamp issues. |

### P2-4: YES_NO FIELD LOGIC (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-4.1** | "No" to YES/NO SELECT field logs "No" | **PASS** | — | Works correctly. |
| **P2-4.2** | "Yes" to YES/NO SELECT field logs "Yes" | **PASS** | — | Works correctly. |
| **P2-4.3** | "Skip" advances without logging | **PASS** | — | Works correctly. |
| **P2-4.4** | "Nope" / "nah" treated as "No" | `SKIP` | — | — |
| **P2-4.5** | "Yeah" / "yep" treated as "Yes" | `SKIP` | — | — |
| **P2-4.6** | Text/notes field: "no" is skipped | `SKIP` | — | — |

### P2-5: ROUTING DEFAULT FIX (5 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-5.1** | Root path (/) redirects to /chat | **FAIL** | — | **FAIL** on Vercel deployment (remains on root). |
| **P2-5.2** | /dashboard still directly accessible | **PASS** | — | Works correctly. |
| **P2-5.3** | Login redirects to /chat | **FAIL** | — | **FAIL:** Goes to /dashboard after login. |
| **P2-5.4** | Logout clears session and blocks /chat | **PASS** | — | Works correctly. |
| **P2-5.5** | All nav items still work after change | **PASS** | — | Works correctly. |
| **P2-5.6** | Back button works correctly | **PASS** | — | Standard browser navigation works. |

### P2-6: CLERK MODE & TONE (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-6.1** | Efficiency Check | `SKIP` | — | — |
| **P2-6.2** | Professionalism Check | `SKIP` | — | — |
| **P2-6.3** | Non-repetitiveness Check | `SKIP` | — | — |
| **P2-6.4** | Tone Check (Neutral/Efficient) | `SKIP` | — | — |
| **P2-6.5** | Tone Check (Neutral/Efficient) | **FAIL** | [SC_P2_6.5_TONE](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_6.5_TONE.png) | **FAIL:** No difference in tone between coffee, pizza, and ice cream. Monotone logging tone. |
| **P2-6.6** | Water Tracker creation | **PASS** | [SC_P2_6.6_WATER](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_6.6_WATER.png) | **PASS:** Correctly identified no water tracker and suggested creation. |

### P2-7: DE-OBFUSCATION (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-7.1** | Protein intake from DB only (No Hallucination) | **FAIL** | [SC_P2_7.1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_7.1_HALLUCINATION_FAIL.png) | **CRITICAL FAIL:** AI relies on chat context (mentions of pizza/ice cream) rather than actual DB logs for totals. |
| **P2-7.2** | Cross-tracker totaling (Food + Sleep) | **PASS** | — | Got both food and sleep info right. |
| **P2-7.3** | Recognition of specific date range | **PASS** | — | Correctly identified specific dates requested. |
| **P2-7.4** | Historical data visibility (1 week+) | **FAIL** | [SC_P2_7.4_1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_7.4_LYING_1.png), [SC_P2_7.4_2](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_7.4_LYING_2.png), [SC_P2_7.4_3](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_7.4_LYING_3.png) | **FAIL:** Pretends no data exists for April 20-24 even though it is present in the database. |
| **P2-7.5** | Comparison query (Today vs Yesterday) | **PASS** | — | Verified yesterday's protein total correctly when asked. |
| **P2-7.6** | Contextual search for specific item | **PASS** | — | Successfully found item within context. |

### P2-8: NATIVE MACRO TOTALING (1 test logged)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-8.2** | Graceful handling of missing fields | **PASS** | [SC_P2_8.2](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_8.2_ESTIMATE_FAIL.png) | **PASS** (Totals correct), but **NEW ISSUE**: AI forced estimations for carbs/fat when only cals/protein provided. |
| **P2-8.3** | Bot pre-calculated totals match manual math | **PASS** | — | Bot correctly pulls/reads from DB for totals. |
| **P2-8.4** | Macro totals update after a new log | **PASS** | — | Real-time update verified. |
| **P2-8.5** | Totals don't bleed between days | **PASS** | — | Daily isolation working. |
| **P2-8.6** | Consistency in session totaling | **PASS** | — | Verified. |

### P2-9: ANTI-HALLUCINATION RULES (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-9.1** | Native nutritional knowledge confidence | **PASS** | — | Verified. |
| **P2-9.2** | No fabricated cards for missing trackers | **PASS** | — | **PASS+**: Suggested adding to notes instead of inventing a tracker. |
| **P2-9.3** | Only logs items mentioned by user | **FAIL** | [SC_P2_9.3](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_9.3_DATE_DB_FAIL.png) | **MAJOR FAIL:** AI failed to read DB for today's logs. Hallucinated date (March 25 vs April 29) and claimed no logs exist. |
| **P2-9.4** | Single-number logging guard | **PASS** | — | Verified. |
| **P2-9.5** | Exact tracker UUID usage | **PASS** | — | Verified. |
| **P2-9.6** | Ambiguous input handling (clarification) | **FAIL** | [SC_P2_9.6](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_9.6_AMBIGUITY_FAIL.png) | **FAIL:** Automatically assumed "96" was calories based on previous context, even in a new chat. |

### P2-10: INTEGRATION TESTS (4 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-10.1** | History + Persona integration | **PASS** | [SC_P2_10.1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC_P2_10.1_INTEGRATION.png) | **PASS:** Conversationally analyzed yesterday's macros vs goals (asked for goals). |
| **P2-10.2** | Math + De-obfuscation integration | **PASS** | — | Verified. |
| **P2-10.3** | Routing + Timestamp independence | **PASS** | — | Verified. |
| **P2-10.4** | SELECT + YES_NO + Width integration | **Blocked** | — | Blocked by SELECT field UI failure. |

---

---

## 🛑 POST-AUDIT CRITICAL DISCOVERIES

| Bug ID | Title | Status | Evidence | Description |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-X1** | Ritual Deadlock (FK Violation) | **NEW** | [SC1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC1_RITUAL_STUCK.png) | `foreign key violation` occurs when logging rituals, trapping user in "Step 1 In Progress" loop. **Update:** Specifically happening to one user who is stuck unable to end day; step keeps reappearing. |
| **BUG-X2** | End of Day Duplication | **NEW** | [SC1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC1_EOD_DUPE.png) | Allowed "End Day" routine twice, resulting in double calculation of daily steps and calories. **Update:** Confirmed double calculations and same-account recurrence. |
| **BUG-X3** | Dashboard Text Overflow | **NEW** | [SC1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC1_TEXT_OVERFLOW.png) | Long text in dashboard widgets (e.g., "LAST WORKOUT") overflows the widget container and extends beyond the mobile screen viewport without wrapping or truncating. |
| **BUG-X4** | Routine Data Hallucination | **NEW** | [SC1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC1_ROUTINE_FAKE_DATA.png), [SC2](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC2_ROUTINE_REAL_DATA.png) | When asked to use "stats from yesterday" during a routine step, AI initially fabricated placeholder/fake data instead of querying the database. Only retrieved real historical data after being corrected. |
| **BUG-X5** | Major Routine Regression | **NEW** | Human Audit Feedback | Routines (Start/End Day) are reported as completely broken and functionally regressed. The system fails to advance or execute routine steps reliably, despite no direct changes to the routine logic. |
| **BUG-X6** | Pull-to-Refresh Layout Break | **NEW** | Human Audit Feedback | **Intermittent:** Pulling down on Chat/Tracker pages sometimes triggers an unwanted refresh. This causes critical UI elements (Header and Chat Input) to become "unpinned" or detached from their fixed positions. |
| **BUG-X7** | ActionCard Duration Display Error | **NEW** | [SC1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC1_DURATION_FAIL.png) | **Intermittent:** Confirmation card incorrectly displays workout duration as "00:59" even when the AI explicitly sends "24:59". Likely a frontend interpretation or truncation error for `time` type fields. |
| **BUG-X8** | Routine Progression Failure | **NEW** | [SC1](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/SC1_ROUTINE_STALL.png) | **Intermittent:** System failed to automatically prompt for Step 2 questions after Step 1 was confirmed. Required manual user prompt ("where is step 2") to resume the routine flow. |
| **BUG-X9** | Meal Logging Context & Logic Regression | **NEW** | [SC1-SC11](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/BUG_X9_SC1.png) | **CRITICAL REGRESSION:** Severe context/logic failure: (1) **Context Amnesia**: AI used file content, then claimed "no files provided" in the next turn. (2) **Forced Estimation & Math Mismatch**: Ignored provided data for Egg Whites to use "USDA standards," causing a calculation error (348 kcal vs the correct 343.7 kcal). (3) **Filtering Failure**: Included all `BW.txt` items despite specific selection instructions. (4) **Quantity Confusion**: Persistent issues with weights (100g) and measurements. (5) **Persistence of Error**: Failed to acknowledge corrections through multiple turns. |
| **BUG-X10** | Arithmetic Failure & Context Denial | **NEW** | [SC1-SC4](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/BUG_X10_SC1.png) | **CRITICAL REGRESSION:** Total breakdown of logic and math: (1) **Summation Failure**: AI lists correct individual macros for 7 items but fails simple addition for the final total. (2) **Double Context Denial**: AI explicitly claims "I hallucinated that you provided stats/images," effectively gaslighting the user by denying the existence of files and text input it had just processed. (3) **Reasoning/Card Mismatch**: Totals in the reasoning text mismatch the final ActionCard values. |
| **BUG-X11** | Image Denial (Gaslighting) & Sleep Data Errors | **NEW** | [SC1-SC5](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/BUG_X11_SC1.png) | **CRITICAL REGRESSION:** Extreme case of AI gaslighting: (1) **Attachment Denial**: AI explicitly denies receiving a screenshot that is clearly attached in the history, claiming it "made up" data to cover for the "missing" image. (2) **Mapping Failure**: Mistakenly duplicates the same value for 'Time in Bed' and 'Actual Sleep Time'. (3) **Precision Hallucination**: Logs "88.1" for a score that should be "88". (4) **Persistence**: Triples down on the lie across 4+ turns (SC4, SC5). |

---

## Summary (Final Audit)

| Phase 1 | 21 | 6 | 8 | 6 | 1 |
| Phase 2 | 57 | 33 | 11 | 4 | 9 |
| Post-Audit | 11 | 0 | 11 | 0 | 0 |
| **Total** | **89** | **39** | **30** | **10** | **10** |

**Final Recommendation:** System is **UNSAFE** for production release. Core regressions in UPDATE logic and critical DB deadlocks (BUG-X1, BUG-X2) require immediate remediation. UI for SELECT trackers is a complete blocker for specialized health tracking. The "Intuition Gap" between V31 and benchmarks (see [Intuition Benchmark](file:///c:/Users/the--/Documents/Projects/yaha/.claude/sessions/2026-04-26/V31%20Test%20report/INTUITION_BENCHMARK.png)) highlights a severe regression in proactive intelligence.
