# 🏗️ App Architect: YAHA Code Review Report

## Verdict: FAIL (with high-priority fixes identified)

I've conducted an **Agentic Exploration Loop** across the YAHA codebase. While the OLED aesthetics and performance overhauls are solid, there are critical logical regressions in the AI pipeline that will block the next phase of development.

---

## 🔍 Bug Root Cause Analysis

### 1. [CRITICAL] Placeholder UUID Crash
- **Finding**: The "invalid syntax for type uuid" error (SLEEP_TRACKER_ID_PLACEHOLDER) is caused by a hardcoded placeholder in the **Routine Data**. 
- **Root Cause**: Since this string isn't in the codebase, it exists in the `routines.steps` JSONB column in the database. The AI is being handed this placeholder ID in the system prompt and is attempting to echo it back in a `LOG_DATA` action, which results in a PostgreSQL crash.
- **User Note**: Armaan notes this was working fine previously; this suggests a recent routine update or data migration introduced the placeholder value into the DB records.
- **Fix**: Direct database update to replace the placeholder with the actual `tracker_id`.

### 2. [HIGH] Routine Field Leak
- **Finding**: `src/lib/ai/prompt-builder.ts:144`
- **Root Cause**: The `buildRoutineSystemPrompt` function explicitly calls `getFullSchema(currentStep)`, which injects every field of the tracker into the prompt. 
- **Fix**: Remove `getFullSchema` from the prompt. Rely strictly on `currentStep.targetFields` to keep the AI focused.

### 3. [MEDIUM] Time Formatting Regression
- **Finding**: `src/lib/ai/prompt-builder.ts:153`
- **Root Cause**: The system prompt explicitly instructs: *"Convert anything that looks like '6h 8m' to a decimal"*. This is a logic regression; the app expects `HH:mm`.
- **Fix**: Update the prompt to enforce `HH:mm` format and sync with the UI utilities.

### 4. [LOW] Latency (Priority #1)
- **Finding**: Multiple parallel fetches are happening in `src/app/api/chat/route.ts:163`, but they are still serialized behind a `supabase.auth.getUser()` check.
- **Hunch**: The `getSession` and `getSafeUser` calls might be hitting the DB sequentially before the parallel block.

---

## 🛠️ Implementation Strategy (Next Steps)

### A. Dashboard Widgets (Pinned Metrics)
- **Location**: `src/app/dashboard/page.tsx` needs to transition from static cards to a `map()` over `trackers.filter(t => t.schema.some(f => f.pinned))`.
- **Schema Update**: Add a `pinned: boolean` property to the `schema` objects in the `trackers` table.

### B. Persistent Chat ("Keep Chat")
- **Location**: `src/app/chat/page.tsx` (Client) and `src/app/actions/chat.ts` (Server).
- **Strategy**: Add a `permanent: boolean` column to `chat_sessions`. Temporary chats can be purged periodically; the "Keep" button flips this bit.

---

## 🧱 Architectural Verdict
The **WAT Architecture** is correctly initialized, but the **Routines** layer needs "Context Hygiene" enforcement. The AI is currently "too informed" about fields it shouldn't be seeing, leading to user friction.

**Reviewer Identity:** `App Architect` via `Code-Reviewer Skill`
