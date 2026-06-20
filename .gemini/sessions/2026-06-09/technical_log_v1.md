# Technical Log v1 — 2026-06-09

## T1: Supabase DB Migrations (via MCP)

**`food_bank_entries`** — table was never created, causing all food bank saves to silently fail.
**`feedback_responses`** — had been pending since 2026-06-05.
Both applied via `mcp__supabase__apply_migration`. RLS + indexes confirmed.

---

## T2: Warmup Endpoint — DB Ping

**File:** `src/app/api/warmup/route.ts`
**Problem:** Endpoint returned 200 immediately with zero DB work. Supabase connection pool stayed cold; first real request after inactivity still paid full pool init cost.
**Fix:** Added lightweight `supabase.from('trackers').select('id').limit(1)` ping. Returns `ping_ms` in response for observability. Errors swallowed — warmup never fails the caller.

---

## T3: SAVE_TO_FOOD_BANK Cards Silently Dropped

**File:** `src/lib/ai/actions.ts`
**Root cause:** `validateAnyCard` dispatch:
```
if CREATE_TRACKER → validateCreateTrackerCard
if UPDATE_DATA    → validateUpdateDataCard
fallthrough       → validateActionCard  ← returns null when type !== LOG_DATA
```
`SAVE_TO_FOOD_BANK` had no branch → always null → never reached frontend.
**Fix:** Added `validateSaveToFoodBankCard` with full field validation, wired as first check before the fallthrough.

---

## T4: Food Bank Attach Menu — Chat Home Page

**File:** `src/components/chat/MobileChatHome.tsx`
**Problem:** Attach menu only had Take Photo / Photo Library / Attach File. Food Bank option existed in `ChatInterface` (active session) but was never added to `MobileChatHome` (new session home).
**Fix:** Added `Utensils` import, Food Bank button that attaches `application/x-food-bank-context` sentinel, "Food Bank Active" chip in attached files display.

---

## T5: Food Bank UX — Remove Picker Modal

**Files:** `src/components/chat/ChatInterface.tsx`, `src/components/chat/MobileChatHome.tsx`
**Problem:** Food Bank button opened a single-item picker modal. Wrong UX — user can't log 10 pantry items one by one.
**Fix:** Button now just attaches the food bank context sentinel. User types naturally ("log 30g oats, 200ml milk, scoop of protein") and AI handles lookup + scaling. Removed `FoodBankPicker` modal, `showFoodBankPicker` state, `foodBankEntries` state, `getFoodBankEntriesAction` import from both files.

---

## T6: Streaming JSON Leak — Fenced Code Blocks

**File:** `src/components/chat/ChatInterface.tsx` line ~1293
**Problem:** Existing regex `\n?\[[\s\n]*\{[\s\S]*/g` stripped raw JSON arrays but not fenced ` ```json ` blocks. `SAVE_TO_FOOD_BANK` responses came wrapped in ` ```json ` → leaked to UI during streaming.
**Fix:** Added `.replace(/\n?` + "```" + `json[\s\S]*/g, '')` before the array regex.

---

## T7: FoodBankList — Multi-Select Delete

**File:** `src/components/settings/food-bank/FoodBankList.tsx`
**Problem:** No bulk delete. User had 25 pantry items wrongly saved as dishes and needed to clean up.
**Fix:** Added Select mode toggle, per-item checkboxes, Select All / Deselect All, "Delete N" bulk action button. In select mode, item cards are tappable (toggle selection). Single delete flow unchanged when not in select mode.

---

## T8: Prompt — Food Bank AI Routing

**File:** `src/lib/ai/prompt-builder.ts`

**Problem 1:** `FOOD_BANK_SAVE_RULE` only showed `entry_type:"dish"` in format example. AI never produced `pantry_item` even when user said "save to pantry" or uploaded a pantry file. Fell back to `LOG_DATA` or `CREATE_TRACKER`.
**Fix:** Rewrote rule to explicitly define dish vs pantry_item with trigger phrases and both format examples.

**Problem 2:** No instruction for combining pantry items into a composed meal with choice of log / save / both.
**Fix:** Added `COMBINING PANTRY ITEMS INTO A MEAL` section to `FOOD_BANK_RULE` covering all four intents.

**Problem 3:** Meal notes field was reiterating all dish ingredients even when source was a food bank entry.
**Fix:** Added `MEAL NOTES / INGREDIENTS FIELD RULES`:
- Food bank DISH (no extras) → notes = `"Food Bank Dish"`
- Food bank DISH + extras → notes = `"[Dish Name] + [extras only]"`
- Food bank PANTRY ITEM → notes = `"Food Bank Pantry Item"`
- Custom combo (no saved dish) → notes = full ingredient list with quantities

---

## Deployments

All 7 commits deployed to `https://yaha-flame.vercel.app` via `vercel --prod`. All builds passed clean.

[CA | 11:30] v1 complete
