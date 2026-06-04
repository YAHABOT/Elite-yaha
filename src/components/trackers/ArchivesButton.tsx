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
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-ui transition-all hover:bg-white/[0.07] hover:border-white/20 active:scale-95 disabled:opacity-50"
        style={{ fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(255,255,255,0.45)' }}
      >
        <Archive className="h-3.5 w-3.5" />
        {loading ? '...' : 'Archives'}
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
