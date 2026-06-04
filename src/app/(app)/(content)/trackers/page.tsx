import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getTrackers } from '@/lib/db/trackers'
import { SortableTrackerList } from '@/components/trackers/SortableTrackerList'
import { ArchivesButton } from '@/components/trackers/ArchivesButton'

export default async function TrackersPage(): Promise<React.ReactElement> {
  const trackers = await getTrackers()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display-heading text-2xl text-textPrimary">Trackers</h1>
        <Link
          href="/trackers/new"
          className="flex items-center gap-1.5 rounded-full px-4 py-2 font-ui text-[#000d1a] transition-all shadow-[0_0_16px_-4px_rgba(0,212,255,0.5)]"
          style={{ fontSize: '11px', letterSpacing: '0.10em', background: 'linear-gradient(135deg, #00d4ff, #0090cc)' }}
        >
          <Plus className="h-4 w-4" />
          New Tracker
        </Link>
      </div>

      {trackers.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
          <p className="font-ui text-textMuted" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>
            No trackers yet. Create your first one to start logging.
          </p>
        </div>
      ) : (
        <SortableTrackerList trackers={trackers} />
      )}

      <div className="mt-3">
        <ArchivesButton />
      </div>
    </div>
  )
}
