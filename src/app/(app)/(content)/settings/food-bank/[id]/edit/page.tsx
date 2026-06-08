import { getFoodBankEntry } from '@/lib/db/food-bank'
import { FoodBankForm } from '@/components/settings/food-bank/FoodBankForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function EditFoodBankEntryPage({ params }: Props) {
  const { id } = await params
  const entry = await getFoodBankEntry(id).catch(() => null)
  if (!entry) notFound()

  return (
    <div className="min-h-screen bg-background px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings/food-bank"
          className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/[0.03] text-textMuted hover:text-textPrimary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-ui text-xl font-bold text-textPrimary tracking-tight">Edit Entry</h1>
          <p className="text-xs text-textMuted opacity-60 mt-0.5">{entry.name}</p>
        </div>
      </div>
      <FoodBankForm initialData={entry} />
    </div>
  )
}
