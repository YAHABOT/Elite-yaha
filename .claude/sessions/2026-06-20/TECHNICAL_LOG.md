# Technical Log - 2026-06-20

## Issue 1: Floating Chat Modal Unmounting on Session Switch
**Root Cause:**
In `ChatSidebar.tsx`, selecting a new session triggered a `<Link href="/chat/[id]">` navigation event. This caused a full Next.js page transition, which resulted in the parent `FloatingChat` wrapper unmounting the old `ChatInterface` and completely closing the widget because the popup state didn't persist across routes when inside the floating overlay.

**Resolution:**
1. Updated `ChatInterface.tsx` to accept `onSessionSelect` and `onNewChat` callbacks.
2. Passed these callbacks down to `ChatSidebar.tsx`.
3. In `ChatSidebar.tsx`, conditionally rendered a `<button>` instead of a `<Link>` if `onSessionSelect` is provided. This allows the sidebar to act as a local state switcher rather than a URL router.
4. In `FloatingChat.tsx`, provided the callbacks: `onSessionSelect={(id) => setSessionId(id)}`. Now, switching sessions only updates the state variable `sessionId` inside the `FloatingChat`, preserving the modal state and keeping the chat open.

## Issue 2: Action Card Math Breakdown Causing Poor Presentation
**Root Cause:**
The original AI prompt (`yaha/src/lib/ai/prompt-builder.ts`) instructed the model to output a verbose bulleted list for math (Rule 13). This verbose breakdown was visually obtrusive and did not fit elegantly above the Action Card, causing the presentation to look "shit" compared to the original app's elegant one-liner. Furthermore, the `meal notes` were empty because the model was confusing the fields.

**Resolution:**
1. Re-wrote `prompt-builder.ts` Rule 13 "CALCULATION RULE".
2. Removed the mandatory bulleted list breakdown.
3. Added strict instructions to use a brief, conversational math explanation (e.g. "64g x 3.05 kcal = 195 kcal") followed by a short friendly summary before yielding the `LOG_DATA` JSON block.
4. Corrected the prompt examples to ensure `fieldLabels` correctly mapped to `Meal notes` to fix the empty meal notes issue.

**Deployment:**
Fixes deployed to production via Vercel (`elite-yaha.vercel.app`).
