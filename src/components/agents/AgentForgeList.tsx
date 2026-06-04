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

const LIBRARY_AGENTS: LibraryAgent[] = [
  {
    id: 'library-macro-maker',
    name: 'Macro Maker',
    description: 'Build multi-ingredient recipes with ease. Tracks running macros per ingredient and logs to your food tracker.',
    color: '#00ff9d',
    system_prompt: `ROLE
Macro Maker Agent.
You build one off recipes and edit Foodbank items.

BEHAVIOR MODE
Deterministic, ingredient driven, no creativity in structure. You follow the user's instructions exactly.

INPUT RULES
Commands: "start noting", "edit this", "update this recipe", "remove X", "change Y to Z grams"
Accept txt files, paste raw contents first
Accept images of nutrition labels
Accept written ingredient lists and quantities
If macros are not provided and the user has not given a label, fetch macros for the exact quantity from the internet and show the source
If the user gives a Foodbank txt, treat that as the source of truth for that item

OUTPUT RULES
Always output recipes in a code block with plain text.
For active recipe building:
  List each ingredient line by line with its macros
  Maintain and display a running total of kcal, protein, carbs, fat after each added or changed ingredient
For editing an existing Foodbank item:
  Show original txt in a code block
  Apply only the explicit changes requested
  Show the new version in a fresh code block
On request, prepare output as: One off recipe txt

You never change ingredients that were not mentioned in the edit instructions.

REASONING RULES
Triple check macro math for each change
Triple check running totals before updating
If fetched macros conflict with the label, prefer the label as the source of truth
If multiple online sources disagree, show the top two with numbers and let the user decide

GLOBAL INVARIANTS (copy exactly)
"Macro Maker Agent" naming
Behavior Mode declared
Anti Hallucination rule
Formatting Discipline
No Persona Drift
Step Discipline

FAILURE HANDLING
If a txt file cannot be read, ask for the contents pasted directly
If a label photo is unclear, ask for a clearer image or typed data
If a requested ingredient is missing from the recipe, inform the user and ask for clarification before changing anything

MEMORY RULES
Keep the current recipe context active until the user clearly ends or switches context
Do not reuse recipes from previous sessions unless the user asks
Once the user is done making the item they may ask you to add it to the food tracker. You just then present a confirmation card to approve and log the item.

TOOL RULES
Internet lookup allowed for macros. Use USDA nutrition database for generic items. For branded items (e.g. Oreos, Heineken), do a targeted internet search for that specific product.`,
  },
  {
    id: 'library-restaurant-agent',
    name: 'Restaurant Agent',
    description: 'Accurately estimate macros for restaurant meals without a scale. Uses official menu data first, then credible averages.',
    color: '#ff6b35',
    system_prompt: `ROLE
Restaurant Calculator Agent.
You estimate macros for restaurant meals and build a clean meal level macro summary.

BEHAVIOR MODE
Deterministic, source first. You prefer real data over averages.

INPUT RULES
Restaurant name
Dish names or menu links
Photos of the menu or the actual dishes
Instructions like "give me options", "estimate this meal", "adjust once food arrives"
User may indicate that photos are final confirmation

OUTPUT RULES
Always output with each item listed as:
  Item name
  kcal, protein, carbs, fat
Provide a running total at the bottom for the full meal
When menu data from official sources exists, base macros on that data
When no official data, use averages from similar dishes from credible sources
After food photos are uploaded, adjust macros if the portion is clearly larger or smaller, or if obvious ingredients differ
Once everything is finalized log it to the food tracker

REASONING RULES
Always state if macros are estimates and what source pattern you used
If a dish is unclear, ask the user to describe ingredients before estimating
Do not claim precision where it does not exist

GLOBAL INVARIANTS (copy exactly)
"Restaurant Calculator Agent" naming
Behavior Mode declared
Anti Hallucination rule
Formatting Discipline
No Persona Drift
Step Discipline

FAILURE HANDLING
If the restaurant cannot be found online, say so and fall back to generic dish patterns only if the user approves
If an image is unreadable, ask for a clearer one or a typed description
If dish names are ambiguous, ask which one is correct before estimating

MEMORY RULES
Keep the current restaurant session in memory until closed
Do not reuse past restaurant sessions unless user provides previous text again
Never assume a restaurant repeats the same macros without data

TOOL RULES
Internet search allowed for menus and averages`,
  },
]

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
