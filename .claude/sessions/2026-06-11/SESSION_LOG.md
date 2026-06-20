# Session Log — 2026-06-11

## ⚠️ Session Scope Note
**This chat (FleetView main):** User Guide / Onboarding chip work only — Tasks 7, 7b, 7c, 7d.
**Separate chat:** Correlator page + other component work (Tasks 8, 9, 10 above were logged from that session bleeding into this log). Do NOT mix changes — if something touches the correlator or unrelated components, that's the other chat's responsibility.

---

## Carry-In from 2026-06-10

**Prior session fixes deployed (full detail in `2026-06-10/technical_log_prior_fixes.md`):**
- 7-day avg denominator — window shift, today excluded from sum + denominator
- Sparkline day-shift — 7 real days shown, `trendDayOffset` aligns labels
- Duration sparkline labels — `H:MM` format, wider margin (was clipping to "22:00")
- This Week/Last Week aggregation chooser — Total vs Average toggle in Add/Edit Widget modal
- Wrong date logging (Agent Forge only) — attempted fix `loggingDate = today` — REGRESSED routines (see Task 1 below)
- File processing message — clean `"Processing X file(s)…"`
- Skip button — wired to `handleSendSilentRef`
- Food bank card title — `break-words` not `truncate`
- AI food bank proactive asking — explicit rule added to `FOOD_BANK_SAVE_RULE`
- Missing fields from screenshots — rule 15b COMPLETE FIELD EXTRACTION added
- Update Log broken — field enrichment, duration conversion, `upsertScoreForDate` (3 root causes fixed)

---

## Tasks This Session

### Task 1 — Logging Date Regression Fix
**Status:** ✅ DEPLOYED
**Problem:** Previous session applied `loggingDate = today` to fix Agent Forge logging to previous day. This broke routines — Start Day June 10, cross midnight to June 11, End Day not yet done → logs going to June 11 instead of June 10.
**Key clarification from user:**
- Regular chat → correct date ✅
- Routines → correct date ✅ (were NOT broken before the bad fix)
- Agent Forge only → previous day ❌ (original bug, still unresolved)
- All End Day routines were completed — no orphaned sessions
**Fix:** Reverted `src/app/api/chat/route.ts` line ~310 to `const loggingDate = finalActiveDayState?.date ?? today`
**Known gap:** Agent Forge date bug is unresolved. Investigate how `loggingDate` flows into the `activeAgent` branch vs `buildRoutineSystemPrompt`. Added to CLAUDE.md Known Gotchas.
**Do NOT:** Re-apply `= today` as the fix.

---

### Task 2 — Static Guide Page (`/settings/guide`)
**Status:** ✅ DEPLOYED (3 iterations)
**Files:**
- `src/app/(app)/(content)/settings/guide/page.tsx` — created
- `src/components/settings/SettingsForm.tsx` — added Help & Guide section (purple `BookOpen` row)

**v1:** Two method cards (Via Chat, Manual), field type pills at bottom
**v2 (user feedback):**
- Screenshot tip folded INTO Via Chat card (not a 3rd method — user clarified)
- AI disclaimer block (amber) added: go to Edit Schema, verify tracker type / field types / units
- Field type guide as table rows with descriptions

**v3 (user feedback):**
- Added Step 1: Save to Home Screen (iOS Safari + Android Chrome cards with steps)
- Create Your Trackers bumped to Step 2
- Coming Next teaser renumbered to 3–6

**Guide page structure (final):**
```
/settings/guide
├── Step 1 — Save to Home Screen
│   ├── iOS card (Safari → Share → Add to Home Screen)
│   └── Android card (Chrome → 3-dot → Install App)
├── Step 2 — Create Your Trackers
│   ├── Via Chat card (text prompts + screenshot tip)
│   ├── Manual card (5 steps + link to /trackers/new)
│   ├── AI disclaimer (amber — verify type/fields/units in Edit Schema)
│   └── Field type guide (Number, Duration, Time, Rating, Select, Multi-Select, Text)
└── Coming Next teaser (Steps 3–6, greyed out)
```

---

### Task 3 — Interactive Guide Research + Plan
**Status:** ✅ RESEARCH COMPLETE — plan saved, pending user approval to build
**Research finding:** Static guide pages have <15% completion. Persistent floating chip + bottom sheet checklist is the correct format (Loom, Duolingo, Superhuman model).
**Plan saved to:** `2026-06-10/INTERACTIVE_GUIDE_PLAN.md`

**Proposed architecture:**
- Floating chip bottom-right above nav — circular progress ring (N/6)
- Tap → bottom sheet with 6-step checklist
- Steps: collapsed (icon + name + check/chevron) / expanded (looping GIF + 2 sentences + CTA)
- Completed: muted, cyan checkmark. Active: cyan left border.
- Chip disappears when all 6 done or explicitly dismissed

**6 steps:**
1. Save to Home Screen (manual "mark done")
2. Log first health entry (auto: first ActionCard confirmed)
3. Create first tracker (auto: first tracker saved)
4. Add dashboard widget (auto: first widget saved)
5. Set up daily routine (auto: first routine created)
6. Connect Telegram — optional (auto: connected or skipped)

**DB strategy:** Derive steps 2–5 from existing tables (no migration). Steps 1 + 6 + dismissed flag stored in `users.stats` JSONB (already exists).
**Progressive unlock:** Steps 1–2 day 1, steps 3–4 after first log, steps 5–6 after day 3. OR all visible day 1. User hasn't decided yet.

**5 open questions for next session:**
1. Progressive unlock (A) or all visible day 1 (B)?
2. GIFs now or static screenshots as placeholder?
3. Step order correct?
4. Chip position — bottom-right above nav or elsewhere?
5. Completion celebration — subtle cyan pulse or something more?

---

### Task 4 — Session Logging (Retroactive)
**Status:** ✅ COMPLETE
**Created:**
- `2026-06-10/SESSION_LOG.md`
- `2026-06-10/MEMORY.md`
- `2026-06-10/technical_log_v1.md` (guide page)
- `2026-06-10/technical_log_prior_fixes.md` (11 fixes from compacted session — corrected to remove wrong "orphaned session" explanation)
- `2026-06-10/INTERACTIVE_GUIDE_PLAN.md`

**Correction made:** Initial log wrongly stated the date bug was caused by an orphaned session from June 8. User clarified: all End Days completed, no orphaned sessions. Bug was Agent Forge only. Corrected in both logs and CLAUDE.md.

---

### Task 5 — Day Start Warning Modal
**Status:** ✅ DEPLOYED
**File:** `src/components/routines/RoutineForm.tsx`
**Trigger:** User selects "Day Start" from the Sequence Type dropdown
**Behaviour:**
- Full-screen amber overlay slides up (fixed, z-50, backdrop-blur)
- Explains: Day Start opens a session that owns all log dates until Day End closes it
- Explains: Without Day End, session stays open forever — logs pile into same date
- Explains: Day End doesn't need any steps — create it blank, skip it in chat
- "I Understand — Continue" button → sets type to day_start and dismisses modal
- Selecting Standard or Day End directly → no modal
- Modal fires again if user switches away and back to Day Start

**Context:** Added after user asked what happens if someone creates Start Day but no End Day. Answer: system gets stuck. End-only is fine (just marks the day ended). Start-only without End = session never closes.

**Known gap (still open):** No auto-expiry for sessions that somehow get stuck. If a session stays open unexpectedly, logs pile into the wrong date. Long-term fix: auto-expire sessions where `date < today` by more than 1 day.

---

### Task 6 — Correlator Numeric Literals
**Status:** ✅ DEPLOYED
**File:** `src/components/journal/CorrelatorModal.tsx`
**What:** Each formula row now has a [Field] [#] toggle. Switching to # replaces the tracker dropdown with a plain number input. Allows formulas like `field_a + 5`, `field_a * 0.453592`, `100 - field_b`.
**Changes:**
- `VariableRow` type: added `rowType: 'field' | 'constant'` + `constantValue: string`
- `buildFormula`: handles constant rows → `{ type: 'constant', value: number }` nodes
- `formulaToRows`: handles constant nodes when loading saved correlators
- `toggleRowType()`: clears field/constant values when switching between modes
- UI: `[Field][#]` pill toggle per row; `#` mode shows `<input type="number">`
- Note: `FormulaNode` type already had `{ type: 'constant' }` — just never exposed in UI

**Pending:** Correlator suggestions feature — discuss WHERE (modal, journal, chat) and HOW (heuristic vs AI) before building.

---

### Task 7 — Interactive Onboarding Guide (Framework)
**Status:** ✅ FRAMEWORK DEPLOYED — content/screenshots pending

**Approved spec (2026-06-11):**
- Floating chip: top-right, draggable (position saved to localStorage), disable toggle in Settings
- 10 steps (revised order from user)
- Progressive unlock: Group 0 always → Group 1 after step 2 → Group 2 after step 3 → Group 3 after steps 5–7 all done
- Completion: confetti burst + full-screen "You know YAHA!" moment
- Media: static screenshot placeholders now — **GIFs deferred (pipeline item, not forgotten)**

**10 steps + auto-complete:**
| # | Step | Completes via |
|---|------|---------------|
| 1 | Save to Home Screen | Manual "Mark as done" |
| 2 | Set up your Trackers | Derived: `trackers` count > 0 |
| 3 | Log your first entry | Derived: `tracker_logs` count > 0 |
| 4 | Explore the Journal | First journal page visit (client-side flag) |
| 5 | Use the Correlator | Manual "Mark as done" |
| 6 | Set up a Routine | Manual "Mark as done" |
| 7 | Set your Targets | Derived: `users.targets` length > 0 |
| 8 | Explore Food Bank | Manual "Mark as done" |
| 9 | Meet your Agents | Manual "Mark as done" |
| 10 | Build your Dashboard | Derived: `dashboard_widgets` count > 0 |

**Unlock groups:**
- Group 0 (always): Steps 1, 2
- Group 1 (after step 2 done): Steps 3, 4
- Group 2 (after step 3 done): Steps 5, 6, 7
- Group 3 (after steps 5+6+7 all done): Steps 8, 9, 10

**DB strategy:** Manual flags in `users.stats.onboarding` JSONB (no migration). Derived steps query existing tables at load.

**⏳ GIF note:** Screenshots are placeholders. Each step needs a 3–5 sec looping screen recording when ready. Assets slot: `public/onboarding/step-N.gif`. Step definitions file has a `gifs` field ready — swap in when recorded.

**Files created:**
- `src/lib/db/onboarding.ts` — `getOnboardingState()`, derives completion from existing tables
- `src/app/actions/onboarding.ts` — `markOnboardingStep`, `dismissOnboarding`, `restoreOnboarding`
- `src/components/onboarding/steps.ts` — 10 step configs (all content drafted)
- `src/components/onboarding/OnboardingChip.tsx` — draggable SVG progress ring
- `src/components/onboarding/OnboardingSheet.tsx` — bottom sheet, lock/active/complete states
- `src/components/onboarding/OnboardingComplete.tsx` — confetti + "You know YAHA!" overlay
- `src/components/onboarding/OnboardingRoot.tsx` — orchestrator, optimistic state
- `src/components/onboarding/StepCarousel.tsx` — swipeable carousel (see Task 7b)

**Files edited:**
- `src/lib/db/users.ts` — `OnboardingManualFlags` type + `UserStats.onboarding`
- `src/app/(app)/layout.tsx` — fetches onboarding state, renders `<OnboardingRoot>` (non-blocking)
- `src/components/settings/SettingsForm.tsx` — "Show Setup Guide" toggle
- `src/app/(app)/(content)/settings/page.tsx` — passes `initialShowGuide` prop

---

### Task 7b — Onboarding Chip Bug Fixes
**Status:** ✅ DEPLOYED
**Files:** `src/components/onboarding/OnboardingChip.tsx`, `src/components/onboarding/OnboardingSheet.tsx`

**Bug 1 — Click not opening sheet:**
- Root cause: `isDragging` was React state. `onPointerUp` captured stale `false` in its closure, hit `if (!isDragging) return` guard and bailed before calling `onOpen()`
- Fix: replaced `isDragging` state with `isDraggingRef` (useRef). State only used for cursor visual (`isDraggingVisual`). Pointer handlers always read live ref value.

**Bug 2 — Chip invisible on mobile:**
- Root cause: chip position initialised once on mount. Switching DevTools from desktop → mobile didn't re-clamp the stored desktop position (e.g. x=1850) to the narrower viewport.
- Fix: added `window.addEventListener('resize', ...)` in the same `useEffect` — fires `clamp()` on every viewport change, including DevTools simulation switches.
- Also bumped `zIndex: 50 → 100` to sit clear of `MobileBottomNav` (`z-50`).

**Bug 3 — Completed steps not reviewable:**
- Root cause: completed steps had `disabled` button + no expand logic — no way to read content for steps already auto-completed from existing data.
- Fix: `expandedIndex` type changed to `number | null`. Completed steps are now tappable (only locked steps disabled). Chevron shows on completed steps (dimmed). "Mark as done"/"Skip" buttons only render when `status !== 'complete'`.

**Stale .next cache issue:**
- Caused by `rm -rf .next` during type-check investigation. Dev server lost `routes-manifest.json`.
- Fix: killed port 3000, restarted via preview MCP — rebuilt cleanly in 4.9s.

---

### Task 7c — Swipeable Screenshot Carousel
**Status:** ✅ DEPLOYED
**Files:** `src/components/onboarding/StepCarousel.tsx` (created), `src/components/onboarding/steps.ts` (updated), `src/components/onboarding/OnboardingSheet.tsx` (updated)

**What:** Each step's media area is now a swipeable carousel instead of a single image slot.

**StepCarousel behaviour:**
- `screenshots: []` → placeholder (step icon + "Screenshot coming soon")
- `screenshots: ['a.png']` → single image, no dots
- `screenshots: ['a.png', 'b.png', ...]` → swipeable carousel: dot indicators (active dot expands to pill), slide counter, swipe via pointer events (touch + mouse)
- Desktop: left/right chevron buttons appear (hidden on mobile via `md:flex hidden`)
- Swipe threshold: 40px

**Type change:** `screenshot: string | null` + `gif: string | null` → `screenshots: string[]` + `gifs: string[]` in `StepConfig`. All 10 steps currently `screenshots: [], gifs: []`.

**To add screenshots:** drop assets into `public/onboarding/`, update step in `steps.ts`:
```ts
screenshots: ['/onboarding/step-2a.png', '/onboarding/step-2b.png'],
```

---

### Task 7d — Remove Progressive Unlock
**Status:** ✅ DEPLOYED
**Files:** `src/lib/db/onboarding.ts`, `src/components/onboarding/OnboardingRoot.tsx`

**Why:** User couldn't see steps 1–4 because existing account data (trackers, logs, etc.) had already auto-completed steps 2–3, which meant unlock groups 1 and 2 were gated and steps they'd never seen were locked. Progressive unlock creates confusion for existing users — wrong UX choice.

**Fix:** All 10 steps now `unlocked: true` unconditionally. Removed entire group unlock logic from `getOnboardingState()` and stripped the client-side unlock recomputation from `OnboardingRoot.handleMarkDone()`. Completion still works exactly as before — only the lock state is gone.

---

### Task 8 — Correlator Chaining
**Status:** ✅ DEPLOYED
**Commits:** `120efb7`
**Files:** `src/types/correlator.ts`, `src/lib/correlator/formula-engine.ts`, `src/components/journal/CorrelatorModal.tsx`, `src/components/journal/CorrelationCard.tsx`, `src/components/journal/DayView.tsx`, `src/lib/db/dashboard-data.ts`, `src/__tests__/correlator/formula-engine.test.ts`

**What:** Formulas can now reference other correlators as inputs — enabling cascading metrics like Thermic Effect of Food → Caloric Balance.

**Key changes:**
- `FormulaNode` 4th type: `{ type: 'correlator', correlatorId: string }`
- `buildFieldValueMapWithCorrelators(logs, correlations)`: topological sort (DFS, cycle detection), pre-computes all correlators in dependency order, injects `corr:{id}` into FieldValueMap
- `CorrelatorModal`: `[Field][⎇][#]` three-way row toggle; Corr dropdown excludes self-reference when editing
- 5 call sites updated (journal, dashboard, widget detail, summary generator, target calculator)
- Also fixed: DashboardContent 7-arg call to 6-arg `computeDailyPointsFromLogs`
- 42/42 formula engine tests pass

---

### Task 9 — AI Suggestion Engine
**Status:** ✅ DEPLOYED (UI layout + error handling fix in subsequent commit `f772e7d`)
**Commits:** `f82a158`, `f772e7d`
**Files:** `src/types/correlator.ts`, `src/app/actions/correlations.ts`, `src/components/journal/CorrelatorModal.tsx`

**Research:** Formula library compiled (20 formulas, 6 categories — saved to `FORMULA_LIBRARY.md`)

**What:** Gemini looks at user's tracker fields, suggests meaningful derived metrics ranked by readiness.

**Key changes:**
- `CorrelatorSuggestion` type: name, description, formula, requiredFields with `found` flags, `missingCount`, `readiness`
- `suggestCorrelationsAction`: sends tracker schema to Gemini flash-lite, gets structured suggestions with real field IDs, resolves field presence, sorts ready→almost→aspirational, caps at 8
- `isValidFormulaNode` now handles `correlator` node type
- `numericTypes` includes `duration` (was missing)
- `revalidateTag` preserved in create/update/delete actions
- Modal: subtle "Suggest" row at top of list view (not in header — header stays clean)
- Ready cards: cyan border + expanded fields + Create button
- Almost/aspirational: collapsed with expand toggle + missing count label
- Error state: red message + Retry button (previously disappeared silently)

---

### Task 10 — BOM Fix (caused by onboarding session, fixed here)
**Status:** ✅ FIXED (not committed — let onboarding session commit with their work)
**Root cause:** Onboarding session added UTF-8 BOM characters to `src/app/globals.css` and `src/app/(app)/layout.tsx`. PostCSS fails on BOM-prefixed CSS → 500 on all pages. Onboarding session confirmed fault.
**Fix:** Stripped BOM via raw byte write on both files.

---

## Open Items

**This chat (User Guide):**
- [ ] Screenshots for onboarding steps 1–10 — shoot screens, drop into `public/onboarding/`, update `screenshots: []` per step in `steps.ts`
- [ ] ⏳ GIF assets — deferred, slots ready in `gifs: []` per step
- [ ] Review step descriptions in `steps.ts` — especially Step 9 (Agents): needs actual agent names/descriptions
- [ ] Continue guide sections 3–6 in `/settings/guide` — Logging Data, Journal, Correlator, Routines, Targets, Food Bank, Agents, Dashboard
- [ ] Verify chip + sheet on real mobile device (not just DevTools)

**Other chat (unrelated to guide):**
- [ ] Agent Forge date bug — logs to previous day, `activeAgent` branch in `route.ts` ~L723
- [ ] Auto-expire stale day sessions
- [ ] Verify Suggest button end-to-end on localhost/journal after BOM fix

## Carry-Forward to Next Session (This Chat)

1. **Onboarding content** — add screenshots to steps; review all 10 descriptions in `src/components/onboarding/steps.ts`, correct Step 9 Agents with real names
2. **Guide page sections 3–10** — write out the remaining sections of `/settings/guide` to match the 10-step onboarding structure
3. **Real mobile test** — verify chip appears top-right and sheet opens on an actual device
