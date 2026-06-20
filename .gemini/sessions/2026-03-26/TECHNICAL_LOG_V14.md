# Technical Log — V14 + V15 Builds
**Session:** 2026-03-26

---

<details>
<summary><strong>Coding Agent — Build 14</strong> | 2026-03-26 17:30</summary>

## Problem Statement
7-issue bug report from user's mobile testing of V13. Full report in `Bug report for V14/Screenshot refrences.md`.

## Files Changed
- `src/components/trackers/SchemaEditor.tsx` — removed tracker ID display, slimmed Add Field button, replaced delete confirm with type-name modal, double-submit guard
- `src/components/trackers/CreateTrackerForm.tsx` — double-submit guard (`if (submitting) return` + no reset on success), button position swap (Create Tracker in schema header, Add Field in footer)
- `src/components/trackers/LogForm.tsx` — double-submit guard
- `src/components/trackers/TrackerCard.tsx` — `min-w-0` + `break-words` on name to prevent truncation
- `src/components/routines/RoutineCard.tsx` — converted from Server Component to `'use client'`, always-visible edit/delete buttons (removed `opacity-0 group-hover`), delete confirmation modal
- `src/components/trackers/LogEntryCard.tsx` — always-visible edit/delete, inline confirm/cancel delete flow, `confirmDelete` state
- `src/components/routines/RoutineForm.tsx` — double-submit guard
- `src/app/(app)/(content)/routines/page.tsx` — back button (Link to `/dashboard`)
- `src/app/(app)/chat/page.tsx` — `overflow-hidden` + `shrink-0` on MobileSessionList header (partial SC1/SC2 fix)
- `src/components/chat/ChatInterface.tsx` — `shrink-0` on input area (partial SC1 fix)

## Why This Approach
- Double-submit pattern: `if (submitting) return` as early guard + never reset `submitting` to false on successful path. Component unmounts on navigation, which naturally clears state. Avoids the race window where `finally { setSubmitting(false) }` re-enables the button before the router.push completes.
- RoutineCard client conversion: delete confirmation modal requires `useState`. Inline `'use server'` action removed in favour of calling the existing `deleteRoutineAction` from client.
- `opacity-0 group-hover:opacity-100` removed everywhere — hover states don't exist on touch devices, permanently hiding controls on mobile.

## Build Verification
```
$ npm run build
EXIT 0 ✓ (warnings only)
```

**Agent Signature:** Coding Agent | 2026-03-26 17:30

</details>

---

<details>
<summary><strong>Code Reviewer — Build 14</strong> | 2026-03-26 18:00</summary>

## Files Reviewed
- `src/components/trackers/SchemaEditor.tsx` ✓ PASS
- `src/components/trackers/CreateTrackerForm.tsx` ✓ PASS
- `src/components/trackers/LogForm.tsx` ✓ PASS
- `src/components/trackers/TrackerCard.tsx` ✓ PASS
- `src/components/routines/RoutineCard.tsx` ✓ PASS
- `src/components/trackers/LogEntryCard.tsx` ✓ PASS
- `src/app/(app)/(content)/routines/page.tsx` ✓ PASS

## Verdict: **PASS**

**Agent Signature:** Code Reviewer | 2026-03-26 18:00

</details>

---

<details>
<summary><strong>QA Agent — Build 14 Test Results</strong> | 2026-03-26 18:00</summary>

## Test Results (from user report)
- [x] SC3 — Tracker ID gone, slimmer Add Field, type-name delete modal — PASS
- [x] SC4 — No duplicate submissions — PASS
- [x] SC5 — Tracker names wrap correctly — PASS
- [x] SC6/SC7 — Edit/delete always visible, delete modal, back button — PASS
- [x] Button swap — Create Tracker in schema header, Add Field at footer — PASS
- [ ] SC1 — Chat header + input still not fixed, page scrolls — FAIL
- [ ] SC2 — New Chat button scrolls away — FAIL
- [ ] Hamburger New Chat — button not responding — FAIL
- [ ] Chat persistence — sessions disappear on navigation — FAIL

## Build 14 Assessment
**Status:** Testing Complete — Partial Report
**Verdict:** FAIL — 4 issues remain

**Agent Signature:** QA Agent | 2026-03-26 18:00

</details>

---

<details>
<summary><strong>Coding Agent — Build 15</strong> | 2026-03-26 18:45</summary>

## Problem Statement
4 remaining issues after Build 14: SC1 (chat layout), SC2 (sessions scroll), hamburger New Chat, chat persistence.

## Root Cause Analysis

### SC1 + SC2 — `min-h-0` missing
In CSS Flexbox, a child's minimum size defaults to its content size. `flex-1 overflow-y-auto` without `min-h-0` means the element can still grow indefinitely, causing the *parent* container to scroll rather than the element itself. This is the canonical "flex scroll not working" bug. Fix: add `min-h-0` to every scrolling flex child.

### SC1 — Header not pinned
The chat header div had no `shrink-0`, so it could be compressed or lost when messages grew. ChatInterface outer div also lacked `overflow-hidden`, allowing content to bleed outside.

### Hamburger New Chat
Backdrop and sidebar panel were sibling `absolute` elements sharing a stacking context. No z-index on either meant DOM order determined which received touch events. On iOS Safari, backdrop `pointer-events` can win ambiguously. Fix: `z-10` on sidebar panel guarantees it sits above the backdrop.

### Chat persistence
`getSessions()` in `src/lib/db/chat.ts` had:
```ts
.neq('title', DEFAULT_SESSION_TITLE)  // filtered out ALL "New Chat" sessions
```
This meant any session never renamed by the user was permanently invisible in the sidebar, appearing deleted on navigation. The cleanup function (`chat-cleanup.ts`) only deletes truly empty/stale sessions (0 messages + 2h idle), so messages were safe in DB but unreachable via UI.

## Files Changed
- `src/components/chat/ChatInterface.tsx` (3 edits):
  - Outer div: added `overflow-hidden`
  - Header div: added `shrink-0`
  - Messages div: added `min-h-0`
  - Sidebar panel in overlay: added `z-10`
- `src/app/(app)/chat/page.tsx` — added `min-h-0` to MobileSessionList nav
- `src/components/chat/ChatSidebar.tsx` — added `min-h-0` to desktop sessions nav
- `src/lib/db/chat.ts` — removed `.neq('title', DEFAULT_SESSION_TITLE)` from `getSessions()`

## Build Verification
```
$ npm run build
✓ Compiled successfully
✓ 21/21 static pages
EXIT 0 ✓
```

**Agent Signature:** Coding Agent | 2026-03-26 18:45

</details>

---

<details>
<summary><strong>Coding Agent — Build 15 (v2)</strong> | 2026-03-26 19:00</summary>

## Problem Statement
4 remaining issues after Build 14: SC1 (chat layout), SC2 (sessions page scroll), hamburger New Chat unresponsive on iOS, chat sessions disappearing after navigation.

## Root Cause Analysis

### SC1 — Chat flex column not constraining height
`ChatInterface` outer div had `h-full flex-col overflow-hidden` but the wrapper div in `[sessionId]/page.tsx` was `flex flex-1 flex-col bg-background` without `min-h-0`. In a flex column, without `min-h-0` a child defaults to its content height, so the wrapper could grow beyond the viewport and the outer container scrolled instead of the messages div. `layout.tsx` `<main>` already had `h-full overflow-hidden` — the missing link was `min-h-0` on the intermediate wrapper.

### SC2 — MobileSessionList not filling available height
The `MobileSessionList` outer div used `flex flex-1 flex-col overflow-hidden` which relies on a flex parent to distribute space, but the parent `<div className="flex h-full">` does not stretch flex children by default. Switching to `flex flex-col h-full overflow-hidden` makes the component claim the full viewport height directly rather than inheriting it from flex-grow.

### Hamburger New Chat — iOS backdrop stacking context
The original overlay used `onClick` on the backdrop `absolute` div to close the sidebar. On iOS Safari, `backdrop-blur-sm` on an absolutely-positioned element creates an implicit stacking context. When the sidebar panel and backdrop share the same stacking context (both `absolute` inside the same `fixed` parent with no explicit z-index), touch events can land on the backdrop div even when visually the sidebar is on top — especially for the "New Chat" button at the top-left of the sidebar which overlaps the backdrop origin. Fix: move the click handler to the outer `fixed` div, add `pointer-events-none` to the backdrop div, and `e.stopPropagation()` inside the sidebar panel. This is unambiguous on all browsers.

Additionally, the "New Chat" `<Link>` inside `ChatSidebar` navigated without closing the overlay, leaving the overlay frozen over the new chat page. Replaced with a `<button>` when `isMobileOverlay` that calls `onMobileClose()` then `router.push('/chat/new')`.

### Chat sessions disappearing — Next.js page cache
`/chat` and `/chat/[sessionId]` pages were being served from Next.js's static/ISR cache. After creating a new session, navigating back to `/chat` could return a stale cached response that predates the new session. Fix: `export const dynamic = 'force-dynamic'` on both pages ensures `getSessions()` is called fresh on every request.

## Files Changed
- `src/app/(app)/chat/[sessionId]/page.tsx` — added `export const dynamic = 'force-dynamic'`; added `min-h-0` to both `ChatInterface` wrapper divs (new session branch + existing session branch)
- `src/app/(app)/chat/page.tsx` — added `export const dynamic = 'force-dynamic'`; changed `MobileSessionList` outer div from `flex flex-1 flex-col` to `flex flex-col h-full`
- `src/components/chat/ChatInterface.tsx` — mobile overlay: moved close handler to outer `fixed` div, added `pointer-events-none` to backdrop div, added `e.stopPropagation()` to sidebar panel div
- `src/components/chat/ChatSidebar.tsx` — added `useCallback` import; added `handleNewChat` callback that calls `onMobileClose()` then `router.push('/chat/new')`; New Chat renders as `<button>` when `isMobileOverlay`, as `<Link>` otherwise

## Why This Approach
- `min-h-0` + `h-full` pair: standard CSS Flexbox fix for scroll-inside-flex-child. Adding `min-h-0` prevents the flex item from overflowing its parent even when content is taller than the viewport.
- `pointer-events-none` on backdrop: eliminates any browser-specific stacking context ambiguity. The outer `fixed` div becomes the sole click target for the "close on tap outside" pattern.
- `force-dynamic`: minimal-impact cache bypass — only affects the two chat routes that need live data, no other pages affected.
- Button vs Link for New Chat in overlay: `<Link>` fires navigation immediately without allowing `onMobileClose` to complete first. A `button` with `router.push` gives sequential control.

## Build Verification
```
$ npm run lint && npm run build
✓ Compiled successfully in 9.5s
✓ Generating static pages (20/20)
EXIT 0 ✓ (warnings only — pre-existing, none introduced by this build)
```

**Agent Signature:** Coding Agent | 2026-03-26 19:00

</details>

<details>
<summary><strong>Coding Agent — Build 15 (v3)</strong> | 2026-03-26 19:45</summary>

## Problem Statement
Mobile `/chat` home page had a "New Chat" green button + basic session list with no action buttons. Required a full redesign: iOS-style header with Select mode for bulk delete, always-visible rename/delete icons on each session row, and a bottom chat input that starts a new chat without needing a separate button. Also two Code Reviewer fixes: remove vestigial `currentSessionId` prop from `ChatInterface` and a stale comment inside `handleSendInternal`.

## Files Changed
- `src/components/chat/MobileChatHome.tsx` (created) — new Client Component with header (title + Select toggle), sessions list (inline rename, always-visible pencil/trash icons, selection mode with bulk delete), empty state, and bottom textarea input that POSTs to `/api/chat` then routes to the new session
- `src/app/(app)/chat/page.tsx` (modified) — replaced `MobileSessionList` (deleted inline function) with `<MobileChatHome>` import; removed unused `ChatSession` type import from page file
- `src/components/chat/ChatInterface.tsx` (modified) — removed `currentSessionId?: string` from `Props` type; deleted vestigial `// ... rest of error handling ...` comment from `handleSendInternal`
- `src/app/(app)/chat/[sessionId]/page.tsx` (modified) — removed `currentSessionId` prop from both `<ChatInterface>` call sites (lines 34 and 74)

## Why This Approach
- `MobileChatHome` is a Client Component because the sessions list requires `useState` (rename/delete/selection state) and `useRouter` for programmatic navigation after new chat creation. The parent `ChatPage` remains a pure Server Component.
- `formatRelativeTime` is duplicated from `ChatSidebar` rather than extracted to a shared util because the rules prohibit barrel files and keeping it co-located avoids a new shared file for a single small helper — acceptable duplication.
- `SESSION_TITLE_MAX_LENGTH` is included for future-proofing the rename input's `maxLength` attribute, matching the pattern in `ChatSidebar`.
- Textarea auto-resize uses a `useEffect` on `input` state matching the pattern in `ChatInterface`.
- Hydration guard (`mounted` state) prevents `formatRelativeTime` mismatches between SSR and client, exactly as in `ChatSidebar`.

## Build Verification
```
$ npm run lint && npm run build
✓ Compiled successfully in 10.4s
✓ Generating static pages (20/20)
EXIT 0 ✓ (warnings only — all pre-existing, none introduced by this build)
```

**Agent Signature:** Coding Agent | 2026-03-26 19:45

</details>

---

<details>
<summary><strong>QA Agent — Build 16 Test Results</strong> | 2026-03-27 06:20</summary>

## Test Results (from user report — real device, ~375px)

- [x] **SC1** — `/chat` home: "New Chat" button gone, bottom input visible — **PASS** (with layout note below)
- [x] **SC2** — Send from home input → navigates to `/chat/[uuid]`, AI responds — **PASS** (slow ~2s, acceptable)
- [ ] **SC1-WIDTH** — MobileChatHome does not fill full screen width; right edge gap visible — **FAIL**
  - Root cause: `md:hidden` div in flex row parent has no `flex-1`, sizes to content width
- [x] **SC3** — Pencil + trash always visible on session rows — **PASS**
- [x] **SC4** — Pencil tap → inline rename input — **PASS** (functionally), no visual cue that field is editable — **PARTIAL PASS**
- [x] **SC5** — Trash → confirm → session removed — **PASS** (slow, no optimistic removal, deleted item lingers briefly)
- [x] **SC6** — Select mode → bulk delete → Cancel — **PASS**
- [x] **SC7** — ChatInterface regression — header/input/AI response all functional — **PASS**
- [ ] **SC8 (chat layout)** — Chat header scrolls away when page scrolled; input pinned below nav but not truly fixed — **FAIL**
  - Screenshot 1: Input under nav bar on load
  - Screenshot 2: Header gone after scroll
  - Root cause: `h-full` on ChatInterface outer div not reliably filling flex parent on iOS/mobile
- [ ] **NEW: Temp sessions in sidebar** — All "New Chat" sessions appear in sidebar including quick-log chats — **FAIL**
  - Root cause: Build 15 removed `.neq('title', 'New Chat')` filter to fix persistence. Real fix was `force-dynamic` — filter should be added back.
- [ ] **CRITICAL: Foreign key constraint on log** — "Failed to log entry: insert or update on table 'tracker_logs' violates foreign key constraint 'tracker_logs_tracker_id_fkey'" — **FAIL**
  - Happens when AI creates a correction action card in the same session (sleep data correction flow)
  - Screenshot 4 (routine chat, sleep data): First card correct, second correction card FK error
  - Screenshot 5: Close-up of error card
  - Root cause: AI generates a new action card for corrections but uses hallucinated/wrong trackerId

## Build 16 Assessment
**Status:** Testing Complete — Full Report
**Verdict:** FAIL — 4 failures (1 critical, 3 high/medium)

Regressions introduced: temp sessions now visible in sidebar (Build 15 filter removal side-effect)
New bugs confirmed: FK constraint error on correction logs, MobileChatHome width, chat layout still broken

**Agent Signature:** QA Agent | 2026-03-27 06:20

</details>

