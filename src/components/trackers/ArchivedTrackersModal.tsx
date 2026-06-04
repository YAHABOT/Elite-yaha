'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Archive, RotateCcw, Trash2, History, ChevronRight } from 'lucide-react'
import { unarchiveTrackerAction, deleteTrackerAction } from '@/app/actions/trackers'
import type { Tracker } from '@/types/tracker'

type Props = {
  trackers: Tracker[]
  onClose: () => void
}

type ConfirmState =
  | { type: 'delete'; tracker: Tracker; input: string }
  | null

export function ArchivedTrackersModal({ trackers: initialTrackers, onClose }: Props): React.ReactElement {
  const router = useRouter()
  const [trackers, setTrackers] = useState<Tracker[]>(initialTrackers)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleUnarchive(tracker: Tracker): Promise<void> {
    setError(null)
    setLoadingId(tracker.id)
    const result = await unarchiveTrackerAction(tracker.id)
    setLoadingId(null)
    if (result.error) {
      setError(result.error)
    } else {
      setTrackers(prev => prev.filter(t => t.id !== tracker.id))
      startTransition(() => router.refresh())
    }
  }

  async function handleDelete(): Promise<void> {
    if (!confirm || confirm.type !== 'delete') return
    if (confirm.input !== confirm.tracker.name) return
    setError(null)
    setLoadingId(confirm.tracker.id)
    const result = await deleteTrackerAction(confirm.tracker.id)
    setLoadingId(null)
    if (result.error) {
      setError(result.error)
      setConfirm(null)
    } else {
      setTrackers(prev => prev.filter(t => t.id !== confirm.tracker.id))
      setConfirm(null)
      startTransition(() => router.refresh())
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={confirm ? undefined : onClose}
      />

      {/* Delete confirm overlay */}
      {confirm?.type === 'delete' && (
        <div className="relative z-10 w-full max-w-sm rounded-3xl border border-red-500/20 bg-[#0A0A0A] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <h3 className="mb-1 text-base font-black text-textPrimary">Delete Forever</h3>
          <p className="mb-1 text-xs text-textMuted/60">
            Type <span className="font-bold text-textPrimary">{confirm.tracker.name}</span> to confirm.
            This <span className="text-red-400">permanently deletes all log data</span>.
          </p>
          <input
            autoFocus
            type="text"
            value={confirm.input}
            onChange={(e) => setConfirm({ ...confirm, input: e.target.value })}
            placeholder={confirm.tracker.name}
            className="mb-4 mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-textPrimary placeholder-white/10 focus:border-red-500/40 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirm.input !== confirm.tracker.name || loadingId === confirm.tracker.id}
              className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loadingId === confirm.tracker.id ? 'Deleting...' : 'Delete Forever'}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-textMuted transition-colors hover:text-textPrimary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main modal */}
      {!confirm && (
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/8 bg-[#080f1e] shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Archive className="h-4 w-4 text-textMuted" />
              <h2 className="font-display-heading text-base text-textPrimary">Archives</h2>
              {trackers.length > 0 && (
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-black text-textMuted">
                  {trackers.length}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/8 text-textMuted transition-colors hover:text-textPrimary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {error && (
              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
                {error}
              </div>
            )}

            {trackers.length === 0 ? (
              <div className="py-12 text-center">
                <Archive className="mx-auto mb-3 h-8 w-8 text-white/10" />
                <p className="text-xs font-black uppercase tracking-widest text-white/20">No archived trackers</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trackers.map((tracker) => (
                  <div
                    key={tracker.id}
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                  >
                    {/* Subtle glow */}
                    <div
                      className="pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-full blur-2xl opacity-[0.07]"
                      style={{ backgroundColor: tracker.color }}
                    />

                    <div className="relative flex items-center gap-3">
                      {/* Color dot */}
                      <div
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: tracker.color }}
                      />

                      {/* Name + archived date */}
                      <div className="min-w-0 flex-1">
                        <p className="font-display-heading text-sm text-textPrimary truncate">{tracker.name}</p>
                        {tracker.archived_at && (
                          <p className="mt-0.5 text-[10px] text-white/25">
                            Archived {new Date(tracker.archived_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {/* View History */}
                        <button
                          type="button"
                          onClick={() => { onClose(); router.push(`/trackers/${tracker.id}`) }}
                          title="View history"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-white/30 transition-colors hover:border-white/20 hover:text-textPrimary"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>

                        {/* Unarchive */}
                        <button
                          type="button"
                          onClick={() => handleUnarchive(tracker)}
                          disabled={loadingId === tracker.id || isPending}
                          title="Restore to active"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-white/30 transition-colors hover:border-white/20 hover:text-green-400 disabled:opacity-40"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setConfirm({ type: 'delete', tracker, input: '' })}
                          disabled={loadingId === tracker.id}
                          title="Delete permanently"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/15 text-red-500/30 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-white/5 px-6 py-3">
            <p className="text-[10px] text-white/20">
              Archived trackers are hidden from your active list. All log data is preserved.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
