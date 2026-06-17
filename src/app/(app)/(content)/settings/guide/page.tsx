import Link from 'next/link'
import { ChevronLeft, MessageSquare, SlidersHorizontal, Copy, AlertTriangle, CheckCircle2, Share, MoreHorizontal } from 'lucide-react'

function StepBadge({ n }: { n: number }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-black text-textMuted">
      {n}
    </div>
  )
}

function MethodCard({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType
  iconColor: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `${iconColor}12`, border: `1px solid ${iconColor}28` }}
        >
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <div>
          <p className="text-sm font-bold text-textPrimary">{title}</p>
          <p className="text-xs text-textMuted opacity-60">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function PromptExample({ text }: { text: string }) {
  return (
    <div className="group relative rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-3 font-mono text-[13px] text-textMuted leading-relaxed">
      <span className="select-all">&ldquo;{text}&rdquo;</span>
      <Copy className="absolute right-3 top-3 h-3.5 w-3.5 text-textMuted/20 group-hover:text-textMuted/50 transition-colors" />
    </div>
  )
}

function GuideStep({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <StepBadge n={n} />
      <p className="pt-0.5 text-sm text-textMuted leading-relaxed">{text}</p>
    </div>
  )
}

type FieldTypeRowProps = {
  label: string
  color: string
  description: string
}

function FieldTypeRow({ label, color, description }: FieldTypeRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <span
        className="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
        style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}
      >
        {label}
      </span>
      <p className="text-xs text-textMuted/70 leading-relaxed">{description}</p>
    </div>
  )
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-textMuted/50 hover:text-textMuted transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
        <div className="space-y-2">
          <h1 className="font-display-heading text-5xl text-textPrimary">How to Use YAHA</h1>
          <div className="border-t border-white/5 pt-3">
            <p className="text-sm font-medium text-textMuted opacity-60">
              Start here. Build your trackers first — everything else flows from them.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1 — Save to Home Screen */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sleep/10 border border-sleep/20 text-[11px] font-black text-sleep">1</div>
          <div>
            <h2 className="text-xl font-bold text-textPrimary tracking-tight">Save to Your Home Screen</h2>
            <p className="text-xs text-textMuted opacity-60 mt-0.5">
              YAHA works best as an app. Add it to your home screen so it opens full-screen with no browser chrome — faster, cleaner, and always one tap away.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">

          {/* iOS */}
          <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[13px]">🍎</div>
              <div>
                <p className="text-sm font-bold text-textPrimary">iPhone / iPad</p>
                <p className="text-[11px] text-textMuted opacity-50">Safari only</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <StepBadge n={1} />
                <p className="pt-0.5 text-xs text-textMuted leading-relaxed">
                  Open YAHA in <span className="font-bold text-textPrimary">Safari</span> (not Chrome or Firefox)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <StepBadge n={2} />
                <p className="pt-0.5 text-xs text-textMuted leading-relaxed">
                  Tap the <span className="inline-flex items-center gap-1 font-bold text-textPrimary"><Share className="h-3 w-3" /> Share</span> button at the bottom of the screen
                </p>
              </div>
              <div className="flex items-start gap-3">
                <StepBadge n={3} />
                <p className="pt-0.5 text-xs text-textMuted leading-relaxed">
                  Scroll down and tap <span className="font-bold text-textPrimary">Add to Home Screen</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <StepBadge n={4} />
                <p className="pt-0.5 text-xs text-textMuted leading-relaxed">
                  Tap <span className="font-bold text-textPrimary">Add</span> — done
                </p>
              </div>
            </div>
          </div>

          {/* Android */}
          <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[13px]">🤖</div>
              <div>
                <p className="text-sm font-bold text-textPrimary">Android</p>
                <p className="text-[11px] text-textMuted opacity-50">Chrome recommended</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <StepBadge n={1} />
                <p className="pt-0.5 text-xs text-textMuted leading-relaxed">
                  Open YAHA in <span className="font-bold text-textPrimary">Chrome</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <StepBadge n={2} />
                <p className="pt-0.5 text-xs text-textMuted leading-relaxed">
                  Tap the <span className="inline-flex items-center gap-1 font-bold text-textPrimary"><MoreHorizontal className="h-3 w-3" /> three-dot menu</span> in the top right
                </p>
              </div>
              <div className="flex items-start gap-3">
                <StepBadge n={3} />
                <p className="pt-0.5 text-xs text-textMuted leading-relaxed">
                  Tap <span className="font-bold text-textPrimary">Add to Home Screen</span> or <span className="font-bold text-textPrimary">Install App</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <StepBadge n={4} />
                <p className="pt-0.5 text-xs text-textMuted leading-relaxed">
                  Confirm — the YAHA icon will appear on your home screen
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Section 2 — Trackers */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nutrition/10 border border-nutrition/20 text-[11px] font-black text-nutrition">2</div>
          <div>
            <h2 className="text-xl font-bold text-textPrimary tracking-tight">Create Your Trackers</h2>
            <p className="text-xs text-textMuted opacity-60 mt-0.5">
              Trackers are the backbone of YAHA. Each one tracks a specific area — sleep, nutrition, workouts, mood, or anything custom. Before you can log data, you need at least one.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          {/* Method A — Chat */}
          <MethodCard
            icon={MessageSquare}
            iconColor="#10b981"
            title="Via Chat"
            subtitle="Describe it or drop a screenshot — AI does the rest"
          >
            <div className="space-y-3">
              <p className="text-xs text-textMuted/70 leading-relaxed">
                Open the chat and either describe your tracker in words, or attach a screenshot from your health app, wearable, or tracking device. The AI reads the fields directly off the image — no need to list them manually.
              </p>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-textMuted/40">Describe it in text</p>
                <PromptExample text="Create a sleep tracker with bedtime, wake time, hours slept, and a quality rating" />
                <PromptExample text="Make a nutrition tracker for calories, protein, carbs, fat, and water" />
              </div>

              <div className="rounded-2xl border border-nutrition/10 bg-nutrition/[0.04] px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-nutrition/50">Or attach a screenshot</p>
                <p className="text-xs text-textMuted/70 leading-relaxed">
                  Take a screenshot of your Fitbit, Garmin, Apple Health, or any app showing your data. Drop it in the chat and say{' '}
                  <span className="font-mono text-nutrition/80">&ldquo;create a tracker from this&rdquo;</span>.
                  The AI will read every field it can see and build the tracker for you automatically.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-textMuted/40">What happens next</p>
                <p className="text-xs text-textMuted/70 leading-relaxed">
                  A <span className="text-nutrition font-bold">Create Tracker</span> card appears with all the fields detected. Review, then tap <span className="font-bold text-textPrimary">Confirm</span>.
                </p>
              </div>
            </div>
          </MethodCard>

          {/* Method B — Manual */}
          <MethodCard
            icon={SlidersHorizontal}
            iconColor="#3b82f6"
            title="Manually"
            subtitle="Full control over every field"
          >
            <div className="space-y-3">
              <p className="text-xs text-textMuted/70 leading-relaxed">
                Go to the Trackers page and build it field by field. Good when you know exactly what you want.
              </p>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-textMuted/40">Steps</p>
                <div className="space-y-2.5">
                  <GuideStep n={1} text='Tap "Trackers" in the sidebar' />
                  <GuideStep n={2} text='Press the "+ New Tracker" button' />
                  <GuideStep n={3} text="Name it and pick a colour" />
                  <GuideStep n={4} text="Add fields — one per metric you want to track" />
                  <GuideStep n={5} text='Hit "Save" — your tracker is ready' />
                </div>
              </div>

              <Link
                href="/trackers/new"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-sleep/20 bg-sleep/[0.06] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-sleep/80 transition-all hover:border-sleep/40 hover:bg-sleep/10 hover:text-sleep"
              >
                Open Tracker Builder →
              </Link>
            </div>
          </MethodCard>

        </div>

        {/* AI Disclaimer — verify after chat creation */}
        <div className="rounded-[24px] border border-amber-500/15 bg-amber-500/[0.04] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400/70" />
            <p className="text-sm font-bold text-amber-300/80">Always verify after the AI creates your tracker</p>
          </div>
          <p className="text-xs text-textMuted/70 leading-relaxed">
            The AI is smart but not perfect. Once it creates a tracker via chat, go to the <span className="font-bold text-textPrimary">Trackers page</span>, open your new tracker, and tap <span className="font-bold text-textPrimary">Edit Schema</span> to double-check three things:
          </p>
          <div className="space-y-2.5">
            {[
              {
                icon: CheckCircle2,
                label: 'Tracker type',
                detail: 'Should match what you\'re tracking — Workout, Nutrition, Sleep, or Custom. This affects how YAHA categorises your data.',
              },
              {
                icon: CheckCircle2,
                label: 'Field types',
                detail: 'Each field needs the right type — Duration, Number, Time, Rating, Select, Text. See the guide below if unsure.',
              },
              {
                icon: CheckCircle2,
                label: 'Units',
                detail: 'Check that units are correct — kg vs lbs, km vs mi, kcal vs kJ. Wrong units mean wrong dashboard numbers.',
              },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/50" />
                <div>
                  <span className="text-xs font-bold text-textPrimary">{item.label} — </span>
                  <span className="text-xs text-textMuted/70">{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Field Types Reference */}
        <div className="rounded-[24px] border border-white/[0.05] bg-white/[0.015] p-6 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-textMuted/40 mb-4">Field type guide</p>
          <FieldTypeRow
            label="Number"
            color="#10b981"
            description="Any plain numeric value — steps, calories, weight, reps, distance. Use this for anything measured in a unit like kg, km, kcal, or ml."
          />
          <FieldTypeRow
            label="Duration"
            color="#3b82f6"
            description="For activities that have a length of time — total sleep, workout duration, meditation length. Stores as H:MM:SS and displays cleanly on the dashboard."
          />
          <FieldTypeRow
            label="Time"
            color="#06b6d4"
            description="A specific clock time, not a length — bedtime, wake time, meal time. Use this when you care about WHEN something happened, not how long it lasted."
          />
          <FieldTypeRow
            label="Rating"
            color="#a855f7"
            description="A 1–10 score. Use this for subjective quality measurements — sleep quality, energy level, mood, perceived effort. Renders as a tap-to-pick scale in the log form."
          />
          <FieldTypeRow
            label="Select"
            color="#f97316"
            description="A dropdown with fixed options you define — e.g. workout type (cardio / strength / flexibility). Pick one option per log. The AI can recognise your option names by label."
          />
          <FieldTypeRow
            label="Multi-Select"
            color="#f59e0b"
            description="Same as Select but you can pick multiple options at once — e.g. symptoms logged in a day, muscle groups worked. Useful when more than one answer applies."
          />
          <FieldTypeRow
            label="Text"
            color="#6b7280"
            description="Free-form notes. Use sparingly — text fields can't be graphed or averaged. Good for things like 'notes', 'what I ate', or 'how I felt' when you just want a record."
          />
        </div>

      </div>

      {/* Coming Next — teaser for remaining sections */}
      <div className="rounded-[24px] border border-dashed border-white/[0.06] bg-white/[0.01] p-6 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-textMuted/30">More sections coming</p>
        <div className="space-y-2">
          {[
            { n: 3, label: 'Logging Data', note: 'text, photos, voice, files → AI extracts fields → you confirm' },
            { n: 4, label: 'Dashboard Widgets', note: 'pin your most-tracked fields, set goals, see trends' },
            { n: 5, label: 'Daily Routines', note: 'morning / evening step-by-step protocols driven by chat' },
            { n: 6, label: 'Food Bank', note: 'save dishes + pantry items for instant one-tap logging' },
          ].map(item => (
            <div key={item.n} className="flex items-center gap-3 opacity-40">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-[10px] font-black text-textMuted">
                {item.n}
              </div>
              <span className="text-sm font-bold text-textMuted">{item.label}</span>
              <span className="hidden text-xs text-textMuted/50 sm:block">— {item.note}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
