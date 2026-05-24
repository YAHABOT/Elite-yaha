---
name: ui-ux-pro-max
description: High-end design intelligence for building premium, professional UI/UX in YAHA.
---

# Skill: UI UX Pro Max (YAHA Edition)

This skill transforms generic AI-generated interfaces into professional, production-grade products by applying advanced design intelligence, curated tokens, and industry-specific reasoning.

## 🎨 Core Design Philosophies

1. **Aesthetics First**: Every UI must WOW the user. Use vibrant gradients, glassmorphism, and balanced white space.
2. **Contextual Intelligence**: Designs must adapt to the product category (YAHA is a Performance/Health app → Mix of "Emerald-Swiss" for finance/data and "Cyber-Neon" for health goals).
3. **Motion by Default**: Subtle micro-animations (hover, load, transition) are mandatory for a premium feel.
4. **Master + Overrides**: Maintain a global `DESIGN_SYSTEM` but allow page-level overrides.

---

## 🛠 Design System Tokens (Lite)

### High-ROI Style Presets
- **Glass-Dark**: `#0f172a` bg, `backdrop-blur-md`, white/10 border, subtle cyan/purple glows.
- **Neo-Minimal**: pure `#ffffff` bg, thick `#000000` borders (2px), sharp corners, vibrant accent colors (e.g., `#ffde59`).
- **Midnight-OLED**: `#000000` bg, intense primary accents (Vivid Blue `#3b82f6`), deep shadows.

### Premium Palettes (YAHA Optimized)
| Name | Primary | Secondary | Background | Vibe |
| :--- | :--- | :--- | :--- | :--- |
| **YAHA-Performance**| `#10b981` | `#059669` | `#f8fafc` | Focus, Clarity, Achievement |
| **Cyber-Neon** | `#00f2ff` | `#7000ff` | `#0a0b10` | Futuristic, Tech, Energy |
| **Emerald-Swiss** | `#059669` | `#10b981` | `#ffffff` | Clean, Financial, Professional |
| **Slate-Modern** | `#64748b` | `#334155` | `#ffffff` | SaaS, Corporate, Minimal |

---

## 🚀 Workflow: Designing a Component for YAHA

When triggered, follow this sequence:

### 1. Style Selection (The Reasoning)
Before coding, specify:
- **Product Type**: (e.g., Dashboard, Health Log, Trading Chart)
- **Style Keyword**: (e.g., Glassmorphism, Industrial, Organic)
- **Primary Color Pair**: (e.g., Deep Sea & Neon Mint)

### 2. Layout & Hierarchy
- Use a 12-column grid or standard Flexbox containers.
- Prioritize the "F-Pattern" for reading.
- Ensure `h1` and `h2` have distinct, premium typography (e.g., Inter, Outfit, or Cal Sans).

### 3. Implementation (Code)
- **Framework**: prioritize **Next.js + Tailwind CSS + shadcn/ui**.
- **Components**: use `src/components/ui` patterns but with "Pro Max" enhancements (custom gradients, shadows, and transitions).
- **Responsive**: always verify Mobile (`sm:`), Tablet (`md:`), and Desktop (`lg:`).

---

## ✅ Pre-Delivery Anti-Pattern Check
*   [ ] Is there enough contrast for accessibility? (WCAG AA)
*   [ ] Are the borders/shadows subtle or intentional? (Avoid generic defaults)
*   [ ] Does it look "flat"? (Add a background gradient or mesh to fix)
*   [ ] Are targets clickable/touch-friendly? (min 44px)
*   [ ] Is there a loading/empty state defined?

---

> [!TIP]
> To "Zero-Shot" a stunning design in YAHA, ask: *"Apply UI UX Pro Max logic to a [Component Name] using the YAHA-Performance palette with a Glass-Dark style."*
