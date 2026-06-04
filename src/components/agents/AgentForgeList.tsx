'use client'

import { useState, useEffect } from 'react'
import { Plus, Bot, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { DesignAgentForm } from './DesignAgentForm'
import { deleteAgentAction } from '@/app/actions/agents'

// ─── Agent Library ───────────────────────────────────────────────────────────
// Empty for now. User will supply agent definitions (id, name, description,
// system_prompt, color). Once added here they become toggleable in the UI
// and appear in Chat's Cognitive Layer when enabled.

type LibraryAgent = {
  id: string
  name: string
  description: string
  system_prompt: string
  color: string
}

const LIBRARY_AGENTS: LibraryAgent[] = []

const LIBRARY_ENABLED_KEY = 'yaha_library_agents_enabled'

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  initialAgents: Agent[]
}

type Tab = 'my_agents' | 'library'

export function AgentForgeList({ initialAgents }: Props) {
  const [tab, setTab] = useState<Tab>('my_agents')
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [isDesigning, setIsDesigning] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [enabledLibraryIds, setEnabledLibraryIds] = useState<Set<string>>(new Set())

  // Load enabled library agents from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LIBRARY_ENABLED_KEY)
      if (stored) setEnabledLibraryIds(new Set(JSON.parse(stored) as string[]))
    } catch {
      // ignore parse errors
    }
  }, [])

  const toggleLibraryAgent = (id: string) => {
    setEnabledLibraryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(LIBRARY_ENABLED_KEY, JSON.stringify([...next]))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agent?')) return
    const res = await deleteAgentAction(id)
    if (res.success) setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-8">

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
        {(['my_agents', 'library'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              tab === t
                ? 'bg-white/10 text-textPrimary shadow-sm'
                : 'text-textMuted/50 hover:text-textMuted/80'
            }`}
          >
            {t === 'my_agents' ? 'My Agents' : 'Agent Library'}
          </button>
        ))}
      </div>

      {/* ── My Agents ────────────────────────────────────────────────────────── */}
      {tab === 'my_agents' && (
        <div className="space-y-6">
          {/* New Agent button */}
          <div className="flex justify-end">
            <button
              onClick={() => setIsDesigning(true)}
              className="flex items-center gap-2 rounded-2xl bg-nutrition px-6 py-3 text-sm font-black uppercase tracking-widest text-nutrition-foreground transition-all hover:scale-[1.05] active:scale-95 shadow-xl shadow-nutrition/20"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              New Agent
            </button>
          </div>

          {/* Agent grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="group relative rounded-[32px] border border-white/5 bg-white/[0.02] p-8 transition-all hover:border-white/10 hover:bg-white/[0.04] shadow-2xl overflow-hidden"
              >
                {/* Background glow */}
                <div
                  className="absolute -top-12 -right-12 h-24 w-24 blur-[60px] pointer-events-none opacity-20"
                  style={{ backgroundColor: agent.color }}
                />

                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl shadow-lg flex-shrink-0"
                      style={{
                        backgroundColor: `${agent.color}15`,
                        border: `1px solid ${agent.color}30`,
                      }}
                    >
                      <Bot className="h-6 w-6" style={{ color: agent.color }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{agent.name}</h3>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <span className="rounded-full bg-nutrition/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-nutrition border border-nutrition/20">
                          ON: {agent.trigger}
                        </span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-textMuted border border-white/10">
                          OFF: {agent.exit_trigger}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Edit / delete — visible on hover */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-3">
                    <button
                      onClick={() => {
                        setEditingAgent(agent)
                        setIsDesigning(true)
                      }}
                      className="p-2 rounded-lg bg-white/5 text-textMuted hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="p-2 rounded-lg bg-white/5 text-textMuted hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {agents.length === 0 && (
              <div className="md:col-span-2 rounded-[40px] border border-dashed border-white/5 p-16 text-center space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 text-textMuted">
                  <Bot className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-sm font-bold text-textMuted uppercase tracking-widest opacity-40">
                  No agents created yet.
                </p>
                <p className="text-xs text-textMuted/30">
                  Press &ldquo;New Agent&rdquo; to build a custom persona.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Agent Library ────────────────────────────────────────────────────── */}
      {tab === 'library' && (
        <div className="space-y-3">
          {LIBRARY_AGENTS.length === 0 ? (
            <div className="rounded-[40px] border border-dashed border-white/5 p-16 text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 text-textMuted">
                <Bot className="h-8 w-8 opacity-20" />
              </div>
              <p className="text-sm font-bold text-textMuted uppercase tracking-widest opacity-40">
                Agent library coming soon.
              </p>
              <p className="text-xs text-textMuted/30">
                Pre-built agent personas will appear here.
              </p>
            </div>
          ) : (
            LIBRARY_AGENTS.map(agent => {
              const enabled = enabledLibraryIds.has(agent.id)
              return (
                <div
                  key={agent.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-4 transition-all hover:border-white/10 hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                      style={{
                        backgroundColor: `${agent.color}15`,
                        border: `1px solid ${agent.color}30`,
                      }}
                    >
                      <Bot className="h-5 w-5" style={{ color: agent.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-textPrimary truncate">{agent.name}</p>
                      <p className="text-xs text-textMuted/60 mt-0.5 truncate">{agent.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleLibraryAgent(agent.id)}
                    className="flex-shrink-0 ml-4 transition-transform active:scale-90"
                    aria-label={enabled ? 'Disable agent' : 'Enable agent'}
                  >
                    {enabled ? (
                      <ToggleRight className="h-7 w-7 text-nutrition" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-textMuted/30" />
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Agent form modal ─────────────────────────────────────────────────── */}
      {isDesigning && (
        <DesignAgentForm
          agent={editingAgent}
          onClose={() => {
            setIsDesigning(false)
            setEditingAgent(null)
          }}
          onSuccess={(agent) => {
            if (editingAgent) {
              setAgents(prev => prev.map(a => a.id === agent.id ? agent : a))
            } else {
              setAgents(prev => [...prev, agent])
            }
            setIsDesigning(false)
            setEditingAgent(null)
          }}
        />
      )}
    </div>
  )
}
