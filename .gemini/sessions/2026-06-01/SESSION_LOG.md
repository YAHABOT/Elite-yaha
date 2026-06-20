# Session 2026-06-01 — V34: New-Chat Message Fix + Dynamic User Alias

**Status:** CLOSED ✓ (continued in 2026-06-02)
**Branch:** feat/mvp-build
**Previous Build Status:** v33 COMPLETE ✓ (carry-over CT-2.1, CT-3, T3 outstanding)

---

## Carry-Over from 2026-05-31

| Task | Status | Notes |
|------|--------|-------|
| CT-2.1 Fix CR findings | ⏳ Deferred | Code review findings from v32 — non-blocking |
| CT-3 QA Testing | ⏳ Deferred | 67 test cases pending |
| T3 Sleep time migration | ✓ Complete | Applied 2026-05-31 to `jfretlgjsthhmlmgmlog` |
| New-chat message lost | ✓ Fixed this session | T9 below |
| Display name / alias | ✓ Fixed this session | T10 below |

---

## Tasks Completed This Session

### [T9] New-Chat Message Lost on Navigation ✓ COMPLETE
**What:** Sending from the chat homepage navigated to a new chat but the typed message was gone. Root cause: `addMessage(user)` was at line ~445, long after the `session` SSE event at line ~169. `MobileChatHome` navigates on the session event; chat page loaded before the message was in DB; new-chat poll never fired (requires `mostRecent.role === 'user'`).
**File:** `src/app/api/chat/route.ts`
**Fix:** Moved `addMessage({ role: 'user' })` to immediately after the `safeEnqueue(session event)`, before EX3 ACK and before all DB queries. Three blocking-path calls left in place.
[CA | 09:45] Delivered

### [T10] Dynamic User Alias in AI Prompts ✓ COMPLETE
**What:** Every user was called "Armaan" — hardcoded in `buildHealthSystemPrompt` (lines ~505, ~514) and `buildRoutineSystemPrompt` (lines ~712-751) in `prompt-builder.ts`.
**Files:** `src/lib/ai/prompt-builder.ts`, `src/app/api/chat/route.ts`
**Fix:** Added `userName?: string` to `BuildHealthSystemPromptParams` and `buildRoutineSystemPrompt` signature. In `route.ts`, resolve display name: `users.alias` → `user_metadata.full_name` → `'you'`. Pass to all prompt builder call sites.
[CA | 09:45] Delivered

**Deployed:** ✓ `dpl_A8tArQBkDgE1jeZrgZndR5The3hq` — https://yaha-flame.vercel.app

---

## Tasks In Progress / Upcoming

### [T11] Historical Search: Full Keyword + Date Range DB Search ✓ COMPLETE
**What:** "find protein bars in my records" returned nothing — AI only saw 200 most-recent logs and keyword was never in there. Root cause: no keyword filtering at DB level, just blind date-range fetch hoping right entries appeared.
**Fix (3 stages):**
1. Added 9 search/recall intent patterns to `HISTORICAL_INTENT_PATTERNS`
2. Widened general search range from 30 days → all-time (`2020-01-01`)
3. **Full keyword search:** `extractSearchKeyword()` strips time/verb/filler from message → runs `ILIKE '%keyword%'` on `fields::text` scoped to the resolved date range. "find protein bars last week" → DB returns only protein bar entries from last week.
**Files:** `src/app/api/chat/route.ts`, `src/lib/db/logs.ts`
[CA | session] Delivered

### [T12] Layout Broken on OnePlus 13 (Agent Forge) ✓ COMPLETE
**What:** Save/cancel buttons cut off, no scroll on OnePlus 13. S25 Ultra + Oppo fine.
**Fix:** Scrollable overlay pattern on `DesignAgentForm` — `fixed inset-0 overflow-y-auto` + inner centering wrapper.
**File:** `src/components/agents/DesignAgentForm.tsx`
[CA | session] Delivered

### [T13] Duration Parsing Wrong for Samsung HR Zone Times ✓ COMPLETE
**What:** Zone 2 = `23:40` logged as 24 seconds instead of 1420.
**Fix:** HR zone disambiguation block in `DURATION_FORMAT_RULE` (first column = MM:SS time, second = percentage — never swap). General 2-part rule: exercise/zone context → always MM:SS.
**File:** `src/lib/ai/prompt-builder.ts`
[CA | session] Delivered

### [T14] AI Fabricates Meal Notes + Gaslights ✓ COMPLETE
**What:** AI invented ingredients for null notes fields, then denied having any records at all.
**Fix:** (1) Filter null/undefined fields from `buildHistoricalSection`, empty strings → "(no notes)". (2) Rule 11b TEXT FIELD INTEGRITY — no fabrication, no denial of already-shown data.
**File:** `src/lib/ai/prompt-builder.ts`
[CA | session] Delivered

### [T15] Routine Step 2 Auto-Advance — Recurring (PINNED)
**What:** T7 fixed the stale-sessionId closure case but step 2 still drops in some instances. User to flag with screenshots when caught.
**Status:** ⏳ Pinned — awaiting reproduction screenshot

---

## Pending (Carry-over)

- **CT-2.1** Code review findings from v32 (low/medium severity — non-blocking)
- **CT-3** QA Testing (67 test cases)
- **Backfill** historical `daily_stats` (user hasn't requested)
