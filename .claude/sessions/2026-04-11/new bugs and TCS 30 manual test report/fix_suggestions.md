# Fix Suggestions

This document outlines proposed technical solutions for the regressions identified in the `observation_of_issues.md` report. **No code has been altered yet; these are purely theoretical fixes for the Redemption Phase.**

### 1. Fixing Calculation Engine & Accumulation Failures (Bugs 23, 11, 28)
*   **De-obfuscate Prompt Data:** Update `buildDaySummary` in `prompt-builder.ts` to map `fld_xxxxx` keys back to their human-readable `label`s before injecting the logs into the system prompt.
    *   *Implementation:* Pass the `Tracker[]` schema into the mapper so the LLM sees `Protein: 25` instead of `fld_protein: 25`.
*   **Implement an `UPDATE_DATA` Action:** Introduce a new action card type (`UPDATE_DATA` or `EDIT_LOG`) in `actions.ts`.
    *   *Implementation:* This action must require a `log_id` (so the LLM knows which record to target) and the updated field values. The backend API (`route.ts`) must then execute an SQL `UPDATE` instead of an `INSERT`. This stops the app from creating duplicate entries when modifying data.
*   **Offload Heavy Math (Optional but Recommended):** If the LLM continues to fail at float arithmetic, consider adding a post-processing calculation step in `route.ts` that totals the daily macros natively in JavaScript and appends a "Daily Totals" system message to the context, rather than relying on the LLM to sum them on the fly.

### 2. Fixing The "No" vs. Skip Logic Bug (Bug 29)
*   **Refine the `YES_NO_FIELD_RULE`:** Relax the aggressive prompt instruction in `prompt-builder.ts`.
    *   *Implementation:* Change the rule to teach the LLM contextual nuance: "If the field is specifically a text field designed for notes, and the user says 'no', treat it as an intent to SKIP the field, not as a literal string value 'No'."
*   **Add Native Boolean Support (Alternative):** Update the schema in `actions.ts` to officially support a `boolean` field type, so the LLM knows exactly when "No" means `false` and when "No" means skip.

### 3. Fixing Routine Hallucination & Data Leakage (Bug 6)
*   **Strict Session/Context Isolation:** Modify `getRecentMessagesForAI` in `route.ts` to filter out messages that belong to previous days or different routine instances.
    *   *Implementation:* Only fetch history where the `created_at` timestamp matches the current `activeDaySession` date, or clear the `historyMessages` array entirely when a new routine is triggered to give the LLM a clean slate.

### 4. Fixing Context Retrieval Failures (Bug 1)
*   **Expand NLP Trigger Breadth:** Replace or significantly expand the rigid Regex patterns in `route.ts` to catch more natural language variations for historical queries.
    *   *Implementation:* Add patterns for phrases like "day before", "previously", "how did I do", "totals for", etc.
*   **Semantic Router (Advanced):** Instead of relying on brittle Regex, utilize a small, fast, local embedding check or a very cheap LLM classification pass strictly to determine if a query requires a historical database fetch before passing it to the main Gemini model.

### 5. Closing the Native Gemini Intelligence Gap (Bugs 14, 24, 25)
*   **Prompt Relaxation for Librarian Mode:** Separate the "Data Extraction" persona from the "Nutritional Estimation" persona in the prompt.
    *   *Implementation:* Instruct the LLM to format its conversational output cleanly (like a markdown code block for macro breakdowns) *before* attempting to construct the strict JSON action card. Tell it to output the conversational breakdown first, and the JSON strictly at the end.
*   **Remove Conflicting Instructions:** Audit `GLOBAL_ANTI_HALLUCINATION_RULES` to ensure it isn't accidentally telling the LLM to override its native knowledge base when estimating common food items.

### 6. Fixing UI / Default Dashboard Routing (Bug 30)
*   **Update Root Page Redirect:** Check the main `page.tsx` or Next.js `middleware.ts`.
    *   *Implementation:* Ensure that navigating to `/` or the app's entry point explicitly redirects to `/chat` (or whichever route houses the active chat session) instead of `/dashboard`.
