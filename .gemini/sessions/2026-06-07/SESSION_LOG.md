# Session 2026-06-07

**Status:** CLOSED ✓
**Branch:** feat/mvp-build
**Previous:** 2026-06-06 CLOSED ✓

---

## Carry-Over from 2026-06-06

| Task | Status | Notes |
|------|--------|-------|
| T58 — Attach File Samsung bypass | ⏳ Ongoing | Carried forward |
| CT-2.1 | ⏳ Non-blocking | Code review findings from v32 |
| CT-3 | ⏳ Non-blocking | 67 QA test cases pending |
| T26 | ⏳ Deferred | AI Summaries — cron + UI pending |
| T43 | ⏳ Pending | Display brightness — OLED too dark on lesser devices |
| T52-migration | ⚠️ Blocked | Apply `20260605000001_feedback_responses.sql` in Supabase |

---

## Tasks Completed This Session

### [T63] YAHA Cat Logo — App-wide branding ✓ COMPLETE
- `public/cat-logo.jpg` — cyberpunk tabby mascot added
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` regenerated with real cat face crop (were blank before)
- `manifest.json` — `maskable` purpose added
- `src/app/layout.tsx` — apple-touch-icon wired
- Cat logo base64-embedded in splash (31KB, no network request)
**Commits:** `45bffc3`

### [T64] Splash screen — cat logo + YAHA wordmark ✓ COMPLETE
- Rewritten: cat image above wordmark on `#050505` background, Courier New, cyan glow, purple tagline, progress bar
- Base64-embedded so works without server
- Previous version had chevron SVG, then text overlaid inside tiny image (invisible)
**Commits:** `45bffc3`, `6ecd344`

### [T65] AI chat avatar ✓ COMPLETE
- Cat logo circle (28×28, `object-position: center 8%`, cyan glow border) left of every AI message
**Commit:** `45bffc3`

### [T66] Dashboard query optimisation ✓ COMPLETE
- `DashboardContent.tsx`: fetch window `Math.max(maxDays*2,30)` → `Math.max(maxDays+7,14)` + `.limit(500)`
**Commit:** `45bffc3`

### [T67] SC1 — Action card regression ✓ COMPLETE
- Root cause: PHOTO-ONLY FOOD DETECTION two-step flow was being applied to file attachments and fitness screenshots. Added `FILE & FITNESS-SCREENSHOT OVERRIDE` rule before the photo-detection section — files/screenshots now go directly to action card.
- Also instructed AI to format durations as human-readable (`56 mins`, `2h 25m`) not raw seconds in text.
**Commit:** `92b6cdc`

### [T68] SC2 — Duration shows `0:00:09` in ActionCard ✓ COMPLETE
- Root cause: `editableFields` converts raw seconds → `"9:59:00"` string on init. Display mode did `parseFloat("9:59:00") = 9` → `formatDuration(9) = "0:00:09"`.
- Fix: if value already matches `/^\d+:\d{2}/` (H:MM:SS), display directly without re-parsing.
**Commit:** `92b6cdc`

### [T69] SC3 — End Day Step 2 never auto-fires ✓ COMPLETE
- Root cause: `handleSubmit` (used for ALL user-typed messages) completely ignored `shouldAutoPromptNextStep` from the SSE `done` event. The full `pendingRoutineAdvanceSessionRef` / `onConfirmed` wiring only existed in `handleSendInternal` (only called for initial routine trigger). Every manual user message in a routine went through `handleSubmit` and auto-advance never wired up.
- Fix: added identical `shouldAutoPromptNextStep` logic to `handleSubmit`.
**Commit:** `92b6cdc`

### [T70] Attach file — library agent context ✓ COMPLETE
- Root cause: inline `<input>` inside the menu div gets removed from DOM when the outside-click handler fires on label tap. For library agents, `handleAgentSelect` prior `setMessages` call left extra pending renders — re-render was faster, input gone before `onChange` fired.
- Fix: same pattern as Photo Library (which works) — button calls `fileDocInputRef.current?.click()` on persistent hidden input outside the menu.
**Commits:** `bf7da03`

### [T71] Attach file — MobileChatHome unresponsive ✓ COMPLETE
- Root cause: `setTimeout(() => fileDocInputRef.current?.click(), 0)` deferred click out of Android user-gesture window — file picker silently blocked.
- Fix: direct `fileDocInputRef.current?.click()` in `onClick` (no setTimeout).
**Commit:** `106e3bd`

### [T72] Agent not carrying from home page to new chat ✓ COMPLETE
- Root cause (1): `active_agent_id` written to DB AFTER server emits session event → race condition, chat page loads before the write completes.
- Root cause (2): library agents never written to DB at all.
- Fix: `MobileChatHome` passes `?agent=<id>` in navigation URL. `ChatSessionPage` reads it and passes `initialAgentId` prop to `ChatInterface`. `ChatInterface` uses `initialSession?.active_agent_id ?? initialAgentId ?? null`.
**Commit:** `106e3bd`

### [T58] Attach file — Samsung extra step (PARTIAL)
- The "Choose an action → Camera / Voice / Files" screen is Samsung My Files' own category picker UI — not an Android intent chooser and not web-fixable.
- Files DO attach after user taps "Files" in that screen.
- Samsung / OPPO devices show this as an extra step — accepted as device behaviour.

---

## Known Gotchas Added This Session

- **`handleSubmit` missing `shouldAutoPromptNextStep` handling** — routine auto-advance only worked via `handleSendInternal` (initial trigger). All user-typed messages go through `handleSubmit`. Fixed by adding identical SSE logic to `handleSubmit`. (date: 2026-06-07)
- **ActionCard duration display: `editableFields` pre-formats to H:MM:SS, display mode re-parsed with `parseFloat` getting leading digit only** — check for H:MM:SS string pattern before re-parsing. (date: 2026-06-07)
- **Library agent not active after home-page navigation** — agent ID lost due to DB race + library agents never stored. Pass `?agent=` URL param on navigation. (date: 2026-06-07)

---

## ⚠️ CARRY-OVER FOR NEXT SESSION

| Task | Status | Notes |
|------|--------|-------|
| CT-2.1 | ⏳ | Code review findings from v32 (non-blocking) |
| CT-3 | ⏳ | 67 QA test cases pending |
| T26 | ⏳ | AI Summaries — cron + UI pending |
| T43 | ⏳ | Display brightness — OLED too dark on lesser devices |
| T52-migration | ⚠️ | Apply `20260605000001_feedback_responses.sql` in Supabase SQL editor |

---

## Commits This Session

| SHA | Message |
|-----|---------|
| `45bffc3` | feat: YAHA cat logo, chat AI avatar, attach fix, dashboard perf |
| `6ecd344` | fix(splash+attach): clean splash layout + revert attach to label+input |
| `190df22` | fix(chat): attach file — remove types from showOpenFilePicker, fall back to accept=*/* |
| `da969cf` | fix(chat): attach file — use persistent fileDocInputRef not inline input |
| `6f4adf1` | fix(chat): attach file — label htmlFor persistent input, true user gesture |
| `ed8b606` | fix(chat): doc input accept=*/* — complex MIME list blocks Android picker |
| `cc59909` | fix(chat): fix JSX comment syntax error from star-slash in accept value |
| `323cd4f` | revert(chat): restore attach file to working state (inline input, doc-only accept) |
| `bd9d5e3` | fix(chat): attach file works repeatedly — reset input value + remount on each open |
| `92b6cdc` | fix(SC1+SC2+SC3): action card regression, duration display, end day step 2 |
| `2224a2b` | fix(chat): library agent attach file — fix MobileChatHome doc input |
| `bf7da03` | fix(chat): attach file works with library agents — use persistent fileDocInputRef |
| `106e3bd` | fix(chat): library agent attach + agent carry-through from home page |
