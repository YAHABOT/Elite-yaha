'use client'

import { use, useEffect } from 'react'

type Props = {
  confirmOnRefreshPromise: Promise<boolean>
}

export function RefreshGuard({ confirmOnRefreshPromise }: Props): null {
  // use() suspends this component until the Promise resolves.
  // The Suspense boundary in layout.tsx has fallback={null} so there's
  // zero visual impact — the guard simply activates once the value arrives.
  const confirmOnRefresh = use(confirmOnRefreshPromise)

  useEffect(() => {
    if (!confirmOnRefresh) return

    const handler = (e: BeforeUnloadEvent): void => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [confirmOnRefresh])

  return null
}
