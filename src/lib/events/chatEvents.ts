type ChatEventPayload = {
  action?: 'open' | 'minimize'
  sessionId?: string | null
  initialRoutineId?: string | null
}

type ChatEventListener = (payload: ChatEventPayload) => void

class ChatEventEmitter {
  private listeners: Set<ChatEventListener> = new Set()

  subscribe(listener: ChatEventListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  openChat(payload: ChatEventPayload = {}) {
    this.listeners.forEach((listener) => listener(payload))
  }
}

export const chatEvents = new ChatEventEmitter()
