# Session Log - 2026-06-20

## Summary of Changes
- Addressed user feedback regarding chat UI behavior: The floating widget previously closed upon navigation because selecting a new chat triggered a router push, unmounting the `ChatInterface`.
- Implemented `onSessionSelect` in `ChatSidebar.tsx` and `FloatingChat.tsx` so the floating chat seamlessly swaps sessions internally without navigating the browser URL.
- Fixed the Action Card content mapping. The `prompt-builder.ts` was outputting verbose markdown bulleted lists for math calculations which broke the UI presentation in the Action Cards. Updated Rule 13 "CALCULATION RULE" to enforce a simple, elegant single-sentence math calculation (e.g., "64g x 3.05 kcal = 195 kcal").
- Vercel deployment of the fixes initiated and verified successfully.

## Next Steps
- User will test the new chat switching behavior to ensure it keeps the popup open.
- User will test logging an item with math to ensure the presentation inside the Action Card is elegant and matches the "original app".
