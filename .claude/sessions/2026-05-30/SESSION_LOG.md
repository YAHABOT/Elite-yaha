# Session 2026-05-30 — V31 Bug Sweep + Post-Fix Iterations

**Status:** COMPLETE ✓ (back-filled 2026-05-31 — session ran out of context)  
**Branch:** feat/mvp-build  
**Previous Build Status:** v32 theme + auth fix (2026-05-27)

---

## Overview

Full V31 QA report bug sweep in a single Coding Agent dispatch, followed by three rounds of post-fix based on live user testing. 4 commits total, 19 files touched, 13 named EX bugs closed.

---

## Tasks Completed

### [T-1] V31 Bug Sweep — 13 EX Fixes + BUG-V32 (f1ccf10)

**Commit:** `f1ccf10` — `Fix: V31 bug sweep — EX2/4/6/8/10/12/13/15/20/23/24/26/29/31 + P2-2.6`

| Bug | Description | File(s) |
|-----|-------------|---------|
| EX2 | Remove 7PM End Day time gate (banner shows whenever session active) | `DashboardClient.tsx` |
| EX4 | Add SELECT field support (dropdown + chips) to manual LogForm | `LogForm.tsx` |
| EX6/EX20 | Fix routine auto-advance — empty string caused 400 → now sends `'continue'` | `route.ts`, `ChatInterface.tsx` |
| EX8/EX10 | Add Rule 22/23: no fabrication under pressure, no gaslighting | `prompt-builder.ts` |
| EX12 | No action card before user provides data (EX12 exception in MANDATORY OUTPUT RULE) | `prompt-builder.ts` |
| EX13 | WidgetCard responsive font (`text-2xl/md:text-3xl`) + overflow protection | `WidgetCard.tsx` |
| EX15/EX26 | Rule 22 anti-gaslighting; weekday pattern + weekday-aware date range in route.ts | `route.ts`, `prompt-builder.ts` |
| EX23/EX24 | Prominent `[LOG_ID: xxx]` format + UPDATE_DATA rule instruction | `prompt-builder.ts` |
| EX29 | Historical context fetched during routines (same-as-yesterday support) | `route.ts`, `prompt-builder.ts` |
| EX31 | Duration output → decimal hours throughout routine prompt | `prompt-builder.ts` |
| P2-2.6 | Journal TrackerDayGroup text/select fields span full width | `TrackerDayGroup.tsx` |
| BUG-V32-5 | Populate `fieldDefinitions` server-side for ActionCard layout decisions | `route.ts`, `ActionCard.tsx` |
| Double-send | Remove `onConfirmed` routine handler (shouldAutoPromptNextStep is now primary) | `ChatInterface.tsx` |

**Files:** 11 files, 248 insertions / 103 deletions

---

### [T-2] Post-Fix Round 1 — Live User Testing Corrections (98ead97)

**Commit:** `98ead97` — `fix(v32-post): EX2 revert, EX15/EX26 weekday detection, EX31 duration, P2-2.6 grid`

| Item | What changed |
|------|-------------|
| EX2 REVERT | Restore 7PM time gate — user wanted End Day banner only after 19:00. T-1 removal was wrong. |
| EX15/EX26 | Add weekday pattern to `HISTORICAL_INTENT_PATTERNS`; weekday-aware date range ("last friday" → actual date) |
| EX31 | Context-aware duration rule: `hrs` unit → decimal hours, `mins` unit → decimal minutes |
| format.ts | Add `mins`/`min` unit → M:SS display (e.g. 4.05 → "4:03"). isDurationMins branch added. |
| P2-2.6 / BUG-V32-5 | Fix ActionCard + LogEntryCard grids: explicit `grid-cols-2` + `col-span-2`; text/select span full width |
| EX3 label | `LogEntryCard` strips parenthetical unit suffixes from legacy labels ("Magnesium Citrate (g)" → "Magnesium Citrate") |

**Files:** 6 files, 92 insertions / 45 deletions

---

### [T-3] Post-Fix Round 2 — Message Order + Date History + Tracker Layout (f5ecc58)

**Commit:** `f5ecc58` — `fix(v32-post2): message order, specific-date history, tracker header layout`

| Item | What changed |
|------|-------------|
| Message order | `getMessages` returned DESC (newest-first); UI expected ASC. Fixed: reverse to ASC before return, keep DESC for cursor pagination efficiency |
| New-chat poll | `ChatInterface` poll-stop check updated to check last array item (newest in ASC), not index 0 |
| Absolute date patterns | Added "23rd may", "may 23rd" etc. to `HISTORICAL_INTENT_PATTERNS`; full day/month parser with year-rollback |
| TrackerHistoryView | Header redesign: title + icon in row, LOG ENTRY button full-width below. Prevents long tracker names pushing button off-screen |

**Files:** 4 files, 77 insertions / 42 deletions

---

### [T-4] Post-Fix Round 3 — Historical Data Completeness + Single-Day Lookup (f0e98fb)

**Trigger:** User reported chat hanging indefinitely on "what did i eat on 23rd may?" — AI showed 4 of 9 items.

**Commit:** `f0e98fb` — `fix(chat): absolute date lookup fetches single day + show all historical items`

| Root Cause | Fix |
|-----------|-----|
| `rangeEnd = today` on absolute dates → 7-day window → Gemini prompt bloat → hang | `rangeEnd = rangeStart` (single day only) |
| `MAX_HISTORICAL_TOKENS = 800` → 3200 chars → cut off at entry 4 | Raised to 4000 (16,000 chars) |
| `slice(-30)` cap → only 30 oldest logs passed to prompt builder | Raised to `slice(-200)` |
| No instructions to AI to list ALL items | Added COMPLETENESS + FORMAT rules to HISTORICAL DATA section |
| Macro display didn't match bold pipe format | Added FORMAT RULE: `**Xkcal \| Xg P \| Xg C \| Xg F**` |

**Files:** 2 files, 10 insertions / 6 deletions

---

## Commits This Session
| Hash | Description | Time |
|------|-------------|------|
| `f1ccf10` | V31 bug sweep — 13 EX bugs + P2-2.6 + BUG-V32-5 | 15:10 |
| `98ead97` | Post-fix 1 — EX2 revert, weekday detection, duration, grid fixes | 18:57 |
| `f5ecc58` | Post-fix 2 — message order, date history, tracker header | 21:09 |
| `f0e98fb` | Post-fix 3 — single-day lookup, historical completeness | 21:39 |

---

## Carry-Over to 2026-05-31
- EX11 (header/input unpin on scroll) — partially addressed by previous work, full fix needed
- SC1 (routine step 2 not auto-prompted after step 1 logged) — root cause not yet identified
- SC2 (routine action card showing wrong tracker fields) — not yet diagnosed
- Session ran out of context mid-work; summary handed off to 2026-05-31 session
