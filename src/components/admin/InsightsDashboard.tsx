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

      {/* User Roster */}
      <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60">
            User Roster
          </h2>
          <div className="flex-1 border-t border-white/5" />
          <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-black text-textMuted opacity-70">
            {userProfiles.length} users
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 pb-1">
          {(['active', 'dormant', 'new'] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getStatusColor(s) }} />
              <span className="text-[10px] font-black uppercase tracking-widest text-textMuted opacity-50 capitalize">{s}</span>
            </div>
          ))}
          <span className="text-[10px] text-textMuted opacity-30 ml-auto">active = logged in last 7d · dormant = logged before · new = never logged</span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[20px_1fr_90px_90px_1fr_70px_60px_90px] gap-3 px-3 pb-1">
          {['', 'USER', 'JOINED', 'LAST SEEN', 'TRACKERS', 'TOTAL', '7D', 'LAST LOG'].map((h, i) => (
            <span key={i} className="text-[9px] font-black uppercase tracking-widest text-textMuted opacity-40 truncate">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {userProfiles.map(user => {
            const statusColor = getStatusColor(user.status)
            const displayTrackers = user.trackerNames.slice(0, 3)
            const extraTrackers = user.trackerNames.length - displayTrackers.length
            return (
              <div
                key={user.id}
                className="grid grid-cols-[20px_1fr_90px_90px_1fr_70px_60px_90px] gap-3 items-center rounded-xl bg-white/[0.02] border border-white/[0.03] px-3 py-2.5 hover:bg-white/[0.04] hover:border-white/[0.06] transition-colors"
              >
                {/* Status dot */}
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}60` }}
                />

                {/* Email */}
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-textPrimary truncate" title={user.email}>
                    {user.email}
                  </p>
                  <p className="text-[9px] font-mono text-textMuted opacity-30 truncate">{user.id.slice(0, 8)}</p>
                </div>

                {/* Joined */}
                <span className="text-[11px] text-textMuted opacity-60 truncate">
                  {formatDate(user.joinedAt)}
                </span>

                {/* Last seen */}
                <span className="text-[11px] text-textMuted opacity-60 truncate">
                  {user.lastSeenAt ? formatRelativeTime(user.lastSeenAt) : '—'}
                </span>

                {/* Trackers */}
                <div className="flex flex-wrap gap-1 min-w-0">
                  {user.trackerCount === 0 ? (
                    <span className="text-[10px] text-textMuted opacity-25">none</span>
                  ) : (
                    <>
                      {displayTrackers.map(name => (
                        <span
                          key={name}
                          className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-bold text-textMuted truncate max-w-[80px]"
                          title={name}
                        >
                          {name}
                        </span>
                      ))}
                      {extraTrackers > 0 && (
                        <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-bold text-textMuted opacity-50">
                          +{extraTrackers}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Total logs */}
                <span className={`text-[13px] font-black ${user.totalLogs > 0 ? 'text-textPrimary' : 'text-textMuted opacity-30'}`}>
                  {user.totalLogs}
                </span>

                {/* 7d logs */}
                <span
                  className="text-[13px] font-black"
                  style={{ color: user.logsLast7d > 0 ? '#10b981' : '#4b5563' }}
                >
                  {user.logsLast7d}
                </span>

                {/* Last log */}
                <span className="text-[11px] text-textMuted opacity-60 truncate">
                  {user.lastLogAt ? formatRelativeTime(user.lastLogAt) : '—'}
                </span>
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
