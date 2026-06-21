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

## Enhancement 3: Persistent Draggable Floating Button & UI Cleanup
**Goal:**
Remove the redundant "YAHA AI" header bar at the top of the chat panel, keep the floating chat button (chip) visible even when the chat is maximized, and use it as an interactive open/close toggle that preserves its smooth draggable movement.

**Implementation Details:**
1. **Header Bar Removal:** Deleted the `div` containing the `Yaha AI` title and `X` close button from `FloatingChat.tsx`.
2. **Toggle Event Logic:** Modified `onPointerUp` inside `FloatingChat.tsx` to call `setIsOpen(prev => !prev)` on touch release (only when the button hasn't been dragged beyond 5px).
3. **Persistent Button visibility:** Removed the `isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'` conditional class styling from the floating button, forcing it to remain fully visible (`opacity-100 pointer-events-auto`) and interactable at all times.
4. **Dynamic Icon Transition:** Conditionally rendered the icon inside the floating button: `<X size={22} />` when `isOpen === true` (representing a close action), and `<MessageCircle size={22} />` when `isOpen === false` (representing a chat action).
5. **Compilation Security:** Fixed type and lint errors in the untracked file `src/app/actions/coaching.ts` to ensure that ESLint check stages pass during compilation.


