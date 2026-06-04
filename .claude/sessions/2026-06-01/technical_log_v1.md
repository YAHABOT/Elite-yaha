# Technical Log V1 — 2026-06-01

## Bug 1 Fix: New-chat message lost on navigation

**Root cause:** `addMessage` for the user message was called at line ~445, well after the `session` SSE event was emitted at line ~169. `MobileChatHome` navigates to `/chat/[sessionId]` on receiving the session event. The chat page loads and calls `getRecentMessages` before the user message is in the DB, so `initialMessages` is empty. The new-chat poll in `ChatInterface` only fires when `mostRecent.role === 'user'`, so it never activates — blank chat.

**Files changed:**
- `src/app/api/chat/route.ts`

**What changed:**
- Moved `addMessage({ role: 'user', ... })` to immediately after the `session` SSE `safeEnqueue` (line ~169), before the EX3 attachment ACK and before all other async work.
- Removed the original call at the old location (previously labelled "Save user message").
- The three `addMessage` calls on the blocking/error paths (lines ~293, ~303, ~313, ~343) were left untouched — they save the user message as part of a short-circuit return and are correct where they are.

---

## Bug 2 Fix: Hardcoded "Armaan" in AI prompts

**Root cause:** `buildHealthSystemPrompt` and `buildRoutineSystemPrompt` in `src/lib/ai/prompt-builder.ts` had "Armaan" hardcoded in the returned prompt strings. Every user received the same name regardless of their actual identity.

**Files changed:**
- `src/lib/ai/prompt-builder.ts`
- `src/app/api/chat/route.ts`

**What changed in prompt-builder.ts:**
- Added `userName?: string` to `BuildHealthSystemPromptParams`.
- In `buildHealthSystemPrompt`: derived `const name = params.userName ?? 'you'`; replaced all "Armaan" occurrences in the return string with `${name}`.
- In `buildRoutineSystemPrompt`: added `userName?: string` as the last parameter; derived `const name = userName ?? 'you'`; replaced all "Armaan" occurrences in the return string with `${name}`; updated the two fall-through calls to `buildHealthSystemPrompt` to forward `userName`.

**What changed in route.ts:**
- After the auth check, fetches the user profile: `getUser(user.id, supabase)` (dynamic import to avoid circular deps).
- Derives `userName`: prefers `userProfile.alias`, falls back to `user.user_metadata.full_name`, then `'you'`.
- Passes `userName` to all three prompt builder call sites: `buildRoutineSystemPrompt(…, userName)` and both `buildHealthSystemPrompt({ …, userName })`.

---

## Issue 1 Fix — Historical search intent patterns

Added 9 general search/recall regex patterns to `HISTORICAL_INTENT_PATTERNS` in `src/app/api/chat/route.ts` (e.g. `/\bfind\b/i`, `/\bsearch\b/i`, `/\bin (my|the)?(records?|history|logs?|database)\b/i`, etc.) so messages like "find all protein bars in my records" now trigger historical log injection. Added a new `else if` branch before the existing `else` default that sets `rangeStart` to 30 days ago when one of these search patterns matches but no specific time pattern was present — previously these fell through to yesterday+today, giving the AI no relevant data to answer general recall queries.

[CA | 09:45] Delivered v1 — both bugs fixed, `npm run build` and `npm run lint` pass with zero errors.
[CA | current] Issue 1 Fix delivered — search-intent patterns + 30-day range branch added, `npm run build` passes.

---

## Fix SC2 (isLoading race)

**Root cause:** When `shouldAutoPromptNextStep` fires, the `done` SSE event is parsed mid-loop. The 600ms setTimeout is scheduled, but the `for(;;)` reader loop continues draining the stream. `setIsLoading(false)` only runs in the `finally` block after the loop exits. If stream drain takes >600ms, `handleSendSilent` finds `isLoading===true` and returns immediately — step 2 never fires.

**Fix:** Added `setIsLoading(false)` immediately before `setIsAutoPrompting(true)` at line ~521 in `src/components/chat/ChatInterface.tsx`, inside the `if (shouldAutoPromptNextStep ...)` block. This unblocks `handleSendSilent` before the timer fires. The stream reader loop continues and `finally` calls `setIsLoading(false)` again (idempotent — no harm).

**File:** `src/components/chat/ChatInterface.tsx`

---

## Fix Issue 4 (HR zone duration)

**Root cause:** HR zone displays show `MM:SS | percentage%` columns side by side. The AI was reading the percentage value (e.g. `34.1`) as seconds instead of the actual zone time (`23:40` = 1420s).

**Fix:** Appended a new block to the `DURATION_FORMAT_RULE` constant in `src/lib/ai/prompt-builder.ts` explicitly describing the two-column format, stating that the FIRST value is MM:SS time, the SECOND is a percentage that must NEVER be used as a time value, with concrete examples for zones 1-3.

**File:** `src/lib/ai/prompt-builder.ts`

---

## Fix Issue 5 (hallucinated notes)

**Root cause (two parts):**
1. `buildHistoricalSection` passed `null`/`undefined` field values and empty strings to the AI without filtering — the AI filled gaps with invented content.
2. No rule prevented the AI from denying previously-shown records after fabricating that the notes field was empty.

**Fix A:** In `buildHistoricalSection`, added `.filter(([, v]) => v !== null && v !== undefined)` before the `.map()` so absent fields are omitted entirely from the prompt. Empty string text fields are now rendered as `(no notes)` rather than being silently passed as `""`.

**Fix B:** Added rule `11b` (`TEXT FIELD INTEGRITY — CRITICAL`) to `GLOBAL_ANTI_HALLUCINATION_RULES` immediately before rule 12, covering: exact-text-only for historical text fields; absent = "no notes recorded"; no fabrication; no denial of data already shown in the conversation.

**File:** `src/lib/ai/prompt-builder.ts`

[CA | 10:15] SC2 + Issue 4 + Issue 5 fixes delivered — `npm run build` passes with zero errors.

---

## Issue 2 Fix — Modal scroll layout

Restructured `DesignAgentForm.tsx` outer overlay from `flex items-center justify-center` to `overflow-y-auto` with inner `flex min-h-full items-end sm:items-center justify-center` centering wrapper and `my-auto` on the modal div — modal now scrolls when taller than the viewport instead of overflowing off-screen.

[CA | 10:30] Issue 2 Fix delivered — modal scroll layout applied, `tsc --noEmit` clean on component file.

---

## Keyword DB Search — Historical Context Wire-up

**What:** Wired keyword + date range filtering into the chat historical context fetch so messages like "find all protein bars last week" hit the DB with BOTH a keyword filter AND the date range — instead of fetching up to 200 most-recent logs and hoping the relevant entry appears.

**Files changed:**
- `src/lib/db/logs.ts`
- `src/app/api/chat/route.ts`

**Changes in `logs.ts`:**
- Added `startDate?: string` and `endDate?: string` optional params to `searchLogsByFieldText`.
- Builds the Supabase query incrementally: base `.ilike('fields::text', ...)` first, then conditionally chains `.gte('logged_at', ...)` and `.lt('logged_at', ...)` when dates are provided. `endDate` receives `+1 day` treatment matching `getLogsForDateRange` pattern.

**Changes in `route.ts`:**
- Added `searchLogsByFieldText` to the import from `@/lib/db/logs`.
- Added `extractSearchKeyword` helper before the `POST` handler — strips time expressions, verb phrases, and filler words from the message, returns a 2+ character keyword or `null`.
- Replaced the single `getLogsForDateRange(...)` call at the bottom of the `hasHistoricalIntent` block with a conditional: if `extractSearchKeyword` returns a keyword, calls `searchLogsByFieldText(keyword, supabase, trackersMini, 100, rangeStart, rangeEnd)`; otherwise falls back to `getLogsForDateRange`.

**Validation:** `npm run lint` — zero new errors/warnings. `npm run build` — clean compile, 20/20 static pages generated. Pre-existing warnings in `ChatInterface.tsx` unchanged.

[CA | 17:19] Keyword DB search wire-up delivered — `npm run build` passes with zero errors.

---

## Tracker Page — Search Bar, Date Range Filter, Log Again Button

**What:** Three-part feature: (1) search + date range filtering in `TrackerHistoryView`, (2) "Log Again" button in `LogEntryCard` that stores a sessionStorage payload and routes to `/chat`, (3) auto-send detection in `ChatInterface` on mount that reads the payload and fires `handleSendSilent`.

**Files changed:**
- `src/components/trackers/TrackerHistoryView.tsx`
- `src/components/trackers/LogEntryCard.tsx`
- `src/components/chat/ChatInterface.tsx`

**TrackerHistoryView changes:**
- Added `Search` to lucide-react import.
- Added `useState` for `searchQuery`, `dateFrom`, `dateTo`.
- Defined `filteredLogs` array (date range + case-insensitive JSON field search) — computed before `groupLogsByDate`.
- `groups` now derives from `filteredLogs` instead of raw `logs`.
- Added search input + date From/To inputs + conditional Clear button + result count `<p>` between the Log Entry button and the history list.
- Updated `<LogEntryCard>` call-sites to pass `trackerId`, `trackerName`, `trackerColor` props.

**LogEntryCard changes:**
- Added `RotateCcw` to lucide-react import; added `useRouter` from `next/navigation`.
- Added `trackerId`, `trackerName`, `trackerColor` to `Props` type.
- Destructured `trackerId`, `trackerName` in function signature (`trackerColor` declared in Props for API completeness but unused in render — not destructured to satisfy ESLint).
- Added `handleLogAgain()`: builds field summary string from schema labels, writes `yaha_log_again` to sessionStorage, calls `router.push('/chat')`.
- Added `<RotateCcw>` button before the Pencil button in the default (non-editing, non-confirmDelete) button group. Order: RotateCcw · Pencil · Trash.

**ChatInterface changes:**
- Added `useEffect([], [])` after the hydration effect that reads `yaha_log_again` from sessionStorage, clears it immediately, and calls `handleSendSilent(autoMessage)` after a 400ms delay to let the new session initialise.

**Validation:** `npm run lint` — only pre-existing warnings (`ChevronRight`, `isAutoPrompting` in ChatInterface). `npm run build` — clean, zero errors, 20/20 static pages.

[CA | 17:45] Part 1+2+3 delivered — build clean, zero new lint warnings.
