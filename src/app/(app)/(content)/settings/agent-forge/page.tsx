import { getAgents } from '@/lib/db/agents'
import { AgentForgeList } from '@/components/agents/AgentForgeList'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default async function AgentForgePage() {
  const agents = await getAgents()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display-heading text-lg text-textPrimary">Agent Management</h1>
          <p className="font-ui text-textMuted/50 mt-0.5" style={{ fontSize: '9px', letterSpacing: '0.10em' }}>
            CREATE AGENTS · EXPLORE THE LIBRARY
          </p>
        </div>
      </div>

      <AgentForgeList initialAgents={agents} />
    </div>
  )
}
