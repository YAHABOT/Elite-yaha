'use server'
import { recordEvent, type UsageEventType, type UsageEventMetadata } from '@/lib/db/analytics'

export async function recordEventAction(
  eventType: UsageEventType,
  metadata: UsageEventMetadata = {}
): Promise<void> {
  // Fire-and-forget — intentionally no return value, no error propagation
  await recordEvent(eventType, metadata)
}
