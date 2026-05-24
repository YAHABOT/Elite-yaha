# Phase 2 Test Coverage Suite (TCS v2)

**CODE REVIEW GATE:** ✅ [CR | 07:45] PASS  
**QA PHASE:** Manual test case generation + validation execution  
**SCOPE:** 9 fixes across timestamp regression, text field width, historical context, YES_NO logic, routing, LLM persona, field de-obfuscation, native macro totaling, anti-hallucination rules

---

## Test Results Summary

| Area | Test Count | Status | Notes |
|------|-----------|--------|-------|
| Timestamp Regression | 6 | PENDING | Happy path + timezone edge cases + fallback |
| Text Field Width | 6 | PENDING | Container widths + mobile layout + long text |
| Historical Context Regex | 6 | PENDING | Pattern matching + case sensitivity + boundaries |
| YES_NO Field Logic | 6 | PENDING | SELECT vs TEXT context + edge case answers |
| Routing Default | 3 | PENDING | Root redirect + explicit dashboard + deep links |
| LLM Persona Separation | 6 | PENDING | Output formatting + JSON structure + accuracy |
| Field ID De-obfuscation | 4 | PENDING | Label mapping + LLM context + calculation accuracy |
| Native Macro Totaling | 5 | PENDING | Accuracy + null handling + float precision |
| Anti-Hallucination Rules | 4 | PENDING | Web search + native knowledge + data integrity |

**Total Test Cases:** 46  
**Manual Testing Required:** Yes (UI interactions, LLM output validation)  
**Automation Possible:** Yes (API + unit tests for logic validation)

---

## 1. Timestamp Regression Tests (Fixes Bugs 15, 7)

**Coverage:** Same-day entries, backdated entries, timezone boundaries, neutral state, fallback behavior

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| TS1 | Same-day entry in active session | Timestamp = current time (not 7:00 PM hardcoded) | |
| TS2 | Backdated entry for yesterday | Timestamp = noon UTC (12:00:00Z) per spec | |
| TS3 | Entry in NEUTRAL state | Timestamp = actual current time (not 7:00 PM default) | |
| TS4 | Multiple entries logged sequentially | Each entry has correct incrementing timestamp | |
| TS5 | Log at 23:59:59 UTC | Date assigned correctly (not rolled to next day prematurely) | |
| TS6 | Invalid client time provided | Gracefully fallback to server UTC (no 7:00 PM fallback) | |

**Test Files to Create/Modify:**
- `src/__tests__/api/timestamp-regression.test.ts` (new)
- `src/__tests__/actions/confirmLogAction.test.ts` (new)

**Preconditions:**
- Active day session available
- Backdated entry API endpoint accessible
- Server timezone correctly set to UTC

---

## 2. Text Field Width Tests (Fixes Bug 17)

**Coverage:** Container width, long text wrapping, responsive layouts, all text inputs

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| TW1 | Text input field renders in ActionCard | Field width = w-full or flex-1 (fills container) | |
| TW2 | Enter 7+ lines of text into field | No awkward wrapping; text extends to right edge | |
| TW3 | Notes field specifically tested | Same width behavior as other text fields | |
| TW4 | All text input fields globally | All instances use w-full or flex-1 (not constrained) | |
| TW5 | Mobile viewport (375px) | Text fields expand properly; no constraint to max-w-sm | |
| TW6 | Container at 50% parent width | Text field respects parent; no hardcoded max-width | |

**Test Files to Create/Modify:**
- `src/__tests__/components/ActionCard-TextWidth.test.tsx` (new)
- `src/__tests__/components/ActionCard.test.tsx` (add CSS width assertions)

**Preconditions:**
- ActionCard component renders with text inputs
- Tailwind CSS build includes responsive utilities
- Mobile viewport simulation available (375px breakpoint)

---

## 3. Historical Context Regex Tests (Fixes Bug 1)

**Coverage:** Pattern matching, case sensitivity, word boundaries, false positives, pattern priority

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| HC1 | Query "how did I do yesterday?" | Historical context fetched (HISTORICAL_INTENT_PATTERNS match) | |
| HC2 | Query "day before yesterday summary" | Pattern match; historical data injected into prompt | |
| HC3 | Query "previously, how was my mood?" | Pattern match; context includes past mood logs | |
| HC4 | Query "DAY BEFORE" (uppercase) | Case-insensitive match; historical context fetched | |
| HC5 | Query "I did a good job before I got here" | No false positive; "before" treated as temporal, not trigger | |
| HC6 | Query combining multiple patterns | Correct pattern priority; no duplicate context injection | |

**Test Files to Create/Modify:**
- `src/__tests__/api/historical-intent-detection.test.ts` (new)
- Update: `src/__tests__/api/chat.test.ts` (add HC pattern tests)

**Preconditions:**
- HISTORICAL_INTENT_PATTERNS array accessible from route
- Historical log data available in DB
- Regex patterns tested for false positives before deployment

---

## 4. YES_NO Field Logic Tests (Fixes Bug 29)

**Coverage:** SELECT field behavior, TEXT field skip intent, context sensitivity, edge case answers

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| YN1 | SELECT ["Yes", "No"] field; user says "No" | Logs false/"No" (data response, not skip) | |
| YN2 | SELECT ["Yes", "No"] field; user says "Yes" | Logs true/"Yes" correctly | |
| YN3 | TEXT field; user says "No" to question | Treated as SKIP intent (advance without logging) | |
| YN4 | TEXT field; user says "skip" explicitly | SKIP intent triggered | |
| YN5 | SELECT ["Option A", "Option B"]; user says "Option A" | Correct option selected (not treated as YES_NO) | |
| YN6 | User says "nope" or "nah" to yes/no field | Still recognized as negative answer | |

**Test Files to Create/Modify:**
- `src/__tests__/ai/yesno-field-logic.test.ts` (new)
- Update: `src/__tests__/ai/prompt-builder.test.ts` (add YES_NO_FIELD_RULE tests)

**Preconditions:**
- Tracker schema with YES_NO field available
- Action card generation logic accessible
- Skip intent detector function available

---

## 5. Routing Default Test (Fixes Bug 30)

**Coverage:** Root redirect, explicit dashboard, deep links

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| RD1 | Navigate to `/` (root) | Redirects to `/chat` (not `/dashboard`) | |
| RD2 | Navigate to `/dashboard` explicitly | Loads dashboard correctly (no forced redirect) | |
| RD3 | Navigate to `/chat/[sessionId]` | Deep link loads; no redirect to root | |

**Test Files to Create/Modify:**
- `src/__tests__/app/routing-default.test.ts` (new)
- Integration test: Verify middleware/page.tsx redirect logic

**Preconditions:**
- page.tsx at src/app/page.tsx with redirect logic
- Middleware (if any) accessible for testing
- Static rendering context available

---

## 6. LLM Persona Separation Tests (Fixes Bugs 14, 24, 25)

**Coverage:** Response formatting, code block structure, JSON accuracy, no duplication, macro accuracy

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| LP1 | Request macro breakdown | Conversational output THEN JSON (not mixed) | |
| LP2 | Macro breakdown output | Appears in markdown code block (clean, readable) | |
| LP3 | Verify JSON structure | Strict format after conversational output | |
| LP4 | Check "Running Total" field | Not repeated excessively (appears once per field) | |
| LP5 | Verify macro accuracy | Estimates match native Gemini (not off by 200+ kcal) | |
| LP6 | Prompt rules validated | INSTRUCTION A (conversational) separate from INSTRUCTION B (JSON) | |

**Test Files to Create/Modify:**
- `src/__tests__/ai/llm-persona-separation.test.ts` (new)
- Update: `src/__tests__/api/chat.test.ts` (add response format validation)

**Preconditions:**
- Prompt builder rules updated (INSTRUCTION A + B separation)
- Gemini API mocks available with realistic responses
- Response parser for JSON extraction accessible

**Manual Validation Steps:**
1. Open chat interface
2. Send "break down my breakfast macros" message
3. Verify conversational text appears first
4. Verify JSON action card appears after text
5. Verify no mixed modes in single output

---

## 7. Field ID De-obfuscation Tests (Fixes Bugs 23, 28, 24)

**Coverage:** Label mapping, LLM context clarity, calculation accuracy

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| FD1 | Request daily totals | Prompt shows "Protein: 25g" not "fld_protein: 25" | |
| FD2 | Verify fieldLabelMap creation | All field IDs correctly mapped from tracker schema | |
| FD3 | LLM receives clean labels | System prompt injection uses human-readable names | |
| FD4 | Calculation accuracy improved | LLM calculates 121.3g protein (not 111.7g hallucination) | |

**Test Files to Create/Modify:**
- `src/__tests__/ai/field-deobfuscation.test.ts` (new)
- Update: `src/__tests__/ai/v30-prompt-builder.test.ts` (verify fieldLabelMap tests)

**Preconditions:**
- buildDaySummary function accessible
- Tracker schema with field labels available
- LLM response mock with correct math available

---

## 8. Native Macro Totaling Tests (Fixes Bugs 9, 23, 28)

**Coverage:** Calculation accuracy, null handling, float precision, system message injection

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| MT1 | Log 3 food items in sequence | Daily totals calculated natively in JS (not LLM) | |
| MT2 | Verify JS totals accuracy | Match manual calculation (Protein: 121.3g exactly) | |
| MT3 | Log with missing fields (null) | JS calculation handles nulls gracefully (skips undefined) | |
| MT4 | Log items with decimal values | No rounding errors accumulate (float precision maintained) | |
| MT5 | System message includes totals | "TODAY'S DAILY TOTALS" appended to prompt before LLM response | |

**Test Files to Create/Modify:**
- `src/__tests__/api/macro-totaling.test.ts` (new)
- Update: `src/__tests__/api/chat.test.ts` (verify totals section in prompt)

**Preconditions:**
- Chat route handler accessible
- Nutrition tracker logs available for aggregation
- Mock Supabase client for log retrieval
- Macro calculation logic (fld_calories, fld_protein, etc.) defined

---

## 9. Anti-Hallucination Rule Audit Tests (Fixes Bugs 19, 18, 14)

**Coverage:** Web search enablement, native knowledge, data integrity, tool use

| # | Test Case | Expected Behavior | Result |
|---|-----------|-------------------|--------|
| AH1 | Query "brand X nutrition facts" | LLM uses web search (not claims "no internet") | |
| AH2 | Query macro estimate for common food | Uses native knowledge (not forced to "can't estimate") | |
| AH3 | Verify user personal info protection | Rules still prevent hallucinating user names/details | |
| AH4 | Check LLM tool use behavior | LLM attempts web search on first prompt (not lazy retries) | |

**Test Files to Create/Modify:**
- `src/__tests__/ai/anti-hallucination-audit.test.ts` (new)
- Update: `src/__tests__/ai/prompt-builder.test.ts` (verify ANTI_HALLUCINATION_RULES)

**Preconditions:**
- Gemini API mock with tool_use capability
- Anti-hallucination rules text accessible
- Test user data to verify PII protection

---

## Coverage Gaps Identified

### 1. Custom User-Defined Field Names
**Gap:** De-obfuscation tests assume standard tracker fields (fld_calories, fld_protein).  
**Missing:** Test with custom user-defined fields (e.g., "my_custom_metric_fld_001").  
**Action:** Add test case to field-deobfuscation.test.ts for arbitrary field names.

### 2. Extreme Macro Totaling Values
**Gap:** Macro totaling tests use typical food values (300-500 kcal items).  
**Missing:** Edge cases like 1000+ logged items, extreme values (5000+ kcal day), negative values from data corruption.  
**Action:** Add stress test to macro-totaling.test.ts with edge values.

### 3. Regex False Positives Under Load
**Gap:** Historical intent detection tests individual patterns in isolation.  
**Missing:** Query fuzzying across 100+ random queries to catch unexpected pattern triggers.  
**Action:** Add fuzz test to historical-intent-detection.test.ts.

### 4. LLM Persona Consistency Across Routine Types
**Gap:** Persona separation tests focus on health logging flow.  
**Missing:** Verify same persona rules apply to morning/evening routines, correlator queries, custom flows.  
**Action:** Add routine-specific tests to llm-persona-separation.test.ts.

### 5. Text Width on Extreme Screen Sizes
**Gap:** Mobile (375px) and desktop tested; missing tablet and ultra-wide.  
**Missing:** Test at 768px (tablet), 1920px (desktop), 2560px (ultra-wide monitor).  
**Action:** Add viewport breakpoint tests to ActionCard-TextWidth.test.tsx.

### 6. Timestamp Timezone Handling
**Gap:** UTC focus; missing actual timezone conversions.  
**Missing:** Test with user in PST, EST, JST; verify correct timestamp assignment in their local time.  
**Action:** Add timezone-aware tests to timestamp-regression.test.ts.

### 7. YES_NO Logic with SELECT Subsets
**Gap:** Tests cover ["Yes", "No"] and generic SELECT separately.  
**Missing:** SELECT fields with YES_NO-like options (["Agree", "Disagree"], ["True", "False"], ["Positive", "Negative"]).  
**Action:** Add subtype tests to yesno-field-logic.test.ts.

### 8. Field Label Mapping with Accented Characters
**Gap:** De-obfuscation assumes ASCII field labels.  
**Missing:** Test with accented characters (é, ü, ñ) in field names from multilingual users.  
**Action:** Add internationalization test to field-deobfuscation.test.ts.

### 9. Routing Edge Cases
**Gap:** Tests cover root, dashboard, and deep links.  
**Missing:** Authenticated vs unauthenticated redirect behavior, protected routes, catch-all fallbacks.  
**Action:** Add auth-aware routing tests to routing-default.test.ts.

### 10. Historical Context Injection Size
**Gap:** Tests verify pattern detection.  
**Missing:** Verify injected context doesn't exceed LLM context limits (no prompt bloat from 1000+ historical logs).  
**Action:** Add prompt size validation to historical-intent-detection.test.ts.

---

## Files to Test

### Existing Test Files (Update with new assertions)
- `src/__tests__/api/chat.test.ts` — Add timestamp validation, historical context, macro totaling, routing
- `src/__tests__/ai/prompt-builder.test.ts` — Add field de-obfuscation, YES_NO logic, anti-hallucination rules
- `src/__tests__/components/ActionCard.test.tsx` — Add text field width CSS validation

### New Test Files (Create)
- `src/__tests__/api/timestamp-regression.test.ts` — 6 timestamp tests
- `src/__tests__/components/ActionCard-TextWidth.test.tsx` — 6 text field width tests
- `src/__tests__/api/historical-intent-detection.test.ts` — 6 regex pattern tests
- `src/__tests__/ai/yesno-field-logic.test.ts` — 6 YES_NO logic tests
- `src/__tests__/app/routing-default.test.ts` — 3 routing tests
- `src/__tests__/ai/llm-persona-separation.test.ts` — 6 persona tests
- `src/__tests__/ai/field-deobfuscation.test.ts` — 4 de-obfuscation tests
- `src/__tests__/api/macro-totaling.test.ts` — 5 macro tests
- `src/__tests__/ai/anti-hallucination-audit.test.ts` — 4 anti-hallucination tests

### Source Files to Validate
- `src/app/api/chat/route.ts` — Timestamp logic, historical injection, macro totaling
- `src/lib/ai/prompt-builder.ts` — Field mapping, YES_NO rules, persona separation, anti-hallucination rules
- `src/app/page.tsx` — Routing default
- `src/components/chat/ActionCard.tsx` — Text field width CSS
- `src/app/actions/chat.ts` — confirmLogAction timestamp handling

---

## Test Execution Order

1. **Unit tests (isolated logic):** prompt-builder, field de-obfuscation, YES_NO logic, macro totaling, anti-hallucination
2. **Integration tests (API):** chat route (timestamp, historical, routing), macro totaling injection
3. **Component tests:** ActionCard text width, persona separation output
4. **Manual tests:** LLM persona (visual validation), routing (user flows)

---

## Pass/Fail Criteria

**PASS Verdict Requirements:**
- All 46 test cases execute without errors
- No assertions fail
- Code coverage ≥ 85% for modified files
- `npm run lint` — 0 errors
- `npm run build` — success
- `npm test` — exit code 0

**FAIL Verdict Triggers:**
- Any test assertion fails
- Manual validation reveals incorrect behavior
- Code review findings unresolved
- Coverage drops below 80%

---

## Sign-Off

Test suite generated and ready for execution. All 46 test cases documented across 9 fix areas. 10 coverage gaps identified for completeness. Manual testing required for LLM persona validation and UI responsiveness.

Manual test execution can begin immediately using test case checklist above. Automated tests can be implemented in parallel.

[QA | 10:12] Phase 2 TCS v2 complete. 46 test cases across 9 fixes. Ready for manual + automated execution.
