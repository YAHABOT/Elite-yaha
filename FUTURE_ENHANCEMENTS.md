# Future Enhancements

## shadcn/ui Design System Integration (UI Upgrade)

**Priority:** High (foundational design system, long-term UI quality)

**Enhancement:** Migrate YAHA's UI component library to shadcn/ui to establish a professional, scalable design system with 80+ pre-built accessible components.

**What is shadcn/ui:**
- Open source React component library built on Radix UI + Tailwind CSS
- "Copy-paste" architecture — components are customizable code, not locked dependencies
- 80+ components (buttons, cards, forms, dialogs, tables, charts, etc.)
- Dark mode support, RTL languages, accessibility-first (WCAG compliant)
- Theming via CSS variables (matches YAHA's current OLED theme approach)
- GitHub repo: **https://github.com/shadcn-ui/ui** (111k+ stars)

**Current State:**
- YAHA has custom UI components (Card, Button, Input, Badge primitives)
- Design tokens exist but scattered across Tailwind config + inline utility classes
- No unified component registry or Figma integration

**Desired State:**
- shadcn/ui components integrated alongside YAHA's existing tracker/chat-specific components
- Figma design system connected to code via Figma Code Connect
- Component library documented in Figma with live updates from GitHub
- Reusable primitives (form inputs, modals, tables) use shadcn/ui base
- YAHA-specific components (ActionCard, ChatBubble, TrackerCard) extend shadcn base components
- Design tokens (OLED colors, spacing, typography) match current implementation

**Integration Strategy (Phased):**

**Phase 1 — Research & Setup:**
- [ ] Map YAHA's existing components → shadcn/ui equivalents
- [ ] Create Figma design system file from shadcn/ui Figma community kit
- [ ] Set up Code Connect rules (Figma → code mappings)
- [ ] Customize shadcn/ui color palette to match YAHA OLED tokens (#050505, #10b981, etc.)

**Phase 2 — Gradual Migration:**
- [ ] Start with utility components (Button, Badge, Input, Card) — replace YAHA primitives
- [ ] Migrate form components (forms, inputs, selects) to shadcn/ui base
- [ ] Keep YAHA-specific logic-heavy components (ActionCard, ChatBubble) but style with shadcn tokens

**Phase 3 — Figma Integration (Design ↔ Code):**
- [ ] Set up Figma Code Connect in component library
- [ ] Link Figma components to their code implementations in `src/components/ui/`
- [ ] Sync design tokens (colors, spacing, typography) from Figma to Tailwind config
- [ ] Enable designers to propose UI changes in Figma → engineers implement via connected code

**Implementation Notes:**
- `npm install -D shadcn-ui` or use the CLI: `npx shadcn-ui@latest init`
- Components installed to `src/components/ui/` (doesn't conflict with feature components in `src/components/`)
- Theming: Customize CSS variables in `globals.css` to match YAHA OLED colors
- Figma setup: Use Figma community kit (search "shadcn/ui") as starting point, customize with YAHA branding
- Code Connect: Add `shadcn.ui.tsx.code.ts` metadata files to link Figma → component code

**Files to Modify/Create:**
- `src/components/ui/` — new directory for shadcn components
- `tailwind.config.ts` — extend theme with shadcn/ui color scales
- `src/globals.css` — CSS variables for theming (OLED tokens)
- `package.json` — add shadcn-ui dependencies
- `Figma Design System file` — sync with GitHub repo, set up Code Connect
- `.figma/config.json` — Code Connect rules (Figma → code mappings)

**Files NOT to Modify:**
- `src/components/chat/`, `src/components/dashboard/`, etc. — feature components remain
- Existing custom primitives can coexist during migration

**Why Deferred:**
- Not blocking MVP features (current custom components work fine)
- Requires careful design system audit to avoid breaking existing UI
- Figma integration setup is time-intensive but high-ROI for design consistency
- Can be done incrementally — adopt shadcn/ui for new features while old components remain
- Long-term benefit: professional design system, easier onboarding for designers, consistent across all pages

**Future Wins:**
- Designers can mock UI changes in Figma → engineers implement with Code Connect
- Component consistency across all pages (dashboard, chat, journal, settings, etc.)
- Accessibility guaranteed (all shadcn components WCAG 2.1 AA)
- Dark mode built-in (YAHA OLED theme already uses dark mode, shadcn extends this)
- Community components: access 100+ community-built shadcn components (date pickers, rich editors, etc.)

---

## ActionCard Visual Polish

**Priority:** Low (cosmetic, non-blocking)

**Enhancement:** Add blue ring border + "EDITING" badge text overlay to entire ActionCard when edit mode is active.

**Current State:**
- Fields grid contains inputs with blue borders when editing
- Badge text toggles between "Pending Log" and "EDITING"
- No full-card visual boundary

**Desired State:**
- Entire ActionCard surrounded by `ring-1 ring-blue-500/40` when `isEditExpanded` is true
- "EDITING" text positioned in top-right corner of the ring (like a label)
- Smooth transition in/out of edit mode

**Files to Modify:**
- `src/components/chat/ActionCard.tsx` — wrapper styling + "EDITING" badge positioning

**Why Deferred:**
- Functionality is 100% correct — editing works, fields update, persistence works
- This is purely visual polish
- Can be added in a future sprint without affecting core workflows

---

## Clipboard Image Paste in Chat

**Priority:** Medium

**Enhancement:** Allow users to paste images directly from clipboard into the chat input (Ctrl+V / Cmd+V).

**Desired State:**
- User copies a screenshot or photo to clipboard
- Pastes into chat textarea → image preview appears inline
- Submits alongside the message text
- Gemini processes the image as an attachment

**Files to Modify:**
- `src/components/chat/ChatInterface.tsx` — `onPaste` event handler on the textarea, base64 encode the clipboard image, add to attachments state

**Why Deferred:**
- Not blocking any core logging or routine workflows
- Requires careful UX (preview, remove button, file size limits)

---

## Show All Tracker Fields in Edit Mode (ActionCard)

**Priority:** Medium

**Enhancement:** When the user expands the edit panel on an ActionCard, show ALL fields from the tracker schema — not just the ones the AI detected and logged.

**Current State:**
- If tracker has 8 fields but AI only logged 4, only 4 fields appear in edit mode
- User cannot fill in the missing 4 fields from the card

**Desired State:**
- Edit mode shows all 8 fields
- Unlogged fields show as blank inputs
- User can fill them in before confirming

**Implementation Note:**
- `card.fieldLabels` already contains ALL field IDs from the schema (route populates this for all fields, not just logged ones)
- `editableFields` init needs to iterate `Object.keys(card.fieldLabels)` instead of `Object.keys(card.fields)`
- Render loop in edit mode should use `card.fieldLabels` as the source of truth

**Files to Modify:**
- `src/components/chat/ActionCard.tsx` — `editableFields` init + edit mode render loop

---

## Hardcoded Food Tracker with AI-Specific Prompts + User Field Extension

**Priority:** High (core MVP feature)

**Enhancement:** Create a pre-built "Food" tracker (hardcoded at user creation) that:
1. Ships with standard fields (Meal Name, Calories, Protein, Carbs, Fat, Fiber, logged timestamp)
2. Has AI-specific prompt rules for parsing food logs (e.g., "if user mentions portion size + food item, extract calories estimate")
3. Allows users to add custom fields to this tracker (e.g., "Sodium", "Sugar", "Restaurant Name")

**Current State:**
- All trackers are user-created
- Food logging works but requires the user to set up a nutrition tracker first
- AI treats all trackers generically — no domain-specific prompts

**Desired State:**
- Every new user gets a "Food" tracker pre-populated
- This tracker cannot be deleted (soft-delete only)
- System prompt includes specific food parsing rules (nutrient extraction, portion size interpretation, unit conversions)
- Users can extend this tracker by adding custom fields via the settings UI
- Custom fields persist alongside hardcoded fields in the same `schema` JSONB

**Implementation Notes:**
- Hardcoded tracker created in user signup flow (check if "Food" exists before creating)
- Tracker schema includes: `isHardcoded: true` flag + `extendable: true` flag
- Custom fields appear at the end of the schema, after hardcoded fields
- System prompt gains a "FOOD_PARSING_RULES" section for nutrient extraction logic

**Files to Modify:**
- `src/lib/db/trackers.ts` — add `createDefaultTrackers()` function called on user signup
- `src/lib/ai/prompt-builder.ts` — add `FOOD_PARSING_RULES` constant injected into food logs prompts
- `src/components/trackers/TrackerCard.tsx` — disable delete button if `isHardcoded: true`
- `src/app/(app)/trackers/[id]/settings/page.tsx` — UI to add custom fields to Food tracker
- `src/types/action-card.ts` — extend schema to include `isHardcoded` and `extendable` flags

**Why Deferred:**
- Requires coordination between tracker creation, prompt injection, and user signup
- UI for custom field extension needs careful validation
- Non-blocking for basic food logging (which already works)

---

## Calorie Balance (Surplus/Deficit) Auto-Calculation

**Priority:** High (analytics feature, user engagement)

**Enhancement:** Automatically detect when a user has logged both food intake AND a TDEE metric, then calculate and display calorie balance (surplus/deficit) in the journal or dashboard.

**Current State:**
- Users can log food (calories) and TDEE separately
- No automatic correlation or balance calculation
- Manual calculation required

**Desired State:**
- System recognizes when both "Food Calories" and "TDEE/Daily Burn" logs exist for the same day
- Automatically computes: `totalCalories - tdee = balance`
- Displays balance in the journal (e.g., "**+500 kcal surplus**" in green or red badge)
- Available on the dashboard as a stat card if user adds both fields to relevant trackers

**TDEE Recognition Rules:**
The AI (and system) must recognize TDEE under multiple names depending on tracker naming:
- **Calories In:** "Calories" (food tracker), "Daily Intake", "Food Energy"
- **TDEE/Calories Out:** "TDEE", "Daily Burn", "Energy Expenditure", "Calories Burned", "Daily Energy Spend"
- **Manual Baseline:** "Maintenance Calories", "Calorie Target", "Daily Goal"

The system should match ANY of these field names and automatically link them for balance calculation.

**Implementation Notes:**
- Add a `calculateDailyBalance()` RPC function in Supabase that:
  - Queries `tracker_logs` for a given day
  - Finds fields matching the TDEE/Calories In pattern via field name fuzzy match or explicit tag
  - Returns `{ totalCalories, tdee, balance, balanceStatus: 'surplus' | 'deficit' | 'maintenance' }`
- Store the result in `daily_stats` JSONB under a `calorieBalance` key
- Fetch balance on journal day-view load + dashboard startup
- Render as a badge in the journal and a stat card on the dashboard

**Files to Modify:**
- `supabase/migrations/` — new RPC `calculate_daily_balance(p_user_id, p_date)`
- `src/lib/db/logs.ts` — add `getDailyBalance(date)` wrapper
- `src/lib/ai/prompt-builder.ts` — document the TDEE field name recognition rules in system prompt (so AI knows which fields will be auto-linked)
- `src/app/(app)/journal/[date]/page.tsx` — fetch + display balance badge
- `src/components/dashboard/BalanceCard.tsx` — new card component for surplus/deficit stat
- `src/types/action-card.ts` — define `BalanceResult` type

**Why Deferred:**
- Requires RPC for efficient daily aggregation
- Depends on food + TDEE trackers both being set up (educational step)
- Non-blocking for basic logging
- Nice-to-have for engagement / analytics

---

## Enter-to-Send Setting (Chat)

**Priority:** Medium

**Enhancement:** Add a Settings page toggle — "Send message on Enter (keyboard)" — that controls whether the Enter key submits the chat input or inserts a newline.

**Desired State:**
- Mobile default: OFF (Enter inserts newline; Shift+Enter behaviour unchanged)
- Desktop default: ON (current behaviour — matches existing `onKeyDown` handler)
- User can override the default in Settings

**Implementation Notes:**
- `onKeyDown` handler in `ChatInterface.tsx` and `MobileChatHome.tsx` must read the user preference before deciding whether to submit
- Preference stored in `users.stats` JSONB (key: `enterToSend`) OR a dedicated boolean column on `users`
- Preference fetched server-side on page load; passed as a prop or read via a client-side hook

**Files to Modify:**
- `src/components/chat/ChatInterface.tsx` — update `onKeyDown` to check preference
- `src/components/chat/MobileChatHome.tsx` — update `onKeyDown` to check preference
- `src/app/(app)/settings/page.tsx` — add toggle UI
- `src/app/actions/settings.ts` — server action to persist preference
- `src/lib/db/users.ts` — read/write `enterToSend` preference

**Why Deferred:**
- Current behaviour (Enter to send on all devices) is fine for MVP
- Mobile UX improvement — prevents accidental submits when writing long messages

---

## Food Bank (after food tracker ships)

**Priority:** Medium (quality-of-life for frequent food loggers)

**Enhancement:** User-managed list of saved food items with pre-filled macro values, accessible from the Food tracker log view or via chat command.

**Desired State:**
- User can save a food item (name + macros) to their Food Bank
- When logging, user can say "log [saved item]" and the AI pre-fills the card from their saved data
- Food Bank accessible from a dedicated panel in the Food tracker view
- Items can be edited or deleted

**Architecture Decision (deferred):**
- Option A: Store food bank in `food_bank` JSONB on `users` table — simple, no new table, limited querying
- Option B: New `food_items` table — proper indexing, supports search, scales better
- Decision: Defer until food tracker ships and usage patterns are clearer

**Privacy Decision (deferred):**
- Food bank is user-private OR globally shared (community food database)
- Recommendation: start user-private; add community sharing as a later feature

**Files to Modify (when implemented):**
- `supabase/migrations/` — new `food_items` table OR `users.food_bank` JSONB column
- `src/lib/db/food-bank.ts` — new DAL file: `getFoodItems`, `createFoodItem`, `deleteFoodItem`
- `src/app/(app)/trackers/[id]/page.tsx` — Food Bank panel in Food tracker view
- `src/lib/ai/prompt-builder.ts` — inject user's saved food items into system prompt context
- `src/types/food-bank.ts` — `FoodItem` type definition

**Why Deferred:**
- Requires food tracker to ship first (hardcoded Food tracker feature above)
- Architecture decision (table vs JSONB) should be made with real usage data
- Non-blocking for core food logging workflow
