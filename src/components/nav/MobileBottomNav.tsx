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
  icon: React.ComponentType<{ className?: string }>
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#050c1a]/88 backdrop-blur-2xl border-t border-[rgba(0,212,255,0.18)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center pt-2.5 pb-2 gap-[3px] transition-all duration-300 group ${
                isActive ? 'text-[#00d4ff]' : 'text-[#475569] hover:text-[#94a3b8]'
              }`}
            >
              <div className="relative flex items-center justify-center px-3 py-1 rounded-full">
                {/* Active glow pill behind icon */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'color-mix(in oklch, #00d4ff 14%, transparent)' }}
                  />
                )}
                <Icon
                  className={`relative z-10 transition-all duration-300 ${
                    tab.primary ? 'w-6 h-6' : 'w-5 h-5'
                  } ${
                    isActive
                      ? 'text-[#00d4ff] drop-shadow-[0_0_5px_rgba(0,212,255,0.55)] stroke-[2.2]'
                      : 'stroke-[1.6]'
                  }`}
                />
              </div>
              <span
                className={`font-ui leading-none transition-all duration-300 ${
                  isActive ? 'text-[#a855f7]' : 'text-[#475569]'
                }`}
                style={{ fontSize: '9px', letterSpacing: '0.12em' }}
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
