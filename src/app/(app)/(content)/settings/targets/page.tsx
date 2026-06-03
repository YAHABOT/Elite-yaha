import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import { getSafeUser } from '@/lib/supabase/auth'
import { getUser } from '@/lib/db/users'
import { createServerClient } from '@/lib/supabase/server'
import { TargetsList } from '@/components/settings/TargetsList'

export default async function TargetsPage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const supabase = await createServerClient()
  const profile = await getUser(user.id, supabase)
  const targets = profile?.targets ?? []

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display-heading text-lg text-textPrimary">Daily Targets</h1>
            <p className="font-ui text-textMuted/50 mt-0.5" style={{ fontSize: '9px', letterSpacing: '0.10em' }}>
              {targets.length} TARGET{targets.length !== 1 ? 'S' : ''} SET
            </p>
          </div>
        </div>
        <Link
          href="/settings/targets/new"
          className="flex items-center gap-1.5 rounded-2xl px-4 py-2 font-ui transition-all duration-200"
          style={{ fontSize: '10px', letterSpacing: '0.12em', background: 'rgba(0,212,255,0.10)', border: '1px solid rgba(0,212,255,0.30)', color: '#00d4ff' }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Target
        </Link>
      </div>

      {/* List */}
      <div className="rounded-[28px] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-3xl">
        <TargetsList targets={targets} />
      </div>
    </div>
  )
}
