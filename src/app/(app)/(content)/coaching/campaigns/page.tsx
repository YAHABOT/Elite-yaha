import Link from 'next/link'
import { Target, Award, ArrowRight, ShieldAlert } from 'lucide-react'

export const metadata = {
  title: 'Campaigns | Coaching Hub',
  description: 'Your active preparation plans, targets, and campaigns.',
}

export default function CampaignsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-8 pb-20 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Target className="text-cyan-400" size={22} />
          Active Campaigns
        </h1>
        <p className="text-xs text-white/50 mt-1 uppercase tracking-widest font-mono">
          Select a campaign to view roadmap, macrocycle, and training schedules.
        </p>
      </div>

      {/* Campaigns Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/coaching/campaigns/valencia" className="group block">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.04] bg-[#050C1A]/40 p-6 backdrop-blur-xl hover:border-cyan-500/30 hover:bg-[#050C1A]/60 transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.05)]">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 rounded-full bg-cyan-500/5 blur-3xl group-hover:bg-cyan-500/10 transition-colors" />
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-[9px] font-black uppercase tracking-widest text-cyan-400">
                  Active • Phase 2
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  October 17, 2026
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wide group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  Valencia Oct 2026
                  <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-xs text-white/50 mt-1 font-mono uppercase tracking-wider">
                  Target Finish: Sub-60 Minutes
                </p>
              </div>

              <p className="text-xs text-white/70 leading-relaxed font-sans pt-2 border-t border-white/5">
                5-month periodized Mixed Doubles preparation. Integrates running biomechanics cadence Caps, loaded sled progressions, and compromised running.
              </p>

              <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 pt-2">
                <span>Athletes: Armaan & Violetta</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Placeholder for future campaign */}
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-6 flex flex-col items-center justify-center text-center group min-h-[220px]">
          <Award size={24} className="text-white/20 mb-3" />
          <h3 className="text-xs font-black text-white/30 uppercase tracking-widest">
            Future Campaigns
          </h3>
          <p className="text-[10px] text-white/20 max-w-[200px] mt-1 font-mono uppercase leading-normal">
            New campaigns will be cataloged here once registered.
          </p>
        </div>
      </div>
    </div>
  )
}
