import type { OnboardingStepId } from '@/lib/db/onboarding'

export type StepPlatform = {
  name: string
  note: string
  steps: string[]   // supports **bold** markers
}

export type StepConfig = {
  id: OnboardingStepId
  title: string
  shortTitle: string
  description: string
  icon: string                // lucide icon name — consumer imports dynamically
  screenshots: string[]       // e.g. ['/onboarding/step-1a.png', '/onboarding/step-1b.png']
  gifs: string[]              // e.g. ['/onboarding/step-1.gif'] — deferred, swap when recorded
  platforms?: StepPlatform[]  // renders instead of screenshot carousel when present
  ctaLabel?: string
  ctaHref?: string
  ctaNote?: string            // small note shown below the CTA button
  cta2Label?: string
  cta2Href?: string
  completionType: 'auto' | 'manual' | 'optional'
}

export const ONBOARDING_STEPS: StepConfig[] = [
  {
    id: 'home_screen',
    title: 'Add YAHA to Your Home Screen',
    shortTitle: 'Home Screen',
    description:
      'YAHA works best as an app. Add it to your home screen so it opens full-screen with no browser chrome — faster, cleaner, and always one tap away.',
    icon: 'Smartphone',
    screenshots: [],
    gifs: [],
    platforms: [
      {
        name: 'iPhone / iPad',
        note: 'Safari only',
        steps: [
          'Open YAHA in **Safari** (not Chrome or Firefox)',
          'Tap the **Share** button at the bottom of the screen',
          'Scroll down and tap **Add to Home Screen**',
          'Tap **Add** — done',
        ],
      },
      {
        name: 'Android',
        note: 'Chrome recommended',
        steps: [
          'Open YAHA in **Chrome**',
          'Tap the **⋯ three-dot menu** in the top right',
          'Scroll down until you find **Add to Home Screen** or **Install App**',
          'Confirm — the YAHA icon will appear on your home screen',
        ],
      },
    ],
    completionType: 'manual',
  },
  {
    id: 'profile',
    title: 'Set Up Your Profile',
    shortTitle: 'Profile',
    description:
      'Before you start logging, fill in your basic details — alias (what YAHA calls you), date of birth, height, and gender. YAHA uses these to give you more personalised insights.',
    icon: 'UserCircle',
    screenshots: ['/onboarding/step-2-profile.png'],
    gifs: [],
    ctaLabel: 'Go to Profile',
    ctaHref: '/settings/profile',
    ctaNote: 'Once done, tap the floating guide button to come back here.',
    completionType: 'manual',
  },
  {
    id: 'trackers',
    title: 'Set Up Your Trackers',
    shortTitle: 'Tracker Setup',
    description:
      'Trackers are the heart of YAHA — they tell the AI where to put your data. Sleep, nutrition, workouts, habits — you can track literally anything.\n\n**Recommended:** go to **Chat** → describe what you want to track (SC1–2), or drop a screenshot from wherever you currently log your data — Fitbit, Apple Health, a spreadsheet (SC3–4) — and the AI reads the fields off automatically. If anything looks off, just tell the AI and it will adjust — or press **Create Tracker** in the chat, then go to **Trackers**, find your tracker, and tap **Edit Schema** to fix it manually.\n\nOr go to **Trackers** → tap **Add Tracker** to build one manually, field by field.\n\nEach field needs a type: **Number**, **Duration**, **Time**, **Rating**, **Select** (single or multi), or **Text**.',
    icon: 'LayoutGrid',
    screenshots: ['/onboarding/step-3-trackers-1.png', '/onboarding/step-3-trackers-2.png', '/onboarding/step-3-trackers-3.png', '/onboarding/step-3-trackers-4.png'],
    gifs: [],
    ctaLabel: 'Create with Chat',
    ctaHref: '/chat/new?prompt=I+want+to+set+up+a+new+tracker',
    cta2Label: 'Build Manually',
    cta2Href: '/trackers/new',
    completionType: 'auto',
  },
  {
    id: 'tracker_page',
    title: 'Using the Trackers Page',
    shortTitle: 'Trackers',
    description:
      'Once your trackers are set up, the **Trackers** page is your hub for managing them. Each tracker card shows its name, type, and fields — and has an **Add Log** button right on the card if you want to log an entry manually without going through chat.\n\nTap **View History** to see the full log history for that tracker. There\'s a **search** with a **date range filter** if you\'re looking for a specific entry. From there you can **add a new log entry**, tap any existing entry to **expand and edit** it, **delete** it, or hit **Log Again** to instantly re-log the exact same entry.\n\nTap **Edit Schema** to change the tracker\'s fields — rename them, change types, or add new ones. You can also **archive** a tracker from here — it disappears from the Trackers page but all its data is preserved. To access archived trackers, tap the **Archives** button at the bottom of the Trackers page — you can view their data or restore them at any time. If you need to delete a tracker entirely, that\'s in here too.',
    icon: 'LayoutGrid',
    screenshots: ['/onboarding/step-4-tracker-page-1.jpg', '/onboarding/step-4-tracker-page-2.jpg', '/onboarding/step-4-tracker-page-3.jpg'],
    gifs: [],
    ctaLabel: 'Go to Trackers',
    ctaHref: '/trackers',
    completionType: 'manual',
  },
  {
    id: 'first_log',
    title: 'Logging with Chat',
    shortTitle: 'Chat',
    description:
      'Chat is how you log everything. Type what happened in plain language, or just upload a photo, screenshot, or file — if the uploaded content has enough info, you don\'t need to type anything at all. YAHA figures out which tracker it belongs to automatically.\n\nOnce it reads your data it shows a **confirmation card**. From there you can **confirm** to log it, tell the AI if something\'s off and it will adjust, or tap the **pencil icon** at the top right of the card to edit the entry yourself.\n\nAt the bottom left of the chat you\'ll find the **attachment button** — tap it to open your camera, gallery, or file picker, or to attach a saved item from your **Food Bank**. Right next to it is the **agent selector**, where you can switch to a specialised AI agent for deeper tasks.\n\nTo **save a chat**, tap the **save button** at the top right. To manage your saved chats or start a new one, tap the **menu button** at the top left.',
    icon: 'MessageCircle',
    screenshots: [],
    gifs: [],
    ctaLabel: 'Open Chat',
    ctaHref: '/chat/new',
    completionType: 'auto',
  },
  {
    id: 'journal',
    title: 'Explore the Journal',
    shortTitle: 'Journal',
    description:
      'The Journal shows all your logs grouped by day, with each tracker\'s entries listed under its name.\n\nTap any **tracker header** to expand it and see everything logged for it that day, with a **total or average** displayed below the first entry. Any **correlations** you\'ve created also show up here.\n\nThe totals and averages are customisable (SC2) — tap the **Configure** button to choose whether each field shows a sum or average (SC3), or hide it entirely. This only applies to fields that log more than one entry per day.\n\nTap the **menu button** at the top left (SC4) to see every day you\'ve logged — tap any date to jump straight to it. From there you can also manage or create correlations using the **Correlator** button.',
    icon: 'BookOpen',
    screenshots: ['/onboarding/step-6-journal-1.jpg', '/onboarding/step-6-journal-2.jpg', '/onboarding/step-6-journal-3.jpg', '/onboarding/step-6-journal-4.jpg'],
    gifs: [],
    ctaLabel: 'Open Journal',
    ctaHref: '/journal',
    completionType: 'manual',
  },
  {
    id: 'correlator',
    title: 'Correlations',
    shortTitle: 'Correlator',
    description:
      'Correlations are where the fun of tracking begins — pick any metrics you\'re logging and see how they relate to each other over time.\n\nAccess the **Correlator** from the menu in the Journal. From there you can create a new correlation or manage your existing ones (SC1).\n\nWhen creating one yourself, give it a name and set the **unit** (e.g. a Calorie Balance metric would use kcal). Then build your **formula** step by step — each part can be a field from one of your trackers, an existing correlation, a fixed number, or the **last logged value** of a field. That last one is useful when you don\'t log something every day — for example your weight: the most recent entry is used in the formula until you log a new one, which makes it perfect for things like tracking your BMR (SC2).\n\nNot sure where to start? Tap **Suggest** and YAHA will recommend metric combinations based on what you\'ve been tracking, so you can spot patterns you didn\'t know to look for (SC3).',
    icon: 'TrendingUp',
    screenshots: ['/onboarding/step-7-correlator-1.jpg', '/onboarding/step-7-correlator-2.jpg', '/onboarding/step-7-correlator-3.png'],
    gifs: [],
    ctaLabel: 'Open Correlator',
    ctaHref: '/journal?correlator=open',
    completionType: 'manual',
  },
  {
    id: 'routines',
    title: 'Set Up a Daily Routine',
    shortTitle: 'Routines',
    description:
      'Routines turn your morning or evening protocol into a guided chat flow — YAHA walks you through each step one by one and logs each tracker automatically as you go. Create a routine on the Routines page, then trigger it in chat by saying its name (or the trigger phrase you set). You\'ll also need a Day End routine to close out the session — it can be completely empty if you just want to mark the day done.',
    icon: 'Repeat',
    screenshots: [],
    gifs: [],
    ctaLabel: 'Create a Routine',
    ctaHref: '/routines/new',
    completionType: 'optional',
  },
  {
    id: 'targets',
    title: 'Set Your Daily Targets',
    shortTitle: 'Targets',
    description:
      'Targets let you set a daily goal for any numeric tracker field — like "at least 7 hrs sleep", "under 2000 kcal", or "at least 8 glasses of water". You choose the field, the target value, and whether higher or lower is better. Your progress toward each target shows up as widgets on the Dashboard.',
    icon: 'Target',
    screenshots: [],
    gifs: [],
    ctaLabel: 'Set Targets',
    ctaHref: '/settings',
    completionType: 'auto',
  },
  {
    id: 'food_bank',
    title: 'Build Your Food Bank',
    shortTitle: 'Food Bank',
    description:
      'The Food Bank stores meals and foods you eat regularly so you can log them instantly — instead of describing the same lunch every day, just say "log my usual chicken bowl" and YAHA fills in all the fields from the saved entry. After you confirm a food log, YAHA will ask if you want to save it to the Food Bank. You can also save and manage foods directly from the Food Bank card in chat.',
    icon: 'Utensils',
    screenshots: [],
    gifs: [],
    ctaLabel: 'Open Chat',
    ctaHref: '/chat',
    completionType: 'manual',
  },
  {
    id: 'agents',
    title: 'Meet the AI Agents',
    shortTitle: 'Agents',
    description:
      'Agents are specialised AI modes inside the chat, each focused on a specific domain. Switch to an agent when you want deeper analysis or advice — for example a nutrition agent that understands your full food history, or a fitness agent that tracks your training load. Tap the agent selector at the top of the chat to see what\'s available.',
    icon: 'Bot',
    screenshots: [],
    gifs: [],
    ctaLabel: 'Open Chat',
    ctaHref: '/chat',
    completionType: 'manual',
  },
  {
    id: 'dashboard',
    title: 'Build Your Dashboard',
    shortTitle: 'Dashboard',
    description:
      'The Dashboard is a fully customisable grid of widgets — each one tracks a specific field from one of your trackers. You can show today\'s total, a 7-day rolling average, your all-time personal best, or weekly totals. Tap the + button to add your first widget, choose the tracker and field, pick the widget type, and it appears on your home screen.',
    icon: 'LayoutDashboard',
    screenshots: [],
    gifs: [],
    ctaLabel: 'Open Dashboard',
    ctaHref: '/dashboard',
    completionType: 'auto',
  },
]
