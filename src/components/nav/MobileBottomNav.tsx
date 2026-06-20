'use client' // needed for usePathname() to detect active tab

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Boxes,
  Settings,
  Target,
} from 'lucide-react'

type TabItem = {
  href: string
  activeMatch?: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>
  label: string
  center?: boolean
}

const TABS: TabItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/coaching', icon: Target, label: 'Coaching', center: true },
  { href: '/trackers', icon: Boxes, label: 'Trackers' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function MobileBottomNav(): React.ReactElement {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl overflow-visible"
      style={{
        background: 'transparent',
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* SVG: fills ONLY below the arc (transparent above) + draws the border stroke.
          viewBox matches nav height so coordinates are in real pixels.
          Fill extends to 200 to cover safe-area-inset-bottom on any device. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 390 62"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* Background fill — only below the arc curve, transparent above */}
        <path
          d="M0,8 L138,8 C158,8 165,2 195,2 C225,2 232,8 252,8 L390,8 L390,200 L0,200 Z"
          fill="rgba(5,12,26,0.92)"
        />
        {/* Arc border stroke */}
        <path
          d="M0,8 L138,8 C158,8 165,2 195,2 C225,2 232,8 252,8 L390,8"
          fill="none"
          stroke="rgba(0,212,255,0.32)"
          strokeWidth="1.2"
        />
      </svg>

      <div className="flex items-stretch h-full">
        {TABS.map((tab) => {
          const matchPath = tab.activeMatch ?? tab.href
          const isActive = pathname === matchPath || pathname.startsWith(matchPath + '/')
          const isCenter = tab.center === true
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className="relative flex-1 flex flex-col items-center justify-start transition-all duration-300"
              style={{ paddingTop: isCenter ? 4 : 10 }}
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
                    color: isActive ? '#00d4ff' : '#94a3b8',
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
              {/* Label pinned to bottom — absolute so flex math can never push it out */}
              <span
                className="absolute font-ui leading-none transition-all duration-300"
                style={{
                  bottom: 6,
                  fontSize: isCenter ? '10px' : '9px',
                  letterSpacing: '0.12em',
                  color: isActive ? '#a855f7' : '#94a3b8',
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
