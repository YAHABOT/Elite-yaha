# Session 2026-05-31 — Bug Fixes: EX11 (Header Unpin) + SC2 (Routine Wrong Tracker Fields)

**Status:** COMPLETE ✓  
**Branch:** feat/mvp-build  
**Previous Build Status:** v32 COMPLETE (2026-05-27)

---

## Tasks Completed

### [T-1] EX11 v1 — Body Scroll Prevention (carry-over from previous session)
**What:** Root layout html/body had `min-h-screen` with no overflow constraint. iOS/Android could scroll the body itself, dragging chat header and input bar off-screen.  
**Fix:** Added `h-full overflow-hidden overscroll-none` to body, `h-full` to html in `src/app/layout.tsx`  
**Commits:** `621b65b`  
**Result:** Deployed. User tested → FAILED on Android Chrome (window-level scroll, not body scroll, was the cause)

---

### [T-2] SC2 — Routine Step Action Card Shows Wrong Tracker Fields
**Root cause:** During End Of Day routine Step 2 (Notes tracker), Gemini was hallucinating the Overview tracker's UUID as `trackerId` but writing `trackerName: "Notes"`. `buildSanitizedActions` found the Overview tracker by UUID → rebuilt `fieldLabels` from Overview schema → card showed Overview fields (Weight, Steps, etc.) under "Notes" title. Step advancement check also failed (UUID mismatch → `hasLoggedCurrentStep = false`) → auto-prompt for next step never fired (SC1 symptom).

**Fix A — prompt-builder.ts:** Inject explicit field IDs + labels into the JSON format template so Gemini sees actual `fld_*` keys, not generic `"fieldId": value` placeholders. Added `fieldsJsonTemplate` and `fieldLabelsJsonTemplate` builders from tracker schema.

**Fix B — route.ts:** Server-side safety net: if AI produces LOG_DATA with wrong `trackerId` but `trackerName` matches the current routine step name, correct the UUID before schema lookup and advancement check.

**Files:** `src/lib/ai/prompt-builder.ts`, `src/app/api/chat/route.ts`  
**Commits:** `39fe6f1`  
**Verdict:** PASS (deployed, user confirmed routine flow working)

---

### [T-3] EX11 v2 — Android Chrome Header/Input Unpin (real fix)
**Root cause:** `overflow: hidden` on body only prevents body-element scroll. Android Chrome triggers window-level scroll from touch events chaining up from the messages `overflow-y-auto` container. This window scroll is not blocked by body overflow.

**Fix:** Changed `(app)/layout.tsx` outer div from `h-dvh overflow-hidden` to `fixed inset-0 overflow-hidden`. `position: fixed; inset: 0` pins the shell to exact viewport bounds — body has zero content in document flow → `window.scrollY` cannot move → header/input structurally cannot unpin. Also reverted html/body `h-full` (no longer needed).

**Files:** `src/app/(app)/layout.tsx`, `src/app/layout.tsx`  
**Commits:** `ab9d46b`  
**Verdict:** User confirmed "seems fine for now" ✓

---

## Commits This Session
| Hash | Description |
|------|-------------|
| `621b65b` | fix(layout): lock html/body height to prevent iOS body scroll (EX11 v1) |
| `39fe6f1` | fix(routine): prevent AI from hallucinating wrong tracker fields in step action cards (SC2) |
| `ab9d46b` | fix(layout): use fixed inset-0 on app shell to prevent window scroll on Android (EX11 v2) |

---

## Known Issues / Next Session Carry-Over
- SC1 (routine step 2 not auto-prompted) was caused by SC2 trackerId mismatch → fixed as part of T-2. No separate fix needed.
- Code Review and QA agents NOT run this session (user-reported bugs required immediate hotfixes). Consider CR + QA sweep next session.
- Applied Learning: `[EX11] overflow:hidden on body doesn't block Android window scroll → use fixed inset-0 on app shell (date: 2026-05-31)`
