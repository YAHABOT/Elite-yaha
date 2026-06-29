import { signOut } from '@/app/actions/auth'
import { ShieldAlert } from 'lucide-react'

export default function BlockedPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b1a28] px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#152e47]/40 p-8 shadow-2xl shadow-red-500/5 backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
          <ShieldAlert className="h-7 w-7 animate-pulse" />
        </div>

        <h1 className="font-ui font-black text-lg tracking-widest text-white uppercase mb-3">
          Access Restricted
        </h1>

        <p className="text-sm text-textPrimary/80 leading-relaxed mb-8">
          Sorry, you don&apos;t have access to this app. Please contact the admin to get access to the app.
        </p>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-xl bg-white/5 border border-white/10 py-3 text-sm font-semibold text-white/70 hover:text-white hover:border-white/20 transition-all hover:bg-white/[0.07]"
          >
            Sign Out
          </button>
        </form>
      </div>
    </main>
  )
}
