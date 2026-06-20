# Technical Log V20.1 — Build 20.1 (Code Reviewer Fixes)

**Date:** 2026-03-27
**Branch:** feat/mvp-build
**Build:** 20.1 — Three targeted fixes from Code Reviewer findings

---

## Changes

### Fix 1 — `src/lib/ai/prompt-builder.ts` (line 105)

**Issue:** The `buildHealthSystemPrompt` function contained a literal `{{TODAY}}` placeholder in the "CURRENT DAY ACTIVITY" section header. Unlike the rest of the function, this string was not being interpolated — the placeholder was emitted verbatim to Gemini.

**Change:** Replaced `{{TODAY}}` with `${today}` so the section header uses template literal interpolation, consistent with the rest of the function and with `buildRoutineSystemPrompt`.

---

### Fix 2 — `src/app/api/chat/route.ts` (lines 337-343)

**Issue:** The catch block in the `POST` handler returned `details: errorStack` (the full `Error.stack`) in the JSON response body. This exposes internal file paths and stack frames to the client — an information-disclosure vulnerability.

**Change:** Removed the `const errorStack` declaration and the `details: errorStack` field from the response. The `error: errorMessage` field and `console.error` line are preserved.

---

### Fix 3 — `src/components/chat/ChatInterface.tsx` (lines 156-160)

**Issue:** `handleSendSilent` — used for routine auto-advance — called `fetch('/api/chat', ...)` without a `signal`. This means if the component unmounts or the user navigates away, the in-flight request cannot be cancelled, leading to potential state updates on an unmounted component.

**Change:** Added `signal: abortControllerRef.current?.signal` to the fetch options object. `abortControllerRef` already exists in the component (declared at line 72) and is used by `handleSendInternal` and the image-send handler — this fix brings `handleSendSilent` into alignment.

---

## Validation

```
npm run lint   — exit 0 (warnings pre-existing, no new errors)
npm run build  — exit 0 (20 routes compiled successfully)
```

---

**Agent Signature:** Coding Agent | 2026-03-27 14:10

<details>
<summary><strong>Code Reviewer — Build 20.1 Review</strong> | 2026-03-27 19:15</summary>

## Files Reviewed

- `src/lib/ai/prompt-builder.ts` ✓ PASS — `${today}` interpolation confirmed at line 105; remaining `{{TODAY}}` literals in module constants are intentional and correctly processed by `.replace()` at call time
- `src/app/api/chat/route.ts` ✓ PASS — `details: errorStack` absent from 500 response; only `error: errorMessage` remains; server-side `console.error` intact
- `src/components/chat/ChatInterface.tsx` ✓ PASS — `signal: abortControllerRef.current?.signal` present in `handleSendSilent`; optional chaining correct; shared-signal behaviour with primary controller is safe given call site

## Verdict: **PASS**

All three fixes verified correct and complete. No collateral changes. No new issues.

**Agent Signature:** Code Reviewer | 2026-03-27 19:15

</details>

<details>
<summary><strong>QA Agent — Test Results Build 20</strong> | 2026-03-27 19:45</summary>

## Test Results

| # | Test | Result | Notes |
|---|------|--------|-------|
| SC1 | ActionCard long text fills full box width | ✗ FAIL | Text still truncated on device — carry-over from B19.1 and B20, root cause not yet resolved |
| SC2 | Dashboard widget labels not truncated | ✗ FAIL | Titles still clipping with ellipsis — `truncate` removal did not take effect on device |
| SC3 | Paperclip → Image/File split; txt/pdf/docx accepted | ✗ FAIL | No split shown — button shows camera, voice recorder, photos/videos. No Files option. txt still rejected |
| SC4 | AI logs items without refusing | — | Not explicitly tested this round |
| SC5 | Send message, navigate away, return — no loss | ✗ FAIL | Message cancelled when user left app and returned. AbortController fix is too aggressive — aborting legitimate in-flight sends on component unmount |
| SC6 | Confirmed cards stay confirmed on return | — | Not explicitly tested this round |
| SC7 | "Log as one item" → single card with correct summed macros | ✓ PASS | Working correctly |
| SC8 | Routine trigger phrase starts in ~3 seconds | N/A | Test criteria was wrong — this is an agent trigger (e.g. "Neutral Protocol"), not a routine trigger. Different pipeline. Remove from future QA. |
| SC9 | Add Routine chips show full labels | ✗ FAIL | Still truncated — "W...", "ST...", etc. FIX-8 did not apply |
| SC10 | Add Tracker bottom CTA / Deploy Protocol top-right | ✗ FAIL | Button positions unchanged |

## New Critical Bug (reported with screenshots in this session)

**[CRITICAL] Image/multimodal pipeline completely broken**

User sent two photos of a food item (vegan snickers brownie) via the attachment button with message "estimate better". No AI response was generated. On follow-up ("Use the photos I just gave you to estimate better"), the AI responded: *"I apologize, but I don't have the ability to view or process images directly."*

This is a pipeline-level failure: uploaded images are NOT being passed to Gemini as multimodal `parts`. The Gemini API call is being made text-only — images are likely stored as URLs but never serialised into the `contents[].parts[]` array. Gemini only reads what is in the `parts` array; linked URLs are invisible to it.

**Severity:** CRITICAL — this breaks the core food logging use case (photo → AI estimate → action card).

## Screenshots
- NSC1 (this session) — User sent photos of brownie, zero AI response
- NSC2 (this session) — AI explicitly claiming "I don't have the ability to view or process images directly"

## Verdict: **FAIL**

6 of 10 tests failed. 1 new critical bug. SC7 pass. SC8 removed from scope (wrong test).

Per user direction: document all failures + new critical bug → pass to Main Agent → V21 task.

**Agent Signature:** QA Agent | 2026-03-27 19:45

</details>
