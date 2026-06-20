# Session Log — 2026-03-26

## Summary

**Session complete. Build 16 deployed — 4 failures identified. V17 work continues in 2026-03-27 session.**

### What shipped
- **Build 13–15**: 14+ bugs fixed across mobile layout, chat sidebar, Save Chat flow, quick-log width, page remount on new chat, AI UUID hallucination, TTL cleanup, hamburger menu iOS fix, session persistence via `force-dynamic`, chat layout scroll containment
- **Build 16**: New `MobileChatHome` — session list with inline rename/delete + bottom persistent chat input replacing "New Chat" button

### What's outstanding (→ V17)
1. **CRITICAL**: FK constraint error when AI makes corrections to action cards (tracker_id hallucination on second card)
2. **HIGH**: Chat layout still scrollable — header/input not truly pinned on mobile
3. **HIGH**: Temp "New Chat" sessions appear in sidebar (filter was removed in B15 fix)
4. **MEDIUM**: `MobileChatHome` doesn't fill full screen width
5. **MEDIUM**: Inline rename has no visual indicator (input looks like label)
6. **LOW**: Delete is slow — no optimistic removal

---

## Session Startup

**Timestamp:** 2026-03-26 — Session initialized

**Context:**
- Previous build (V12 from 2026-03-25) — all tests passing ✅
- New bug reports identified by user during further testing (independent of V8-V12 fixes)
- Ready for new bug triage and fixes

**Session Prep Completed:**
- ✅ Context gathered (SESSION_LOG + TECHNICAL_LOG from 2026-03-25)
- ✅ Current build state confirmed (V12 PASS, 20+ routes)
- ✅ Bug intake process ready
- ✅ Files reorganized (V9-V12 history moved to 2026-03-25 folder)

---

## Future Enhancements Introduced (2026-03-26)

### 1. Hardcoded Food Tracker + User Field Extension
- Pre-built "Food" tracker shipped with every user account (cannot be deleted)
- AI gets food-specific parsing rules for nutrient extraction, portion estimation, unit conversion
- Users can extend this tracker with custom fields (Sodium, Sugar, Restaurant, etc.)
- Custom fields persist alongside hardcoded fields in the same schema
- **Priority:** High (core MVP feature)

### 2. Calorie Balance (Surplus/Deficit) Auto-Calculation
- System auto-detects when both food intake + TDEE are logged on the same day
- Auto-recognizes TDEE under multiple names: "TDEE", "Daily Burn", "Calories Burned", "Daily Energy Spend", "Maintenance Calories", etc.
- Automatically computes balance: `totalCalories - tdee = surplus/deficit`
- Displays in journal (badge) + dashboard (stat card)
- **Priority:** High (analytics feature, user engagement)

Both enhancements documented in `FUTURE_ENHANCEMENTS.md` with implementation notes, file targets, and rationale.

---

## New Bugs Reported — V13 Targets

All bugs identified from first real phone test (V12 build). Independent of V8-V12 fixes.

| # | Bug | Severity | File(s) |
|---|-----|----------|---------|
| 1 | Create tracker form overflows mobile — field rows too wide | High | `SchemaFieldRow.tsx` |
| 2 | Schema editor squished on mobile — p-8 padding, delete buttons hidden | High | `SchemaEditor.tsx` |
| 3 | Chat sidebar invisible on mobile — no way to access session history | High | `chat/[sessionId]/page.tsx`, `ChatSidebar.tsx` |
| 4 | "Save Chat" flow missing — sidebar should only show named/saved sessions | High | `ChatInterface.tsx`, `chat.ts`, `ChatSidebar.tsx` |
| 5 | Quick Log (AgentSelector) too wide on mobile — eats input space | Medium | `AgentSelector.tsx` |
| 6 | Page full-refresh on first message in new chat (persistent bug) | High | `ChatInterface.tsx` |
| 7 | AI uses "New sleep tracker id" as UUID — hallucination in trackerId field | High | `prompt-builder.ts` |

---

## Build History

---

## Coding Agent — Build 13 Released
**Timestamp:** 2026-03-26 12:00 | **Status:** Implementation Complete

- Build v13 compiled ✓
- Full details: `TECHNICAL_LOG_V13.md`

**Cliff Notes:**
- Fixed: 7 bugs — mobile layout overflow (trackers form), mobile sidebar drawer (chat), Save Chat flow, AgentSelector width, page remount on new chat, AI UUID hallucination
- Files changed: 9

**Agent Signature:** Coding Agent | 2026-03-26 12:00

---

## Work Log

(To be filled in as fixes are applied)

---

## QA Agent — Test Criteria
**Timestamp:** 2026-03-26 15:30 | **Status:** Awaiting Test Report

All tests must be performed on a real mobile device or browser devtools at ~375px viewport width unless noted otherwise.

### Test Checklist for Build v13

- [ ] SC1 — Create Tracker mobile layout — Navigate to Trackers → New Tracker. Add 2 or more fields. Verify no horizontal overflow at 375px: type selector and unit input are both visible and tappable without scrolling sideways. Reorder arrows should be visible without hover.

- [ ] SC2 — Schema Editor mobile layout — Open an existing tracker's schema edit page. Verify: field rows render in a readable two-line layout (label on row 1, controls on row 2), the Delete Tracker button is visible without scrolling, and when tapping Delete the "Are you sure?" confirmation shows both Yes and No/Cancel buttons fully on-screen and tappable.

- [ ] SC3 — Chat sidebar mobile drawer — While inside a chat session on mobile (~375px), tap the hamburger (☰) button visible in the top-left of the header. Verify the session sidebar slides in as a fixed overlay covering the screen. Tap outside the panel or tap the X/back button to close it. Verify it closes correctly.

- [ ] SC4 — Sidebar only shows saved sessions — Open the chat sidebar (desktop or via the mobile drawer). Verify zero "New Chat" entries appear in the list. Only sessions that have been explicitly named/saved should be visible.

- [ ] SC5 — Save Chat button and modal — Start a new chat at /chat/new, send at least one message (wait for AI reply). Verify a "Save Chat" button appears in the header. Tap it, enter a name in the modal, confirm. Verify: (a) the Save Chat button disappears immediately from the header without a page reload, (b) the session now appears in the sidebar list under the given name.

- [ ] SC6 — Quick Log compact on mobile — In the chat input bar at ~375px viewport width, verify the AgentSelector (Quick Log button) displays only a coloured dot and a chevron with no text label, leaving adequate horizontal space for the text input area.

- [ ] SC7 — No page flash on first message — Navigate to /chat/new. Type a message and send it. Verify the page does NOT flash or fully reload. The URL should silently update to /chat/[uuid] while the chat stream renders in-place. Send a second message in the same session and confirm it posts correctly to the same session (URL does not change to /chat/new again).

- [ ] SC8 — AI uses real tracker UUID — In chat, ask the AI to log data to an existing tracker (e.g. "log my sleep: 8 hours"). Verify the action card appears without a "Failed to add entry: Invalid input syntax for type uuid" error. Confirm the action card and verify the entry is saved successfully.

**Agent Signature:** QA Agent | 2026-03-26 15:30

---

## Coding Agent — Build 13 Mobile Fixes Released
**Timestamp:** 2026-03-26 | **Status:** Implementation Complete

- Build v13 Mobile Fixes compiled ✓
- Full details: `TECHNICAL_LOG_V13.md` (section: "Build 13 Mobile Fixes")

**Cliff Notes:**
- Fixed: New Tracker form left-side bleed on mobile (px-4 added)
- Fixed: SchemaEditor overflow-hidden clipping delete confirm (glow wrapper scoped)
- Fixed: SchemaFieldRow Row 2 visually disconnected on mobile (border-l indent)
- Fixed: /chat page blank on mobile (MobileSessionList full-page fallback)
- Fixed: Sessions with messages deleted after 10 min (TTL → 120 min empty, 24h with messages)
- Fixed: AgentSelector button too wide on mobile (responsive px/py/gap/rounded)
- Fixed: Textarea flex-shrink overflow in chat input (min-w-0 added)
- Files changed: 7

**Agent Signature:** Coding Agent | 2026-03-26

---

## Main Agent — V14 Bug Report Intake
**Timestamp:** 2026-03-26 17:00 | **Status:** Bugs Triaged

User submitted a formal bug report (see `Bug report for V14/Screenshot refrences.md`) with 7 issues from continued mobile testing of V13.

| # | Issue | Severity |
|---|-------|----------|
| SC1 | Chat input + header not fixed — whole page scrolls instead of just messages | High |
| SC2 | Chat sessions page entirely scrollable — New Chat button scrolls away | High |
| SC3 | SchemaEditor shows internal tracker ID, Add Field button too bulky, delete confirm UX bad | Medium |
| SC4 | Double-submit on Create Tracker / Save Schema / Log Entry / Deploy Protocol | High |
| SC5 | Tracker names truncated with `...` instead of wrapping | Medium |
| SC6/SC7 | Routine edit/delete buttons hidden until hover (broken on mobile touch) + no delete confirmation + no back button | High |
| Extra | Create Tracker form — swap positions of Add Field and Create Tracker buttons | Low |

**Agent Signature:** Main Agent | 2026-03-26 17:00

---

## Coding Agent — Build 14 Released
**Timestamp:** 2026-03-26 17:30 | **Status:** Implementation Complete

- Build v14 compiled ✓
- Full details: `TECHNICAL_LOG_V14.md`

**Cliff Notes:**
- Fixed SC3: Removed tracker ID display, slimmed Add Field button, type-name delete modal
- Fixed SC4: Double-submit prevention on CreateTrackerForm, SchemaEditor, LogForm, RoutineForm
- Fixed SC5: `min-w-0` + `break-words` on TrackerCard name
- Fixed SC6/SC7: RoutineCard → client component, always-visible edit/delete, delete confirmation modal, back button on routines page; LogEntryCard → always-visible edit/delete, inline confirm/cancel
- Fixed SC1 (partial): `shrink-0` on chat input
- Fixed SC2 (partial): `overflow-hidden` + `shrink-0` on MobileSessionList header
- Button swap: Create Tracker moved to schema section header, Add Field to footer
- Files changed: 8

**Agent Signature:** Coding Agent | 2026-03-26 17:30

---

## QA Agent — V14 Test Criteria
**Timestamp:** 2026-03-26 18:00 | **Status:** Results Received

### Test Results — Build v14 (user-reported)

- [x] SC3 — Tracker ID gone, Add Field slimmer, type-name delete modal — **PASS**
- [x] SC4 — No duplicate submissions anywhere — **PASS**
- [x] SC5 — Tracker names wrap, no truncation — **PASS**
- [x] SC6/SC7 — Edit/delete always visible, delete modal, back button — **PASS**
- [x] Button swap — Create Tracker in schema header, Add Field at bottom — **PASS**
- [ ] SC1 — Chat still scrollable, header + input not truly fixed — **FAIL**
- [ ] SC2 — New Chat button still scrolls away — **FAIL**
- [ ] New: Hamburger menu New Chat button not working
- [ ] New: Chat sessions don't persist — disappear when navigating away

**Verdict:** FAIL — 3 regressions / 2 new bugs remaining

**Agent Signature:** QA Agent | 2026-03-26 18:00

---

## Main Agent — V15 Bug Triage
**Timestamp:** 2026-03-26 18:30 | **Status:** Bugs Identified

Root causes confirmed by code inspection:

1. **SC1 root cause:** `flex-1 overflow-y-auto` on messages div missing `min-h-0` — without it a flex child can grow beyond its parent, causing the container to scroll instead of the element. Also header was missing `shrink-0`.
2. **SC2 root cause:** Same `min-h-0` missing on sessions nav. Also applies to `ChatSidebar.tsx` desktop nav.
3. **Hamburger New Chat root cause:** Sidebar panel and backdrop are sibling `absolute` elements — no explicit z-index on panel, backdrop captures touch events on iOS Safari.
4. **Chat persistence root cause:** `getSessions()` in `chat.ts` had `.neq('title', 'New Chat')` which filtered out ALL unnamed sessions from the sidebar, making them appear deleted even though they exist in the DB.

**Agent Signature:** Main Agent | 2026-03-26 18:30

---

## Coding Agent — Build 15 Released
**Timestamp:** 2026-03-26 18:45 | **Status:** Implementation Complete

- Build v15 compiled ✓ (zero errors)
- Full details: `TECHNICAL_LOG_V14.md` (Build 15 section)

**Cliff Notes:**
- Fixed SC1: `overflow-hidden` on ChatInterface outer div, `shrink-0` on header, `min-h-0` on messages div
- Fixed SC2: `min-h-0` on MobileSessionList nav + ChatSidebar nav
- Fixed hamburger: `z-10` on sidebar panel inside mobile overlay
- Fixed persistence: removed `.neq('title', 'New Chat')` filter from `getSessions()`
- Files changed: 4

**Agent Signature:** Coding Agent | 2026-03-26 18:45

---

## QA Agent — V15 Test Criteria
**Timestamp:** 2026-03-26 18:50 | **Status:** Awaiting Test Report

### Test Checklist for Build v15

- [ ] SC1 — Open any chat on mobile. Confirm YAHA header (hamburger + bot icon) stays pinned at top at all times. Confirm input box stays pinned above the bottom nav bar. Confirm ONLY the chat bubbles area scrolls. (SC1)

- [ ] SC2 — Go to `/chat` on mobile. Confirm "New Chat" green button stays fixed at the top as you scroll. Confirm only the sessions list below it scrolls. (SC2)

- [ ] SC3 — Open the hamburger menu in any chat. Tap "New Chat". Confirm it navigates to a fresh chat. (Hamburger fix)

- [ ] SC4 — Start a new chat, send at least one message, then navigate to Dashboard and come back to Chat. Confirm the session is still visible in the sessions list even though it was never renamed. (Persistence fix)

**Agent Signature:** QA Agent | 2026-03-26 18:50

---

## Main Agent — Build 15 Deployed + Build 16 Feature Spec
**Timestamp:** 2026-03-26 19:30 | **Status:** New Feature Queued

**Build 15 deployed** to `yaha-flame.vercel.app` ✓ — zero errors, all 20 routes compiled. Code Reviewer returned **PASS WITH NOTES** (two non-blocking cleanups deferred to Build 16).

**New feature request from user (Build 16):** Redesign the mobile `/chat` home screen:
1. Remove the "New Chat" button — replace with a persistent chat input at the bottom
2. Placeholder: "Type here to start a new chat..." (disappears on focus)
3. When user sends from home input → POST to `/api/chat` with `sessionId: 'new'` → navigate to `/chat/[sessionId]`
4. Sessions list: edit (rename inline) + delete buttons **always visible** on the right of each item
5. "Select" button in header for bulk deletion mode (same as ChatSidebar)
6. Also fix Code Reviewer notes: remove dead `currentSessionId` prop, remove vestigial comment

**Agent Signature:** Main Agent | 2026-03-26 19:30

---

## Coding Agent — Build 16 Released
**Timestamp:** 2026-03-27 | **Status:** Implementation Complete

- Build v16 compiled ✓ (zero errors, 26 routes)
- Full details: `TECHNICAL_LOG_V14.md` (Build 15 v3 / Build 16 section)

**Cliff Notes:**
- Built: `MobileChatHome` — new Client Component replacing `MobileSessionList`
  - Header with "Chat" title + "Select" bulk-delete mode
  - Sessions list: always-visible rename (pencil) + delete (trash) per item
  - Inline rename flow (same UX as ChatSidebar)
  - Bottom persistent chat input: POST to `/api/chat` → navigate to `/chat/[sessionId]`
- Removed dead `currentSessionId` prop from `ChatInterface` both call sites
- Removed vestigial comment from `ChatInterface.tsx`
- Deployed to `yaha-flame.vercel.app` ✓
- Files changed: 4

**Agent Signature:** Coding Agent | 2026-03-27

---

## QA Agent — Build 16 Test Criteria
**Timestamp:** 2026-03-27 | **Status:** Awaiting Test Report

All tests at ~375px mobile viewport (or Chrome DevTools responsive mode).

### Test Checklist for Build 16

- [ ] **SC1** — Navigate to `/chat` on mobile. Confirm there is NO "New Chat" green button. Instead, a text input pinned to the bottom of the screen should be visible with placeholder "Type here to start a new chat...". Tapping it should focus and show the keyboard. (New Chat input replacing button)

- [ ] **SC2** — On the `/chat` home screen, type a message in the bottom input and tap Send (or press Enter). Confirm the page navigates to `/chat/[uuid]` with the message already visible in the chat, and the AI begins responding. Do NOT see a full page flash. (New chat created from home input)

- [ ] **SC3** — On the `/chat` home screen, confirm each session row shows a pencil (rename) button and a trash (delete) button on the right side **at all times** — no hover required. (Always-visible session actions)

- [ ] **SC4** — Tap the pencil icon on a session in the `/chat` home list. Confirm the session title becomes an inline editable text field. Edit the name and confirm (Enter or checkmark). Confirm the new name persists. (Inline rename on home screen)

- [ ] **SC5** — Tap the trash icon on a session in the `/chat` home list. Confirm a browser confirm dialog appears. Confirm deletion. Confirm the session disappears from the list. (Delete from home screen)

- [ ] **SC6** — On the `/chat` home screen, tap "Select" in the header. Confirm all sessions show checkboxes. Select 2+ sessions. Confirm a bulk-delete button appears. Tap it, confirm the dialog, and verify the selected sessions are removed. Tap "Cancel" to exit selection mode. (Bulk delete mode)

- [ ] **SC7** — Navigate to `/chat/new` or any existing chat. Confirm the chat header, chat bubbles, and input bar all render correctly — no regressions from the `currentSessionId` prop removal. Send a message and confirm normal AI response. (Regression: ChatInterface unaffected)

- [ ] **SC8** — Confirm SC1–SC4 from Build 15 still pass: chat layout fixed (header + input pinned), sessions persist after navigation, hamburger New Chat works, Quick Log compact on mobile. (Build 15 regression check)

**Agent Signature:** QA Agent | 2026-03-27
