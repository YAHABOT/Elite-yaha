import { getSafeUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { fetchCoachClientsAction, startImpersonatingAction } from '@/app/actions/coaching'
import { Shield, User, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default async function CoachDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  // Real user check
  const realUser = (user as unknown as { id: string; email?: string | null; realUser?: { id: string; email?: string | null } }).realUser || user
  const isCoach =
    realUser.id === '44ef9aae-79d7-4bc9-8eea-7d8a55964813' ||
    realUser.id === '4c74333b-18e6-465a-a62a-523a4ad2999b' ||
    realUser.email === 'armaan1993@gmail.com' ||
    realUser.email === 'violetmikulchik@gmail.com'

  if (!isCoach) {
    redirect('/')
  }

  // Handle auto-impersonation query parameter
  const params = await searchParams
  const impersonateId = params.impersonate
  if (impersonateId && typeof impersonateId === 'string') {
    await startImpersonatingAction(impersonateId)
    redirect('/')
  }

  const clients = await fetchCoachClientsAction()

  async function handleImpersonateForm(formData: FormData) {
    'use server'
    const clientId = formData.get('clientId') as string
    if (clientId) {
      await startImpersonatingAction(clientId)
      redirect('/')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 safe-top shrink-0">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="font-black text-sm tracking-widest text-rose-500 uppercase flex items-center gap-2">
            <Shield size={18} className="text-rose-500 animate-pulse" />
            Cortex Command Portal
          </div>
          <span className="text-[10px] font-black uppercase bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/50 tracking-wider">
            Secure Session
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Banner */}
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 md:p-8 shadow-[0_0_30px_rgba(244,63,94,0.05)] relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
              <Shield size={22} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-sm font-black uppercase tracking-wider text-rose-500">Backdoor Impersonation</h2>
              <p className="text-xs text-white/50 leading-relaxed max-w-2xl">
                Use this dashboard to impersonate any client. In backdoor mode, you bypass RLS and view/edit the {"app's"} trackers, journals, and nutrition data exactly as if you were logged into the client{"'s"} account. A red banner will stay pinned to the top of the viewport to remind you that backdoor mode is active.
              </p>
            </div>
          </div>
        </div>

        {/* Client List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Active Clients</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{clients.length} Clients Found</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {clients.map(client => {
              const hasIntake = client.intakeStatus === 'submitted'
              const isDraft = client.intakeStatus === 'draft'

              return (
                <div
                  key={client.id}
                  className="bg-[#050C1A]/40 border border-white/[0.03] hover:border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.15)] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 shrink-0 group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-all">
                      <User size={22} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-white/90 uppercase tracking-wide group-hover:text-white transition-colors">
                        {client.alias}
                      </h3>
                      <p className="text-[10px] font-mono text-white/30 truncate max-w-[200px] md:max-w-xs">
                        {client.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Intake Status Badge */}
                    {hasIntake ? (
                      <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                        <CheckCircle size={10} />
                        Intake Ready
                      </span>
                    ) : isDraft ? (
                      <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                        <Clock size={10} />
                        Intake Draft
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-white/5 border border-white/10 text-white/40 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                        <AlertCircle size={10} />
                        Intake Empty
                      </span>
                    )}

                    {/* Impersonation action */}
                    <form action={handleImpersonateForm} className="w-full md:w-auto">
                      <input type="hidden" name="clientId" value={client.id} />
                      <button
                        type="submit"
                        className="w-full md:w-auto bg-white/5 hover:bg-rose-500 hover:text-white border border-white/10 hover:border-rose-500 text-white/80 font-black uppercase tracking-widest text-[9px] px-5 py-3 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 group/btn hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] active:scale-[0.98]"
                      >
                        Enter Backdoor
                        <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}

            {clients.length === 0 && (
              <div className="bg-[#050C1A]/20 border border-dashed border-white/10 rounded-3xl p-12 text-center text-white/30 font-bold uppercase tracking-widest text-xs">
                No Clients Configured.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
