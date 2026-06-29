# Technical Log - 2026-06-28

## Issue 1: False Positive "HYROX Group Class" Session Type Classification
**Root Cause:**
In `yaha/src/app/actions/coaching.ts` (Next.js server action) and `data/save_coaching_data.py` (Telegram dispatcher), the session type displayed in the UI timeline card and Telegram notifications was dynamically derived by searching the `pre_workout_fueling` column. The parser logic checked if the lowercased fueling text contained the substring `"hyrox"` to classify the session as a `"HYROX Group Class 🏋️"`.

Because Armaan's running interval session description today contained the parenthesized phrase `"(The Hyrox Pace Sharpener)"`, the parser matched `"hyrox"` first and incorrectly classified the day as a group class. Violetta's fueling description only contained `"run intervals"` and did not contain the word `"hyrox"`, so she correctly resolved to `"Interval Run ⚡"` and was unaffected by the bug.

**Resolution:**
1. Modified `deriveSessionType` in `yaha/src/app/actions/coaching.ts` to replace the broad `fl.includes('hyrox')` check with a strict check matching only `"group class"`, `"hyrox class"`, or `"regybox"`.
2. Modified `_send_telegram_notification` in `data/save_coaching_data.py` with the exact same strict criteria.
3. Re-ran `save_today_briefings.py` to patch the database with the updated category and successfully dispatched correct Telegram alerts.
4. Ran `npx vercel --prod --yes` inside `yaha/` to deploy updates to production hosting on Vercel.

**How it will be prevented going forward:**
1. **Ban Naked Substring Matching for Broad Names:** We will completely avoid using broad, high-level names like `"hyrox"` for type classification within this project. Because the entire project context is Hyrox preparation, this term will naturally appear in running, pacing, and strength workouts.
2. **Move to Structured Data:** Future plans will prioritize storing the session type in a structured database column (`coaching_prescribed_workouts.session_type`) instead of dynamically deriving it from text blocks.
3. **Timeline Card Verification in UI Tests:** Add automated test assertions in Playwright verification runs to check that interval running days are correctly classified as `Interval Run` on the UI timeline card.
