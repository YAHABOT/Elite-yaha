export function formatFieldValue(value: number | string | string[] | null, unit?: string, label?: string, fieldType?: string): string {
  if (value === null || value === undefined || value === '') return '---'

  // Handle multi-select arrays — join with comma separator
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '---'
  }
  
  // Force numeric conversion if it's a valid number string
  let val = value
  if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
    val = Number(val)
  }

  // duration field type — value is total seconds (integer)
  if (fieldType === 'duration' && typeof val === 'number') {
    const totalSecs = Math.round(Math.abs(val))
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    if (h > 0 && s === 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0 && s === 0) return `${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const cleanLabel = (label || '').toLowerCase().trim()
  const isTime = cleanLabel.includes('start') || cleanLabel.includes('end') || cleanLabel.includes('time at')

  // "hrs" / "hours" unit or sleep-related labels → decimal hours stored, display as Xh Ym
  const isDurationHrs = (unit || '').toLowerCase().includes('hrs') ||
                        (unit || '').toLowerCase().includes('hours') ||
                        cleanLabel.includes('duration') ||
                        cleanLabel.includes('time in') ||
                        cleanLabel.includes('actual sleep') ||
                        cleanLabel.includes('awake') ||
                        cleanLabel.includes('rem') ||
                        cleanLabel.includes('light') ||
                        cleanLabel.includes('deep') ||
                        cleanLabel.includes('total sleep')

  // "mins" / "min" unit → decimal minutes stored, display as M:SS (e.g. 4.05 → "4:03")
  const unitLower = (unit || '').toLowerCase()
  const isDurationMins = unitLower === 'mins' || unitLower === 'min'

  if (typeof val === 'number') {
    if (isTime) {
      const totalMinutes = Math.round(val * 60)
      const h = Math.floor(totalMinutes / 60) % 24
      const m = totalMinutes % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    if (isDurationMins) {
      // Decimal minutes → M:SS (e.g. 4.05 min = 4 min 3 sec → "4:03")
      const mins = Math.floor(val)
      const secs = Math.round((val - mins) * 60)
      return `${mins}:${String(secs).padStart(2, '0')}`
    }

    if (isDurationHrs) {
      const totalMinutes = Math.round(val * 60)
      const h = Math.floor(totalMinutes / 60)
      const m = totalMinutes % 60
      if (h === 0) return `${m}m`
      if (m === 0) return `${h}h`
      return `${h}h ${m}m`
    }

    // Round to 1 or 2 decimal places for other numbers
    const rounded = Math.round(val * 100) / 100
    return unit ? `${String(rounded)} ${unit}` : String(rounded)
  }

  // Handle unit display for web/journal view if unit is provided but not already in string
  let display = String(val)
  if (unit && !display.toLowerCase().includes(unit.toLowerCase())) {
    display = `${display} ${unit}`
  }
  
  return display
}
