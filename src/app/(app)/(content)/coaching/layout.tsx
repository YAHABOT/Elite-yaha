'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Target, User, BookOpen, ClipboardCheck } from 'lucide-react'
import { checkIsRoohanAction } from '@/app/actions/coaching'

export default function CoachingLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRoohan, setIsRoohan] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await checkIsRoohanAction()
        setIsRoohan(res)
      } catch (err) {
        console.error('Failed to verify user profile:', err)
      }
    }
    checkUser()
  }, [])

  return (
    <div className="min-h-full flex flex-col md:flex-row relative bg-background/30 rounded-3xl border border-white/[0.04] overflow-hidden">
      
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-[#050C1A]/95 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 h-14 w-full">
        <button onClick={() => setIsOpen(true)} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors" aria-label="Open coaching menu">
          <Menu size={20} />
        </button>
        <div className="font-black text-xs tracking-widest text-white/90 uppercase flex items-center gap-1.5">
          <Target size={14} className="text-cyan-400" />
          Coaching
        </div>
        <div className="w-8 h-8" /> {/* Balance spacer */}
      </header>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" />
          
          {/* Drawer content */}
          <aside className="relative flex flex-col w-72 max-w-[80vw] h-full bg-[#050505] border-r border-white/10 p-5 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
              <span className="font-black text-xs tracking-widest text-white/90 uppercase flex items-center gap-1.5">
                <Target size={14} className="text-cyan-400" />
                Coaching Portal
              </span>
              <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-3">Main</p>
                <Link 
                  href="/coaching" 
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${pathname === '/coaching' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  <BookOpen size={16} />
                  Timeline
                </Link>
                <Link 
                  href="/coaching/campaigns" 
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${pathname.startsWith('/coaching/campaigns') ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  <Target size={16} />
                  Campaigns
                </Link>
                <Link 
                  href="/coaching/approvals" 
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${pathname.startsWith('/coaching/approvals') ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  <ClipboardCheck size={16} />
                  Approvals
                </Link>
              </div>

              {isRoohan && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-3">User Profile</p>
                  <Link 
                    href="/coaching/profile/intake" 
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${pathname === '/coaching/profile/intake' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                  >
                    <User size={16} />
                    Intake Questionnaire
                  </Link>
                </div>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex flex-col w-60 border-r border-white/5 bg-[#050505]/40 p-5 shrink-0 self-stretch min-h-[calc(100vh-4rem)]">
        <div className="pb-6 mb-6 border-b border-white/5">
          <span className="font-black text-[11px] tracking-widest text-white/90 uppercase flex items-center gap-1.5">
            <Target size={14} className="text-cyan-400" />
            Coaching Hub
          </span>
        </div>
        
        <nav className="flex-1 space-y-6">
          <div className="space-y-1.5">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.25em] px-3 mb-2">Main</p>
            <Link 
              href="/coaching" 
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${pathname === '/coaching' ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.25)]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}
            >
              <BookOpen size={14} />
              Timeline
            </Link>
            <Link 
              href="/coaching/campaigns" 
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${pathname.startsWith('/coaching/campaigns') ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.25)]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}
            >
              <Target size={14} />
              Campaigns
            </Link>
            <Link 
              href="/coaching/approvals" 
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${pathname.startsWith('/coaching/approvals') ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.25)]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}
            >
              <ClipboardCheck size={14} />
              Approvals
            </Link>
          </div>

          {isRoohan && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.25em] px-3 mb-2">User Profile</p>
              <Link 
                href="/coaching/profile/intake" 
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${pathname === '/coaching/profile/intake' ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.25)]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}
              >
                <User size={14} />
                Intake Form
              </Link>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
