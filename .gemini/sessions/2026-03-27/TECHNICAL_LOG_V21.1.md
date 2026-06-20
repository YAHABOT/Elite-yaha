# Technical Log — Build 21.1

**Date:** 2026-03-27
**Branch:** feat/mvp-build
**Purpose:** Code Reviewer bug fixes (3 items)

---

## Changes

### Fix 1 — Remove [perf] timing logs from chat route

**File:** `src/app/api/chat/route.ts`

Removed 5 `console.log('[perf]', ...)` lines:
- Line ~98: `'[perf]', Date.now(), 'request-received'`
- Line ~145: `'[perf]', Date.now(), 'before-db-lookups'`
- Line ~168: `'[perf]', Date.now(), 'after-db-lookups'`
- Line ~269: `'[perf]', Date.now(), 'before-gemini-call'`
- Line ~272: `'[perf]', Date.now(), 'after-gemini-response'`

All `console.log('[ChatRoute]', ...)` and `console.error(...)` lines were left untouched.

---

### Fix 2 — Add attachments column to MESSAGE_COLUMNS

**File:** `src/lib/db/chat.ts`

`MESSAGE_COLUMNS` const updated to include `attachments`:

Before:
```
'id, session_id, role, content, actions, created_at'
```

After:
```
'id, session_id, role, content, actions, attachments, created_at'
```

This ensures all DB selects on `chat_messages` return the `attachments` column, which is required for the Gemini history mapping in `route.ts` that reads `msg.attachments`.

---

### Fix 3 — Mount guard before setMessages in handleAgentSelect

**File:** `src/components/chat/ChatInterface.tsx`

Added `if (!isMountedRef.current) return` immediately before the `setMessages(...)` call inside the `res.ok` block of `handleAgentSelect`. This prevents state updates on unmounted components when an agent-switch response arrives after the component has been unmounted.

Before:
```typescript
if (res.ok) {
  const data = await res.json()
  setMessages(prev => [...prev, {
```

After:
```typescript
if (res.ok) {
  const data = await res.json()
  if (!isMountedRef.current) return
  setMessages(prev => [...prev, {
```

---

## Validation

```
npm run lint  — PASS (warnings only, zero errors)
npm run build — PASS (26 routes compiled, exit 0)
```

---

**Agent Signature:** Coding Agent | 2026-03-27 10:42

<details>
<summary><strong>Code Reviewer — Build 21.1 Verification</strong> | 2026-03-28 00:00</summary>

## Files Reviewed
- `src/app/api/chat/route.ts` ✓ PASS — no `[perf]` strings remain; other logs untouched
- `src/lib/db/chat.ts` ✓ PASS — `MESSAGE_COLUMNS` includes `attachments` at line 13
- `src/components/chat/ChatInterface.tsx` ✓ PASS — `isMountedRef.current` guard at line 151, immediately before `setMessages`

## Verdict: **PASS**

All 3 targeted changes verified correct. No regressions detected.

**Agent Signature:** Code Reviewer | 2026-03-28 00:00

</details>
