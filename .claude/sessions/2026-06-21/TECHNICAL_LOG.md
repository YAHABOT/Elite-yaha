# Technical Log - 2026-06-21

## Issue 1: Floating Chat Minimization on Routine Banner Click (Race Condition)
**Root Cause:**
Clicking "Start" on the morning/evening routine banners triggered client-side or full-page routing navigation to `/chat/new?routine=...`. 
1. In Next.js, this changed the `pathname`, which triggered a `useEffect` inside `FloatingChat.tsx` that minimizes the chat window on any route transition (`setIsOpen(false)`).
2. The `/chat` redirect wrapper was mounting, firing `chatEvents.openChat()` (which maximizes the chat), and immediately replacing the URL back to `/dashboard` via `router.replace('/dashboard')`.
3. The routing transition back to `/dashboard` triggered the `pathname` observer in `FloatingChat.tsx` a second time, immediately closing the chat window before it could be rendered.

**Resolution:**
1. Modified `chatEvents.ts` to include a payload action supporting `'open' | 'minimize'`.
2. Updated `FloatingChat.tsx` to handle the `minimize` event action. On new sessions (`sessionId === 'new'`), it now dynamically fetches the routine configuration from `/api/routines/${initialRoutineId}` using standard `fetch` if an `initialRoutineId` is set, and passes it down.
3. Updated `ChatInterface.tsx` to accept the `initialRoutineId` prop. The auto-start `useEffect` hook triggers if either `searchParams` OR `initialRoutineId` is set. If resuming an in-progress session, it invokes `onSessionSelect` instead of Next.js browser routing.
4. Refactored routine banner triggers in `DashboardClient.tsx`, `RoutineBanner.tsx`, and `WidgetDetailClient.tsx` from Link/anchor elements into `<button>` click events that trigger `chatEvents.openChat()` directly. This opens the overlay inline on the current page with zero routing transitions.

## Issue 2: Chat Overlay Remains Open on Nav Bar Re-Clicks
**Root Cause:**
The minimization hook in `FloatingChat.tsx` was bound strictly to `[pathname]`. If a user was on `/dashboard` with the chat open and re-clicked the "Dashboard" nav bar button, Next.js bypassed route changes since the route was already active. `pathname` remained unchanged, so the minimize effect did not execute.

**Resolution & Verification:**
1. Refactored `NavLink.tsx` (desktop sidebar) and `MobileBottomNav.tsx` (mobile bottom tabs) to hook into click events.
2. Clicking the **Chat** sidebar item prevents default routing and calls `chatEvents.openChat()` to toggle the overlay on the current page.
3. Clicking **any other navigation tab** dispatches `chatEvents.openChat({ action: 'minimize' })`. This forces the chat to minimize immediately on click, regardless of whether a page transition actually happens.
4. Added diagnostic telemetry logs inside `NavLink.tsx`, `MobileBottomNav.tsx`, and `FloatingChat.tsx` to trace event dispatch and consumption.
5. Deployed the latest build via Vercel CLI (`npx vercel --prod --yes`) to ensure the changes were compiled and active on the production domain.
6. Verified through the browser console that clicking the active "Dashboard" tab correctly emits `[MobileBottomNav] Clicked tab: /dashboard` and prompts `[FloatingChat] Minimizing chat: setting isOpen to false`, successfully closing the floating chat.

