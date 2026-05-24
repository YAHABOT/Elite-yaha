# TECHNICAL LOG — V5

**Date:** 2026-03-24 (reconstructed)
**Focus:** Navigation latency, bulk delete, ghost cleanup initiation

---

## Navigation Latency Fix

### Root cause
"New Chat" button used `href="/chat"` which could land in a dead/stale session state if the user was already on `/chat/[sessionId]`.

### Fix
Changed `src/components/chat/ChatSidebar.tsx` to use `href="/chat/new"` — explicit route that always creates a fresh session.

---

## Bulk Delete Chats (Restored)

Feature re-enabled: users can now select and delete multiple chat sessions from the sidebar.

---

## Ghost Cleanup Initiation

`src/lib/db/chat-cleanup.ts` orphaned function identified. Wired into `getSessions()` as fire-and-forget background cleanup (threshold: 1h, later reduced to 10min in V6).

---

## Files Changed

- `src/components/chat/ChatSidebar.tsx` — navigation route change
- `src/lib/db/chat-cleanup.ts` — cleanup wiring started
