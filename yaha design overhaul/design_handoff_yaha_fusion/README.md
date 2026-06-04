# YAHA — Design Handoff: Fusion Theme
**Prepared for:** Claude Code  
**Date:** May 31, 2026  
**Design tool:** HTML prototypes (see bundled files)

---

## Overview

This package contains the full visual redesign of **YAHA** — a personal health tracking app built in Next.js. The design is called **Fusion**: it combines Aurora's rounded, spacious card layout with the Masterlog dashboard's deep navy color palette and a custom three-font typographic system.

The bundled HTML files are **high-fidelity design references** — prototypes showing intended look, layout, and behavior. Your task is to **recreate these designs in the existing YAHA Next.js codebase** using its established patterns (Tailwind CSS, existing components, etc.). Do not ship the HTML directly.

---

## Fidelity

**High-fidelity.** Colors, typography, spacing, border radii, shadows, and interactions are all final. Recreate pixel-accurately using the existing codebase patterns. Every `var(--*)` token below maps to a Tailwind `arbitrary value` or a CSS custom property in `globals.css`.

---

## Design Token System

Add these CSS custom properties to `globals.css` (or your existing token file) under a `.dark` or `:root` scope:

```css
/* ── Fusion Theme ─────────────────────────────────────── */

/* Backgrounds */
--yaha-bg:        #050c1a;   /* page background */
--yaha-surface:   #091424;   /* cards */
--yaha-surface2:  #0e1d34;   /* inner cards, nested surfaces */
--yaha-raise:     #0f2040;   /* hover states, progress tracks, segmented controls */

/* Borders */
--yaha-border:    rgba(0, 212, 255, 0.13);   /* default card border */
--yaha-border2:   rgba(0, 212, 255, 0.38);   /* emphasis border, active states */

/* Text */
--yaha-text:      #e2e8f0;   /* primary text */
--yaha-muted:     #94a3b8;   /* secondary text, labels */
--yaha-faint:     #475569;   /* placeholder text, disabled, dividers */

/* Accent */
--yaha-accent:    #00d4ff;   /* primary CTA, active tabs, highlights */
--yaha-accent-ink:#000d1a;   /* text ON accent backgrounds */
--yaha-accent2:   #a855f7;   /* secondary accent (purple), gradients */

/* Category colors */
--yaha-nutrition: #00ff9d;   /* Food tracker */
--yaha-sleep:     #a855f7;   /* Sleep tracker */
--yaha-workout:   #ff6b35;   /* Workout / training tracker */
--yaha-mood:      #00d4ff;   /* Mood tracker */
--yaha-water:     #22d3ee;   /* Hydration tracker */
--yaha-heart:     #ef4444;   /* Heart rate */

/* Spacing */
--yaha-pad:  20px;   /* screen horizontal padding */
--yaha-gap:  14px;   /* gap between cards */

/* Radii */
--yaha-r-lg:   26px;
--yaha-r-md:   20px;
--yaha-r-sm:   14px;
--yaha-r-pill: 999px;

/* Glow / shadows */
--yaha-glow: 0 0 16px -4px rgba(0,212,255,0.45), 0 0 0 1px rgba(0,212,255,0.15);
```

---

## Typography System

Install from Google Fonts (or swap for purchased files — see Font Swap section):

```html
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,600;0,700;1,700&family=Share+Tech+Mono&family=Audiowide&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Font roles

| Role | Font | Usage | CSS |
|------|------|-------|-----|
| **Display** | Chakra Petch 700 italic | Page titles (h1), tracker names, section headers, modal titles, "YAHA ASSISTANT" | `font-family: 'Chakra Petch'; font-weight: 700; font-style: italic; text-transform: uppercase; letter-spacing: 0.06em` |
| **Mono / Data** | Share Tech Mono | All numeric field values ("502 Kcal", "36.92 g", "7:01", "86"), timestamps | `font-family: 'Share Tech Mono'; font-weight: 400; letter-spacing: 0.04em` |
| **UI Labels** | Audiowide | Field label keys ("ITEM NAME", "CALORIES"), eyebrow text, tab bar labels, badge text, "TOTALS CONFIG", "CHOOSE WHAT SHOWS…" | `font-family: 'Audiowide'; font-size: 9–11px; letter-spacing: 0.10–0.14em; text-transform: uppercase` |
| **Body** | Inter | All other body copy, chat messages, descriptions, button labels | `font-family: 'Inter'` |

### Font swap (when purchased)
Once you have the `.woff2` files for Cyberhype (display), Unhuman (mono), and Omnitrinx (UI labels), add `@font-face` blocks and replace the three Google Font families above with:
```css
@font-face { font-family: 'Cyberhype'; src: url('/fonts/Cyberhype.woff2'); }
@font-face { font-family: 'Unhuman';   src: url('/fonts/Unhuman.woff2');   }
@font-face { font-family: 'Omnitrinx'; src: url('/fonts/Omnitrinx.woff2'); }
```
Then in your token file replace `'Chakra Petch'` → `'Cyberhype'`, `'Share Tech Mono'` → `'Unhuman'`, `'Audiowide'` → `'Omnitrinx'`.

---

## Background Treatment

Every screen has a subtle radial glow + faint cyan grid:

```css
.yaha-screen {
  background-color: var(--yaha-bg);
  background-image:
    radial-gradient(120% 60% at 80% -10%, rgba(0,212,255,0.09), transparent 60%),
    radial-gradient(60% 40% at 10% 95%, rgba(168,85,247,0.06), transparent 55%),
    linear-gradient(rgba(0,212,255,0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,212,255,0.022) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 44px 44px, 44px 44px;
}
```

---

## Screens

### 1. Dashboard

**Purpose:** Overview of the day. Morning routine banner + 6 stat widgets.

**Layout:**
- Vertical scroll. Padding: 20px horizontal, 84px bottom (clears tab bar).
- Morning Protocol banner card (full-width, gradient tint).
- "Skip Morning Routine" ghost button (full-width, dashed border).
- "Dashboard / [date]" header + Edit + Add Widget chips.
- 2-column grid of 6 stat widgets, `gap: 14px`.

**Morning Protocol card:**
- Background: `linear-gradient(135deg, rgba(0,212,255,0.18), var(--yaha-surface))`
- Border: `1px solid var(--yaha-border2)`
- Icon square: 46×46px, radius 13px, `bg: var(--yaha-accent)`, color `var(--yaha-accent-ink)`
- Title: Inter 700 16px. Subtitle: Inter 14px muted.
- CTA button: "Start →" accent pill, height 40px.

**Skip button:**
- Full-width, height ~42px, radius `var(--yaha-r-md)`
- Border: `1px dashed var(--yaha-border2)`. Background transparent.
- Text: Audiowide 10px, faint, uppercase, letter-spacing 0.14em.

**Widget card (×6):**
- Background: `var(--yaha-surface)`. Border: `1px solid var(--yaha-border)`.
- Radius: `var(--yaha-r-md)`. No padding — top accent line + inner padded section.
- Top accent line: `height: 2px`, `linear-gradient(to right, transparent, <category-color>, transparent)`.
- Icon: 16px, category color.
- Label: Audiowide 10px uppercase faint, right-aligned.
- Value: Share Tech Mono 26px, `linear-gradient(135deg, var(--yaha-accent), var(--yaha-accent2))` gradient text fill.
- Unit: Audiowide 11px muted.

---

### 2. Journal

**Purpose:** Day-by-day log browser. Date navigation + correlations + per-tracker entry groups.

**Date header (fixed, not scrolling):**
- Hamburger menu icon (left) + left chevron + date label (center) + right chevron.
- Date label: Audiowide eyebrow "SATURDAY" + Inter 700 15px "May 30, 2026".
- Border-bottom: `1px solid var(--yaha-border)`.

**Correlations section:**
- Section label: Audiowide eyebrow + "+ New" accent link.
- 2-column grid of correlation cards (`var(--yaha-surface2)`, radius `var(--yaha-r-md)`, padding 14px).
- Label: Audiowide 10px muted uppercase. Value when empty: Share Tech Mono 28px faint "— — —".

**Entries section:**
- Section label: Audiowide eyebrow + chip showing "N trackers".
- Each tracker group is a **collapsible card** (see Tracker Group component below).

**Tracker Group Card (collapsible):**
- Border: `1px solid <category-color>22`, inner glow: `inset 0 0 24px <category-color>06`.
- Header row: 32×32 colored dot icon + Chakra Petch 700 15px name + entry-count badge + chevron toggle button.
- Toggle button: 28×28px circle, `var(--yaha-raise)` bg. Chevron down when open, right when closed.
- Default: all groups open.
- Entry cards nested inside (see Entry Card component).

---

### 3. Chat (AI Logging)

**Purpose:** Conversational food/supplement/workout logging with AI confirm-to-log cards.

**Header:**
- Back chevron + "YAHA ASSISTANT" (Chakra Petch 700 italic, uppercase, cyan→purple gradient text) + "Logging session · active" (Inter 11px muted) + "+ New Chat" chip.
- Border-bottom: `1px solid var(--yaha-border)`.

**Message bubbles:**
- AI: `var(--yaha-surface)` card, radius `var(--yaha-r-md)`, top-left corner squared to 5px. Inter 14px 1.5 line-height.
- User: `var(--yaha-accent)` bg, `var(--yaha-accent-ink)` text, Inter 500 14px. Top-right corner squared.

**Confirm-to-log action card:**
- Background: `var(--yaha-surface)`, border `var(--yaha-border2)`. Radius `var(--yaha-r-md)`.
- Header: colored dot + "LOG · FOOD" (Audiowide eyebrow) + CHAT source badge.
- Field grid: 2-col, keys in Audiowide 10px muted uppercase, values in Share Tech Mono 14px 600.
- Confirm button: full-width accent pill + ✓. Dismiss: ghost square 46×46px + ×.

**Input dock:**
- Sits at `bottom: 72px` (above tab bar). Blurred surface bg + top border.
- Inner card: + icon circle + "Log something…" placeholder + cyan send circle button.

---

### 4. Trackers

**Purpose:** Browse and manage all tracker schemas.

**Header:** Chakra Petch h1 "TRACKERS" (gradient) + "New Tracker" accent pill button (right).

**Tracker List Card (per tracker):**
- Background: `var(--yaha-surface)`. Border: `1px solid <color>15`. Radius `var(--yaha-r-md)`.
- Top accent hairline: `height: 1px`, `linear-gradient(to right, transparent, <color>70, transparent)`.
- Corner ambient glow: absolute positioned blurred circle, 7% opacity.
- **Header row:** 44×44 icon square (radius 13px, `<color>18` bg, `<color>30` border, glow shadow) + Chakra Petch 700 16px name + **stacked buttons on the right** (Log Entry / Edit Schema / View History — all `chip` style, 7px padding, 13px font).
  - Log Entry chip: `<color>14` bg, color border.
  - Edit Schema + View History: default chip style.
- **Badges row** (below name, left-aligned): type badge (`<color>18` bg, `<color>28` border) + "N fields" badge (raise bg).
- No bottom divider.

---

### 5. Tracker Detail

**Purpose:** Full entry history for one tracker, grouped by day.

**Header:**
- "← BACK TO TRACKERS" — Audiowide 10px muted uppercase.
- Hero row: 52×52 icon square + Chakra Petch h1 gradient + "100 TOTAL ENTRIES · 6 FIELDS" Audiowide 10px muted.
- **LOG ENTRY button:** full-width, height 52px, accent gradient, Inter 900 14px uppercase, journal icon + "LOG ENTRY" text. Margin-bottom 8px.

**Day sections (collapsible):**
- Header: Audiowide eyebrow + horizontal rule + chevron circle button (26×26px).
- **Today: open by default.** All prior days: collapsed by default.
- Clicking the header row toggles open/closed.

**Entry cards** (inside each day):
- Background: `var(--yaha-surface2)`, radius `var(--yaha-r-sm)`. Padding 11px 13px.
- Top row: Share Tech Mono 11px timestamp + source badge + pencil icon + trash icon.
- Field grid: 2-col, keys in Audiowide 9–10px muted uppercase (`.flabel`), values in Share Tech Mono 14px 600.
- Wide fields (Meal Notes) span full width.

**Daily Totals & Averages card** (appears when day has ≥2 entries):
- Border: `1px solid <color>28`, inner glow `inset 0 0 28px <color>06`.
- Header: trendUp icon (category color) + "DAILY TOTALS & AVERAGES" Chakra Petch 12px uppercase (color) + CONFIGURE button (gear icon + Audiowide "CONFIGURE" text, raise bg, pill shape).
- 2-col field grid: Audiowide 9px muted key → Share Tech Mono 15px 600 value → Audiowide 9px faint aggregation label (TOTAL / AVERAGE).

---

### 6. Configure Modal (bottom sheet)

**Trigger:** Tap CONFIGURE in the Daily Totals card.

**Container:**
- Full-screen overlay: `rgba(0,0,0,0.6)` + `backdrop-filter: blur(6px)`.
- Sheet: slides up from bottom. `var(--yaha-surface2)` bg, radius `var(--yaha-r-lg)` top corners only. Border `var(--yaha-border2)` (no bottom). Max-height 82%, scrollable.
- Padding: 20px sides, 36px bottom safe area.

**Sheet header:**
- 38×38 icon (radius 11px, workout color) + Chakra Petch 700 16px tracker name + "TOTALS CONFIG" Audiowide 10px muted + × close button (32×32 circle).

**Field rows:**
- "CHOOSE WHAT SHOWS IN THE TOTALS ROW" — Audiowide 10px faint uppercase.
- Each row: Chakra Petch 600 14px field name + unit in Audiowide 10px faint + SUM / AVG / HIDE buttons.
- Active button: `var(--yaha-raise)` bg, `var(--yaha-border2)` border, full text color.
- Inactive buttons: transparent bg, `var(--yaha-border)` border, faint text.
- Button: padding 6px 10px, radius 8px, Audiowide/Inter 11px 900 uppercase.
- Rows separated by `1px solid var(--yaha-border)`.

**Save button:** Full-width ghost button, height 50px, margin-top 20px.

---

### 7. Settings

**Purpose:** Account management, daily targets, integrations, data export, appearance.

**Layout:**
- Chakra Petch h1 "SETTINGS" (gradient) + Inter 13px muted subtitle.
- Profile card: avatar (56×56 circle, cyan→purple gradient bg) + name (Inter 700 17px) + email + Edit button.
- Setting groups: Audiowide eyebrow label + card with row list.
- Each row: 34×34 swatch icon (category color 18% bg) + Inter 500 15px label + detail (Inter Mono 13px muted) OR toggle + chevron.
- Rows separated by `1px solid var(--yaha-border)`. Last row: no border.

---

## Component Specs

### Source Badge
```
CHAT     — bg: cyan 18%,   color: cyan,   border: cyan 30%
TELEGRAM — bg: purple 18%, color: purple, border: purple 30%
MANUAL   — bg: raise,      color: muted,  border: default
```
Style: `border-radius: 6px; padding: 3px 7px; font: Audiowide 10px 900 uppercase; letter-spacing: 0.1em`

### Chip (default)
```
background: var(--yaha-surface2)
border: 1px solid var(--yaha-border)
border-radius: var(--yaha-r-pill)
padding: 7px 13px
font: Inter 500 13px
display: inline-flex; align-items: center; gap: 7px
```

### Accent Button
```
background: linear-gradient(135deg, var(--yaha-accent), #0090cc)
color: var(--yaha-accent-ink)
box-shadow: 0 0 20px -4px rgba(0,212,255,0.5)
border-radius: var(--yaha-r-pill)
height: 46px; padding: 0 20px
font: Inter 700 15px
```

### Toggle
```
width: 46px; height: 28px; border-radius: 99px
OFF: background var(--yaha-raise)
ON:  background var(--yaha-accent)
Knob: 22×22px white circle, left: 3px (off) → 21px (on), transition 0.2s
```

### Tab Bar
```
position: fixed; bottom: 0; left: 0; right: 0; height: 72px
background: rgba(5, 12, 26, 0.88); backdrop-filter: blur(24px) saturate(160%)
border-top: 1px solid rgba(0,212,255,0.18)
5 tabs: Dashboard · Journal · Chat · Trackers · Settings

Each tab:
  - display: flex flex-col; align-items: center; padding-top: 10px; gap: 3px
  - Icon: 21px (Chat: 24px). Stroke 1.6 (active: 2.2)
  - Label: Audiowide 9px 900 uppercase letter-spacing 0.12em
  - INACTIVE: color var(--yaha-faint)
  - ACTIVE icon: var(--yaha-accent) + drop-shadow(0 0 5px rgba(0,212,255,0.55))
  - ACTIVE label: var(--yaha-accent2)  [purple]
  - Active bg pill: color-mix(in oklch, var(--yaha-accent) 14%, transparent), radius 99px, padding 4px 12px
```

---

## Interactions & Behavior

| Interaction | Behavior |
|---|---|
| Tracker group collapse | Toggle open/closed via chevron button. Default: open. |
| Day section collapse (Tracker detail) | Toggle open/closed. Today: open. All prior days: closed. |
| Configure modal | Opens as bottom sheet with blur overlay. SUM/AVG/HIDE buttons are togglable per field. × closes. |
| Chat confirm card | Confirm logs the entry, × dismisses. |
| Tab bar | Active tab: cyan icon glow + purple label. |

---

## Assets & Icons

All icons are inline SVG using Lucide-style paths (stroke, round caps/joins, 24×24 viewBox, strokeWidth 1.6–2.2). No external icon library needed — paths are in `yaha-shared.jsx`.

Icons used per screen:
- **Dashboard:** sun, moon, bowl, dumbbell, drop, heart, arrowUp, pencil, plus, chevronRight
- **Journal:** menu, chevronLeft/Right, sliders, link, activity, pencil, trash
- **Chat:** chevronLeft, plus, send, check, x, journal
- **Trackers:** activity, journal, pencil, eye, chevronRight
- **Tracker detail:** chevronLeft, trendUp, journal, chevronDown/Right, pencil, trash, gear, x
- **Settings:** bowl, moon, drop, bolt, message-square, bell, download, boxes, sliders

---

## Files in This Package

| File | Purpose |
|------|---------|
| `YAHA Redesign.html` | Full canvas with all 5 theme directions + Fusion full app (open in browser, pan/zoom) |
| `yaha.css` | All design tokens (all 5 themes), component base styles, typography |
| `yaha-shared.jsx` | Shared React components: Icon, TabBar, Ring, SourceBadge, EntryCard, TrackerGroup, CollapsibleDay, DailyTotals, ConfigureModal |
| `dashboards.jsx` | Three dashboard directions (Aurora, Ember, Tide) |
| `aurora-a.jsx` | Journal, Trackers list, Tracker detail, Tracker detail + configure screens |
| `aurora-b.jsx` | Dashboard (accurate), Chat, Settings |
| `ios-frame.jsx` | iPhone device frame (design canvas only, not needed in app) |
| `design-canvas.jsx` | Pan/zoom design canvas (design canvas only, not needed in app) |

---

## Implementation Priority

1. **Design tokens** → `globals.css`
2. **Google Fonts** → `layout.tsx` or `_document.tsx`
3. **Tab bar** → global layout component
4. **Card + chip + button** → update existing UI primitives
5. **Entry card + field label typography** → apply `.flabel` (Audiowide) and Share Tech Mono to all field key/value pairs
6. **Tracker Group collapse** → add `useState` toggle to existing tracker group component
7. **Collapsible day sections** → add `useState` toggle to history list
8. **Daily Totals card** → new component, render when `entries.length >= 2` for a given day
9. **Configure modal** → new bottom sheet, triggered from Daily Totals CONFIGURE button
10. **Background gradient** → add to root layout or page wrapper

---

## Notes for Claude Code

- The existing app is **Next.js + Tailwind**. Map token hex values to Tailwind `arbitrary values` (e.g. `bg-[#050c1a]`) or extend `tailwind.config.js` with the token names above.
- The Fusion theme is the **only direction to implement** — ignore Aurora, Ember, Tide, Masterlog, Hyper rows in the design canvas.
- The `dir-fusion` CSS class in `yaha.css` contains the complete token set — read it as the source of truth for all values.
- Field label font (Audiowide) and field value font (Share Tech Mono) must be applied **globally** to all tracker entry displays — this affects Journal, Tracker detail, and Chat confirm cards.
- Daily Totals card should only render when `entries.length >= 2` for the current day group.
- Configure modal state can live locally in the Tracker detail page component.
