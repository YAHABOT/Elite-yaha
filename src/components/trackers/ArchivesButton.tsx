'use client'

import { useState } from 'react'
import { Archive } from 'lucide-react'
import { getArchivedTrackersAction } from '@/app/actions/trackers'
import { ArchivedTrackersModal } from '@/components/trackers/ArchivedTrackersModal'
import type { Tracker } from '@/types/tracker'

export function ArchivesButton(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [archived, setArchived] = useState<Tracker[] | null>(null)

  async function handleOpen(): Promise<void> {
    if (loading) return
    setLoading(true)
    const result = await getArchivedTrackersAction()
    setLoading(false)
    if (result.data) {
      setArchived(result.data)
      setOpen(true)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-transparent py-3 font-ui transition-all hover:border-white/[0.12] hover:bg-white/[0.02] active:scale-[0.99] disabled:opacity-40"
        style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)' }}
      >
        <Archive className="h-3.5 w-3.5" />
        {loading ? 'LOADING...' : 'ARCHIVES'}
      </button>

      {open && archived && (
        <ArchivedTrackersModal
          trackers={archived}
          onClose={() => { setOpen(false); setArchived(null) }}
        />
      )}
    </>
  )
}
