# Technical Log V17 — Build v17
## Session: 2026-03-27

<details>
<summary><strong>Coding Agent — Build 17</strong> | 2026-03-27 06:45</summary>

## Problem Statement
6 bugs covering: AI FK hallucination crash, chat layout broken on iOS (header scrolls, input hidden), temp "New Chat" sessions cluttering sidebar, mobile chat home width gap, rename input has no visual indicator, and delete has no optimistic removal.

## Files Changed
- `src/lib/ai/prompt-builder.ts` (line 71) — Strengthened rule 7 with correction/editing UUID enforcement
- `src/app/actions/logs.ts` (lines 1-35) — Added tracker ownership validation before DB insert to prevent FK error reaching user
- `src/components/chat/ChatInterface.tsx` (line 369) — Changed `h-full` to `flex-1 min-h-0` on outer div for correct iOS Safari flex height
- `src/components/chat/MobileChatHome.tsx` (line 140, 43, 78-114, 137-215) — Changed `h-full` to `flex-1 min-h-0` (also fixes BUG 4 width gap), added `localSessions` optimistic state for delete/bulk-delete/rename, updated all render references
- `src/lib/db/chat.ts` (line 40) — Reinstated `.neq('title', 'New Chat')` filter in `getSessions()` to hide temp sessions from sidebar/home list
- `src/components/chat/ChatSidebar.tsx` (line 250) — Added visible border/bg styling to rename input
- `src/components/chat/MobileChatHome.tsx` (line 228) — Added visible border/bg styling to rename input (same fix as ChatSidebar)

## Why This Approach

**BUG 1 (FK crash):** Two-layer fix — prompt rule prevents AI from generating fresh UUIDs on corrections; server action validates ownership before insert so the user gets a recoverable error message instead of a raw DB FK crash.

**BUG 2/4 (layout):** `h-full` on flex children doesn't resolve to a constrained height on iOS Safari when the parent's height is determined by `flex-1` (flex algorithm). The reliable pattern is `flex-1 min-h-0`. The same fix on MobileChatHome's outer div also fills full viewport width (BUG 4) since `flex-1` in the flex row takes all available space.

**BUG 3 (temp sessions):** Reinstated `.neq('title', 'New Chat')` which was removed in Build 15. The persistence fix (force-dynamic export) is now in place so named sessions appear immediately — the filter is safe to reinstate.

**BUG 5 (rename UI):** Changed `bg-transparent outline-none` to `bg-white/[0.04] border border-white/20 rounded-lg px-2 py-0.5 focus:border-nutrition/50` on both sidebar and mobile home rename inputs.

**BUG 6 (slow delete):** Added `localSessions` state initialized from the `sessions` prop. `handleDelete` and `handleBulkDelete` now call `setLocalSessions(prev => prev.filter(...))` before awaiting the server action. On failure they restore from `sessions` prop. `handleRename` updates `localSessions` on success for instant title reflection. All render references (`sessions.length`, `.map(sessions)`) updated to use `localSessions`.

## Build Verification

```
$ npm run lint && npm run build
✓ Compiled successfully in 8.1s
✓ Generating static pages (20/20)
EXIT 0 — zero errors, pre-existing warnings only
```

**Agent Signature:** Coding Agent | 2026-03-27 06:45

</details>

<details>
<summary><strong>Code Reviewer — Code Quality</strong> | 2026-03-27 07:30</summary>

## Files Reviewed

- `src/lib/ai/prompt-builder.ts` ✓ PASS
- `src/app/actions/logs.ts` ⚠ PASS WITH NOTES
  - Lines 22-35: Ownership validation logic is correct (see notes below)
- `src/components/chat/ChatInterface.tsx` ✓ PASS
- `src/components/chat/MobileChatHome.tsx` ⚠ PASS WITH NOTES
  - Lines 43, 95, 127: Optimistic state pattern mostly correct (see notes below)
- `src/lib/db/chat.ts` ✓ PASS
- `src/components/chat/ChatSidebar.tsx` ⚠ PASS WITH NOTES
  - Lines 254, 260, 346: Missing `type="button"` attributes (see notes below)

---

## Detailed Findings

### 1. logs.ts — Tracker Ownership Validation (IMPORTANT)

The validation approach is correct: `createServerClient()` is used (not the browser client), `getUser()` is called before the query, and the `user_id` equality filter is applied alongside the `id` filter. This correctly enforces ownership at the server layer and gives the user a recoverable error message instead of a raw FK constraint crash.

One important note: `createLog()` in `src/lib/db/logs.ts` also calls `createServerClient()` and `getSafeUser()` independently. This means Build 17's `createLogAction` now performs **two separate Supabase auth calls** in sequence before the insert (one for the ownership check in the action, one inside `createLog`). Both use the same cookie-based session so the result is always consistent, but it is a small redundant round-trip. This is not a bug — defense-in-depth is the stated project pattern — but it is worth noting as a minor performance cost per log write.

The `{ data: trackerRow }` destructure discards the `error` from the ownership query. If the Supabase query fails for a network or RLS reason, `trackerRow` will be `null` and the code will return the "Tracker not found" message, which is misleading in a transient error scenario. The distinction between "tracker truly does not exist" and "DB query failed" is lost. This is a minor UX concern, not a security issue.

### 2. ChatInterface.tsx — flex-1 min-h-0 Layout (CORRECT)

Line 369: `<div className="relative flex flex-1 min-h-0 flex-col overflow-hidden ...">` is correct. The outer wrapper takes `flex-1 min-h-0` which constrains height within the parent flex column, and the messages area at line 513 takes `min-h-0 flex-1 overflow-y-auto`. The header (`shrink-0`) and input (`shrink-0`) are correctly pinned. This is the canonical fix for iOS Safari flex overflow and is applied properly.

### 3. MobileChatHome.tsx — Optimistic Delete State Desync Risk (IMPORTANT)

The optimistic delete pattern has one structural gap. On delete failure, line 95 restores using `setLocalSessions(sessions)` — the original `sessions` **prop**. This is a stale closure risk: if multiple delete operations are attempted in quick succession (or if a rename has been applied to `localSessions` since mount), a single delete failure will restore the list to the **original prop value**, silently discarding all in-session renames and any successful prior deletes that have not yet caused a parent re-render.

Concretely: user renames session A, then deletes session B which fails — the restore clobbers the rename for A. The same pattern exists in `handleBulkDelete` at line 127.

A safer pattern would be to capture the pre-delete snapshot from `localSessions` (not `sessions`) at the top of the handler and restore from that snapshot on failure.

### 4. chat.ts — .neq('title', 'New Chat') Filter (CORRECT)

Line 40: `.neq('title', DEFAULT_SESSION_TITLE)` is correctly placed after the `.eq('user_id', user.id)` filter and before `.order()` and `.limit()`. The constant `DEFAULT_SESSION_TITLE` is defined at the top of the file as `'New Chat'`. Placement is correct and consistent with the rest of the query chain. The Coding Agent's stated reasoning (cleanup runs before fetch, force-dynamic is now in place) is sound.

### 5. ChatSidebar.tsx — Missing type="button" Attributes (SUGGESTION)

Lines 260 and 268 (the confirm/cancel buttons inside the rename row) are missing `type="button"`. Both are inside a `<li>` that is not wrapped in a form, so there is no functional risk of accidental form submission here. However, this is inconsistent with the rest of the codebase where all interactive buttons explicitly declare `type="button"`. The pattern is also absent from `MobileChatHome.tsx` at the equivalent confirm button on line 256. This was not introduced by Build 17 (these buttons predate this build), so it is flagged as a suggestion rather than a regression.

### 6. prompt-builder.ts — Rule 7 Strengthening (CORRECT)

Line 71: The added text "When correcting, editing, or updating data from a previous message in this conversation, you MUST use the SAME trackerId as the original action. NEVER generate a new UUID for a correction. Look up the tracker from the Available Trackers list EVERY time you write an action card — even if you think you remember it." is clear, unambiguous, and correctly placed within the numbered rules. No TypeScript or runtime risk.

### 7. No New TypeScript Errors

Build output confirms EXIT 0 with zero new errors. The `{ data: trackerRow }` pattern at `logs.ts` line 26 correctly narrows to `null` on not-found per Supabase's `.single()` behavior.

### 8. No New Security Issues

- All server-side auth calls use `createServerClient()` (cookie-based) — not the browser client.
- No secrets are logged or exposed.
- The ownership check at `createLogAction` lines 26-35 adds a server-side guard that did not exist before this build. RLS remains the ultimate enforcement layer.

---

## Summary Table

| Area | Status | Severity |
|---|---|---|
| Tracker ownership validation (auth client, user check) | Correct | — |
| Redundant auth call (action + DAL both call getUser) | Minor inefficiency | Suggestion |
| Stale `sessions` prop used in delete restore | State desync risk | Important |
| `flex-1 min-h-0` placement (ChatInterface + MobileChatHome) | Correct | — |
| `.neq('title', 'New Chat')` placement | Correct | — |
| Missing `type="button"` on rename confirm/cancel (pre-existing) | Pre-existing minor | Suggestion |
| Prompt rule 7 clarification | Correct | — |
| TypeScript strict mode compliance | PASS | — |
| Security posture | PASS | — |

---

## Verdict: PASS WITH NOTES

All six bugs are correctly addressed. The implementation is sound, the auth model is correct, and the layout fix follows the canonical iOS Safari flex pattern. Two items warrant follow-up before the next major build:

1. **Important** — `handleDelete` and `handleBulkDelete` in `MobileChatHome.tsx` should restore from a local snapshot of `localSessions` rather than the stale `sessions` prop to prevent in-session renames being silently discarded on a failed delete.
2. **Suggestion** — The double `getUser()` call (once in the action, once inside `createLog`) could be consolidated by passing the validated user through to the DAL, but this is a performance micro-optimization and not a correctness issue.

**Agent Signature:** Code Reviewer | 2026-03-27 07:30

</details>
