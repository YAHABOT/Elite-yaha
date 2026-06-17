'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

type Props = {
  loggedDates: string[]
  selectedDate: string
  today: string
  onSelectDate: (date: string) => void
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW = ['S','M','T','W','T','F','S']

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildMonthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const cells: { day: number; cur: boolean }[] = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: prevDays - firstDay + 1 + i, cur: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, cur: true })
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - firstDay - daysInMonth + 1, cur: false })
  return cells
}

export function JournalCalendar({ loggedDates, selectedDate, today, onSelectDate }: Props) {
  const loggedSet = new Set(loggedDates)

  const [selYear, setSelYear] = useState(() => {
    const [y] = selectedDate.split('-').map(Number)
    return y
  })
  const [selMonth, setSelMonth] = useState(() => {
    const [, m] = selectedDate.split('-').map(Number)
    return m - 1
  })
  const [yearViewOpen, setYearViewOpen] = useState(false)
  const [yearViewYear, setYearViewYear] = useState(selYear)

  function prevMonth() {
    if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1) }
    else setSelMonth(m => m - 1)
  }
  function nextMonth() {
    if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1) }
    else setSelMonth(m => m + 1)
  }

  const cells = buildMonthCells(selYear, selMonth)
  const [todayY, todayM, todayD] = today.split('-').map(Number)

  return (
    <div className="flex flex-col flex-1 min-h-0 select-none">
      {/* Month header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-textMuted hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { setYearViewYear(selYear); setYearViewOpen(true) }}
          className="text-xs font-semibold text-textPrimary hover:text-water transition-colors tracking-tight"
        >
          {MONTHS[selMonth]} {selYear}
        </button>
        <button
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-textMuted hover:bg-white/[0.06] transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Day-of-week row */}
      <div className="grid grid-cols-7 px-2 mb-1 flex-shrink-0">
        {DOW.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-textMuted/40 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 px-2 gap-y-0.5 flex-shrink-0">
        {cells.map(({ day, cur }, i) => {
          const key = cur ? toDateKey(selYear, selMonth, day) : ''
          const isLogged = cur && loggedSet.has(key)
          const isSelected = cur && key === selectedDate
          const isToday = cur && day === todayD && selMonth === todayM - 1 && selYear === todayY

          return (
            <button
              key={i}
              disabled={!cur}
              onClick={() => cur && onSelectDate(key)}
              className={`flex h-9 w-full items-center justify-center rounded-lg transition-colors ${
                cur ? 'cursor-pointer hover:bg-white/[0.05]' : 'cursor-default'
              } ${isSelected && !isToday ? 'bg-white/[0.07]' : ''}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium leading-none transition-colors ${
                  isToday
                    ? 'bg-water text-background font-bold'
                    : isLogged
                    ? 'text-water font-semibold'
                    : cur
                    ? 'text-[#1C1030]'
                    : 'text-[#0F0A18]'
                }`}
              >
                {day}
              </span>
            </button>
          )
        })}
      </div>

      {/* Year overlay */}
      {yearViewOpen && (
        <div className="absolute inset-0 z-20 flex flex-col bg-surface overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.04] flex-shrink-0">
            <button
              onClick={() => setYearViewYear(y => y - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-textMuted hover:bg-white/[0.06] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-textPrimary tracking-tight">{yearViewYear}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setYearViewYear(y => y + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-textMuted hover:bg-white/[0.06] transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setYearViewOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-textMuted hover:bg-white/[0.06] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3">
            {MONTHS_SHORT.map((name, m) => {
              const isCurMonth = m === selMonth && yearViewYear === selYear
              const isThisMonth = m === todayM - 1 && yearViewYear === todayY
              const miniCells = buildMonthCells(yearViewYear, m)

              return (
                <button
                  key={m}
                  onClick={() => {
                    setSelYear(yearViewYear)
                    setSelMonth(m)
                    setYearViewOpen(false)
                  }}
                  className={`rounded-xl border p-2 text-left transition-colors hover:border-white/10 ${
                    isCurMonth
                      ? 'border-water/40 bg-water/[0.04]'
                      : isThisMonth
                      ? 'border-water/20 bg-white/[0.02]'
                      : 'border-white/[0.04] bg-white/[0.01]'
                  }`}
                >
                  <p className={`text-[10px] font-semibold mb-1.5 text-center ${isCurMonth || isThisMonth ? 'text-water' : 'text-textMuted'}`}>
                    {name}
                  </p>
                  <div className="grid grid-cols-7 gap-0">
                    {miniCells.map(({ day, cur }, i) => {
                      const k = cur ? toDateKey(yearViewYear, m, day) : ''
                      const logged = cur && loggedSet.has(k)
                      const isT = cur && day === todayD && m === todayM - 1 && yearViewYear === todayY

                      return (
                        <div key={i} className="flex items-center justify-center h-[14px]">
                          <span
                            className={`text-[7px] font-medium flex items-center justify-center w-[13px] h-[13px] rounded-full leading-none ${
                              isT
                                ? 'bg-water text-background font-bold'
                                : logged
                                ? 'text-water font-semibold'
                                : cur
                                ? 'text-[#1C1030]'
                                : 'text-[#0F0A18]'
                            }`}
                          >
                            {day}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
