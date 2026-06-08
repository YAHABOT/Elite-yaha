import { getFoodBankEntries } from '@/lib/db/food-bank'
import { FoodBankList } from '@/components/settings/food-bank/FoodBankList'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function FoodBankPage() {
  const entries = await getFoodBankEntries().catch(() => [])

  return (
    <div className="min-h-screen bg-background px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/[0.03] text-textMuted hover:text-textPrimary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-ui text-xl font-bold text-textPrimary tracking-tight">Food Bank</h1>
          <p className="text-xs text-textMuted opacity-60 mt-0.5">Your saved dishes and pantry staples</p>
        </div>
      </div>
      <FoodBankList initialEntries={entries} />
    </div>
  )
}
