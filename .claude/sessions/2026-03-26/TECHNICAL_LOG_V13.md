<details>
<summary><strong>Coding Agent — Build 13</strong> | 2026-03-26 12:00</summary>

## Problem Statement
7 mobile UX and AI hallucination bugs fixed in this build:
1. Create Tracker form overflows on mobile (SchemaFieldRow)
2. Schema editor squished on mobile (SchemaEditor)
3. Chat sidebar invisible on mobile (no hamburger/drawer)
4. No way to save/name a chat; sidebar showed unnamed sessions
5. AgentSelector too wide on mobile (label text visible)
6. Page full-refresh when first message sent in new chat (router.replace causes remount)
7. AI uses tracker name as UUID instead of real UUID in LOG_DATA

## Files Changed
- `src/components/trackers/SchemaFieldRow.tsx` (lines 44-108) — Two-row mobile layout: label on row 1, type+unit+delete on row 2. Reorder arrows always visible on mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`). Type select uses `flex-1 sm:flex-none sm:w-32` so it fills available space on mobile.
- `src/components/trackers/SchemaEditor.tsx` (lines 128, 197) — Changed `p-8` to `p-4 md:p-8`, `rounded-[40px]` to `rounded-2xl md:rounded-[40px]`. Footer actions changed from `flex items-center justify-between` to `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between` with inner save/cancel row also stacking vertically on mobile. Delete confirmation uses `flex-col gap-2 sm:flex-row sm:items-center`.
- `src/components/chat/ChatSidebar.tsx` (lines 10, 15, 32, 115-130) — Added `onMobileClose?: () => void` prop. When provided, aside uses `flex` instead of `hidden md:flex` and renders a close button at the top. Imported `ArrowLeft` icon.
- `src/app/(app)/chat/[sessionId]/page.tsx` (lines 22-34, 60-73) — Pass `sessions` and `currentSessionId` props to both `ChatInterface` render sites so the mobile drawer has session data.
- `src/components/chat/ChatInterface.tsx` (throughout) — Multi-fix file:
  - Added imports: `Menu` icon, `ChatSidebar`, `renameSessionAction`
  - Added props: `sessions?: ChatSession[]`, `currentSessionId?: string`
  - Added state: `currentSessionId` (BUG 6), `isMobileSidebarOpen` (BUG 3), `isSaveModalOpen` + `saveTitle` + `isSaving` (BUG 4)
  - BUG 6: All API `body` uses `currentSessionId` state instead of `sessionId` prop. Both `router.replace()` calls replaced with `setCurrentSessionId(data.sessionId)` + `window.history.replaceState()` to prevent page remount.
  - BUG 3: Mobile sidebar overlay renders as `fixed inset-0 z-50 md:hidden` with backdrop + animated panel when `isMobileSidebarOpen`. Hamburger `Menu` button in header (`md:hidden`).
  - BUG 4: "Save Chat" button shown in header when `session.title === 'New Chat'` and session is not `'new'`. Modal with text input calls `renameSessionAction` then `router.refresh()`. Mode/Persistent labels hidden on mobile (`hidden sm:block`) to reclaim space.
- `src/lib/db/chat.ts` (line 39-40) — Added `.neq('title', DEFAULT_SESSION_TITLE)` to `getSessions()` query so sidebar only shows named sessions.
- `src/app/actions/chat.ts` (line 144) — Changed `revalidatePath('/chat')` to `revalidatePath('/chat', 'layout')` in `renameSessionAction` so sidebar refreshes after save.
- `src/components/chat/AgentSelector.tsx` (line 41) — Wrapped label text `<span>` in `<span className="hidden ... sm:inline">` so only the dot and chevron show on mobile.
- `src/lib/ai/prompt-builder.ts` (lines 63-81) — Added rules 7 and 8 to `GLOBAL_ANTI_HALLUCINATION_RULES`: rule 7 mandates `trackerId` must be the exact UUID from Available Trackers list, rule 8 prevents LOG_DATA on newly created trackers in the same response. Replaced `"TRACKER_ID"` placeholder in `FEW_SHOT_EXAMPLES` with realistic fake UUID `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`.

## Why This Approach

**BUG 1/2**: Two-row layout on mobile is the correct pattern when a fixed-width flex row exceeds viewport width. Responsive padding/radius values are the standard Tailwind approach.

**BUG 3**: Rendering the sidebar as a fixed overlay from within `ChatInterface` (already a Client Component) avoids creating a new Client Component wrapper or lifting state up to the Server Component page. The `onMobileClose` prop keeps the existing sidebar component reusable for both contexts.

**BUG 4**: Filtering `getSessions()` at the DB layer (`.neq`) is more efficient than client-side filtering. The Save Chat modal in `ChatInterface` is co-located with session state, avoiding prop drilling.

**BUG 5**: `hidden sm:inline` on the label span is the minimal change — the dot indicator and chevron remain visible so the user can still see the active state and open the dropdown.

**BUG 6**: Two root causes fixed together. Internal `currentSessionId` state ensures the API always sends the correct session ID. `window.history.replaceState` updates the URL without triggering Next.js router re-navigation/remount. This is the canonical pattern for client-side URL sync without a full navigation.

**BUG 7**: The AI was treating `"TRACKER_ID"` as a pattern to imitate, producing descriptive strings like `"food-tracker"`. Adding an explicit UUID format rule and a realistic example UUID in few-shots strongly guides the model toward correct UUID output.

## Build Verification
```
$ npm run lint && npm run build
Warnings only (pre-existing, no new errors)
Exit 0 ✓
All 25 routes compiled successfully
```

**Agent Signature:** Coding Agent | 2026-03-26 12:00

</details>

<details>
<summary><strong>Code Reviewer — Code Quality</strong> | 2026-03-26 14:30</summary>

## Files Reviewed
- `src/components/trackers/SchemaFieldRow.tsx` ✓ PASS
- `src/components/trackers/SchemaEditor.tsx` ✓ PASS
- `src/components/chat/ChatSidebar.tsx` ✓ PASS
- `src/app/(app)/chat/[sessionId]/page.tsx` ✓ PASS
- `src/components/chat/AgentSelector.tsx` ✓ PASS
- `src/lib/db/chat.ts` ✓ PASS
- `src/app/actions/chat.ts` ✓ PASS
- `src/lib/ai/prompt-builder.ts` ✓ PASS
- `src/components/chat/ChatInterface.tsx` ⚠ PASS WITH NOTES
  - Line ~469: **BUG 4 residual** — Save Chat button stays visible after saving. `session` state is initialized from prop at mount and never updated by `handleSaveChat`. After `renameSessionAction`, `session.title` is still `'New Chat'` in state. Fix: add `setSession(prev => prev ? { ...prev, title: saveTitle.trim() } : prev)` after success. Confidence: 92.
  - Line ~378: **BUG 3 residual** — Mobile sidebar passes `propCurrentSessionId` (always `"new"` for new chats) instead of `currentSessionId` state (which updates to real UUID after first message). Fix: change `currentSessionId={propCurrentSessionId}` → `currentSessionId={currentSessionId}`. Confidence: 88.
  - Line ~337: **BUG 6 URL** — `handleSubmit` history update drops `?routine=` param. Fix: append `searchParams.get('routine')` if present, matching the `handleSendInternal` pattern. Confidence: 83.

## Verdict: **PASS WITH NOTES**

All 7 bugs addressed; 8 of 9 files pass cleanly. Three targeted fixes needed in `ChatInterface.tsx` before QA: Save button stale state, mobile sidebar active highlight, and routine URL param hygiene.

**Agent Signature:** Code Reviewer | 2026-03-26 14:30

</details>

<details>
<summary><strong>Coding Agent — Build 13 Patch</strong> | 2026-03-26 15:00</summary>

## Problem Statement
Three residual issues identified by Code Reviewer in `ChatInterface.tsx`:
1. Save Chat button stays visible after saving (BUG 4 residual) — session state never updated on success
2. Mobile sidebar shows wrong active session after first message (BUG 3 residual) — prop vs state confusion
3. `handleSubmit` drops `?routine=` URL param after session ID is assigned (BUG 6 URL hygiene)

## Files Changed
- `src/components/chat/ChatInterface.tsx` (3 targeted edits):
  - Line ~352: `handleSaveChat` — added `setSession(prev => prev ? { ...prev, title: saveTitle.trim() } : prev)` immediately after `res.success`, before `router.refresh()`. Save Chat button now disappears instantly on success without waiting for server round-trip.
  - Line ~378: Mobile `ChatSidebar` render — changed `currentSessionId={propCurrentSessionId}` to `currentSessionId={currentSessionId}` (state variable). Active session highlight now reflects real UUID after first message.
  - Line ~335: `handleSubmit` `window.history.replaceState` block — reads `searchParams.get('routine')` and appends `?routine=${routineParam}` to the URL if present, matching the existing `handleSendInternal` pattern on line 211.
  - Line 39: Removed `currentSessionId: propCurrentSessionId` from destructuring since it is now unused (Fix 2 eliminated its only callsite). The `currentSessionId` prop remains in the `Props` type for API compatibility with the page component.

## Why This Approach
- **Fix 1**: Optimistic session state update is the correct pattern — the rename succeeded on the server, so immediately reflecting it in client state gives instant feedback and matches what the next `router.refresh()` will eventually confirm.
- **Fix 2**: `currentSessionId` state is initialized from the `sessionId` prop but mutates to the real UUID after `handleSendInternal`/`handleSubmit` resolve. The prop never changes for the lifetime of the component mount. The mobile sidebar must track the live state, not the frozen prop.
- **Fix 3**: Mirrors the existing `handleSendInternal` approach (line 211) which already preserves `routineId` in the URL. Using `searchParams.get('routine')` is correct because that value comes from the URL on initial load and does not change during a session.

## Build Verification
```
$ npm run lint && npm run build
Warnings only (all pre-existing, zero new errors introduced)
Exit 0
21/21 static pages generated successfully
```

**Agent Signature:** Coding Agent | 2026-03-26 15:00

</details>

<details>
<summary><strong>Coding Agent — Build 13 Mobile Fixes</strong> | 2026-03-26</summary>

## Problem Statement
5 additional mobile bugs reported after V13 initial testing:
1. New Tracker form cut off on left — no horizontal padding on outer wrapper
2a. SchemaEditor overflow-hidden clips delete confirm buttons on small screens
2b. SchemaFieldRow Row 2 (type/unit/delete) visually detached from Row 1 on mobile
3a. Chat /chat page shows nothing on mobile (sidebar hidden, no fallback)
3b. Chat sessions deleted after 10 min idle (too aggressive — sessions with messages gone)
4. AgentSelector button too large in chat input bar on mobile

## Files Changed
- `src/app/(app)/(content)/trackers/new/page.tsx` (line 7, 19) — Added `px-4` to outer wrapper div. Changed `p-6` to `p-4 sm:p-6` on inner card so content doesn't touch screen edges on mobile.
- `src/components/trackers/SchemaEditor.tsx` (line 128-131) — Removed `overflow-hidden` from main container. Moved clipping to a dedicated `pointer-events-none absolute inset-0 overflow-hidden` wrapper scoped to the glow div only, so child content (delete confirm buttons) is never clipped.
- `src/components/trackers/SchemaFieldRow.tsx` (line 81) — Added `border-l-2 border-white/10 pl-2 sm:border-l-0 sm:pl-0` to Row 2, giving a subtle left border on mobile to visually connect type/unit/delete controls to the label above.
- `src/app/(app)/chat/page.tsx` (full rewrite) — Added `MobileSessionList` server component that renders full-page session list + New Chat button on mobile (`flex md:hidden`). Desktop layout unchanged (sidebar + "select a conversation" panel, both `hidden md:*`). Imported `ChatSession` type.
- `src/lib/db/chat-cleanup.ts` (full rewrite) — Changed `CLEANUP_IDLE_MINUTES` from `10` to `120`. Added `CLEANUP_WITH_MESSAGES_HOURS = 24`. After fetching stale candidates, queries `chat_messages` to count which sessions have messages. Empty sessions deleted after 2h; sessions with messages only deleted after 24h idle.
- `src/components/chat/AgentSelector.tsx` (line 34) — Changed trigger button classes to `gap-1.5 sm:gap-3 rounded-xl sm:rounded-2xl px-2 py-1.5 sm:px-4 sm:py-2` — compact on mobile, full-size on sm+.
- `src/components/chat/ChatInterface.tsx` (line 681) — Added `min-w-0` to textarea so it can shrink correctly when AgentSelector is present.

## Why This Approach
- **Bug 1**: `px-4` on the outer wrapper is the minimal safe fix — `max-w-2xl` already centres on desktop; the padding only matters below the breakpoint.
- **Bug 2a**: Moving `overflow-hidden` to a dedicated inset wrapper preserves the glow clip without affecting any child elements. Wrapping in `pointer-events-none` ensures it never intercepts touches.
- **Bug 2b**: A `border-l-2` indent is a common pattern for showing sub-item grouping without adding extra padding that would break alignment on desktop (removed via `sm:border-l-0 sm:pl-0`).
- **Bug 3a**: A co-located `MobileSessionList` Server Component avoids prop drilling or a new Client Component. The `md:hidden` / `hidden md:flex` split is the canonical Next.js/Tailwind pattern for responsive layout variants.
- **Bug 3b**: Fetching message counts with a single `chat_messages` query and filtering in JS is efficient — candidate sets are small (user's own untitled sessions). Separating empty vs. has-messages TTL preserves user data while still cleaning up abandoned empty sessions.
- **Bug 4**: `min-w-0` on flex children is standard practice to prevent overflow when parent is a flex container. Responsive `px`/`py`/`gap`/`rounded` classes are the correct Tailwind approach.

## Build Verification
```
$ npm run lint && npm run build
Warnings only (all pre-existing, zero new errors introduced)
Exit 0 ✓
26 routes compiled successfully
```

**Agent Signature:** Coding Agent | 2026-03-26

</details>
