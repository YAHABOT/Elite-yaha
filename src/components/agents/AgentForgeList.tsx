'use client'

import { useState, useEffect } from 'react'
import { Plus, Bot, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { DesignAgentForm } from './DesignAgentForm'
import { deleteAgentAction } from '@/app/actions/agents'

// ─── Agent Library ───────────────────────────────────────────────────────────
type LibraryAgent = {
  id: string
  name: string
  description: string
  system_prompt: string
  color: string
}

const LIBRARY_AGENTS: LibraryAgent[] = []

const LIBRARY_ENABLED_KEY = 'yaha_library_agents_enabled'
// Stores disabled agent IDs — absence means enabled (default on)
export const MY_AGENTS_DISABLED_KEY = 'yaha_my_agents_disabled'

type Props = { initialAgents: Agent[] }
type Tab = 'my_agents' | 'library'

export function AgentForgeList({ initialAgents }: Props) {
  const [tab, setTab] = useState<Tab>('my_agents')
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [isDesigning, setIsDesigning] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [enabledLibraryIds, setEnabledLibraryIds] = useState<Set<string>>(new Set())
  // Stores IDs of agents that are DISABLED — absence = enabled (default on)
  const [disabledMyAgentIds, setDisabledMyAgentIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const lib = localStorage.getItem(LIBRARY_ENABLED_KEY)
      if (lib) setEnabledLibraryIds(new Set(JSON.parse(lib) as string[]))
      const my = localStorage.getItem(MY_AGENTS_DISABLED_KEY)
      if (my) setDisabledMyAgentIds(new Set(JSON.parse(my) as string[]))
    } catch { /* ignore */ }
  }, [])

  const toggleLibrary = (id: string) => {
    setEnabledLibraryIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(LIBRARY_ENABLED_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  const toggleMyAgent = (id: string) => {
    setDisabledMyAgentIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(MY_AGENTS_DISABLED_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agent?')) return
    const res = await deleteAgentAction(id)
    if (res.success) setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
        {(['my_agents', 'library'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl transition-all ${
              tab === t
                ? 'bg-white/10 text-textPrimary'
                : 'text-textMuted/50 hover:text-textMuted/80'
            }`}
            style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            {t === 'my_agents' ? 'My Agents' : 'Agent Library'}
          </button>
        ))}
      </div>

      {/* ── My Agents ── */}
      {tab === 'my_agents' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setIsDesigning(true)}
              className="flex items-center gap-2 rounded-xl border border-nutrition/30 bg-nutrition/10 px-4 py-2.5 text-nutrition transition-all hover:bg-nutrition/20 active:scale-95"
              style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              <Plus className="h-3.5 w-3.5 stroke-[3px]" />
              New Agent
            </button>
          </div>

          {agents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/5 p-12 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                <Bot className="h-6 w-6 text-textMuted opacity-20" />
              </div>
              <p className="text-textMuted opacity-40" style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                No agents yet
              </p>
            </div>
          ) : (
            agents.map(agent => {
              const enabled = !disabledMyAgentIds.has(agent.id)
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-all hover:border-white/10"
                >
                  {/* Icon */}
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${agent.color}15`, border: `1px solid ${agent.color}30` }}
                  >
                    <Bot className="h-4 w-4" style={{ color: agent.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-textPrimary truncate" style={{ fontSize: '13px', fontWeight: 700 }}>
                      {agent.name}
                    </p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span
                        className="rounded-full bg-nutrition/10 px-2 py-0.5 text-nutrition border border-nutrition/20"
                        style={{ fontSize: '8px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                      >
                        ON: {agent.trigger}
                      </span>
                      <span
                        className="rounded-full bg-white/5 px-2 py-0.5 text-textMuted border border-white/10"
                        style={{ fontSize: '8px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                      >
                        OFF: {agent.exit_trigger}
                      </span>
                    </div>
                  </div>

                  {/* Actions — always visible */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditingAgent(agent); setIsDesigning(true) }}
                      className="p-2 rounded-lg bg-white/5 text-textMuted hover:text-white hover:bg-white/10 transition-all active:scale-90"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="p-2 rounded-lg bg-white/5 text-textMuted hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleMyAgent(agent.id)}
                      className="ml-1 transition-transform active:scale-90"
                      aria-label={enabled ? 'Disable agent' : 'Enable agent'}
                    >
                      {enabled
                        ? <ToggleRight className="h-6 w-6 text-nutrition" />
                        : <ToggleLeft className="h-6 w-6 text-textMuted/30" />
                      }
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Agent Library ── */}
      {tab === 'library' && (
        <div className="space-y-3">
          {LIBRARY_AGENTS.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/5 p-12 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                <Bot className="h-6 w-6 text-textMuted opacity-20" />
              </div>
              <p className="text-textMuted opacity-40" style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Agent library coming soon
              </p>
              <p className="text-textMuted/30" style={{ fontSize: '11px' }}>
                Pre-built personas will appear here
              </p>
            </div>
          ) : (
            LIBRARY_AGENTS.map(agent => {
              const enabled = enabledLibraryIds.has(agent.id)
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-all hover:border-white/10"
                >
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${agent.color}15`, border: `1px solid ${agent.color}30` }}
                  >
                    <Bot className="h-4 w-4" style={{ color: agent.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-textPrimary truncate" style={{ fontSize: '13px', fontWeight: 700 }}>
                      {agent.name}
                    </p>
                    <p className="text-textMuted/60 truncate mt-0.5" style={{ fontSize: '11px' }}>
                      {agent.description}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleLibrary(agent.id)}
                    className="flex-shrink-0 ml-1 transition-transform active:scale-90"
                    aria-label={enabled ? 'Disable' : 'Enable'}
                  >
                    {enabled
                      ? <ToggleRight className="h-6 w-6 text-nutrition" />
                      : <ToggleLeft className="h-6 w-6 text-textMuted/30" />
                    }
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Agent form modal */}
      {isDesigning && (
        <DesignAgentForm
          agent={editingAgent}
          onClose={() => { setIsDesigning(false); setEditingAgent(null) }}
          onSuccess={agent => {
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
