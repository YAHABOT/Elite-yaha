'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  updateAliasAction,
} from '@/app/actions/settings'
import { signOut } from '@/app/actions/auth'
import type { User } from '@/lib/db/users'
import {
  Bot,
  Workflow,
  ShieldCheck,
  Footprints,
  LogOut,
  ChevronRight,
} from 'lucide-react'

type Props = {
  initialValues: User | null
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

function DeveloperButton({
  icon: Icon,
  label,
  href,
  colorClass,
}: {
  icon: React.ElementType
  label: string
  href: string
  colorClass: string
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 transition-all hover:scale-[1.02] active:scale-98 shadow-lg group ${colorClass}`}
    >
      <Icon className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </Link>
  )
}

export function SettingsForm({ initialValues }: Props): React.ReactElement {
  const [aliasValue, setAliasValue] = useState(initialValues?.alias ?? '')
  const [aliasSaveState, setAliasSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function handleAliasBlur() {
    if (aliasValue.trim() === (initialValues?.alias ?? '').trim()) return
    setAliasSaveState('saving')
    const result = await updateAliasAction(aliasValue)
    setAliasSaveState(result.error ? 'idle' : 'saved')
    if (!result.error) setTimeout(() => setAliasSaveState('idle'), 2000)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">

      {/* Identity & System */}
      <Section title="Identity & System" description="Manage your persona and developer access.">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-40">Alias</label>
              {aliasSaveState === 'saving' && (
                <span className="text-[9px] font-black uppercase tracking-widest text-textMuted/40">Saving…</span>
              )}
              {aliasSaveState === 'saved' && (
                <span className="text-[9px] font-black uppercase tracking-widest text-nutrition">✓ Saved</span>
              )}
            </div>
            <input
              value={aliasValue}
              onChange={e => setAliasValue(e.target.value)}
              onBlur={() => void handleAliasBlur()}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-textPrimary placeholder:text-textMuted/20 focus:border-nutrition/50 focus:outline-none focus:ring-1 focus:ring-nutrition/20 transition-all duration-300"
              placeholder="Unknown"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-40 mb-2 block">Developer Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <DeveloperButton
                icon={Bot}
                label="Agent Forge"
                href="/settings/agent-forge"
                colorClass="hover:border-sleep/30 hover:shadow-sleep/5 text-sleep/80 hover:text-sleep"
              />
              <DeveloperButton
                icon={Workflow}
                label="Routines"
                href="/settings/routines"
                colorClass="hover:border-purple-500/30 hover:shadow-purple-500/5 text-purple-400/80 hover:text-purple-400"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Daily Targets */}
      <Section title="Daily Targets" description="Set goals tied to your actual tracker fields.">
        <Link
          href="/settings/targets"
          className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all duration-200 hover:border-[rgba(0,212,255,0.25)] hover:bg-white/[0.04] group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.18)' }}>
              <Footprints className="h-4 w-4" style={{ color: '#00d4ff' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-textPrimary">Manage Targets</p>
              <p className="text-xs text-textMuted opacity-60 mt-0.5">Create, edit and delete daily goals</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-textMuted/40 group-hover:text-textMuted transition-colors" />
        </Link>
      </Section>

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
