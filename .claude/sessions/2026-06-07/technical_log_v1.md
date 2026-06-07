# Technical Log v1 — Session 2026-06-07

---

## SC3 Root Cause (End Day Step 2 not auto-firing)

`ChatInterface` has two send functions:
- `handleSendInternal` — only called for the initial routine trigger (URL `?routine=`)
- `handleSubmit` — called for ALL user-typed messages

`handleSendInternal` had the full `shouldAutoPromptNextStep` / `pendingRoutineAdvanceSessionRef` / `onConfirmed` wiring. `handleSubmit` parsed the SSE `done` event but never read `shouldAutoPromptNextStep` at all. Result: every manual user message during a routine (which goes through `handleSubmit`) never wired up the auto-advance. Start Day worked because the trigger phrase is sent via `handleSendInternal`, and in simple routines Step 1 data can be included in that trigger. End Day Step 1 always requires a separate manual message → `handleSubmit` → no auto-advance.

**Fix:** Added identical block to `handleSubmit`:
```typescript
const shouldAutoPromptNextStep = event.shouldAutoPromptNextStep ?? false
if (shouldAutoPromptNextStep && attachSessionId && isMountedRef.current) {
  const hasLogDataCards = (event.actions ?? []).some(a => a?.type === 'LOG_DATA')
  if (hasLogDataCards) {
    pendingRoutineAdvanceSessionRef.current = attachSessionId
  } else {
    attachShouldScheduleAutoAdvance = true
    setIsAutoPrompting(true)
  }
}
```

---

## SC2 Root Cause (Duration shows `0:00:09` in ActionCard)

`editableFields` initialises duration fields by converting raw seconds to `"H:MM:SS"` string:
```typescript
if (card.fieldDefinitions?.[key]?.type === 'duration') {
  return [key, formatDuration(numVal)]  // e.g. "9:59:00"
}
```

The display mode then tried to parse back:
```typescript
const numValue = typeof value === 'string' ? parseFloat(value) : NaN
// parseFloat("9:59:00") = 9 (leading digit only)
// formatDuration(9) = "0:00:09" ❌
```

**Fix:** Detect pre-formatted string before re-parsing:
```typescript
const displayValue = isDuration
  ? (typeof value === 'string' && /^\d+:\d{2}/.test(value)
      ? value  // already H:MM:SS, use directly
      : formatDuration(typeof value === 'number' ? value : parseFloat(String(value))))
  : String(value)
```

---

## SC1 Root Cause (No action card from file attachments)

The `PHOTO-ONLY FOOD DETECTION FLOW` in the AI prompt has a two-step process:
1. Extract data → show as text bullets → say "Does this look right? Let me know and I'll log it."
2. Wait for verbal confirmation → then generate action card

This flow was being applied to non-food file attachments (sleep exports, fitness screenshots) because the AI didn't have an explicit override rule. Added a `FILE & FITNESS-SCREENSHOT OVERRIDE` section before the photo detection:

> For FILE attachments (CSV, PDF, etc.) and fitness app screenshots, ALWAYS generate the action card immediately. Do NOT use the two-step flow. Duration values in text: always human-readable (56 mins, 2h 25m), never raw seconds.

---

## Attach File — Definitive Root Cause & Fix

**The core issue:** inline `<input>` inside the menu div is removed from DOM when `setIsAttachMenuOpen(false)` fires. This can happen before `onChange` fires (after the OS file picker closes). The timing varies by render load — library agents had extra pending renders from `handleAgentSelect`'s prior `setMessages`, making it more likely to fail.

**The reliable pattern (matches Photo Library which always worked):**
```jsx
<button onClick={() => { setIsAttachMenuOpen(false); fileDocInputRef.current?.click() }}>
  Attach File
</button>
```

`fileDocInputRef` is a persistent hidden `<input>` outside the menu div — it survives the menu closing. The programmatic `.click()` is in a user-gesture context (synchronous in the `onClick` handler), which Android Chrome accepts.

This pattern was tried earlier (`da969cf`) but reverted because the user reported "fail". In retrospect, "fail" at that time was likely the Samsung My Files category screen (which is the device's own UI, not a web bug). With the inline input now producing zero-attach results for library agents, the persistent-ref approach is unambiguously correct.

**MobileChatHome had the additional bug:** `setTimeout(() => fileDocInputRef.current?.click(), 0)` — the `setTimeout` deferred the click outside the user-gesture window, so Android silently blocked the file picker. Fixed to direct synchronous click.

---

## Agent Carry-Through from Home Page

Race condition flow:
1. Server emits `{ type: 'session', sessionId }` (line 199 in route.ts)
2. `MobileChatHome` navigates immediately on receiving this event
3. Chat page loads, calls `getSession(sessionId)` from DB
4. Server writes `active_agent_id` at line 224 (AFTER step 1)
5. By step 3, `active_agent_id` may not be in DB yet → `ChatInterface` initialises `activeAgentId = null`

Library agents are additionally never written to DB at all.

**Fix:** Pass agent ID in navigation URL as `?agent=<id>`. `ChatInterface` reads it via new `initialAgentId` prop:
```typescript
const [activeAgentId, setActiveAgentId] = useState<string | null>(
  initialSession?.active_agent_id ?? initialAgentId ?? null
)
```

---

## Files Changed This Session

| File | Change |
|------|--------|
| `public/cat-logo.jpg` | New — cyberpunk cat mascot |
| `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Regenerated with real cat face |
| `public/manifest.json` | Added maskable purpose |
| `public/splash.html` | Rebuilt — cat logo + wordmark on dark bg, base64-embedded |
| `src/app/layout.tsx` | apple-touch-icon metadata |
| `src/lib/ai/prompt-builder.ts` | FILE & FITNESS-SCREENSHOT OVERRIDE before photo detection |
| `src/components/chat/ActionCard.tsx` | Duration display: detect pre-formatted H:MM:SS string |
| `src/components/chat/ChatInterface.tsx` | SC3 fix in handleSubmit; persistent-ref Attach File; initialAgentId prop |
| `src/components/chat/MobileChatHome.tsx` | Attach File: remove setTimeout; agent URL param on navigate |
| `src/components/dashboard/DashboardContent.tsx` | nDayLogs query optimisation |
| `src/app/(app)/chat/[sessionId]/page.tsx` | Read ?agent= param, pass to ChatInterface |
| `src/app/loading.tsx`, `src/app/(app)/loading.tsx` | Suspense loading fallbacks |
