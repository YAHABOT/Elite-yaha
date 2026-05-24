# Observation of Issues

This document outlines the root causes for the bugs and regressions identified during the TCS 30 manual testing phase for the YAHA health logging application. These observations are based on a direct analysis of the application's core logic (`route.ts`, `prompt-builder.ts`, `actions.ts`) without modifying any source code.

### 1. Calculation Engine & Accumulation Failures (Bugs 23, 11, 28)
*   **LLM Float Arithmetic limitation:** The AI lacks a native calculator tool. It is performing "mental math" on floating-point numbers based strictly on token generation.
*   **Data Obfuscation in Prompt:** In `buildDaySummary` (`prompt-builder.ts`), daily logs are injected into the prompt using raw database field IDs (e.g., `fld_protein: 25`) instead of human-readable labels (`Protein: 25`). This forces the LLM to mentally map `fld_xxx` to specific nutrients while simultaneously attempting math, drastically increasing error rates.
*   **Duplicate Update Bug (Bug 11):** The app lacks an `UPDATE_DATA` action type in `actions.ts`. When a user requests an update (e.g., "add 100 to it"), the LLM calculates the new total and emits a new `LOG_DATA` action card. The app blindly inserts this as a *new* row, doubling the daily stats instead of updating the existing record.

### 2. The "No" vs. Skip Logic Bug (Bug 29)
*   **Overly Aggressive Prompt Rule:** `prompt-builder.ts` enforces a strict `YES_NO_FIELD_RULE`: "ALWAYS produce a LOG_DATA action card with the boolean/text field set to false or 'No'. Do NOT treat 'no' or 'nope' as wanting to skip the step."
*   **Missing Boolean Field Type:** The tracker schema (`actions.ts`) does not natively support a `boolean` field type (it only supports `number`, `text`, `rating`, `time`). Consequently, when the user says "No" (meaning "I didn't do this, skip it"), the LLM is forced by the prompt rule to literally log the string "No" into a text field rather than skipping the step.

### 3. Routine Hallucination & Data Leakage (Bug 6)
*   **Contaminated Chat History:** While `buildRoutineSystemPrompt` injects the correct routine steps, `route.ts` also retrieves the last 10 messages from the database (`getRecentMessagesForAI`). If sessions are not cleanly segregated, the LLM reads old messages (from previous days, altered routines, or different user profiles) and blends them with the current routine instructions, leading it to invent non-existent steps (e.g., "Step 3").

### 4. Context Retrieval Failures (Bug 1)
*   **Brittle Regex Triggers:** In `route.ts`, historical database fetches are gated behind rigid Regular Expressions (e.g., `/\byesterday\b/i`, `/\bsummar[iy]se?\b/i`). If the user's natural language request (e.g., "how did I do the day before") fails to trigger these specific regex patterns, `historicalContext` remains empty. The LLM then correctly, but frustratingly, reports "I don't have access to that data" because the app failed to supply it.

### 5. Native Gemini Intelligence Gap (Bugs 14, 24, 25)
*   **Prompt Constraint Conflicts:** The system prompt is heavily burdened with rules (`GLOBAL_ANTI_HALLUCINATION_RULES`, `MANDATORY MULTI-FIELD FORMAT RULE`) prioritizing rigid JSON extraction over conversational intuition. The "Librarian Mode" conflicts with strict data integrity rules, causing the AI to hallucinate wildly inaccurate macros (e.g., 1900 kcal for a pizza) and produce cluttered, repetitive macro breakdown formatting instead of the clean output native Gemini provides.

### 6. UI / Default Dashboard Routing (Bug 30)
*   **Routing Default:** The application is prioritizing the Dashboard view as the default landing state instead of prioritizing the active Chat view upon initial load, indicating a Next.js routing or state management configuration issue.
