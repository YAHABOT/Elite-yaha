# Technical Log v1 — 2026-05-30

*(Back-filled 2026-05-31 — original session ran out of context)*

---

## Key Root Causes Diagnosed & Fixed

### EX15/EX26 — Bot Hanging on Absolute Date Queries

**Symptom:** "what did i eat on 23rd may?" → 3+ minute hang, no response.

**Root cause chain:**
1. `HISTORICAL_INTENT_PATTERNS` didn't match "23rd may" → no DB lookup triggered
2. After adding the pattern: `rangeEnd = today` on absolute date branch → fetched 7 days (May 23–30) instead of 1
3. 7 days of logs in Gemini system prompt → prompt bloat → timeout

**Fix (spread across T-3 + T-4):**
- T-3: Added ordinal date patterns to `HISTORICAL_INTENT_PATTERNS` + full day/month parser
- T-4: Changed `rangeEnd = today` → `rangeEnd = getDateStr(d)` (single day)
- T-4: Raised `MAX_HISTORICAL_TOKENS` 800 → 4000, `slice(-30)` → `slice(-200)`
- T-4: Added COMPLETENESS RULE + FORMAT RULE to historical data section of system prompt

### EX6/EX20 — Routine Auto-Advance Broken

**Symptom:** After confirming a routine step action card, bot didn't prompt for next step.

**Root cause:** `handleSendSilent('')` sent empty string → server returned 400 (message required).

**Fix (T-1):** Changed to `handleSendSilent('continue')`. Also removed double-trigger `onConfirmed` handler which was causing duplicate step prompts.

### P2-2.6 / BUG-V32-5 — ActionCard Grid Layout Broken

**Symptom:** Select fields and long text fields didn't span full width; truncated in 2-column grid.

**Root cause:** Tailwind's `grid-cols-[auto_auto]` with `col-span-full` doesn't work predictably on mobile. Also, `fieldDefinitions` wasn't populated server-side so ActionCard couldn't determine field types for layout decisions.

**Fix (T-1 + T-2):**
- Changed to explicit `grid-cols-2` with `col-span-2` (Tailwind static class — always works)
- Populated `fieldDefinitions` server-side in `buildSanitizedActions` with `{ fieldId, label, type, unit, selectOptions, multiSelect }`

### Message Order Bug

**Symptom:** New messages appeared at wrong position in chat; oldest message sometimes showed where newest should be.

**Root cause:** `getMessages` queried DB in DESC order (newest-first for cursor pagination efficiency) but returned the array as-is. UI expected ASC (oldest-first) to append new messages at the end.

**Fix (T-3):** Reverse the result array in `getMessages` before returning. DB query stays DESC for performance; UI gets ASC.

### EX31 — Duration Format Context-Aware

**Symptom:** Sleep duration "6h 8m" was being output as decimal hours (6.13) for ALL duration fields, but fields with `unit: mins` should output decimal minutes.

**Fix (T-2):** Context-aware rule: if field has `unit: hrs` → decimal hours. If `unit: mins` → decimal minutes. Added M:SS display in `format.ts` for mins unit.

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/app/api/chat/route.ts` | HISTORICAL_INTENT_PATTERNS, weekday detection, absolute date parsing, rangeEnd single-day, fieldDefinitions population |
| `src/lib/ai/prompt-builder.ts` | Rules 22/23, EX12 exception, EX29 historical in routines, EX31 duration, FORMAT/COMPLETENESS rules, MAX_HISTORICAL_TOKENS |
| `src/components/chat/ActionCard.tsx` | grid-cols-2, col-span-2, fieldDefinitions-based layout |
| `src/components/chat/ChatInterface.tsx` | handleSendSilent 'continue', poll-stop check fix, onConfirmed removal |
| `src/components/trackers/LogForm.tsx` | SELECT field support (dropdown + chips) |
| `src/components/trackers/LogEntryCard.tsx` | Legacy label cleanup (strip parenthetical units), col-span-2 |
| `src/components/trackers/TrackerHistoryView.tsx` | Header redesign (title row + button row) |
| `src/components/dashboard/WidgetCard.tsx` | Responsive font + overflow protection |
| `src/components/dashboard/DashboardClient.tsx` | EX2 toggle (removed 7PM gate → reverted → restored) |
| `src/components/journal/TrackerDayGroup.tsx` | Text/select fields col-span-2 |
| `src/lib/utils/format.ts` | isDurationMins branch, M:SS display |
| `src/lib/db/chat.ts` | getMessages ASC reverse |

---

[CA | session-end] 4 deployment iterations. No formal CR or QA sweep — hotfix mode. User confirmed fixes working after each deploy.
