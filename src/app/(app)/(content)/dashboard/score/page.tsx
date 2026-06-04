import { redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getUser } from '@/lib/db/users'
import { ScoreDetailClient } from '@/components/dashboard/ScoreDetailClient'
import type { TrackerLog } from '@/types/log'
import type { UserTarget } from '@/lib/db/users'
import type { Tracker } from '@/types/tracker'

export type TargetDetail = {
  id: string
  fieldLabel: string
  trackerName: string
  trackerType: string
  fieldType: string
  unit?: string
  targetValue: number
  actual: number
  pct: number
  direction: 'above' | 'below'
}

export type DayDetail = {
  date: string
  label: string
  score: number
  logCount: number
  hasTargets: boolean
  targets: TargetDetail[]
}

function computeDayDetails(
  allLogs: TrackerLog[],
  targets: UserTarget[],
  trackers: Tracker[],
  nDays: number
): DayDetail[] {
  const numericTargets = targets.filter(
    t => t.trackerId !== '__correlations__' &&
    ['number', 'rating', 'duration'].includes(t.fieldType) &&
    t.value > 0
  )
  const hasTargets = numericTargets.length > 0
  const result: DayDetail[] = []

  for (let i = nDays - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLogs = allLogs.filter(l => l.logged_at.startsWith(dateStr))
    const logCount = dayLogs.length

    let score = 0
    const targetDetails: TargetDetail[] = []

    if (hasTargets) {
      const pcts = numericTargets.map(target => {
        // Combined cross-tracker target: fieldId = "combined:{type}:{normalizedLabel}"
        let actual = 0
        let trackerType = 'custom'
        if (target.trackerId === '__combined__') {
          const parts = target.fieldId.split(':')
          const [, cType, normalizedLabel] = parts
          trackerType = cType ?? 'custom'
          const matchingTrackers = trackers.filter(t => t.type === cType)
          for (const t of matchingTrackers) {
            const field = t.schema.find(f => f.label.toLowerCase().trim() === normalizedLabel)
            if (!field) continue
            for (const log of dayLogs.filter(l => l.tracker_id === t.id)) {
              const raw = (log.fields as Record<string, unknown>)?.[field.fieldId]
              const num = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
              if (Number.isFinite(num)) actual += num
            }
          }
        } else {
          const trackerLogs = dayLogs.filter(l => l.tracker_id === target.trackerId)
          const values = trackerLogs
            .map(l => (l.fields as Record<string, unknown>)?.[target.fieldId])
            .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
          actual = values.reduce((a, b) => a + b, 0)
          trackerType = trackers.find(t => t.id === target.trackerId)?.type ?? 'custom'
        }
        const direction = target.direction ?? 'above'
        const pct = direction === 'below'
          ? (actual <= target.value ? 100 : Math.max(0, (target.value / actual) * 100))
          : Math.min(actual / target.value, 1) * 100

        targetDetails.push({
          id: target.id,
          fieldLabel: target.fieldLabel,
          trackerName: target.trackerName,
          trackerType,
          fieldType: target.fieldType,
          unit: target.unit,
          targetValue: target.value,
          actual: Math.round(actual * 10) / 10,
          pct: Math.round(pct),
          direction,
        })

        return pct
      })
      score = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    } else {
      score = logCount
    }

    const label = i === 0
      ? 'TODAY'
      : d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()

    result.push({ date: dateStr, label, score, logCount, hasTargets, targets: targetDetails })
  }

  return result
}

export default async function ScorePage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const supabase = await createServerClient()

  const [trackers, userProfile] = await Promise.all([
    getTrackersBasic(supabase),
    getUser(user.id, supabase),
  ])

  const targets = userProfile?.targets ?? []

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: allLogs } = await supabase
    .from('tracker_logs')
    .select('id, tracker_id, fields, logged_at')
    .eq('user_id', user.id)
    .gte('logged_at', thirtyDaysAgo.toISOString())
    .order('logged_at', { ascending: false })

  const dayDetails = computeDayDetails(
    (allLogs ?? []) as TrackerLog[],
    targets,
    trackers,
    30
  )

  return <ScoreDetailClient dayDetails={dayDetails} />
}
