# Technical Log v1 — 2026-06-14

## Task 1: PWA bottom nav safe area fix

### Problem
iPhone 12 Pro in standalone PWA mode (Add to Home Screen): bottom nav icons and labels overlapping. Works fine in Safari and on Samsung.

### Root Cause
```
height: 62 (fixed)
paddingBottom: env(safe-area-inset-bottom)   ← iPhone PWA = 34px
```
Content area = 62 - 34 = 28px. Icons (20px) + labels (8px + 6px gap) = 34px needed. Overlap.

In Safari: safe-area = 0 → content = 62px → fine.
On Samsung: safe-area = 0 → content = 62px → fine.

### Fix
`src/components/nav/MobileBottomNav.tsx`
```
height: 'calc(62px + env(safe-area-inset-bottom, 0px))'   // was: 62
paddingBottom: 'env(safe-area-inset-bottom, 0px)'          // was: 'env(safe-area-inset-bottom)'
```
Nav GROWS to accommodate safe area. Content area always = 62px.

Device behaviour after fix:
| Device | safe-area-inset-bottom | nav height | content area |
|--------|----------------------|------------|--------------|
| Samsung 3-button | 0px | 62px | 62px ✓ |
| Android gesture nav | ~24px | 86px | 62px ✓ |
| iPhone in Safari | 0px | 62px | 62px ✓ |
| iPhone PWA standalone | 34px | 96px | 62px ✓ |

### Commit
`6e8c549` — deployed via `vercel deploy --prod`

---

## Task 2: PWA top notch + chat input gap

### Problem A — Page headers behind notch (Trackers, Journal, Chat)
Content layout `pt-4` = 16px. iPhone 12 Pro PWA `env(safe-area-inset-top)` ≈ 47px. Pages with prominent headers at y=0 get clipped behind the status bar.

Dashboard and Settings not visibly broken (content is visually forgiving at top, no large heading right at y=0).

### Fix A — Content layout
`src/app/(app)/(content)/layout.tsx`
```
pt-4  →  pt-[max(1rem,env(safe-area-inset-top,0px))]
```
- Samsung: max(16px, 0) = 16px — no change
- iPhone PWA: max(16px, 47px) = 47px — clears notch

### Fix A — Chat headers (separate layout, doesn't use content layout)
`src/components/chat/ChatInterface.tsx` line 1057:
```
py-3  →  pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]
```
`src/components/chat/MobileChatHome.tsx` line 306:
```
py-4  →  pb-4 pt-[max(1rem,env(safe-area-inset-top,0px))]
```

### Problem B — Large gap between chat input and nav bar (iPhone PWA only)
Chat input bars had `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`.

iPhone PWA: pb = 16 + 34 = 50px INSIDE the input bar → bar looks 34px taller than on Samsung with dead space below the text field.

Samsung: pb = 16 + 0 = 16px → looks normal.

The main element already handles the nav offset via `pb-[calc(4rem+env(safe-area-inset-bottom,0px))]` (= 98px on iPhone PWA). The chat input bar doesn't need its own safe-area padding.

### Fix B
`src/components/chat/ChatInterface.tsx` line 1355:
```
pb-[calc(1rem+env(safe-area-inset-bottom,0px))]  →  pb-4
```
`src/components/chat/MobileChatHome.tsx` line 501:
```
pb-[calc(1rem+env(safe-area-inset-bottom,0px))]  →  pb-4
```
Samsung: was 16px, now 16px — no change.
iPhone PWA: was 50px, now 16px — gap eliminated.

### Commit
`e4b1411` — deployed via `vercel deploy --prod`

---

[CA | 18:15] Delivered v1
