'use client'

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Users, BarChart2, Zap, Activity } from 'lucide-react'
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

export function InsightsDashboard({ insights }: Props): React.ReactElement {
  const {
    totalSignups,
    usersWithTrackers,
    usersLoggedThisWeek,
    aiAccuracy7d,
    actionCardOutcomes30d,
    dailyActivity14d,
    topTrackers,
    recentEvents,
    userProfiles,
  } = insights

  const accuracyColor = getAccuracyColor(aiAccuracy7d)

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
          <p className={`text-3xl font-black ${accuracyColor}`}>
            {aiAccuracy7d === null ? '—' : `${aiAccuracy7d}%`}
          </p>
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
            const displayTrackers = user.trackerNames.slice(0, 4)
            const extraTrackers = user.trackerNames.length - displayTrackers.length
            return (
              <div
                key={user.id}
                className="rounded-2xl p-4 transition-all hover:brightness-110"
                style={{
                  background: `linear-gradient(135deg, ${statusColor}08 0%, transparent 60%), #0e243a`,
                  border: `1px solid ${statusColor}25`,
                  boxShadow: `0 0 20px ${statusColor}0a`,
                }}
              >
                {/* Top row: ring + identity */}
                <div className="flex items-start gap-4">
                  <EngagementRing score={user.engagementScore} color={statusColor} />

                  <div className="flex-1 min-w-0 pt-1">
                    {/* Status badge */}
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 mb-1.5"
                      style={{
                        backgroundColor: `${statusColor}18`,
                        border: `1px solid ${statusColor}35`,
                        fontSize: '8px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: statusColor,
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: statusColor, boxShadow: `0 0 4px ${statusColor}` }} />
                      {user.status}
                    </span>

                    {/* Email */}
                    <p className="text-[13px] font-bold text-textPrimary truncate leading-tight" title={user.email}>
                      {user.email}
                    </p>
                    <p className="text-[9px] font-mono opacity-25 text-textMuted mt-0.5">
                      {user.id.slice(0, 8)}···
                    </p>
                  </div>
                </div>

                {/* 7-day activity bars */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-textMuted opacity-30">7-day activity</span>
                    <span className="text-[8px] font-black opacity-50" style={{ color: statusColor }}>
                      {user.logsLast7d} logs
                    </span>
                  </div>
                  <ActivityBars days={user.logsLast7dByDay} color={statusColor} />
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-0 mt-3 rounded-xl overflow-hidden border border-white/[0.04]">
                  {[
                    { label: 'Total Logs', value: user.totalLogs, color: 'text-textPrimary' },
                    { label: 'Trackers', value: user.trackerCount, color: 'text-textMuted' },
                    { label: 'Last Log', value: user.lastLogAt ? formatRelativeTime(user.lastLogAt) : '—', color: 'text-textMuted', small: true },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center py-2 gap-0.5 border-r border-white/[0.04] last:border-r-0"
                      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    >
                      <span className={`font-black ${stat.small ? 'text-[10px]' : 'text-[16px]'} ${stat.color}`}>
                        {stat.value}
                      </span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-textMuted opacity-35">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tracker chips */}
                {user.trackerCount > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {displayTrackers.map(name => (
                      <span
                        key={name}
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold truncate max-w-[90px]"
                        style={{
                          backgroundColor: `${statusColor}12`,
                          border: `1px solid ${statusColor}25`,
                          color: statusColor,
                        }}
                        title={name}
                      >
                        {name}
                      </span>
                    ))}
                    {extraTrackers > 0 && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
                      >
                        +{extraTrackers} more
                      </span>
                    )}
                  </div>
                )}

                {/* Footer metadata */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]">
                  <span className="text-[9px] text-textMuted opacity-35">
                    Joined {formatDate(user.joinedAt)}
                  </span>
                  <span className="text-[9px] text-textMuted opacity-35">
                    Seen {user.lastSeenAt ? formatRelativeTime(user.lastSeenAt) : 'never'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
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
