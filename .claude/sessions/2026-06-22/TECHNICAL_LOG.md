# Technical Log - 2026-06-22

## Issue 1: Double-Session Classification Order Bug
**Root Cause:**
On double-session days (such as a HYROX Group Class in the morning and a Zone 2 easy run in the evening), the system parsed the day's training category as "Long Run" or "Zone 2" instead of "HYROX Group Class". This occurred because the conditional matching block inside `deriveSessionType` evaluated `"long run"` and `"zone 2"` check-phrases first. Since the briefing text's fueling advice contained mentions of the evening run, the check matched early and returned the incorrect type.

**Resolution:**
1. **Telegram Notification script (`data/save_coaching_data.py`):**
   Reordered the conditional check priorities so that high-intensity/structured functional blocks like `"hyrox"`, `"group class"`, `"open gym"`, `"strength"`, and `"interval"` are matched and returned first before resolving lower-intensity running checks.
2. **Frontend Server Actions (`yaha/src/app/actions/coaching.ts`):**
   Updated `deriveSessionType` to mirror the Telegram bot's prioritized classification sequence.
3. **Deployment:**
   Ran production build (`npm run build`) and pushed live to Vercel via CLI.

## Issue 2: Workout Plans File-to-Database Sync
**Root Cause:**
Historical training logs and active schedules were stored in isolated markdown files within the local directory structure (`plans/` and `plans/archive/`). This led to local-vs-remote state drift and hindered executing schedule pivots as single transactions on Supabase.

**Resolution:**
1. **Database Schema:**
   Added a `coaching_workout_plans` table to hold raw plan documents with columns `id`, `name` (unique), `type` (active/archive), `content` (text), and timestamps.
2. **Migration Scripts:**
   - Wrote and executed `data/migrate_workout_plans_to_db.py` to upsert all 3 active plan files and 26 archive plans (total 29) to the new table. Added conflict targets handling in `supabase_client.py` for correct upserting.
   - Wrote and executed `data/migrate_archives_to_db.py` to parse all 26 archive files (extracting 358 sessions) and insert them into the `coaching_prescribed_workouts_archive` table with appropriate metadata.
3. **Local File System Integrity:**
   Restored active markdown schedules under `plans/` as reference files.

## Issue 3: UI Cards List Layout and CNS Reasoning Accordion Bugs
**Root Cause:**
1. In `MorningBriefingDetail.tsx`, the custom list parser `parseBulletPoints` split lists using a regular expression (`^\s*[\*\-]\s`) that did not account for leading spaces of nested sub-bullets. This caused nested points to escape their parent card containers.
2. The "CNS Reasoning" card lacked toggle integration and remained fully open, while "Verdict Compliance" and "Daily Nutrition & Meal Analysis" headers were not normalized under the accordion layout.

**Resolution:**
1. Refactored `parseBulletPoints` to match `^\s{0,2}[\*\-]\s` to capture both top-level and indented nested lists.
2. Normalized title matches in `MorningBriefingDetail.tsx` to parse "CNS Reasoning" and related strings as `Readiness Reasoning`, styling them as collapsible detail items defaulting to closed state.

## Issue 4: Bracketed Metric Unit Abbreviation Expansion
**Root Cause:**
The LLM was instructed to provide metric unit details but began outputting long-form bracketed explanations for simple units (e.g. `min (minutes)`, `g (grams)`, `kcal (kilocalories)`).

**Resolution:**
1. Modified `gemini.md` rules to clarify that bracketed long-form explanations apply *only* to the 15 advanced recovery metrics (e.g., `ABI (Autonomic Balance Index)`), leaving basic abbreviations clean.
2. Created and executed `data/rewrite_briefing_data.py` to clean all basic units in both athletes' `2026-06-22` database rows, replacing duplicate nutrition checks with a unified `Daily Nutrition & Meal Analysis` and updating CNS reasoning keys.
