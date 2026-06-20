'use server'

import { getSessions as dbGetSessions, getSession as dbGetSession, getMessages as dbGetMessages } from '@/lib/db/chat'
import { getRoutine as dbGetRoutine } from '@/lib/db/routines'

export async function fetchChatSessionsAction() {
  return await dbGetSessions()
}

export async function fetchChatSessionDataAction(sessionId: string) {
  if (sessionId === 'new') {
    return { session: null, messages: [], routine: null }
  }

  const [session, messagesData] = await Promise.all([
    dbGetSession(sessionId).catch(() => null),
    dbGetMessages(sessionId).catch(() => ({ messages: [], nextCursor: undefined })),
  ])

  const routine = session?.active_routine_id 
    ? await dbGetRoutine(session.active_routine_id).catch(() => null)
    : null

  return { session, messages: messagesData.messages, routine }
}
