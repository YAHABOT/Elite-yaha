# Technical Log — Build 18 | 2026-03-27

<details>
<summary><strong>Coding Agent — Build 18</strong> | 2026-03-27 07:45</summary>

## Problem Statement

Three bugs identified from Build 17 test results:

1. **CRITICAL — Page refresh/remount on every message sent from `/chat/new`**: Next.js 15 App Router patches `window.history.replaceState`. When `ChatInterface` calls it to update the URL from `/chat/new` to `/chat/[uuid]`, Next.js intercepts the path change and triggers a full server-side navigation — remounting the page component and causing visible flash on every message send.

2. **HIGH — 10-min temp chat persistence broken**: The restored `.neq('title', 'New Chat')` filter in `getSessions()` hides ALL untitled sessions regardless of age. User expectation: named sessions always visible + "New Chat" sessions visible for 10 minutes after last interaction.

3. **HIGH — Blank fields stored in tracker log entries**: `ActionCard.tsx` initializes `editableFields` with ALL schema fields (including ones the AI didn't populate, which get empty strings `''`). When the user confirms, all fields including empty ones are passed to `confirmLogAction` and written to the JSONB `fields` column. The tracker detail page then renders "---" for every empty field.

## Files Changed

- `src/components/chat/ChatInterface.tsx` (lines 206-210, 332-341) — removed two `window.history.replaceState` calls; replaced with comment explaining Next.js 15 intercept issue. `setCurrentSessionId` kept intact.
- `src/lib/db/chat.ts` (lines 36-43) — replaced `.neq('title', DEFAULT_SESSION_TITLE)` with `.or('title.neq.New Chat,updated_at.gte.{tenMinutesAgo}')` to show named sessions always + recent untitled sessions within 10-minute window.
- `src/components/chat/ActionCard.tsx` (lines 103-107) — added `confirmedFields` filter in `handleConfirm` to strip empty/null/undefined field values before calling `confirmLogAction`.

## Why This Approach

**BUG 1:** The `window.history.replaceState` calls were purely cosmetic — the real session UUID was already tracked in `currentSessionId` state for all API calls. The URL update provided no functional benefit. Removing it entirely is the minimal correct fix; the URL stays as `/chat/new` for the lifetime of an unsaved chat, which is an acceptable UX trade-off vs. the full page remount.

**BUG 2:** Supabase's `.or()` filter accepts PostgREST filter syntax, allowing a single compound filter that expresses "named sessions (any age) OR recent untitled sessions (within 10 min)". This avoids a second DB query and keeps the fetch in one round-trip. The `tenMinutesAgo` constant is computed as `Date.now() - 10 * 60 * 1000` in ISO string format immediately before the query.

**BUG 3:** The `editableFields` state intentionally includes all schema fields (for the edit UX so users can fill in missing fields). But on confirm, only non-empty values should be persisted. The `Object.fromEntries(Object.entries(...).filter(...))` pattern strips falsy values cleanly without mutating state.

## Build Verification

```
$ npm run lint
EXIT 0 — warnings only (all pre-existing, none introduced by this build)

$ npm run build
EXIT 0 — 26 routes compiled ✓
Compiled successfully in 6.9s
```

**Agent Signature:** Coding Agent | 2026-03-27 07:45

</details>
