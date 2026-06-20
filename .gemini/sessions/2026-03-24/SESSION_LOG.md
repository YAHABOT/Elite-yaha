# Session Log — 2026-03-24

## Summary

**Issues Fixed:** 5 major regressions (V5–V8)
**Builds Run:** 5 (all EXIT 0)
**Test Results:** All visual/functional tests passed
**Critical Decisions:** Eliminated agent workflow, established direct fix pipeline, created session archive system
**Next Day Focus:** Implement new features from user-provided handoffs, maintain session logging

---

## Build History

| Time | Version | Build | Result | Notes |
|------|---------|-------|--------|-------|
| — | V5 | `npm run build` | EXIT 0 — 25 routes | Navigation latency, bulk delete, ghost cleanup started |
| — | V6 | `npm run build` | EXIT 0 — 25 routes | Ghost session idempotency, prompt bulleting, PostgREST cleanup fixed |
| — | V7 | `npm run build` | EXIT 0 — 25 routes | Hydration crash, bulk delete, ActionCard polish |
| 14:35 | V8 | `npm run build` | EXIT 0 — 25 routes | Duration format, disappearing fields, confirmed persistence fixed |

## Test Results

### V5
- Navigation: tested, working
- Bulk delete chats: tested, working
- Ghost cleanup: implemented but not fully wired (fixed in V6)

### V6
- Ghost session idempotency: tested (10s reuse window)
- Session cleanup: tested (10-minute threshold)
- Prompt bulleted lists: tested with multi-field requests
- PostgREST filter: verified `.filter('id', 'not.in', '(uuid1,...)')` syntax
- Build: EXIT 0

### V7
- Hydration crash: fixed and verified
- Bulk delete: re-enabled and tested
- ActionCard unit corruption: fixed
- Confirmed state: partial persistence (SC3 remained broken)

### V8
- SC1 (Duration format): `08:54` now displays correctly for HRS fields ✓
- SC2 (Disappearing fields): number/rating fields now show in edit mode ✓
- SC3 (Confirmed persistence): confirmed:true now persists across page refresh ✓

## Work Log

### V5 — Navigation & Bulk Delete & Ghost Cleanup
- Changed "New Chat" button from `href="/chat"` to `href="/chat/new"`
- Bulk delete chats feature restored
- Ghost session cleanup wired into `getSessions()` as fire-and-forget

**Files changed:**
- `src/components/chat/ChatSidebar.tsx`
- `src/lib/db/chat-cleanup.ts`

### V6 — Ghost Sessions & Prompt Regression & Cleanup Refinement
- **Ghost sessions**: Added 10s idempotency window in `createSession()` to prevent duplicate "New Chat" sessions
- **Ghost cleanup**: Fixed orphaned function, added user scope, corrected PostgREST filter syntax
- **Prompt bulleting**: Injected `MULTI_FIELD_PROMPT_RULE` constant into both system prompts
- **StrictMode fix**: `triggerSent` useRef + sessionStorage 5s TTL double-guard
- **Routine step advance**: `handleSendSilent` now refreshes session + currentRoutine state

**Files changed:**
- `src/lib/db/chat.ts` (idempotency window)
- `src/lib/db/chat-cleanup.ts` (orphaned → wired)
- `src/lib/ai/prompt-builder.ts` (MULTI_FIELD_PROMPT_RULE)
- `src/components/chat/ChatInterface.tsx` (triggerSent guard, routine refresh)

### V7 — Hydration Crash & Bulk Delete & ActionCard Polish
- Fixed hydration crash (CSS loading issue after cache clear)
- Restored bulk delete functionality
- ActionCard unit corruption fixed
- Confirmed state persistence attempted (incomplete)

**Files changed:**
- `src/components/chat/ActionCard.tsx`
- Build: cleared `.next` cache, restarted dev server

### V8 — Duration Format & Disappearing Fields & Confirmed Persistence
- **SC1**: `ActionCard.tsx` — HRS fields convert decimal hours to HH:MM during `editableFields` init
- **SC2**: `LogEntryCard.tsx` — `startEdit()` uses raw value for number/rating, not `formatFieldValue`
- **SC3**: `ChatInterface.tsx` — use real `data.message.id` (DB UUID) instead of fake `mod-${Date.now()}`

**Files changed:**
- `src/components/chat/ActionCard.tsx`
- `src/components/trackers/LogEntryCard.tsx`
- `src/components/chat/ChatInterface.tsx`

**Build result:** EXIT 0, 25 routes, zero errors

## Key Decisions Made

2. **Session archive system** — `.claude/sessions/[DATE]/` folders with SESSION_LOG.md + TECHNICAL_LOG_V[N].md for each day
3. **PostgREST filter syntax** — Always use `.filter('id', 'not.in', '(uuid1,uuid2)')`, never raw SQL subquery strings
4. **Message ID strategy** — Use real DB UUID from API response, not client-generated optimistic IDs, for ActionCard persistence
5. **Idempotency at DB layer** — 10s session reuse window catches StrictMode, rapid clicks, and race conditions

## Next Steps

- Wait for user-provided handoff with new issues
- Apply same direct fix → build → archive pattern
- Maintain session logging throughout
