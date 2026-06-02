'use client' // needed for usePathname() to detect active tab

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Boxes,
  Settings,
} from 'lucide-react'

type TabItem = {
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>
  label: string
  center?: boolean
}

const TABS: TabItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/chat', icon: MessageCircle, label: 'Chat', center: true },
  { href: '/trackers', icon: Boxes, label: 'Trackers' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function MobileBottomNav(): React.ReactElement {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl overflow-visible"
      style={{
        backgroundColor: 'rgba(5,12,26,0.90)',
        height: 62,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* SVG arc border — flat on sides, bumps up over center chat icon */}
      <svg
        aria-hidden="true"
        viewBox="0 0 390 22"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 22,
          pointerEvents: 'none',
        }}
      >
        <path
          d="M0,16 L138,16 C158,16 165,6 195,6 C225,6 232,16 252,16 L390,16"
          fill="none"
          stroke="rgba(0,212,255,0.32)"
          strokeWidth="1.2"
        />
      </svg>

      <div className="flex items-stretch h-full">
        {TABS.map((tab, index) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          const isCenter = tab.center === true
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center pb-2 gap-[3px] transition-all duration-300"
              style={{ paddingTop: isCenter ? 10 : 13 }}
            >
              <div className="relative flex items-center justify-center px-3 py-1 rounded-full">
                {/* Active glow pill */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'rgba(0,212,255,0.12)' }}
                  />
                )}
                <Icon
                  className="relative z-10 transition-all duration-300"
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{
                    width: 20,
                    height: 20,
                    color: isActive ? '#00d4ff' : '#475569',
                    filter: isActive
                      ? 'drop-shadow(0 0 5px rgba(0,212,255,0.60))'
                      : isCenter
                      ? 'drop-shadow(0 0 5px rgba(0,212,255,0.30))'
                      : 'none',
                    transform: isCenter ? 'scale(1.28)' : undefined,
                    transformOrigin: 'center',
                  }}
                />
              </div>
              <span
                className="font-ui leading-none transition-all duration-300"
                style={{
                  fontSize: '9px',
                  letterSpacing: '0.12em',
                  color: isActive ? '#a855f7' : '#475569',
                }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
