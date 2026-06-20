# TECHNICAL_LOG_V13

## Vercel Deployment & Fixes
- Added a hardcoded `projectId` in `.vercel/project.json` for the `elite-yaha` project.
- Pushed the source code to GitHub: `YAHABOT/Elite-yaha`.
- Linked Vercel environment variables directly into the Production environment.
- Configured OpenAI API keys into Vercel successfully, solving the Chat `API keys not found` errors.

## Supabase Database Migration
- Configured `elite-coaching` project.
- Re-ran the database schema via `pg` connection to the Pooler URL on port 6543 (in progress) to apply the 25 migration files to fix the `table not found` errors for Tracker, Journal, and Routines.

## Next Step Architecture: Floating Chat UI
- Re-architecting the Chat page into a global layout overlay.
- It will persist across all routes using Next.js layouts or a global Context overlay.
- "Coaching" will be promoted to the center of the bottom navigation bar.
- **COMPLETED**: Created `chatEvents.ts` for global event emission.
- **COMPLETED**: Created `FloatingChat.tsx` Client Component wrapping the `ChatInterface`.
- **COMPLETED**: Added `FloatingChat` to `src/app/(app)/layout.tsx`.
- **COMPLETED**: Refactored existing `/chat/page.tsx` and `/chat/[sessionId]/page.tsx` routes into client redirectors that fire `chatEvents.openChat()` to prevent breaking existing deep links.
- **COMPLETED**: Removed the Chat tab from `MobileBottomNav.tsx` and increased the font size of the central Coaching tab.
