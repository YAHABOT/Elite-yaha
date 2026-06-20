# Comprehensive Bug Fix Task — V32 (All Remaining Work)

**Dispatch Date:** 2026-05-24 | **Status:** IN PROGRESS  
**Agent:** Coding Agent (Sonnet 4.6)  
**Baseline Tests:** 1789/1789 PASS  
**Deployment URL:** https://yaha-flame.vercel.app  

---

## CRITICAL CONTEXT

The prior session claimed "all 9 bugs fixed" but only 3 were actually implemented:
- ✅ BUG-V32-6, BUG-V32-7, BUG-V32-9 (DONE in previous session)
- ❌ BUG-V32-1, 2, 3, 4, 5, 8 (NOT DONE — need fixing NOW)
- ❌ All 35 extra bugs (NOT DONE — categorized but never touched)

**This task fixes ALL remaining bugs. No more incomplete claims.**

---

## TIER 1: CRITICAL BUGS (6 total) — MUST FIX

### BUG-V32-1: Message Context Loss After 3+ Hours
**File:** `src/lib/ai/prompt-builder.ts`  
**Issue:** Message history capped at 10 messages. After 3+ hour conversation, AI loses context.  
**Root Cause:** `messageHistory` slice limited to `slice(-10)` instead of `slice(-30)`  
**Fix:** Expand to last 30 messages for AI context window.  
**Test:** No unit test change needed (existing tests will pass with larger context)

### BUG-V32-2: Image File Denial (AI Says "No Receipt")
**Files:** `src/lib/ai/prompt-builder.ts`, `src/components/chat/ChatInterface.tsx`  
**Issue:** User uploads receipt image → AI responds "I cannot process image uploads"  
**Root Cause:** Vision capability rules missing or disabled in prompt. No explicit permission in system prompt.  
**Fix:** Add vision capability confirmation to prompt. Ensure ChatInterface passes `image_url` correctly to Gemini.  
**Test:** Verify image URL format passed to API, check prompt includes vision capability statement

### BUG-V32-3: Field Mapping Corruption (Data Lands in Wrong Field)
**Files:** `src/app/actions/chat.ts`, `src/lib/db/logs.ts`  
**Issue:** User logs "900 calories" → lands in "water" field instead of "calories"  
**Root Cause:** `fieldId` validation missing. AI picks wrong field, no sanitization.  
**Fix:**  
1. In `chat.ts`: Validate `fieldId` exists in tracker schema before inserting
2. In `logs.ts`: Sanitize field values (strip unknown fields, validate types)  
**Test:** Verify action card maps correct fieldId before DB write

### BUG-V32-4: Routine Hallucination (AI Fabricates Historical Data)
**File:** `src/lib/ai/prompt-builder.ts`  
**Issue:** User asks "What was my morning routine yesterday?" → AI invents data that doesn't exist  
**Root Cause:** No anti-hallucination rule. Prompt allows AI to infer missing data.  
**Fix:** Add explicit rule to prompt: "Never invent data. Only cite logs that exist in database. If data missing, say so explicitly."  
**Test:** Existing prompt-builder tests should cover this; verify anti-hallucination rule in prompt string

### BUG-V32-5: Routine FK Deadlock (User Stuck in Step 1)
**Files:** `src/app/actions/chat.ts`, `src/app/actions/routines.ts`, `src/lib/db/routines.ts`  
**Issue:** User creates routine → Step 1 complete → Cannot advance to Step 2 (FK constraint error)  
**Root Cause:** UPDATE_DATA action uses INSERT pattern instead of UPDATE. Creates duplicate instead of updating.  
**Fix:**  
1. In `chat.ts`: Change action handling to check if record exists → UPDATE instead of INSERT
2. In `routines.ts`: Ensure transaction safety on step updates
3. In `db/routines.ts`: Add UPSERT logic (INSERT ... ON CONFLICT ... UPDATE)  
**Test:** Verify action card step updates don't create duplicates

### BUG-V32-8: Historical Log Injection Truncated (24h Limit)
**Files:** `src/lib/ai/prompt-builder.ts`, `src/lib/db/logs.ts`  
**Issue:** AI uses only 24h of logs in context. Multi-day queries return incomplete data.  
**Root Cause:** Query uses `yesterdayStr` as endDate, limiting to 24h window instead of full week.  
**Fix:**  
1. In `prompt-builder.ts`: Change log query window to 7 days (not 24h)
2. In `logs.ts`: Query full date range, filter correctly  
**Test:** Verify logs-range query returns correct date window

---

## TIER 2: HIGH-IMPACT EXTRAS (15 total) — PRIORITY FIX

### LLM/AI Issues (6 highest priority)
- **Unit Conversion Failures:** Hours logged as minutes, kg as lbs  
  - File: `src/lib/ai/prompt-builder.ts`  
  - Fix: Add unit conversion rules to prompt ("validate units before DB write")
- **Daily Total Miscalculations:** Sum shows 0 when should be >0  
  - File: `src/lib/db/logs.ts`  
  - Fix: Verify aggregation logic, handle NULL values correctly
- **Vision Parsing Errors:** AI misreads receipt numbers  
  - File: `src/lib/ai/prompt-builder.ts`  
  - Fix: Add explicit OCR validation rule
- **Field Name Confusion:** AI uses "workout_time" vs "workoutDuration"  
  - File: `src/lib/ai/prompt-builder.ts`  
  - Fix: Include exact field names in prompt schema
- **Context Loss Variants:** Different from BUG-V32-1, affects cross-day context  
  - File: `src/lib/ai/prompt-builder.ts`  
  - Fix: Ensure daily transition preserves critical context
- **Response Format Issues:** AI returns malformed JSON for action cards  
  - File: `src/lib/ai/prompt-builder.ts`  
  - Fix: Enforce strict response format in system prompt

### UI/Layout Issues (6 highest priority)
- **SELECT Dropdown Overflow:** Options cut off at bottom  
  - File: `src/components/SchemaFieldRow.tsx`  
  - Fix: Add max-height + scroll to dropdown container
- **Text Field Width:** Input fields too narrow for long values  
  - File: `src/components/SchemaFieldRow.tsx`  
  - Fix: Adjust flex-grow to use available space
- **Message Spacing Issues:** Messages clump together, hard to read  
  - File: `src/components/chat/ChatInterface.tsx`  
  - Fix: Verify gap/margin in message list
- **Routine Step Layout Misalignment:** Step cards don't align  
  - File: `src/components/RoutineStep.tsx`  
  - Fix: Verify flex/grid alignment
- **Time Display:** Shows wrong timezone or format  
  - File: `src/components/LogEntry.tsx`  
  - Fix: Verify timezone conversion on display
- **Journal Card Alignment:** Cards wrap unexpectedly  
  - File: `src/components/Dashboard.tsx`  
  - Fix: Verify grid column sizing

### DB/Logic Issues (3 highest priority)
- **Routing Default (/ → /chat):** Root path doesn't redirect  
  - File: `src/app/page.tsx` + `middleware.ts`  
  - Fix: Add redirect logic to /chat
- **Daily Stats Query:** Wrong aggregation logic  
  - File: `src/lib/db/daily-stats.ts`  
  - Fix: Verify GROUP BY and date filtering
- **Message History Pagination:** Doesn't load older messages  
  - File: `src/lib/db/chat.ts`  
  - Fix: Verify cursor-based pagination logic

---

## VALIDATION GATES

✅ **Code Quality Gate:**
- `npm run lint` — zero new errors
- TypeScript strict — no `any` types
- No hardcoded secrets
- RLS never bypassed

✅ **Test Gate:**
- `npm test` — all 1789 baseline tests still PASS
- No regressions introduced
- New bugs marked fixed should have supporting test coverage

✅ **Deployment Gate:**
- All code committed to `feat/mvp-build` branch
- No uncommitted changes
- Build successful (npm run build)

---

## VERIFICATION CHECKLIST

**Before marking DONE, verify:**
- [ ] All 6 critical bugs actually in code (not just claimed)
- [ ] High-priority extras (15 bugs) addressed in code
- [ ] npm lint CLEAN (no new errors)
- [ ] npm test 1789/1789 PASS (no regressions)
- [ ] Code Review PASS
- [ ] Full 67-test verification runs (Phase 1: 21 + Phase 2: 46)
- [ ] 67 tests should show 67 PASS / 0 FAIL / 0 SKIP

---

## AGENT EXECUTION RULES

1. **Be explicit in code changes.** Show file paths, line numbers, what was changed.
2. **No claiming completion without actual implementation.** If you say "fixed", the code must show it.
3. **Reference MEMORY.md for Coding Agent config** — do not re-read `.claude/agents/coding-agent.md`
4. **Validate before return:**
   - Run `npm lint`
   - Run `npm test`
   - Confirm all files changed are listed in output
5. **Output format (mandatory):**
   - Verdict: PASS | BLOCKED
   - Findings: max 5, with file:line refs
   - Files Changed: paths only (no code snippets)

---
