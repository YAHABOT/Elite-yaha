# SESSION LOG — 2026-04-11

**Status:** V30 shipped but CRITICAL regressions found on device. Hotfix required immediately.

---

## Catch-Up

- V30 complete: commits a2c8785 → ecd34e1 on master + feat/mvp-build
- QA: BUILD PASS (463/0), CR: PASS
- **Deploy branch incident:** All V30 commits went to master, Vercel tracks feat/mvp-build — fixed at session end yesterday by merging + pushing

---

## V30 Critical Regressions (found on device 2026-04-10)

### R1 — CRITICAL: Chat completely broken
**Error:** `Unexpected token 'd', "data: {"ty"... is not valid JSON`
**Root cause:** Some send path in `ChatInterface.tsx` still calls `res.json()` on the SSE stream. Content-type check possibly not firing on all paths. Error banner appears, some messages partially work but chat is unreliable.

### R2 — CRITICAL: Chat header + input bar not pinned (V29 regression re-introduced)
**Root cause:** B7 performance fix added `<Suspense>{children}</Suspense>` wrapper in `src/app/(app)/layout.tsx:49`. Suspense boundary inserts an element with no `h-full` into the flex chain: `h-dvh > main(h-full) > [Suspense, no height] > page`. Chain breaks → header scrolls, input floats. Exact same class of bug fixed in V29 hotfix 4.

### R3 — MEDIUM: Tracker card cut off at bottom
**Root cause:** Likely related to Suspense/overflow change in layout. Needs investigation.

### R4 — MEDIUM: Cross-day error message still old wording
`"Start day for 2026-04-11 already complete. End 2026-04-11's session first."` — B2 fix may have applied to cross-day path only, not same-day re-trigger path.

---

## Task: V30-HF1 — Critical Regression Fixes

**RA Gate:** N/A
**What:** Fix R1 (JSON parse), R2 (Suspense layout), R3 (tracker scroll), R4 (message wording)
**Files:** ChatInterface.tsx, layout.tsx, possibly route.ts
**Validate:** npm run lint && npm run build

## V30-HF1 Fix

**Commit:** `af67799` — lint 0 errors, build exit 0
**Deployed:** https://yaha-flame.vercel.app

- `src/app/(app)/layout.tsx` — removed `<Suspense>` wrapper + import; `{children}` renders directly into `<main>`, restoring `h-dvh > main(h-full) > page` flex chain (R2 fix)
- `src/components/chat/ChatInterface.tsx` — attachment send path now detects `text/event-stream` content-type before calling `res.json()` (R1 fix)
- `src/app/api/chat/route.ts` — same-day re-trigger message: `"A session for ${today} is already active. You can continue logging or complete your End Day routine."` (R4 + R5 fix)

[CA | 10:30] V30-HF1 delivered


## V30-HF2 — New Chat SSE Fix

**Commit:** `923872b` — build exit 0
**Deployed:** https://yaha-flame.vercel.app

- `src/components/chat/MobileChatHome.tsx` — `handleSend` was calling `res.json()` on SSE response. Fixed with SSE reader loop to extract `sessionId` from `done` event, then `router.push`.
- Root cause: HF1 only fixed `ChatInterface.tsx`. `MobileChatHome` is a separate component that also calls `/api/chat` — missed in HF1 audit.

[CA | 11:10] V30-HF2 delivered


## V30-HF3 — Chat Header Unpinned + New Chat Navigation + Tracker Card Cut-Off

**Commit:** `57511dd` — build exit 0
**Deployed:** feat/mvp-build pushed to Vercel

### Problems Fixed
1. **Chat header/input unpinned** — User reported header + input bar disappeared after new-chat navigation (chat completely non-functional)
2. **New chat navigation lag** — MobileChatHome waits for full AI response before getting sessionId. If Vercel timeout or AI is slow, navigation fails
3. **Tracker card cut-off** — Last tracker card unreachable by scroll (Android Chrome h-full height bug)

### Root Causes & Solutions
- **SSE sessionId timing:** Route was waiting until full AI response before emitting sessionId in final event. Solution: emit sessionId in FIRST SSE event (new `session` event type)
- **New-chat early navigation:** Client navigates to `/chat/[sessionId]` before server finishes generating AI response → page loads with only user message. Solution: ChatInterface polls via router.refresh() every 3s for up to 60s until AI response arrives in initialMessages
- **Vercel timeout:** Route could hang if Gemini streaming took >30s (Vercel default). Solution: `export const maxDuration = 60` at top of route.ts
- **Tracker card scroll:** Content layout div `h-full overflow-y-auto` calculates height as parent's OUTER height (dvh) not content area (dvh−64px nav) on Android Chrome. Last content ends up behind the 64px bottom nav clip boundary. Solution: add `pb-[calc(4rem+env(safe-area-inset-bottom,0px))]` directly to scroll container instead of just `p-4 md:p-6`

### Changes
- `src/app/api/chat/route.ts` — emit `sessionId` as first SSE event; wrap enqueues with try-catch for client disconnect; extend timeout to 60s
- `src/components/chat/ChatInterface.tsx` — add poll + refresh mechanism for early navigation; listen to initialMessages updates to detect when AI response arrives
- `src/components/chat/MobileChatHome.tsx` — listen for `session` event type and navigate immediately, not waiting for `done` event
- `src/app/(app)/(content)/layout.tsx` — add mobile bottom nav padding to scroll container to prevent content clipping

[CA | 14:45] V30-HF3 delivered

## Session Closed — No Testing (App Dysfunctional)

**Status:** V30-HF1, V30-HF2, V30-HF3 delivered but app remained unreliable on device. No manual test performed.

**Hotfixes applied:**
- HF1: Removed Suspense wrapper from layout (R2 header pin), fixed ChatInterface SSE parsing (R1), updated error message (R4)
- HF2: Fixed MobileChatHome SSE parsing (R1 parallel path)
- HF3: Emit sessionId first + poll mechanism for early navigation (R2 nav lag), added Android safe-area padding to tracker scroll (R3)

**Root cause analysis in technical_log_v30.md — all issues traced to design pattern mismatches (SSE vs JSON, early navigation race, layout height calculation).**

**Next session:** Use consolidated TCS_v30 from 2026-04-09. Request full manual test run on Android Chrome against latest Vercel deploy.
