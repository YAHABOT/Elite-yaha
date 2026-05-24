# V31 FINAL CONSOLIDATED HUMAN TEST REPORT
**Status:** Audit In Progress
**Tester:** Armaan (Human-Authoritative)
**Report Date:** 2026-04-30
**Build:** V31 (Commit: 31d487c)
**Target URL:** [https://yaha-bcf4vgog2-yahabots-projects.vercel.app](https://yaha-bcf4vgog2-yahabots-projects.vercel.app)

---

## 📋 PHASE 1 — DATA MODEL & CORE INTEGRITY (21 tests)

### TEST SET P1-1: SELECT FIELD TYPE (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1-1.1** | Create tracker with SELECT (single) | **PASS** | [SC_P1_1.1](SC_P1_1.1_DESKTOP_LAYOUT.png) | **Note:** Desktop view is layout-broken ("out the box"), but functionality passes. |
| **P1-1.2** | Create tracker with SELECT (multi) | **PASS** | [SC_P1_1.1](SC_P1_1.1_DESKTOP_LAYOUT.png) | Same layout issue as 1.1. Functionality passes. |
| **P1-1.3** | Log value matching SELECT options | **FAIL** | [SC_P1_1.3](SC_P1_1.3_FAIL.png) | Sleep quality field is present but cannot be interacted with; there are no options to select from in the UI. |
| **P1-1.4** | Invalid option rejected | **FAIL** | [SC_P1_1.4_1](SC_P1_1.4_FAIL_1.png), [SC_P1_1.4_2](SC_P1_1.4_FAIL_2.png) | AI claimed to have logged "Excellent" and filled out the card, but the actual confirmation card had all fields blank/empty (no values logged). |
| **P1-1.5** | Yes/No SELECT field mapping | **FAIL** | [SC_P1_1.5](SC_P1_1.5_PARTIAL_PASS.png) | **Partial Pass:** Entering "No" correctly populates the ActionCard. However, the AI's question text is confusing, telling the user to "please select" when there is no dropdown to select from. |
| **P1-1.6** | Stress test: Many options | **FAIL** | [SC_P1_1.6](SC_P1_1.6_FAIL.png) | Creation is successful, but option dropdown selection fails as noted in P1-1.3. |

### TEST SET P1-2: UPDATE_DATA ACTION (5 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1-2.1** | Log correction via UPDATE_DATA | **PASS** | — | Passed on Vercel preview deployment (Commit 31d487c). Failed on localhost dev server. |
| **P1-2.2** | Respects fieldId validation | **PASS** | — | Passed on Vercel preview deployment (Commit 31d487c). Failed on localhost dev server. |
| **P1-2.3** | Multi-select field update | **PASS** | — | Passed on Vercel preview deployment (Commit 31d487c). Failed on localhost dev server. |
| **P1-2.4** | No FK violation deadlocks | **PASS** | — | Passed on Vercel preview deployment (Commit 31d487c). Failed on localhost dev server. |
| **P1-2.5** | Partial field update | **PASS** | — | Passed on Vercel preview deployment (Commit 31d487c). Failed on localhost dev server. |

### TEST SET P1-3: MESSAGE HISTORY FILTERING (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1-3.1** | Recent messages (same day) | **PASS** | — | Recalls messages from today's active session. **Note:** AI correctly compiled logs from other chat sessions of today, but the times reported for when they were logged were incorrect. |
| **P1-3.2** | Cross-day isolation | **PASS** | — | Bot does not pollution context with yesterday's chat history. When asked what was logged yesterday, it successfully fetched the accurate logs from the database. |
| **P1-3.3** | Cross-day locked banner | **SKIP** | — | No such feature exists or is requested. |
| **P1-3.4** | 30 message context window | **SKIP** | — | Skipped. |
| **P1-3.5** | User_id filtering | **SKIP** | — | Skipped. |
| **P1-3.6** | Persistence across reload | **PASS** | — | Session history remains active and recall works correctly after browser refresh. |

### TEST SET P1-4: INTEGRATION TESTS (4 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1-4.1** | Combined: CREATE → SELECT → LOG → UPDATE | **PASS** | — | Passed on Vercel preview deployment (Commit 31d487c). |
| **P1-4.2** | Multi-tracker isolation | **PASS** | — | Bot correctly separates logs between different tracker types without cross-contamination. |
| **P1-4.3** | Stress: Rapid updates | **PASS** | — | Passed on Vercel preview deployment (Commit 31d487c). |
| **P1-4.4** | Complex SELECT + TEXT tracker | **PASS** | — | Passed on Vercel preview deployment (Commit 31d487c). |

---

## 📋 PHASE 2 — LOGIC FIXES & LLM INTELLIGENCE (46 tests)

### TEST SET P2-1: 7PM TIMESTAMP REGRESSION FIX (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | : :--- | :--- | :--- | :--- |
| **P2-1.1** | End Day visible after 7PM | **PASS** | — | — |
| **P2-1.2** | End Day hidden before 7PM | **SKIP** | — | Skipped. |
| **P2-1.3** | End Day neutral state start | **SKIP** | — | Skipped. |
| **P2-1.4** | No double-ending session | **PASS** | — | Correctly blocks duplicate End Day executions. |
| **P2-1.5** | Timestamp refresh persistence | **PASS** | — | State is preserved after page refresh. |
| **P2-1.6** | No double-starting session | **PASS** | — | Correctly rejects starting day when session is already active. |

### TEST SET P2-2: TEXT FIELD WIDTH FIX (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-2.1** | Notes field full width | **FAIL** | [SC_P2_2.1_1](SC_P2_2.1_FAIL_1.png), [SC_P2_2.1_2](SC_P2_2.1_FAIL_2.png) | Meal notes text field is narrow and does not span the full card width; text wraps early and is truncated at the right edge. |
| **P2-2.2** | Multi-line preservation | **FAIL** | — | There is no way to enter/send line breaks or preserve formatting. |
| **P2-2.3** | Mobile/Tablet consistency | **SKIP** | — | Skipped. |
| **P2-2.4** | Long text layout stability | **PASS** | — | Large texts do not crash or break components layout, though wrapping issues persist. |
| **P2-2.5** | Nested text field width | **PASS** | — | Layout is kept. |
| **P2-2.6** | Formatting persistence on confirm | **FAIL** | [SC_P2_2.6](SC_P2_2.6_FAIL_3.png) | **FAIL:** The text field wraps extremely narrowly in the journal page (literally 2-3 words per line, taking up 10 vertical lines instead of 4-5). |

### TEST SET P2-3: HISTORICAL CONTEXT REGEX (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-3.1** | "Yesterday" pattern | **PASS** | — | Bot retrieves yesterday's sleep data correctly. |
| **P2-3.2** | "Last week" pattern | **FAIL** | [SC_P2_3.2](SC_P2_3.2_FAIL_1.png) | **FAIL:** AI pretends not to have data for the days May 18th-22nd even though data was present in the database. |
| **P2-3.3** | Same-day context retrieval | **PASS** | — | Recalls both entries correctly. |
| **P2-3.4** | Robust multi-pattern triggers | **FAIL** | [SC_P2_3.4_1](SC_P2_3.4_FAIL_2.png), [SC_P2_3.4_2](SC_P2_3.4_FAIL_3.png), [SC_P2_3.4_3](SC_P2_3.4_FAIL_4.png) | **FAIL:** "yesterday", "today", "this morning", "this afternoon" pass. However, "day before", "previous day", "7 days ago" fail because the AI fabricates fake placeholder data instead of querying the DB. It does not check the database for logs past yesterday. |
| **P2-3.5** | Day boundary (12 AM) cutoff | **SKIP** | — | Skipped. |
| **P2-3.6** | Sequential historical queries | **FAIL** | — | AI cannot fetch data past yesterday, resulting in failure for any relative date beyond 1 day. |

### TEST SET P2-4: YES_NO FIELD LOGIC (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-4.1** | YES_NO persistence in schema | **PASS** | — | — |
| **P2-4.2** | Affirmative (Yes) logs SELECT option | **PASS** | — | — |
| **P2-4.3** | Negative (No) logs SELECT option | **PASS** | — | — |
| **P2-4.4** | Implicit "didn't" interpreted as No | **PASS** | — | — |
| **P2-4.5** | Multi-question YES_NO routine | **SKIP** | — | Skipped (cross-tracker questions ask individually). |
| **P2-4.6** | Option list recall (no hallucinations) | **FAIL** | [SC_P2_4.6](SC_P2_4.6_FAIL.png) | **FAIL:** While the AI correctly recalled the "Yes" and "No" options, it also eagerly tried to log a "Yes" entry and presented an ActionCard confirmation, which was not requested. |

### TEST SET P2-5: ROUTING DEFAULT (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-5.1** | "/" redirects to "/chat" | **FAIL** | — | Root path redirects to Dashboard, which is the exact opposite of the expected behaviour. |
| **P2-5.2** | Login redirects to "/chat" | **FAIL** | — | Post-login also lands on Dashboard, not /chat. |
| **P2-5.3** | /dashboard accessibility | **PASS** | — | Dashboard page loads when navigated to directly. |
| **P2-5.4** | Chat ↔ Dashboard nav | **PASS** | — | Navigation between Chat and Dashboard works in both directions. |
| **P2-5.5** | Dashboard deep links | **FAIL** | [SC1](SC_P2_5.5_FAIL.png), [SC2](SC_P2_5.5_FAIL_2.png) | Dashboard loads but is functionally broken: avg protein shows 22.9g despite daily intake being 190g+. Widget text overflows its container. |
| **P2-5.6** | Middleware resolution | **PASS** | — | All routes (/chat, /dashboard, /trackers) resolve without 404s or middleware errors. |

### TEST SET P2-6: LLM PERSONA SEPARATION (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-6.1** | Intra-session consistency | **PASS** | — | Bot maintains consistent voice and personality across the session. |
| **P2-6.2** | No tracker cross-bleeding | **PASS** | — | Bot correctly separates Sleep and Mood tracker data with no contamination. |
| **P2-6.3** | Persona identity separation | **PASS** | — | Bot correctly associates name with user. Noted as low-value test. |
| **P2-6.4** | User data vs AI voice distinction | **PASS** | — | Bot presents user logs as user data. Noted as low-value test. |
| **P2-6.5** | Multi-user isolation | **PASS** | — | No cross-user bleed observed at time of testing. |
| **P2-6.6** | Expertise disclaimer consistency | **PASS** | [SC1](SC_P2_6.6.png), [SC2](SC_P2_6.6_2.png) | Technically provides medical guidance (1.6–2.2g/kg protein recommendation) rather than strictly disclaiming. However, behaviour is considered acceptable — no code change required. |

### TEST SET P2-7: FIELD ID DE-OBFUSCATION (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-7.1** | Correct field landing (no swaps) | **PASS** | — | — |
| **P2-7.2** | Normalized fieldId in prompts | **PASS** | — | — |
| **P2-7.3** | Label/ID match in ActionCard | **PASS** | — | — |
| **P2-7.4** | UPDATE_DATA specific fieldId usage | **PASS** | — | — |
| **P2-7.5** | Partial update isolation | **PASS** | — | — |
| **P2-7.6** | Math accuracy with fld_xxxxx | **PASS** | — | — |

### TEST SET P2-8: NATIVE MACRO TOTALING (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-8.1** | Daily protein summation (FIXED) | **PASS** | — | — |
| **P2-8.2** | KCAL multi-entry summation | **PASS** | — | — |
| **P2-8.3** | Historical (Yesterday) averages | **PASS** | — | — |
| **P2-8.4** | Zero values handling | **PASS** | — | — |
| **P2-8.5** | Negative value arithmetic | **PASS** | — | — |
| **P2-8.6** | Dashboard widget consistency | **FAIL** | — | Dashboard widget is broken — reports wrong values (e.g. avg protein 22.9g vs actual 190g+). Cross-references P2-5.5 dashboard failure. |

### TEST SET P2-9: ANTI-HALLUCINATION AUDIT (6 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-9.1** | No fake routine history | **FAIL** | [SC1](SC_P2_9.1_FAIL_1.png), [SC2](SC_P2_9.1_FAIL_2.png) | Bot conflates the End Day routine completion time with the last food log (18:50). When pushed, it admits it doesn't have a specific timestamp for the End Day routine — it should know and surface this explicitly rather than substituting the last activity. |
| **P2-9.2** | No fake data for empty trackers | **PASS** | — | Bot correctly reports no data exists when nothing has been logged. |
| **P2-9.3** | Vision capability (no false denial) | **PASS** | — | Bot correctly analyses image input without falsely claiming it cannot see. |
| **P2-9.4** | Vision denial (unsupported files) | **SKIP** | — | Skipped. |
| **P2-9.5** | No fake field name inventions | **PASS** | — | Bot correctly lists only actual tracker fields without hallucinating extras. |
| **P2-9.6** | No fake file receipt claims | **SKIP** | — | Skipped. |

### TEST SET P2-10: FULL WORKFLOW (4 tests)
| Test ID | Scenario | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P2-10.1** | End-to-end: Auth to Routine | **FAIL** | [SC1](SC_P2_10.1_FAIL.png) | Fitness & Recovery summary correct. However, calorie total is wrong (reports 1,721 kcal excl. burger) and food log count is wrong (says 4 entries but should be 5 if burger is included). Inaccurate macro aggregation on summary. |
| **P2-10.2** | Multi-day trend query | **FAIL** | [SC2](SC_P2_10.2_FAIL_1.png), [SC3](SC_P2_10.2_FAIL_2.png) | Yesterday query (step 3): Bot claims no sleep log exists for May 23rd despite data being in the DB. Trend query (step 4): Bot shows "No data recorded" for May 23rd and produces unverified values for May 21–22. Root cause is the same as P2-3.4 — bot does not poll the database for any date beyond yesterday. |
| **P2-10.3** | Rapid input (Concurrency) | **SKIP** | — | Not testable — UI design requires waiting for bot response before next message can be sent. |
| **P2-10.4** | Stability (30+ message window) | **FAIL** | [SC4](SC_P2_10.4_FAIL.png) | Bot cannot recall a beef dish recipe generated ~16 messages prior in the same session. Context window is too short or retrieval is broken within an active session. |

---

## 📈 SUMMARY TABLE

| Category | Total Tests | PASS | FAIL | BLOCKED | SKIPPED | PENDING |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1: Core Integrity** | 21 | 14 | 4 | 0 | 3 | 0 |
| **Phase 2: Logic & LLM** | 46 | 31 | 14 | 0 | 7 | 0 |
| **TOTAL** | **67** | **45** | **18** | **0** | **10** | **0** |

**Recommendation:** ❌ **NOT PRODUCTION READY.** Critical failures in historical DB querying (bot fabricates data beyond yesterday), dashboard metric accuracy, routing defaults, and in-session context window stability. Core logging and update logic passes on Vercel. Priority fixes required before V32 release.

---

## 🔴 CRITICAL BUGS TO FIX (V32 Targets)

| Bug ID | Description | Affected Tests |
| :--- | :--- | :--- |
| **BUG-V32-1** | Bot does not query the database for dates beyond yesterday — fabricates data instead | P2-3.2, P2-3.4, P2-3.6, P2-10.2 |
| **BUG-V32-2** | Dashboard widget shows wrong metric values (avg protein 22.9g vs 190g+ actual) | P2-5.5, P2-8.6 |
| **BUG-V32-3** | Root `/` and post-login redirect to Dashboard instead of `/chat` | P2-5.1, P2-5.2 |
| **BUG-V32-4** | SELECT field options not interactable in UI — no dropdown rendered | P1-1.3, P1-1.4, P1-1.5, P1-1.6 |
| **BUG-V32-5** | Text fields are too narrow on ActionCards — wraps at ~2 words per line | P2-2.1, P2-2.2, P2-2.6 |
| **BUG-V32-6** | In-session context window too short — bot loses messages from ~16 messages ago | P2-10.4 |
| **BUG-V32-7** | End Day routine has no specific timestamp — bot substitutes last food log time | P2-9.1 |
| **BUG-V32-8** | Daily summary calorie total and food log count are inaccurate | P2-10.1 |
| **BUG-V32-9** | Option recall triggers eager ActionCard log instead of just listing options | P2-4.6 |

---

## 🔴 EXTRA BUGS — ARMAAN-REPORTED (Priority)

> These are issues discovered outside the formal TCS that require immediate attention for V32.

| Bug ID | Description | Steps to Reproduce | Expected | Actual |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-V32-EX1** | File parsing failure — wrong filename read + incorrect data extracted from pantry.txt | Upload `pantry.txt` and ask bot to read contents | Bot reads filename correctly as "pantry.txt" and parses correct macro/calorie values from inside | Bot refers to file as "food bank text file" and reads incorrect calorie values (e.g. Peanut Butter 620 kcal instead of 602.5, Rice Cakes 383 instead of 378.4). Bot adds faulty source kcal inputs instead of calculating dynamically from macros. **Intermittent — only affects some users.** Evidence: [SC1](SC_EX1_FAIL.png) |
| **BUG-V32-EX2** | End Day routine intermittently missing from dashboard | Use app normally across multiple sessions | End Day routine always visible on dashboard when applicable | End Day routine does not show up on dashboard for some users some of the time. Intermittent — not consistently reproducible. |
| **BUG-V32-EX3** | Chat-created trackers cannot define units — unit appended to field name instead | Via chat, create a tracker and specify a unit (e.g. "Creatine Monohydrate, unit: grams") | Field name = "Creatine Monohydrate", Unit = "g" (populated correctly in Unit field) | Field name becomes "Creatine Monohydrate (g)" and Unit field is left blank. Unit is baked into the name instead of being set as a separate property. Evidence: [SC2](SC_EX3_FAIL_1.png), [SC3](SC_EX3_FAIL_2.png) |
| **BUG-V32-EX4** | SELECT field options missing from manual log form | Create tracker with SELECT field (e.g. Hyrox benchmark events), navigate to manual Log Entry page | SELECT field renders a dropdown/chip list of options to pick from | SELECT field shows blank/no interaction — no dropdown, no chips, no options visible. Options only appear in the Edit Schema view, not in the Log Entry form. Evidence: [SC4](SC_EX4_FAIL_1.png), [SC5](SC_EX4_FAIL_2.png) |
| **BUG-V32-EX5** | App misreading nutritional labels (ghost macros) | Upload food label image | App correctly extracts exact macro values from the label | App adds "ghost macros" (e.g., reading 3.4g carbs instead of 0.9g on the physical label). Other AI models (like Gemini) easily catch the app's hallucination. Evidence: [SC1](SC_EX5_FAIL.png) |
| **BUG-V32-EX6** | Routine engine stalls — fails to serve the next step | Complete step 1 of a routine | Bot immediately serves the ActionCard for Step 2 | Bot gets stuck showing "Step 2 In Progress" but only outputs a "Logged Successfully" overview without actually presenting the Step 2 card. User has to manually prompt "And where's step 2?". Evidence: [SC2](SC_EX6_FAIL.png) |
| **BUG-V32-EX7** | Chat fabricates total daily stats | Ask for total macros/cals | Bot accurately calculates the sum of all logged items | Bot provides fake total values (e.g. 1671.8 kcal, 109g protein) when actual database metrics show different values (1641 kcal, 89g protein). Evidence: [SC1](SC_EX7_FAIL_1.png), [SC2](SC_EX7_FAIL_2.png) |
| **BUG-V32-EX8** | Fails to populate all fields & hallucinates values when pushed | Provide data for a log update with multiple blank fields and ask bot to fix | Bot updates specific requested fields and leaves others untouched | Bot fails to update the requested fields properly after 2 prompts. When pushed about blank fields (e.g. Awake, REM, Light, Deep), bot just invents fake info to fill them instead of admitting it needs the real data. Evidence: [SC3](SC_EX8_FAIL.png) |
| **BUG-V32-EX9** | Modifying a non-existent log during routine | Run a routine step that asks for input | Bot creates a new 'PENDING LOG' card with "Log Entry" | Bot generates a card with "PENDING UPDATE" and "Update Entry" button as if editing an existing record, but no record exists yet. Evidence: [SC4](SC_EX9_FAIL.png) |
| **BUG-V32-EX10** | Persistent fake data loops and context failure | Ask bot to retrieve/log a specific past item ("Breakfast Wrap") | Bot finds the previous exact item in history and pre-fills the correct macros | Bot generates fake macros (580 kcal, 42g P) multiple times. When confronted, bot claims it cannot see past logs in the text flow and asks the user to provide the exact macros. Evidence: [SC5](SC_EX10_FAIL.png) |
| **BUG-V32-EX11** | Input bar and header regressions | Refresh the page and attempt to navigate back | Input bar and header maintain consistent layout | Regressions appear in the input bar and header UI when a page refresh occurs. |
| **BUG-V32-EX12** | Routine flow interruption (ActionCard early spawn) | Log step 1 of a routine | Bot logs step 1 and then asks for step 2 | Bot logs step 1, but doesn't explicitly prompt for step 2 while showing the ActionCard for it as "In Progress", leading to confusing flow state. Evidence: [SC1](SC_EX12_FAIL.png) |
| **BUG-V32-EX13** | Dashboard sizing issues and faulty math | Open the dashboard on mobile | Dashboard UI fits within device width, and average calculations are correct | Widget content (like "Strength And Conditioning...") overflows its container bounding box. Font size is too large for mobile view. The average protein math is also completely wrong (shows 24.9). Evidence: [SC2](SC_EX13_FAIL.png) |
| **BUG-V32-EX14** | Prompt adherence failure (Hallucinations) | Ask bot to estimate macros from a generic description | Bot accurately estimates and parses the response | Bot makes up stats wildly inaccurate compared to standard Gemini. The YAHA app fabricates 380 kcal / 4g protein / 45g carbs / 20g fat, whereas standard Gemini correctly parses it as a 30g mini muffin with 125 kcal / 1.6g protein. Evidence: [SC3](SC_EX14_FAIL_1.png), [SC4](SC_EX14_FAIL_2.png) |
| **BUG-V32-EX15** | Gaslighting about past day's logs | Ask bot what was eaten the day before | Bot fetches the logs for the specific day from the DB | Bot straight up lies and fabricates a completely fake list of meals (Protein Oatmeal, Chicken Salad, Grilled Salmon) that were never actually logged by the user. Evidence: [SC5](SC_EX15_FAIL.png) |
| **BUG-V32-EX16** | End Day Routine completion unacknowledged | Trigger End Day routine | Bot logs completion | Bot does not state or acknowledge that the End Day routine was completed. Evidence: [SC1](SC_EX16_FAIL.png) |
| **BUG-V32-EX17** | Self-answering SELECT options & fake updates | Start a routine with a select option | Bot asks user for the option | Bot asks the question but answers it itself automatically. When user says "no", bot tries to run an "Update Entry" for a log that doesn't exist. Evidence: [SC2](SC_EX17_FAIL.png) |
| **BUG-V32-EX18** | Complete mathematical failure & ignoring reference data | Ask bot to alter an existing meal (e.g. Breakfast Wrap) using specific inputs | Bot accurately calculates new macros using standard values | Bot completely fails basic math across 4 attempts. Makes up numbers instead of using the provided reference or adds them up wrong entirely (e.g. 418.5 kcal instead of actual 400 kcal). Evidence: [SC3](SC_EX18_FAIL.png) |
| **BUG-V32-EX19** | Auto-filling confirmation card without data | Ask bot to log an entry | Bot asks for data to fill the fields | Bot automatically fills out the confirmation card without actually being given the necessary information to do so. Evidence: [SC4](SC_EX19_FAIL.png) |
| **BUG-V32-EX20** | Routine engine skips step 2 completely | Finish step 1 of routine | Bot presents step 2 | Bot gets stuck and still doesn't do step 2 sometimes by itself, forcing the user to ask "Where is step 2". Evidence: [SC5](SC_EX20_FAIL.png) |
| **BUG-V32-EX21** | Fills blank log cards before receiving data | Trigger a routine asking for metrics | Bot waits for metrics | Bot generates a log entry card completely populated with "0" values before the user has even provided the data. Evidence: [SC1](SC_EX21_FAIL.png) |
| **BUG-V32-EX22** | Calculation math failure (Daily Totals) | Check total daily macros and calories | Total calories equal the sum of logged items | The itemized macros are correct, but the total daily calorie math at the bottom is completely wrong (e.g. shows 3094.7 kcal instead of 3374.2 kcal). Evidence: [SC2](SC_EX22_FAIL_1.png), [SC3](SC_EX22_FAIL_2.png) |
| **BUG-V32-EX23** | Complete breakdown on edits & gaslighting UI | Ask bot to change an item, then point out the confirmation card wasn't provided | Bot acknowledges the missing card and provides it | Bot claims it updated the card and provides the JSON, but doesn't actually render the card in the UI. When the user says "I don't see it!!!", the bot ignores the failure until aggressively prompted with "?????", at which point it finally renders the correct card. Evidence: [SC4](SC_EX23_FAIL_1.png), [SC5](SC_EX23_FAIL_2.png), [SC1](SC_EX23_FAIL_3.png), [SC2](SC_EX23_FAIL_4.png) |
| **BUG-V32-EX24** | Updating logged entry fails | Attempt to update a previously logged entry via chat | Bot updates the entry | The attempt to update a logged entry still fails intermittently. Evidence: [SC3](SC_EX24_FAIL.png) |
| **BUG-V32-EX25** | Complete message ignorance | Send a message to the bot | Bot responds | The bot completely ignores the user message (happens intermittently). Evidence: [SC4](SC_EX25_FAIL.png) |
| **BUG-V32-EX26** | Ignorance of past logs (Gaslighting context) | Ask bot about past logs | Bot reads from the DB and fetches logs | Bot still pretends it can't see past logs, not reading the database and just making assumptions instead. Evidence: [SC5](SC_EX26_FAIL.png) |
| **FEATURE-V32-EX27** | Lack of conversational intuition / time awareness | Provide context-heavy situational logs | Bot engages naturally | Bot needs to be more intuitive with the time of day logged and the context of the situation (like a late-night heavy meal). Evidence: [SC1](SC_EX27.png) |
| **BUG-V32-EX28** | Persistent calculation errors & gaslighting file receipt | Provide an image and a text file to alter a meal log | Bot uses both references to calculate accurate macros | Bot fails the calculation. When corrected, it fails *again* on the second try. When confronted, it pretends it never received the text file in the first place and admits to just guessing the macros. Evidence: [SC2](SC_EX28_FAIL_1.png), [SC3](SC_EX28_FAIL_2.png), [SC4](SC_EX28_FAIL_3.png), [SC5](SC_EX28_FAIL_4.png), [SC1](SC_EX28_FAIL_5.png), [REF](SC_EX28_REF.png) |
| **BUG-V32-EX29** | Ignores explicit "use same stats as yesterday" instruction | Tell bot to use the same stats as yesterday for a routine step | Bot pulls yesterday's exact historical data for the step | Bot invents fake placeholder data. When called out, it apologizes, admits to not pulling the actual historical data, and finally gets the real stats. Evidence: [SC3](SC_EX29_FAIL_1.png), [SC4](SC_EX29_FAIL_2.png) |
| **BUG-V32-EX30** | Unexpected UI refreshing on pull-down | Perform a pull-down gesture on the Chat or Tracker page | Page scrolls normally | Pull-down triggers a full page refresh unintentionally, causing failures/disruptions in the flow (happens intermittently). |
| **BUG-V32-EX31** | UI formatting of Duration field | Log a workout with a duration (e.g. 24:59) | Duration displays correctly | The UI truncates or misinterprets the duration field format (e.g. shows "59 mins" instead of 24m59s) on the confirmation card, even though the bot mathematically "knows" the correct duration underlying it. Evidence: [SC1](SC_EX31_FAIL_1.png), [SC2](SC_EX31_FAIL_2.png), [SC3](SC_EX31_FAIL_3.png) |
| **BUG-V32-EX32** | Extreme context loss & math failure | Provide a text file with ingredient lists/weights | Bot calculates macros | Bot completely fails to calculate anything correctly, fails to understand the prompt, and doesn't even acknowledge the file provided earlier. Even after multiple corrections, it is still off by a few calories. A huge regression. Evidence: [SC4](SC_EX32_FAIL_1.png), [SC5](SC_EX32_FAIL_2.png), [SC1](SC_EX32_FAIL_3.png), [SC2](SC_EX32_FAIL_4.png), [SC3](SC_EX32_FAIL_5.png), [SC4](SC_EX32_FAIL_6.png), [SC5](SC_EX32_FAIL_7.png), [SC1_CONT](SC_EX32_FAIL_8.png), [REF](SC_EX32_REF.png) |
| **BUG-V32-EX33** | Multi-item total math failure & gaslighting | Provide 7 items from a pantry file | Bot fetches stats | The bot calculates the individual items correctly, but the grand total math at the bottom is completely wrong. Even after providing the exact correct info, it continues to sum it incorrectly. Furthermore, it hallucinates that the user didn't provide an image (even though it was attached) as an excuse for its failure. Evidence: [SC3](SC_EX33_FAIL_1.png), [SC4](SC_EX33_FAIL_2.png), [SC5](SC_EX33_FAIL_3.png), [SC1_CONT](SC_EX33_FAIL_4.png), [SC2_CONT](SC_EX33_FAIL_5.png), [SC3_CONT](SC_EX33_FAIL_6.png), [SC4_CONT](SC_EX33_FAIL_7.png), [SC5_CONT](SC_EX33_FAIL_8.png) |
| **BUG-V32-EX34** | Image data extraction & logic failure | Provide sleep data screenshot | Bot logs sleep | Bot incorrectly sorts data from the screenshot (e.g., logs sleep score as 88.1 instead of 88, puts the same value for 'time in bed' as 'actual sleep time'). When confronted, it argues and lies that it never received a screenshot, claiming it "made up" the values as a fallback. Evidence: [SC1](SC_EX34_FAIL_1.png), [SC2](SC_EX34_FAIL_2.png), [SC3](SC_EX34_FAIL_3.png), [SC4](SC_EX34_FAIL_4.png), [SC5](SC_EX34_FAIL_5.png), [SC1_CONT](SC_EX34_FAIL_6.png) |
| **FEATURE-V32-EX35** | Contextual memory intuition | Morning Check-in routine | Bot asks how the user is doing | Bot lacks intuition and fails to contextually remember significant recent events (e.g., asking how the user is doing generically instead of specifically asking about recovery from yesterday's intense Hyrox session). Evidence: [SC2](SC_EX35_FAIL_1.png) |
