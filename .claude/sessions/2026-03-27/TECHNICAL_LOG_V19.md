# Technical Log — Build 19

<details>
<summary><strong>Coding Agent — Build 19</strong> | 2026-03-27 09:25</summary>

## Problem Statement

Three runtime issues addressed in this build:

1. **Mobile safe area padding** — On iOS/Android with gesture navigation, `MobileBottomNav` grows taller than the static `pb-16` (64px) on `<main>` because it adds `env(safe-area-inset-bottom)` to its own height. The result: the bottom 24–34px of the chat input bar is hidden behind the nav. Fix applied at three layers: `<main>`, `ChatInterface` input bar, `MobileChatHome` input bar.

2. **ActionCard text truncation** — Field values were always rendered inside `<input type="text">`, a single-line element that clips long text. Long entries like "Today is a rest day." were visually cut off. Fix: split into two branches — `<p>` for view mode (wraps), `<input>` for edit mode only.

3. **AI no-match hallucination** — `GLOBAL_ANTI_HALLUCINATION_RULES` Rule 2 had no explicit "do not log" instruction when no tracker field matched the input. Rule 9 added as a complete no-match protocol. Rule 2 also strengthened with a direct prohibition.

Additionally, two future enhancement items were documented in `FUTURE_ENHANCEMENTS.md`.

## Files Changed

- `src/app/(app)/layout.tsx` (line 23) — replaced `pb-16` with `pb-[calc(4rem+env(safe-area-inset-bottom,0px))]`; `md:pb-0` preserved so desktop is unaffected
- `src/components/chat/ChatInterface.tsx` (line 641) — replaced `p-4 md:p-5` with `px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:p-5 md:pb-5`; belt-and-suspenders fix for the input bar
- `src/components/chat/MobileChatHome.tsx` (line 353) — replaced `p-4` with `px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`; same pattern as ChatInterface
- `src/components/chat/ActionCard.tsx` (lines 223–229) — replaced single `<input>` with conditional render: `<input>` when `isEditExpanded`, `<p className="... break-words whitespace-pre-wrap">` when not; empty values render an em-dash in muted style
- `src/lib/ai/prompt-builder.ts` (lines 66, 73) — strengthened Rule 2 with "do NOT generate a LOG_DATA action" clause; added Rule 9 No-Match Protocol as a new rule in `GLOBAL_ANTI_HALLUCINATION_RULES`
- `FUTURE_ENHANCEMENTS.md` (appended) — added "Enter-to-Send Setting (Chat)" and "Food Bank (after food tracker ships)" sections with full implementation notes

## Why This Approach

**Safe area (three-layer fix):**
- `pb-[calc(4rem+env(safe-area-inset-bottom,0px))]` on `<main>` is the primary fix — it makes the scroll clearance exactly tall enough to clear the nav regardless of inset size
- The `0px` fallback means browsers without `env()` support get `4rem` = 64px, identical to the previous `pb-16`
- `md:pb-0` after it in the class list means Tailwind's desktop breakpoint still wins — zero regression on desktop
- `viewport-fit=cover` was already present in `src/app/layout.tsx` via `viewportFit: 'cover'` in the `viewport` export — no change needed
- Belt-and-suspenders padding on the input bars themselves ensures the input content is never underneath any inset even if a child component creates an unexpected stacking context

**ActionCard `<p>` vs `<input>` branch:**
- Only the value element changes — the label span, unit badge, container div, and `col-span-2` logic for `isLarge` are untouched
- `whitespace-pre-wrap break-words` ensures multi-line text values and long single words both wrap correctly
- The empty-value em-dash matches the placeholder styling used in edit mode (`text-muted-foreground/20`)
- Edit mode keeps `<input>` unchanged — no behaviour regression

**Rule 9 (No-Match Protocol):**
- Placed after Rule 8 as Rule 9 so existing rule numbers are preserved
- Explicitly names the two correct fallback behaviours: tell the user what's available, OR suggest creating a new tracker
- Repeats the trackerId/fieldId prohibition already in Rule 7 — intentional redundancy for emphasis at the decision point
- Does not touch `FEW_SHOT_EXAMPLES`, `MULTI_FIELD_PROMPT_RULE`, `buildHealthSystemPrompt`, or Response Rules

## Build Verification

```
$ npm run lint && npm run build

next lint — warnings only (all pre-existing, none introduced by B19)
next build — EXIT 0

Route (app)                                 Size  First Load JS
... (26 routes compiled)
✓ Generating static pages (20/20)
```

All 26 routes compiled. No new type errors. No lint errors introduced.

**Agent Signature:** Coding Agent | 2026-03-27 09:25

</details>

<details>
<summary><strong>Code Reviewer — Code Quality Review</strong> | 2026-03-27 10:15</summary>

## Files Reviewed

- `src/app/(app)/layout.tsx` ✓ PASS
- `src/components/chat/ChatInterface.tsx` ⚠ PASS WITH NOTES
  - Line 641: `md:p-5 md:pb-5` — `md:p-5` already sets all four sides to 1.25rem at desktop; the trailing `md:pb-5` is redundant. Functionally harmless — both classes resolve to the same value — but adds unnecessary noise to the class string. Clean up in a follow-up.
- `src/components/chat/MobileChatHome.tsx` ✓ PASS
  - Note: component root carries `md:hidden` so the safe-area calc is never rendered on desktop — no regression risk.
- `src/components/chat/ActionCard.tsx` ✓ PASS
  - `isLarge` computed from `String(value || '').length > 20` before the branch — handles `null` correctly. `<p>` path renders em-dash span for empty/null/undefined. `<input>` path uses `value={value ?? ''}` correctly coercing `null`. TypeScript strict mode satisfied.
- `src/lib/ai/prompt-builder.ts` ⚠ PASS WITH NOTES
  - `GLOBAL_ANTI_HALLUCINATION_RULES` is injected into both `buildHealthSystemPrompt` and `buildRoutineSystemPrompt`. Rule 9 instructs "respond conversationally ONLY — no action card" when no tracker match is found. The routine prompt's `MANDATORY OUTPUT RULE` directly contradicts this with "ALWAYS append a JSON block... Even if ambiguous." The contradiction is model-dependent — the later, more-specific MANDATORY OUTPUT RULE likely wins in practice, so routine flow is unlikely to regress. But the conflict should be resolved explicitly: either exclude Rule 9 from `buildRoutineSystemPrompt` or add a carve-out clause ("this rule applies to health chat only; during routine execution, always follow the MANDATORY OUTPUT RULE").

## Additional Notes

**`viewport-fit=cover` confirmed:** `src/app/layout.tsx` exports `viewportFit: 'cover'` in the `viewport` constant. `env(safe-area-inset-bottom)` will activate correctly on iOS Safari and Android Chrome for all three patched files.

**Pre-existing issue (out of B19 scope):** `buildHealthSystemPrompt` contains `## CURRENT DAY ACTIVITY ({{TODAY}})` as a literal string — the `{{TODAY}}` placeholder is never replaced in this section (only the imported constant strings receive `.replace()`). Worth a separate fix.

## Verdict: **PASS WITH NOTES**

Neither note blocks QA testing. Recommended follow-up in B19.1 or next cleanup build:
1. Remove redundant `md:pb-5` from `ChatInterface.tsx` line 641
2. Add a carve-out to Rule 9 so it does not conflict with the routine `MANDATORY OUTPUT RULE`

**Agent Signature:** Code Reviewer | 2026-03-27 10:15

</details>

<details>
<summary><strong>QA Agent — Build 19 Test Results</strong> | 2026-03-27 11:45</summary>

## Test Results (from user report)

### Passing Tests
- [x] **SC1** — Chat header stays pinned when scrolling messages — **PASS** ✓
- [x] **SC2** — Chat input stays pinned above bottom nav — **PASS** ✓
- [x] **SC3** — `/chat` home top bar stays pinned when scrolling session list — **PASS** ✓
- [x] **SC5** — AI responds conversationally when no tracker matches user's request, no action card — **PASS** ✓
- [x] **SC6** — Regression: normal health log (Notes tracker) still generates action card — **PASS** ✓
- [x] **SC7** — Desktop layout: no extra bottom padding — **PASS** ✓ (verified on desktop resize 1280x800)

### Failing Tests
- [ ] **SC4** — Action card text field truncation — **FAIL** (partial)
  - Issue: Long text values wrap but field input is width-constrained. The note "This is a test to see if this function is working well or not" wraps to 3 lines instead of filling the full box width.
  - Root cause: ActionCard input element likely has `max-w-[...]` constraint or the container is too narrow.
  - Fix required: Input should use `w-full` to expand to container width, allowing text to wrap naturally across the full field width.

## Build 19 Assessment

**Status:** Testing Complete — Full Report
**Verdict:** PASS WITH ONE KNOWN ISSUE

6 of 7 test criteria passed. SC4 (text field width) needs adjustment for B19.1 fix. The safe area fix (Fix 1) works cross-platform; ActionCard branching works (view vs edit modes); AI no-match protocol works without regression.

**Issues for B19.1:**
1. ActionCard input field width — remove width constraints so text fills box width
2. Code Reviewer notes (non-blocking):
   - Redundant `md:pb-5` in ChatInterface line 641 (cleanup)
   - Rule 9 carve-out for routine execution (add comment clarifying routine precedence)

**Agent Signature:** QA Agent | 2026-03-27 11:45

</details>
