'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { dismissOnboarding, restoreOnboarding } from '@/app/actions/onboarding'
import {
  Bot,
  Workflow,
  ShieldCheck,
  Footprints,
  LogOut,
  ChevronRight,
  Utensils,
  BookOpen,
  LayoutList,
  UserCircle,
  Share2,
} from 'lucide-react'

type Props = {
  initialShowGuide: boolean
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl shadow-2xl space-y-6">
      <div>
        <h2 className="font-ui text-xl text-textPrimary tracking-tight">{title}</h2>
        {description && <p className="text-sm text-textMuted opacity-60">{description}</p>}
      </div>
      {children}
    </div>
  )
}


function NavRow({
  href, icon: Icon, iconBg, iconColor, title, description, hoverBorder,
}: {
  href: string; icon: React.ElementType; iconBg: string; iconColor: string
  title: string; description: string; hoverBorder: string
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all duration-200 hover:bg-white/[0.04] group ${hoverBorder}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: iconBg, border: `1px solid ${iconColor}30` }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-textPrimary">{title}</p>
          <p className="text-xs text-textMuted opacity-60 mt-0.5">{description}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 ml-3 text-textMuted/40 group-hover:text-textMuted transition-colors" />
    </Link>
  )
}

function SystemSection() {
  return (
    <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl shadow-2xl space-y-3">
      <h2 className="font-ui text-xl text-textPrimary tracking-tight mb-6">System</h2>
      <NavRow href="/settings/food-bank" icon={Utensils} iconBg="rgba(16,185,129,0.08)" iconColor="#10b981" title="Food Bank" description="Dishes, pantry staples, and shortcuts" hoverBorder="hover:border-[rgba(16,185,129,0.25)]" />
      <NavRow href="/settings/targets" icon={Footprints} iconBg="rgba(0,212,255,0.08)" iconColor="#00d4ff" title="Daily Targets" description="Create, edit and delete daily goals" hoverBorder="hover:border-[rgba(0,212,255,0.25)]" />
      <NavRow href="/settings/agent-forge" icon={Bot} iconBg="rgba(59,130,246,0.08)" iconColor="#3b82f6" title="Agent Management" description="Configure and manage AI agents" hoverBorder="hover:border-[rgba(59,130,246,0.25)]" />
      <NavRow href="/settings/routines" icon={Workflow} iconBg="rgba(168,85,247,0.08)" iconColor="#a855f7" title="Routine Management" description="Set up daily routines and protocols" hoverBorder="hover:border-[rgba(168,85,247,0.25)]" />
      <NavRow href="/settings/share-card" icon={Share2} iconBg="rgba(0,212,255,0.08)" iconColor="#00d4ff" title="Share Card" description="Choose what appears on your daily share image" hoverBorder="hover:border-[rgba(0,212,255,0.25)]" />
    </div>
  )
}

export function SettingsForm({ initialShowGuide }: Props): React.ReactElement {
  const [showGuide, setShowGuide] = useState(initialShowGuide)
  const [guideToggleSaving, setGuideToggleSaving] = useState(false)

  async function handleGuideToggle() {
    if (guideToggleSaving) return
    setGuideToggleSaving(true)
    const nextValue = !showGuide
    setShowGuide(nextValue)
    if (nextValue) {
      await restoreOnboarding()
    } else {
      await dismissOnboarding()
    }
    setGuideToggleSaving(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">

      {/* Profile */}
      <NavRow
        href="/settings/profile"
        icon={UserCircle}
        iconBg="rgba(6,182,212,0.08)"
        iconColor="#06b6d4"
        title="Profile"
        description="Alias, date of birth, height, and gender"
        hoverBorder="hover:border-[rgba(6,182,212,0.25)]"
      />

      {/* System */}
      <SystemSection />

      {/* AI_SUMMARIES_DEFERRED — see docs/plans/ai-summaries-deferred.md
          Re-enable by restoring the Section here + the pill links in DashboardClient.tsx */}

      {/* Communication Channels */}
      <Section title="Communication Channels" description="Sync with your external messenger handles.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="group rounded-2xl border border-white/5 bg-black/20 p-4 opacity-40 grayscale pointer-events-none">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-textMuted">
                <Bot className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-textPrimary">WhatsApp</span>
            </div>
            <div className="text-[10px] font-bold text-textMuted opacity-40 px-1">COMING SOON</div>
          </div>
          <div className="group rounded-2xl border border-white/5 bg-black/20 p-4 opacity-40 grayscale pointer-events-none">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-textMuted">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-textPrimary">Telegram</span>
            </div>
            <div className="text-[10px] font-bold text-textMuted opacity-40 px-1">COMING SOON</div>
          </div>
        </div>
      </Section>

      {/* Help & Guide */}
      <Section title="Help & Guide" description="Learn how to get the most out of YAHA.">
        <Link
          href="/settings/guide"
          className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all duration-200 hover:border-[rgba(168,85,247,0.25)] hover:bg-white/[0.04] group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)' }}>
              <BookOpen className="h-4 w-4" style={{ color: '#a855f7' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-textPrimary">How to Use YAHA</p>
              <p className="text-xs text-textMuted opacity-60 mt-0.5">Step-by-step guide — trackers, logging, dashboard, routines</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-textMuted/40 group-hover:text-textMuted transition-colors" />
        </Link>

        {/* Setup Guide toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)' }}>
              <LayoutList className="h-4 w-4" style={{ color: '#a855f7' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-textPrimary">Show Setup Guide</p>
              <p className="text-xs text-textMuted opacity-60 mt-0.5">Floating checklist to help you get started</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleGuideToggle()}
            disabled={guideToggleSaving}
            aria-label={showGuide ? 'Hide setup guide' : 'Show setup guide'}
            className={[
              'relative h-6 w-11 shrink-0 rounded-full border transition-all duration-200',
              showGuide
                ? 'bg-[#06b6d4]/20 border-[#06b6d4]/40'
                : 'bg-[#1E1E1E] border-[#1E1E1E]',
              guideToggleSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200',
                showGuide
                  ? 'left-[calc(100%-1.375rem)] bg-[#06b6d4]'
                  : 'left-0.5 bg-[#A1A1AA]/40',
              ].join(' ')}
            />
          </button>
        </div>
      </Section>

      {/* Sign Out */}
      <div className="flex items-center justify-center pb-4">
        <button
          type="button"
          onClick={() => void signOut()}
          className="group flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-red-400/70 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
          Sign Out
        </button>
      </div>

    </div>
  )
}
