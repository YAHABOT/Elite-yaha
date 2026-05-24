# TECHNICAL LOG — V6

**Date:** 2026-03-24 (reconstructed)
**Build result:** EXIT 0 — 25 routes

---

## Ghost Session Idempotency

### Root cause
Rapid clicks on "New Chat" or React StrictMode remounts caused multiple "New Chat" sessions to spawn within seconds, orphaning previous ones.

### Fix
`src/lib/db/chat.ts` — `createSession()` now checks for an existing "New Chat" session within the past 10 seconds (`SESSION_REUSE_WINDOW_MS = 10_000`) before INSERT. If found, returns the existing session instead of creating a duplicate.

```typescript
if (!input?.title) {
  const windowStart = new Date(Date.now() - SESSION_REUSE_WINDOW_MS).toISOString()
  const { data: recent } = await supabase
    .from('chat_sessions')
    .select(SESSION_COLUMNS)
    .eq('user_id', user.id)
    .eq('title', DEFAULT_SESSION_TITLE)
    .gte('updated_at', windowStart)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (recent) return recent as ChatSession
}
```

---

## Ghost Cleanup Refinement

### Root cause
`cleanupStaleTemporarySessions()` was orphaned dead code. When wired in V5, it had three bugs:
1. Threshold was 1 hour (too lenient)
2. Missing `eq('user_id', user.id)` scope
3. Used `.not('id', 'in', rawSQLSubquery)` which PostgREST treats as a literal string value, not evaluated SQL

### Fix
`src/lib/db/chat-cleanup.ts` — cleanup now:
1. Reduced threshold to 10 minutes (`CLEANUP_IDLE_MINUTES = 10`)
2. Added user scope: `.eq('user_id', user.id)`
3. Uses correct PostgREST syntax: `.filter('id', 'not.in', '(uuid1,uuid2,...)')` after resolving used session IDs in application memory

Wired into `getSessions()` as fire-and-forget via dynamic import to prevent circular dependencies.

---

## Prompt Bulleting Rule

### Root cause
AI system prompts were regressing from multi-field bulleted format to run-on paragraphs, causing worse user experience.

### Fix
`src/lib/ai/prompt-builder.ts` — Created centralized `MULTI_FIELD_PROMPT_RULE` constant:

```typescript
const MULTI_FIELD_PROMPT_RULE = `
## 🔴 MANDATORY MULTI-FIELD FORMAT RULE
When asking the user to provide 2 or more data points in a single message, you MUST present each one as a separate bullet on its own line. Example:
- Sleep Score
- Time in Bed
- Actual Sleep Time
NEVER use run-on paragraphs or comma-separated inline lists for multi-field requests.
`
```

Injected into both `buildHealthSystemPrompt()` and `buildRoutineSystemPrompt()` to prevent future regression from partial edits.

---

## StrictMode Double-Fire Guard

### Root cause
`useRef` alone resets on React StrictMode remount, causing the `triggerSent` lock to be bypassed and routines to fire twice.

### Fix
`src/components/chat/ChatInterface.tsx` — Implemented dual-layer guard:
1. `useRef` for immediate check
2. `sessionStorage` with 5-second TTL as second guard that survives StrictMode remount

```typescript
const storageKey = `yaha_trigger_${routineId}`
const lastTs = sessionStorage.getItem(storageKey)
if (lastTs && Date.now() - Number(lastTs) < 5_000) return
triggerSent.current = true
sessionStorage.setItem(storageKey, String(Date.now()))
```

---

## Routine Step Advance

### Root cause
`handleSendSilent` (silent routine message send) never refreshed the session or current routine state after API response, so the step badge remained frozen on the previous step.

### Fix
`src/components/chat/ChatInterface.tsx` — `handleSendSilent` now calls `getSessions()` and refreshes the `currentRoutine` state after successful response, so `onConfirmed` gates work correctly and the UI advances to the next step.

---

## Files Changed

- `src/lib/db/chat.ts` — idempotency window
- `src/lib/db/chat-cleanup.ts` — threshold, scope, PostgREST syntax
- `src/lib/ai/prompt-builder.ts` — MULTI_FIELD_PROMPT_RULE constant
- `src/components/chat/ChatInterface.tsx` — triggerSent double-guard, routine state refresh
