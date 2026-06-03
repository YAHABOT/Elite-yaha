export type SummaryType = 'weekly' | 'monthly'

export type LinkedField = {
  trackerId: string
  trackerName: string
  fieldId: string
  fieldLabel: string
  fieldType: string
  unit?: string
  isCorrelation?: boolean
}

export type SummaryConfig = {
  id: string
  user_id: string
  type: SummaryType
  enabled: boolean
  instructions: string
  linked_fields: LinkedField[]
  created_at: string
  updated_at: string
}

export type SummaryMetric = {
  label: string
  value: string
  unit?: string | null
  delta?: string | null
}

export type SummaryContent = {
  coachSummary: string
  score?: number
  metrics: SummaryMetric[]
  highlights: string[]
}

export type Summary = {
  id: string
  user_id: string
  type: SummaryType
  period_start: string
  period_end: string
  content: SummaryContent
  generated_at: string
}
