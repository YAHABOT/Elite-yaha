import { notFound } from 'next/navigation'
import { getTracker } from '@/lib/db/trackers'
import { SchemaEditor } from '@/components/trackers/SchemaEditor'

type Props = {
  params: Promise<{ id: string }>
}

export default async function SchemaEditorPage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params

  let tracker
  try {
    tracker = await getTracker(id)
  } catch {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <SchemaEditor tracker={tracker} />
    </div>
  )
}
