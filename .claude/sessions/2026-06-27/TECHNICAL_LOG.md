# Technical Log - 2026-06-27

## Issue 1: verify_coaching_ui Parameter Ordering Bug
**Root Cause:**
In `data/save_coaching_data.py`, the code invoked `verify_coaching_ui(user_id, db_user_id)`. However, the helper's signature expects `(user_name, user_id)`. Since `db_user_id` stored the name ("Armaan"/"Violetta") and `user_id` stored the UUID, they were swapped. This caused the Playwright authentication logic to query `https://jwiqwxacxgzpsshtsmsl.supabase.co/auth/v1/admin/users/Armaan` and fail with a 404, bypassing UI validation and Telegram alerts.

**Resolution:**
Swapped the parameters to `verify_coaching_ui(db_user_id, user_id)` in `data/save_coaching_data.py`.

---

## Issue 2: Supplements Aggregation Bug
**Root Cause:**
The server action in `yaha/src/app/actions/coaching.ts` fetched yesterday's logged supplements using `yesterdayLogs.find(l => l.tracker_id === 'f0edd06f-62e4-4da9-8866-29fd9582398b')`. Because `.find()` only returns the first matching item, only the first supplement log of the day was retrieved and processed. Multiple logging sessions on the same day (e.g., morning Electrolytes and afternoon Creatine/Magnesium) were ignored.

**Resolution:**
Replaced `.find()` with `.filter()` to retrieve all logged supplements, and updated the code to loop through and aggregate the quantities and totals across all logs.

---

## Issue 3: Static Playwright Verification
**Root Cause:**
`data/verify_ui.py` only scanned the dashboard text for static indicators of failures (like `"NaN"` or `"undefined"`), which missed cases where component boxes (such as Supplements Check) were hidden completely due to missing conditional fields.

**Resolution:**
Updated `verify_ui.py` to query Supabase directly for yesterday's actual supplements logs, and dynamically assert that their names (e.g., `"Creatine"`, `"Magnesium"`) exist in the page's inner text.

---

## Issue 4: Food Bank Typos & Hallucinated Ingredients
**Root Cause:**
When a user referenced a food bank dish with typos (e.g. `"bulgar bowl"`), the strict matching logic `msg.includes(e.name.toLowerCase())` in `yaha/src/app/api/chat/route.ts` failed to identify the entry. While the AI matched the name semantically and knew the overall macros (from the general food bank list in the prompt), the lack of concrete ingredients forced the LLM to hallucinate a matching recipe, resulting in inaccurate ingredient lists.

**Resolution:**
1. Implemented `getLevenshteinDistance` and token-based `isFuzzyMatch` in `yaha/src/app/api/chat/route.ts` to support minor typos (edit distance <= 1 for short words, <= 2 for long words).
2. Removed the `FOOD_BANK_ADJUST_KEYWORDS` check restriction to ensure ingredients are always retrieved and passed into prompt context if any food bank entry is mentioned in the chat.
