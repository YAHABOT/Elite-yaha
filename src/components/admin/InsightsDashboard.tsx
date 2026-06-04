'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useState } from 'react'
import { Users, BarChart2, Zap, Activity, ChevronDown, Clock } from 'lucide-react'
import type { AdminInsights, UserProfile } from '@/lib/db/analytics'

type Props = {
  insights: AdminInsights
}

// OLED color palette
const CYAN = '#00d4ff'
const PURPLE = '#a855f7'
const GREEN = '#10b981'
const AMBER = '#f59e0b'
const RED = '#ef4444'

const EVENT_TYPE_COLORS: Record<string, string> = {
  action_card_confirmed: GREEN,
  action_card_dismissed: RED,
  routine_completed: '#3b82f6',
  routine_step_skipped: AMBER,
  manual_log_created: CYAN,
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diffMs / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getDayAbbr(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[new Date(dateStr).getDay()]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function getStatusColor(status: UserProfile['status']): string {
  return status === 'active' ? '#10b981' : status === 'dormant' ? '#f59e0b' : '#4b5563'
}

function getAccuracyColor(value: number | null): string {
  if (value === null) return 'text-textMuted'
  if (value >= 80) return 'text-green-400'
  if (value >= 50) return 'text-amber-400'
  return 'text-red-400'
}


// ─── Sub-components ──────────────────────────────────────────────────────────

function EngagementRing({ score, color }: { score: number; color: string }) {
  const r = 26
  const circumference = 2 * Math.PI * r
  const strokeDash = (score / 100) * circumference
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="flex-shrink-0">
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle
        cx="34" cy="34" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${strokeDash} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      />
      <text x="34" y="37" textAnchor="middle" fill={color} fontSize="13" fontWeight="900" fontFamily="monospace">
        {score}
      </text>
      <text x="34" y="47" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontWeight="700" fontFamily="sans-serif">
        SCORE
      </text>
    </svg>
  )
}

function ActivityBars({ days, color }: { days: number[]; color: string }) {
  const max = Math.max(...days, 1)
  // Align labels to today = last bar
  const today = new Date().getDay() // 0=Sun
  const orderedLabels = Array.from({ length: 7 }, (_, i) => {
    const dayIdx = (today - (6 - i) + 7) % 7
    return ['S','M','T','W','T','F','S'][dayIdx]
  })
  return (
    <div className="flex items-end gap-[3px] h-9 w-full">
      {days.map((count, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full rounded-sm transition-all"
            style={{
              height: `${Math.max(3, Math.round((count / max) * 28))}px`,
              backgroundColor: count > 0
                ? `${color}${Math.round(40 + (count / max) * 180).toString(16).padStart(2, '0')}`
                : 'rgba(255,255,255,0.04)',
            }}
          />
          <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>
            {orderedLabels[i]}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: '#0e243a',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '12px',
  color: '#f5f5f5',
  fontSize: 12,
}

function formatHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

export function InsightsDashboard({ insights }: Props): React.ReactElement {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const {
    totalSignups,
    usersWithTrackers,
    usersLoggedThisWeek,
    aiAccuracy7d,
    aiAccuracyTrend,
    trackerAccuracy,
    actionCardOutcomes30d,
    dailyActivity14d,
    topTrackers,
    recentEvents,
    routineHealth,
    chatFailures7d,
    userProfiles,
  } = insights

  const accuracyColor = getAccuracyColor(aiAccuracy7d)

  // Trend: compare this week vs last week
  const thisWeekAcc  = aiAccuracyTrend[3]?.accuracy ?? null
  const lastWeekAcc  = aiAccuracyTrend[2]?.accuracy ?? null
  const trendDelta   = thisWeekAcc !== null && lastWeekAcc !== null ? thisWeekAcc - lastWeekAcc : null
  const trendArrow   = trendDelta === null ? '' : trendDelta > 0 ? '↑' : trendDelta < 0 ? '↓' : '→'
  const trendColor   = trendDelta === null ? '' : trendDelta > 0 ? '#10b981' : trendDelta < 0 ? '#ef4444' : '#6b7280'

  const outcomeTotal =
    actionCardOutcomes30d.confirmed_clean +
    actionCardOutcomes30d.confirmed_edited +
    actionCardOutcomes30d.dismissed

  const pieData = [
    { name: 'Confirmed clean', value: actionCardOutcomes30d.confirmed_clean, color: GREEN },
    { name: 'Confirmed edited', value: actionCardOutcomes30d.confirmed_edited, color: AMBER },
    { name: 'Dismissed', value: actionCardOutcomes30d.dismissed, color: RED },
  ]

  const chartData = dailyActivity14d.map(d => ({
    ...d,
    label: getDayAbbr(d.date),
  }))

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-textPrimary">INSIGHTS</h1>
            <span className="rounded-full bg-green-500/20 border border-green-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-green-400 animate-pulse">
              LIVE
            </span>
          </div>
          <p className="text-xs font-medium text-textMuted mt-1 opacity-60">
            Admin only · Learning loop active
          </p>
        </div>
      </div>

      {/* Hero stats row */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Signups */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10">
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-textMuted opacity-60">
              Total Signups
            </span>
          </div>
          <p className="text-3xl font-black text-textPrimary">{totalSignups}</p>
        </div>

        {/* Users with Trackers */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/10">
              <BarChart2 className="h-4 w-4 text-green-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-textMuted opacity-60">
              Made Trackers
            </span>
          </div>
          <p className="text-3xl font-black text-textPrimary">{usersWithTrackers}</p>
        </div>

        {/* Logged This Week */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10">
              <Activity className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-textMuted opacity-60">
              Logged 7d
            </span>
          </div>
          <p className="text-3xl font-black text-textPrimary">{usersLoggedThisWeek}</p>
        </div>

        {/* AI Accuracy */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10">
              <Zap className="h-4 w-4 text-purple-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-textMuted opacity-60">
              AI Accuracy 7d
            </span>
          </div>
          <div className="flex items-end gap-2">
            <p className={`text-3xl font-black ${accuracyColor}`}>
              {aiAccuracy7d === null ? '—' : `${aiAccuracy7d}%`}
            </p>
            {trendArrow && (
              <span className="text-base font-black mb-0.5" style={{ color: trendColor }}>
                {trendArrow} {Math.abs(trendDelta!)}pp
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Two column row: Daily Activity + Outcomes */}
      <div className="grid grid-cols-2 gap-6">

        {/* Daily Activity */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60">
              Daily Activity
            </h2>
            <div className="flex-1 border-t border-white/5" />
            <span className="text-[10px] font-medium text-textMuted opacity-40">14d</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="count" fill={CYAN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Action Card Outcomes */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60">
              Action Card Outcomes
            </h2>
            <div className="flex-1 border-t border-white/5" />
            <span className="text-[10px] font-medium text-textMuted opacity-40">30d</span>
          </div>

          {outcomeTotal === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm font-medium text-textMuted opacity-40">No data yet</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={64}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-textPrimary">{outcomeTotal}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-textMuted opacity-50">total</span>
                </div>
              </div>
              <div className="space-y-2.5 flex-1">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-[11px] font-medium text-textMuted">{entry.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-textPrimary">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Intelligence — trend + per-tracker accuracy + chat failures */}
      <div className="grid grid-cols-2 gap-6">

        {/* Week-over-week accuracy trend */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60">Accuracy Trend</h2>
            <div className="flex-1 border-t border-white/5" />
            <span className="text-[10px] font-medium text-textMuted opacity-40">4 weeks</span>
          </div>
          {aiAccuracyTrend.every(w => w.total === 0) ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm font-medium text-textMuted opacity-40">Not enough data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={aiAccuracyTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown) => [`${v ?? '—'}%`, 'Accuracy']}
                />
                <ReferenceLine y={80} stroke="rgba(16,185,129,0.2)" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke={PURPLE}
                  strokeWidth={2.5}
                  dot={{ fill: PURPLE, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: PURPLE }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          {/* Chat failures footnote */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
            <span className="text-[9px] font-black uppercase tracking-widest text-textMuted opacity-40">Chat failures (7d)</span>
            <span className={`text-[13px] font-black ${chatFailures7d > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {chatFailures7d}
            </span>
          </div>
        </div>

        {/* Per-tracker AI accuracy */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60">Per-Tracker Accuracy</h2>
            <div className="flex-1 border-t border-white/5" />
          </div>
          {trackerAccuracy.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm font-medium text-textMuted opacity-40">No confirmed cards yet</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-52">
              {trackerAccuracy.map(t => {
                const accColor = t.accuracy >= 80 ? GREEN : t.accuracy >= 50 ? AMBER : RED
                return (
                  <div key={t.tracker_name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-textPrimary truncate max-w-[60%]" title={t.tracker_name}>{t.tracker_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-textMuted opacity-40">{t.total} cards</span>
                        <span className="text-[12px] font-black" style={{ color: accColor }}>{t.accuracy}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full" style={{ width: `${t.accuracy}%`, backgroundColor: accColor, opacity: 0.7 }} />
                    </div>
                    {t.frequentlyMissedFields.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        <span className="text-[9px] text-textMuted opacity-50 self-center">AI misses:</span>
                        {t.frequentlyMissedFields.map(f => (
                          <span
                            key={f.field}
                            className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: AMBER }}
                            title={`Left blank in ${f.missRate}% of logs`}
                          >
                            {f.field} <span className="opacity-60">{f.missRate}%</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {t.mostCommonEdits.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        <span className="text-[9px] text-textMuted opacity-50 self-center">Typical corrections:</span>
                        {t.mostCommonEdits.map(e => (
                          <span
                            key={e.field}
                            className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}
                            title={`Corrected ${e.count}×`}
                          >
                            {e.field} <span className="opacity-80">{e.avgDelta > 0 ? `+${e.avgDelta}` : e.avgDelta}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Trackers */}
      <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60">
            Top Trackers
          </h2>
          <div className="flex-1 border-t border-white/5" />
        </div>
        {topTrackers.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm font-medium text-textMuted opacity-40">No logs recorded yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={topTrackers}
              margin={{ top: 4, right: 4, left: -24, bottom: 40 }}
            >
              <XAxis
                dataKey="tracker_name"
                tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="count" fill={PURPLE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* User Roster — card grid */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60">User Roster</h2>
          <div className="flex-1 border-t border-white/5" />
          <div className="flex items-center gap-3">
            {(['active', 'dormant', 'new'] as const).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getStatusColor(s) }} />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40" style={{ color: getStatusColor(s) }}>{s}</span>
              </div>
            ))}
            <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-black text-textMuted opacity-70 ml-1">
              {userProfiles.length}
            </span>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 gap-4">
          {userProfiles.map(user => {
            const statusColor = getStatusColor(user.status)
            const isExpanded = expandedUserId === user.id
            const usedTrackers = user.trackerBreakdown.filter(t => !t.unused)
            const unusedTrackers = user.trackerBreakdown.filter(t => t.unused)
            return (
              <div
                key={user.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: `linear-gradient(135deg, ${statusColor}08 0%, transparent 60%), #0e243a`,
                  border: `1px solid ${statusColor}25`,
                  boxShadow: `0 0 20px ${statusColor}0a`,
                }}
              >
                {/* Card body */}
                <div className="p-4">
                  {/* Top row: ring + identity */}
                  <div className="flex items-start gap-4">
                    <EngagementRing score={user.engagementScore} color={statusColor} />
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                          style={{ backgroundColor: `${statusColor}18`, border: `1px solid ${statusColor}35`, fontSize: '8px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: statusColor }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: statusColor, boxShadow: `0 0 4px ${statusColor}` }} />
                          {user.status}
                        </span>
                        {user.currentStreak > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5"
                            style={{ backgroundColor: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', fontSize: '8px', fontWeight: 900, letterSpacing: '0.08em', color: '#fb923c' }}
                          >
                            🔥 {user.currentStreak}d
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-bold text-textPrimary truncate leading-tight" title={user.email}>{user.email}</p>
                      <p className="text-[9px] font-mono opacity-25 text-textMuted mt-0.5">{user.id.slice(0, 8)}···</p>
                    </div>
                  </div>

                  {/* 7-day activity bars */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-textMuted opacity-30">7-day activity</span>
                      <span className="text-[8px] font-black opacity-50" style={{ color: statusColor }}>{user.logsLast7d} logs</span>
                    </div>
                    <ActivityBars days={user.logsLast7dByDay} color={statusColor} />
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center mt-3 rounded-xl overflow-hidden border border-white/[0.04]">
                    {[
                      { label: 'Total Logs', value: String(user.totalLogs), small: false },
                      { label: 'Trackers', value: String(user.trackerCount), small: false },
                      { label: 'Peak Time', value: user.peakHour !== null ? formatHour(user.peakHour) : '—', small: true },
                      { label: 'Last Log', value: user.lastLogAt ? formatRelativeTime(user.lastLogAt) : '—', small: true },
                    ].map((stat, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center py-2 gap-0.5 border-r border-white/[0.04] last:border-r-0" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <span className={`font-black ${stat.small ? 'text-[10px] text-textMuted' : 'text-[16px] text-textPrimary'}`}>{stat.value}</span>
                        <span className="text-[7px] font-black uppercase tracking-widest text-textMuted opacity-35">{stat.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tracker chips (compact, always visible) */}
                  {usedTrackers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {usedTrackers.slice(0, 4).map(t => (
                        <span
                          key={t.name}
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold truncate max-w-[90px]"
                          style={{ backgroundColor: `${statusColor}12`, border: `1px solid ${statusColor}25`, color: statusColor }}
                          title={`${t.name}: ${t.count} logs`}
                        >
                          {t.name}
                        </span>
                      ))}
                      {usedTrackers.length > 4 && (
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                          +{usedTrackers.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer + expand toggle */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]">
                    <span className="text-[9px] text-textMuted opacity-35">Joined {formatDate(user.joinedAt)}</span>
                    <button
                      onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                      className="flex items-center gap-1 rounded-lg px-2 py-0.5 transition-all hover:opacity-80"
                      style={{ backgroundColor: `${statusColor}15`, border: `1px solid ${statusColor}25` }}
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: statusColor }}>
                        {isExpanded ? 'Hide' : 'Full Breakdown'}
                      </span>
                      <ChevronDown
                        className="h-3 w-3 transition-transform"
                        style={{ color: statusColor, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      />
                    </button>
                  </div>
                </div>

                {/* ── Expanded drill-down ── */}
                {isExpanded && (
                  <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: `${statusColor}20`, backgroundColor: `${statusColor}06` }}>

                    {/* Tracker activity breakdown */}
                    {user.trackerBreakdown.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-textMuted opacity-40">Tracker Activity</p>
                        {user.trackerBreakdown.map(t => {
                          const maxCount = user.trackerBreakdown[0]?.count ?? 1
                          const barPct = t.unused ? 0 : Math.max(4, Math.round((t.count / Math.max(maxCount, 1)) * 100))
                          return (
                            <div key={t.name} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-textPrimary truncate max-w-[55%]" title={t.name}>{t.name}</span>
                                <span className="text-[10px] font-black" style={{ color: t.unused ? '#4b5563' : statusColor }}>
                                  {t.unused ? 'never used' : `${t.count} log${t.count !== 1 ? 's' : ''}`}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${barPct}%`, backgroundColor: t.unused ? '#1f2937' : statusColor, opacity: t.unused ? 0.3 : 0.7 }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-textMuted opacity-30 text-center py-2">No trackers created yet</p>
                    )}

                    {/* Unused trackers callout */}
                    {unusedTrackers.length > 0 && (
                      <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <p className="text-[8px] font-black uppercase tracking-widest text-amber-400 opacity-70 mb-1">Set up but never used</p>
                        <p className="text-[11px] text-textMuted opacity-60">
                          {unusedTrackers.map(t => t.name).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Peak hour */}
                    {user.peakHour !== null && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 opacity-40" style={{ color: statusColor }} />
                        <span className="text-[11px] text-textMuted opacity-60">
                          Usually logs around <span className="font-black text-textPrimary">{formatHour(user.peakHour)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Routine Health */}
      <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60">Routine Health</h2>
          <div className="flex-1 border-t border-white/5" />
        </div>
        {routineHealth.completions === 0 && routineHealth.skips === 0 ? (
          <p className="text-sm font-medium text-textMuted opacity-40 text-center py-6">No routine data yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center space-y-1">
              <p className="text-3xl font-black text-green-400">{routineHealth.completions}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-textMuted opacity-40">Completions</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center space-y-1">
              <p className="text-3xl font-black text-amber-400">{routineHealth.skips}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-textMuted opacity-40">Steps Skipped</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center space-y-1">
              {routineHealth.avgCompletionMinutes !== null ? (
                <>
                  <p className="text-3xl font-black text-blue-400">{routineHealth.avgCompletionMinutes}<span className="text-sm font-bold text-textMuted opacity-60 ml-0.5">m</span></p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-textMuted opacity-40">Avg Duration</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-black text-textMuted opacity-30">—</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-textMuted opacity-40">Avg Duration</p>
                </>
              )}
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center space-y-1">
              <p className="text-xl font-black text-textPrimary truncate" title={routineHealth.topSkippedStep ?? '—'}>
                {routineHealth.topSkippedStep ?? '—'}
              </p>
              <p className="text-[8px] font-black uppercase tracking-widest text-textMuted opacity-40">Most Skipped Step</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60">
            Recent Activity
          </h2>
          <div className="flex-1 border-t border-white/5" />
          <span className="text-[10px] font-medium text-textMuted opacity-40">last 20</span>
        </div>
        {recentEvents.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm font-medium text-textMuted opacity-40">No events yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentEvents.map((event) => {
              const badgeColor = EVENT_TYPE_COLORS[event.event_type] ?? '#6B7280'
              const trackerName = (event.metadata?.tracker_name as string | undefined) ?? null
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 rounded-xl bg-white/[0.02] border border-white/[0.03] px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                >
                  {/* Event type badge */}
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                    style={{
                      backgroundColor: `${badgeColor}20`,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}30`,
                    }}
                  >
                    {event.event_type.replace(/_/g, ' ')}
                  </span>

                  {/* Tracker name */}
                  <span className="flex-1 truncate text-xs font-medium text-textMuted">
                    {trackerName ?? <span className="opacity-30">—</span>}
                  </span>

                  {/* User ID */}
                  <span className="shrink-0 font-mono text-[10px] text-textMuted opacity-40">
                    {event.user_id.slice(0, 8)}
                  </span>

                  {/* Timestamp */}
                  <span className="shrink-0 text-[10px] font-medium text-textMuted opacity-50">
                    {formatRelativeTime(event.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
