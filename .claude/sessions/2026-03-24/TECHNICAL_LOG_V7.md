# TECHNICAL LOG — V7

**Date:** 2026-03-24 (reconstructed)
**Build result:** EXIT 0 — 25 routes

---

## Hydration Crash Fix

### Root cause
After clearing the `.next` cache directory, the running dev server still served stale webpack chunk references, causing `ChunkLoadError`. Additionally, Tailwind/CSS weren't loading, rendering the UI completely unstyled.

### Fix
Restarted the dev server (`npm run dev`) to pick up fresh webpack chunks and rebuild CSS from current source files. Cache clearing alone wasn't sufficient — the dev server needed to restart to re-transpile and re-hash all chunks.

---

## Bulk Delete Chats (Re-enabled)

### Root cause
Bulk delete functionality was broken or missing in previous iterations.

### Fix
Restored and tested the multi-select + delete flow in `ChatSidebar.tsx`.

---

## ActionCard Unit Corruption Fix

### Root cause
V4 overcorrection stripped all formatting from `editableFields` initialization, which prevented duration values from being formatted as HH:MM and embedded unit text in raw fields.

### Fix
`src/components/chat/ActionCard.tsx` — Partially restored formatting logic while keeping unit text out of editable strings. The unit pill is rendered separately outside the input, so the input only contains the formatted numeric value.

---

## Confirmed State Persistence (Partial)

### Root cause
ActionCard persistence was partially broken due to multiple issues (fixed fully in V8).

### Fix
Attempted improvements to `confirmLogAction` logic, but SC3 (fake message ID issue) remained undiagnosed and unfixed. Fully resolved in V8.

---

## Files Changed

- `src/components/chat/ActionCard.tsx` — formatting refinement
- `.next/` directory — cleared cache
