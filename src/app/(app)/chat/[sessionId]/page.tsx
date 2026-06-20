'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { chatEvents } from '@/lib/events/chatEvents'
import { use } from 'react'

export default function ChatSessionRedirect({ params, searchParams }: { 
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ routine?: string }>
}) {
  const router = useRouter()
  const { sessionId } = use(params)
  const { routine } = use(searchParams)

  useEffect(() => {
    chatEvents.openChat({ sessionId, initialRoutineId: routine || null })
    router.replace('/dashboard')
  }, [sessionId, routine, router])

  return null
}
