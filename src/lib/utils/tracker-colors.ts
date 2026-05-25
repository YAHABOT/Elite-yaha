import type { TrackerType } from '@/types/tracker'

export const TRACKER_TYPE_COLORS: Record<TrackerType, string> = {
  nutrition: '#10b981',  // green
  sleep: '#3b82f6',      // blue
  workout: '#f97316',    // orange
  mood: '#a855f7',       // purple
  water: '#06b6d4',      // cyan
  custom: '#1E1E1E',     // default border color
}

/**
 * Get the color for a tracker type.
 * Used to assign colors to widgets based on their tracker's type.
 */
export function getTrackerTypeColor(type: TrackerType): string {
  return TRACKER_TYPE_COLORS[type] ?? TRACKER_TYPE_COLORS.custom
}
