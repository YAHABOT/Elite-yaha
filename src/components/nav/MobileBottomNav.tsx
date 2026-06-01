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
  primary?: boolean
}

const TABS: TabItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/chat', icon: MessageCircle, label: 'Chat', primary: true },
  { href: '/trackers', icon: Boxes, label: 'Trackers' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function MobileBottomNav(): React.ReactElement {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl"
      style={{
        backgroundColor: 'rgba(5,12,26,0.90)',
        borderTop: '1px solid rgba(0,212,255,0.18)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center pt-2.5 pb-2 gap-[3px] transition-all duration-300"
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
                    width: tab.primary ? 24 : 20,
                    height: tab.primary ? 24 : 20,
                    color: isActive ? '#00d4ff' : '#475569',
                    filter: isActive ? 'drop-shadow(0 0 5px rgba(0,212,255,0.60))' : 'none',
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
