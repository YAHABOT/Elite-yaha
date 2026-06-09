export type WidgetType = 'field_latest' | 'field_average' | 'field_total' | 'correlator' | 'tracker_latest' | 'combined_field'
export type TargetDisplay = 'bar' | 'ring' | 'number' | 'hide'
export type WidgetPeriod = 'this_week' | 'last_week'

export const WIDGET_TYPES: WidgetType[] = [
  'field_latest',
  'field_average',
  'field_total',
  'tracker_latest',
  'correlator',
  'combined_field',
]

export type ExtraField = {
  field_id: string
  label: string
  unit?: string
}

export type ExtraFieldValue = {
  field_id: string
  label: string
  value: number | string | null
  unit?: string
  fieldType?: string
}

export type Widget = {
  id: string
  user_id: string
  type: WidgetType
  label: string
  tracker_id?: string
  field_id?: string
  correlation_id?: string
  days?: number
  position: number
  color?: string
  width?: 'half' | 'full'
  extra_fields?: ExtraField[]
  target_display?: TargetDisplay
  period?: WidgetPeriod
  pb_direction?: 'above' | 'below'
}

export type WidgetValue = {
  value: number | string | null
  unit?: string
  fieldType?: string      // e.g. 'duration' — drives display formatting in WidgetCard
  trend?: number[]
  delta?: number          // % change vs previous period (e.g. 12.5 means +12.5%)
  label: string
  extraValues?: ExtraFieldValue[]
  loggedAt?: string
}

export type CreateWidgetInput = Omit<Widget, 'id' | 'user_id'>
