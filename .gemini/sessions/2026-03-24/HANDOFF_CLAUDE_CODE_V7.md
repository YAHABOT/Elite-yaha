# YAHA V7 EMERGENCY HANDOFF — Restoration & Hydration Lock

**Date:** 2026-03-24
**Status:** CRITICAL REGRESSIONS DETECTED POST-V6

## 🛑 HYDRATION CRASH (SC1)
The sidebar is crashing with a "Hydration failed" error (Server/Client mismatch).
- **File**: `src/components/chat/ChatSidebar.tsx` (Line 150)
- **Root Cause**: `formatRelativeTime` uses `new Date()` inside a client component renderer. This creates a time gap between SSR and Hydration.
- **V7 Fix**: Wrap the relative time display in a `useEffect` to ensure it only renders on the client, or use a "No SSR" approach for that specific span.

## 🔄 RESTORATION: BULK SELECT (LOST FEATURE)
The "Chat Selection" and "Bulk Delete" features were wiped during the baseline reset.
- **File**: `ChatSidebar.tsx`
- **V7 Mission**: Re-implement the `SelectionMode` state and checkboxes.
- **Logic**:
  - Add `isSelectionMode` toggle.
  - Add `selectedIds: Set<string>` state.
  - Add "Select All" and "Delete N Selected" buttons with the optimistic UI logic used in V5.

## 🛠️ ACTION CARD: UNIT PROTECTION & PERSISTENCE
The current build allows users to delete units (e.g., deleting "kg" from "95 kg") inside the edit input.
- **File**: `ActionCard.tsx`
- **V7 Fix**: 
  - **Unit Isolation**: The `<input>` should ONLY contain the raw numeric value. The unit pill should be positioned absolutely or as a suffix *outside* the input field so it cannot be backspaced.
  - **Persistence Guard**: Confirmed cards revert to "Pending" on refresh. You must check if the message data already contains a `logged_at` or `tracker_log_id` and initialize the local `status` to `'confirmed'` if so.

## 🚩 MISSING UI: LOG EDITING BANNER
The "Editing" status banner for logs is missing from the build.
- **File**: `LogEntryCard.tsx`
- **V7 Fix**: Re-add the high-visibility "Editing" banner at the top of the card when `isEditing` is true.

## 📂 EVIDENCE
- **SC1**: Hydration Error in Sidebar.
- **SC2-SC5**: (Refer to V6 handoff for formatting/ghost spawning baseline).

**MISSION**: Restore the V5 features and fix the hydration crash immediately. Do NOT regress on the Ghost Spawning fix (keep the idle window in `chat.ts`).
