# Phase 3 Manual Testing Guide — YAHA Production Deployment

**Deployment:** https://yaha-flame.vercel.app  
**Test Date:** 2026-05-25  
**Build Status:** ✓ CLEAN (6.3min, zero errors, 531/531 tests passing)

---

## Pre-Test Checklist

- [ ] Login with your account at https://yaha-flame.vercel.app/login
- [ ] Verify you're on the production deployment (URL bar shows `yaha-flame.vercel.app`)
- [ ] Have browser DevTools open (F12) for any unexpected behavior
- [ ] Note the current date/time for timestamp validation

---

## Test Scenario 1: Health Data Logging (Chat → Database)

**Objective:** Verify that sending health data via chat creates correct action cards and persists to database.

### Test 1.1: Send Multi-Tracker Health Data
1. Navigate to `/chat/new` (new chat session)
2. Send this exact message:
   ```
   I slept 8 hours last night, drank 3 liters of water, and had a 45 minute workout this morning.
   ```
3. **Expected:** Assistant responds with "Processing your health data..." (loading indicator)
4. Wait 5-10 seconds for action cards to generate
5. **Expected:** Three separate action cards appear:
   - **Sleep Card:** DURATION field shows "08:00" (8 hours)
   - **Water Card:** VOLUME field shows "3" or "3000" (liters/milliliters)
   - **Workout Card:** DURATION field shows "00:45" (45 minutes)

### Test 1.2: Verify All Cards Generated
1. Scroll up/down in chat to see all three action cards
2. Each card should have:
   - Tracker name at top (SLEEP, WATER, WORKOUT)
   - Correct fields for that tracker
   - Date stamp (today's date: 2026-05-25)
   - **Green "Log Entry" button**
   - **Gray "Discard" button**

### Test 1.3: Log Each Entry (Sequential)
1. Click **"Log Entry"** on the Sleep card
2. **Expected:** Card disappears from chat, message appears below: "✓ Logged sleep data (8h)"
3. Repeat for Water card
   - **Expected:** Card disappears, "✓ Logged water intake (3L)"
4. Repeat for Workout card
   - **Expected:** Card disappears, "✓ Logged workout (45min)"

### Test 1.4: Verify Database Persistence
1. Navigate to `/journal` (Daily Journal view)
2. **Expected:** Today's entries show:
   - Sleep: 8 hours
   - Water: 3 liters
   - Workout: 45 minutes
3. Click on each entry to expand and verify full details saved correctly
4. **PASS IF:** All three data points appear in journal with correct values

---

## Test Scenario 2: Modify Existing Log (UPDATE_DATA Defense)

**Objective:** Verify that UPDATE_DATA action only works on existing logs (prevents fabricated modifications).

### Test 2.1: Create Log to Modify
1. Go to `/chat/new` (new session)
2. Send: `I slept 7 hours`
3. Click "Log Entry" on the Sleep card
4. **Expected:** Entry logged (message: "✓ Logged sleep data (7h)")

### Test 2.2: Attempt Modification via Chat
1. Send: `Actually, I slept 9 hours instead`
2. **Expected:** Assistant generates action card
3. **Expected:** Field shows new value "09:00" (9 hours)
4. **Key Check:** Card should be for the **same log entry** (not a new one)
5. Card should have **"Log Entry" button** with note: "Update existing entry"
6. Click "Log Entry"
7. **Expected:** Journal updates to show 9 hours (not 7 hours)

### Test 2.3: Verify No Duplicate Entries
1. Go to `/journal`
2. **Expected:** Only ONE sleep entry for today (not two: 7h AND 9h)
3. **PASS IF:** Entry shows 9 hours (the update worked)

---

## Test Scenario 3: Routine Flow Protection (Skip Intent)

**Objective:** Verify that casual messages cannot interrupt an active routine flow.

### Test 3.1: Start Morning Routine
1. Go to `/chat/new`
2. Send: `start morning ritual` (or whatever your morning routine is called)
3. **Expected:** Assistant responds with Step 1 of routine (e.g., "Drink water", "Take vitamins", etc.)
4. **Expected:** Chat shows current step and prompts for input

### Test 3.2: Attempt Casual Interruption
1. While routine is active, send: `What's the weather like?`
2. **Expected:** Assistant ignores the casual question
3. **Expected:** Routine continues with: "Please complete the current step first: [step]"
4. **Alternative:** If bot did respond to weather, **FAIL** — skip intent not working

### Test 3.3: Complete Routine Step
1. Respond to the routine step (e.g., if it asks "Did you drink water?", say "Yes")
2. **Expected:** Routine advances to next step
3. Repeat steps 2-3 for 2-3 more routine steps to confirm skip intent persists
4. **PASS IF:** Casual messages are consistently blocked while routine is active

### Test 3.4: End Routine
1. Send: `end routine` or `skip`
2. **Expected:** Routine ends with summary (e.g., "Morning ritual complete. You completed 5/5 steps.")
3. Now send: `What's the weather?`
4. **Expected:** Assistant responds normally (routine no longer active)

---

## Test Scenario 4: Dashboard Mobile View (320px Width)

**Objective:** Verify dashboard widgets stack correctly on mobile and all fields are readable.

### Test 4.1: Open Dashboard on Desktop First
1. Navigate to `/dashboard`
2. **Expected:** Widgets displayed in multi-column layout
3. Take note of widget titles: Sleep Summary, Water Intake, Workout Stats, Mood, etc.

### Test 4.2: Resize Browser to Mobile (320px)
1. Press F12 (DevTools)
2. Click **Toggle device toolbar** (mobile icon in DevTools)
3. Select **iPhone SE** or custom **320x667** (mobile width)
4. Refresh page

### Test 4.3: Verify Mobile Stacking
1. **Expected:** All widgets stack **vertically** (single column)
2. **Expected:** No horizontal scrolling needed
3. **Expected:** All widget titles remain readable
4. Scroll down and verify:
   - Sleep widget shows: "8h" (from Scenario 1)
   - Water widget shows: "3L"
   - Workout widget shows: "45min"
   - No text overflow or cut-off values

### Test 4.4: Tap Interactive Elements
1. Tap on a widget (e.g., Sleep card)
2. **Expected:** Widget expands or shows detail view (not broken)
3. Tap back to collapse
4. **PASS IF:** No layout breaks, all text readable, no horizontal scroll

---

## Test Scenario 5: Dashboard Desktop View (1920px Width) & Numeric Accuracy

**Objective:** Verify dashboard displays correctly on desktop and all numeric calculations are exact (no rounding).

### Test 5.1: Open Dashboard on Desktop
1. Press F12 to close DevTools (or resize back to full width)
2. Navigate to `/dashboard`
3. **Expected:** Widgets display in 2-3 column layout
4. Widgets should NOT overlap or be cut off

### Test 5.2: Verify Numeric Values (No Rounding)
For each widget, check the **exact value** (not rounded):

1. **Sleep Widget:**
   - Expected: `8 hours` (not "~8h" or "8.0h")
   - If showing hours AND minutes: `8h 0m` (exact)

2. **Water Widget:**
   - Expected: `3 liters` (not "~3L" or "3.0L")
   - If showing in milliliters: `3000 mL` (exact)

3. **Workout Widget:**
   - Expected: `45 minutes` (not "~45m" or "45.0m")
   - If showing in hours: `0.75 hours` (exact decimal, not rounded to "1h")

### Test 5.3: Verify Calculations (N-Day Averages, Totals)
1. If dashboard shows **weekly average sleep:**
   - Expected: Only one data point (8h) → average = `8h` (exact)
   - NOT `8.0h` or `8.00h` (unnecessary decimal places)

2. If dashboard shows **total water (all time):**
   - Expected: `3L` or `3000mL` (from one log entry)
   - Verify calculation: `1 entry × 3L = 3L total`

3. If dashboard shows **total workouts:**
   - Expected: `1 workout` or `45 minutes total`
   - NOT approximations like "~1" or "~45"

### Test 5.4: Check Responsive Layout
1. Resize browser to 1440px width (tablet)
2. **Expected:** Widgets adjust to 2-column layout (not 3)
3. Resize to 1920px (desktop)
4. **Expected:** Widgets spread to 3-column layout (or user preference)
5. **PASS IF:** Layout adapts smoothly, no overflow, calculations remain exact

---

## Test Result Documentation

After completing all scenarios, record:

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Health Data Logging | PASS / FAIL | All 3 entries logged? Values correct? |
| 2. Modify Existing Log | PASS / FAIL | Update worked? No duplicates? |
| 3. Routine Skip Intent | PASS / FAIL | Casual messages blocked? Routine continued? |
| 4. Mobile Dashboard (320px) | PASS / FAIL | Stacked layout? All text readable? |
| 5. Desktop Dashboard (1920px) | PASS / FAIL | Multi-column? Numbers exact (no rounding)? |

---

## If Any Test FAILS

1. **Screenshot the failure** (DevTools open)
2. **Note the exact error message** (if any)
3. **Include:** Browser console errors (F12 → Console tab)
4. **Report to:** Include scenario number + screenshot + error details

---

## Success Criteria

✅ **ALL 5 SCENARIOS PASS** = Production ready for full deployment  
❌ **ANY SCENARIO FAILS** = Blocker for production deployment

---

**Test Start Time:** _______________  
**Test End Time:** _______________  
**Overall Result:** ✅ PASS / ❌ FAIL
