import { getUser } from '@/lib/db/users'
import { getSafeUser } from '@/lib/supabase/auth'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function ProfilePage(): Promise<React.ReactElement> {
  const userAuth = await getSafeUser()
  if (!userAuth) redirect('/login')

  const supabase = await createServerClient()
  let profile = null
  try {
    profile = await getUser(userAuth.id, supabase)
  } catch {
    // DB error — render with empty defaults
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-textMuted opacity-50 hover:opacity-100 transition-opacity mb-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
        <h1 className="font-display-heading text-5xl text-textPrimary">Profile</h1>
        <div className="border-t border-white/5 pt-3">
          <p className="text-sm font-medium text-textMuted opacity-60">
            Personal details YAHA uses to personalise your experience.
          </p>
        </div>
      </div>

      <ProfileForm initialValues={profile} />
    </div>
  )
}
