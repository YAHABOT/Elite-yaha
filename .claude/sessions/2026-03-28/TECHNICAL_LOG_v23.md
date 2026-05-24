# TECHNICAL LOG v23 — Bug Fix Sprint (V23)

**Date:** 2026-03-28
**Build:** V23
**Scope:** 12-priority bug fix pass across chat, AI pipeline, file uploads, UI layout

---

## P1 — CRITICAL: Agent system prompt stripping YAHA capabilities

**File:** `src/app/api/chat/route.ts` lines 251-255 (post-fix)

**Root cause confirmed:** When `activeAgent` was set, `systemPrompt = activeAgent.system_prompt` replaced the entire YAHA health prompt. The agent's raw prompt had no vision block, no tracker schema, no DB preamble, and no mandatory JSON output rule. This made agents unable to view images or produce LOG_DATA action cards.

**Fix applied:**
```typescript
const yahaSection = buildHealthSystemPrompt({ trackers, date, userContext: brainContext, dayLogs })
systemPrompt = `${activeAgent.system_prompt}\n\n---\n## YAHA HEALTH LOGGING CAPABILITIES\n${yahaSection}`
```

Agent personality stays on top; full YAHA health logging section (vision, DB rules, tracker schema, mandatory JSON output) is appended below. Agents retain personality/focus AND can now see photos and produce valid action cards.

**Status:** FIXED

---

## P2 — CRITICAL: MIME type mismatch crashes file uploads

**Files:** `src/app/api/chat/route.ts` and `src/lib/ai/gemini.ts`

**Root cause confirmed:** `route.ts` ALLOWED_MIME_TYPES included `text/plain`, `text/csv`, `docx`, `xlsx`, `xls`. `gemini.ts` ALLOWED_MIME_TYPES only had images/audio/pdf. When a .txt or .csv file passed validation in route.ts, it reached gemini.ts which threw `"Unsupported attachment MIME type"`. Additionally, Office formats (docx/xlsx/xls) are not supported by Gemini's inlineData API at all.

**Fix applied:**
- `route.ts`: removed docx/xlsx/xls from ALLOWED_MIME_TYPES; added comment linking to gemini.ts for sync awareness
- `gemini.ts`: added `text/plain` and `text/csv` to ALLOWED_MIME_TYPES; added comment linking to route.ts
- `ChatInterface.tsx`: updated ACCEPTED_FILE_TYPES constant from `.txt,.pdf,.docx,.xlsx,.xls,.csv,...` to `.txt,.pdf,.csv,application/pdf,text/plain,text/csv`
- `MobileChatHome.tsx`: updated ACCEPTED_FILE_TYPES from `.txt,.pdf,.docx,.xlsx,.xls,.csv` to `.txt,.pdf,.csv`

Both sides now accept exactly: images, audio, PDF, text/plain, text/csv. No mismatch possible.

**Status:** FIXED

---

## P3 — Food/health logging action card (V22 backtick escaping)

**File:** `src/lib/ai/prompt-builder.ts`

**Verification:** Read the entire file. Lines 190-191:
```typescript
${CREATE_TRACKER_RULES}
${FEW_SHOT_EXAMPLES.replace(/{{TODAY}}/g, today)}
```
Both are correctly interpolated at the end of the `buildHealthSystemPrompt` return string. The backtick escaping in the template literal uses `\`` correctly throughout. The `buildRoutineSystemPrompt` also includes `GLOBAL_ANTI_HALLUCINATION_RULES` and `MULTI_FIELD_PROMPT_RULE` plus its own mandatory JSON output rule section.

The `{{TODAY}}` placeholder is replaced at line 156 via `.replace(/{{TODAY}}/g, today)` and at line 191 for FEW_SHOT_EXAMPLES.

**Status:** VERIFIED CORRECT — no change made

---

## P4 — ActionCard text truncation

**File:** `src/components/chat/ActionCard.tsx` line 203

**Root cause:** The `isLarge` check at threshold > 20 chars was too high. On a 375px phone in 2-column grid, each column is ~148px. Text fields like "Huda Beer (300ml)" (17 chars) didn't hit the threshold and stayed in a narrow column.

Additionally, fields with semantic labels (Item Name, Notes) always benefit from full width regardless of value length.

**Fix applied:** Lowered threshold to 15 chars AND added semantic label detection:
```typescript
const isLarge = String(value || '').length > 15
  || card.fieldLabels?.[key]?.toLowerCase().includes('name')
  || card.fieldLabels?.[key]?.toLowerCase().includes('item')
  || card.fieldLabels?.[key]?.toLowerCase().includes('notes')
```

Fields with values >15 chars and any "name/item/notes" field always get `col-span-2` for full width.

**Status:** FIXED

---

## P5 — Dashboard widget label truncation

**File:** `src/components/dashboard/WidgetCard.tsx` line 79

**Root cause:** The label `<span>` was inside `flex items-center gap-2 min-w-0`. The flex item (span) did NOT have `min-w-0` itself, which can cause overflow issues in flex layouts. More critically, there was no `break-words` class, so long single-word or tracked uppercase text couldn't wrap within the narrow flex container on 2-column grid cells.

**Fix applied:**
```jsx
<span className="min-w-0 text-[10px] font-black uppercase tracking-[0.15em] text-textMuted leading-tight break-words">
```
Added `min-w-0` (enables shrinking below content size) and `break-words` (allows line breaks within long labels).

**Status:** FIXED

---

## P6 — Attachment "File" option not showing on mobile

**Files:** `src/components/chat/MobileChatHome.tsx` and `src/components/chat/ChatInterface.tsx`

**Verification:** Both files have the popover with both "Attach Image" and "Attach File" buttons. Code is present.

**Root cause identified:** The issue is timing. `setIsAttachMenuOpen(false)` followed by `fileDocInputRef.current?.click()` in the same click handler fails on mobile: the menu close triggers a re-render that unmounts/remounts DOM elements before the programmatic `.click()` fires, so the file picker never opens.

**Fix applied:** Added `setTimeout(() => fileDocInputRef.current?.click(), 0)` in both files to defer the click until after the current render cycle completes.

MobileChatHome.tsx:
```typescript
onClick={() => {
  setIsAttachMenuOpen(false)
  setTimeout(() => fileDocInputRef.current?.click(), 0)
}}
```

ChatInterface.tsx: same pattern applied.

**Status:** FIXED

---

## P7 — Chat header and input bar scrolling on mobile

**Verification:** Read ChatInterface.tsx and layout.tsx.

- `layout.tsx` main element: `h-full overflow-hidden` — PRESENT (line 23)
- ChatInterface.tsx outer wrapper (line 467): `relative flex flex-1 min-h-0 flex-col overflow-hidden` — PRESENT
- ChatInterface.tsx header (line 533): `shrink-0` — PRESENT
- ChatInterface.tsx input area (line 772): `shrink-0` — PRESENT
- Messages area: `flex-1 overflow-y-auto` pattern intact

The flex column `shrink-0 header + flex-1 overflow-y-auto messages + shrink-0 input` chain is intact and correct.

**Status:** VERIFIED CORRECT — no change made

---

## P8 — MobileChatHome attach button and AgentSelector

**Verification:** Read MobileChatHome.tsx lines 469-506.

Left controls div (line 471): contains Paperclip button AND AgentSelector component. Both are present in the rendered input bar.

**Status:** VERIFIED CORRECT — no change made

---

## P9 — New chat homepage + button

**Verification:** Read `src/app/(app)/chat/page.tsx`.

- Empty sessions (desktop): "+ New Chat" Link at lines 44-50 — PRESENT
- Non-empty sessions (desktop): "+ New Chat" Link at lines 58-64 — PRESENT
- Mobile: `MobileChatHome` renders with input bar at bottom for starting new chats

**Status:** VERIFIED CORRECT — no change made

---

## P10 — Routine builder chip labels

**Verification:** Read `src/components/routines/RoutineForm.tsx` lines 264-285.

Chip button: `flex items-center gap-3 rounded-2xl border px-4 py-3`. No `max-w-` constraint, no `truncate`, no `overflow-hidden`. Container: `flex flex-wrap gap-3` at line 264 — chips wrap naturally. Label text (line 278): `text-[10px] font-black uppercase tracking-widest` — no truncation.

Chip labels should display in full. The button has no width constraint.

**Status:** VERIFIED CORRECT — no change made

---

## P11 — Journal DayView V22 changes

**Verification:** Read `src/components/journal/DayView.tsx`.

1. Header div (line 180): `sticky top-0 z-10` — PRESENT
2. Mobile hamburger (lines 183-190): `md:hidden` class — PRESENT
3. Mobile drawer (line 133): `z-40` — PRESENT
4. View + Correlator buttons in drawer (lines 146-157) — PRESENT
5. Desktop-only buttons (lines 208-220): `hidden md:flex` — PRESENT

All V22 journal changes are correctly implemented in the file.

**Status:** VERIFIED CORRECT — no change made

---

## P12 — Settings logout button

**Verification:** Read `src/components/settings/SettingsForm.tsx` lines 291-299.

Logout section present:
```jsx
<form action={signOut}>
  <button type="submit" className="group flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-red-400/70 ...">
    <LogOut className="h-4 w-4 ..." />
    Sign Out
  </button>
</form>
```

`signOut` is imported from `@/app/actions/auth`. `LogOut` icon is imported from lucide-react at line 25.

**Status:** VERIFIED CORRECT — no change made

---

## Validation

```
npm run lint   → warnings only, zero errors
npm run build  → EXIT 0, 26 routes compiled
```

Build output: all routes compiled successfully including `/api/chat`, `/chat`, `/chat/[sessionId]`, `/dashboard`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | P1: combined agent+YAHA prompt; P2: removed Office MIME types |
| `src/lib/ai/gemini.ts` | P2: added text/plain and text/csv to ALLOWED_MIME_TYPES |
| `src/components/chat/ChatInterface.tsx` | P2: updated ACCEPTED_FILE_TYPES; P6: setTimeout for file doc input click |
| `src/components/chat/MobileChatHome.tsx` | P2: updated ACCEPTED_FILE_TYPES; P6: setTimeout for file doc input click |
| `src/components/chat/ActionCard.tsx` | P4: lowered isLarge threshold to 15 + semantic label detection |
| `src/components/dashboard/WidgetCard.tsx` | P5: added min-w-0 + break-words to label span |

---

**Agent Signature:** Coding Agent | 2026-03-28 16:13
