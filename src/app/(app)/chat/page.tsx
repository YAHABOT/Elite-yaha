'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { chatEvents } from '@/lib/events/chatEvents'
import { use } from 'react'

export default function ChatRootRedirect({ searchParams }: { 
  searchParams: Promise<{ routine?: string }>
}) {
  const router = useRouter()
  const { routine } = use(searchParams)

  useEffect(() => {
    chatEvents.openChat({ sessionId: 'new', initialRoutineId: routine || null })
    router.replace('/dashboard')
  }, [routine, router])

  return null
}
