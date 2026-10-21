import type { PortalNotification } from '@/src/modules/portal/domain/portal-notifications-types'
import {
  buildPushPayload,
  selectNotificationsToPush,
} from '@/src/modules/push/domain/push-dispatch'
import type {
  DispatchSubscription,
  PushRecipient,
} from '@/src/modules/push/infrastructure/push-subscriptions.supabase'
import type { PushPayload } from '@/src/modules/push/domain/push-dispatch'
import type { PushSendResult } from '@/src/modules/push/infrastructure/web-push-sender'

export type PushDispatchDeps = {
  listSubscriptions: () => Promise<DispatchSubscription[]>
  fetchRecipients: (userIds: string[]) => Promise<Map<string, PushRecipient>>
  /** Avisos pendientes del usuario, o `null` si no se pudieron calcular. */
  loadNotifications: (
    userId: string,
    recipient: PushRecipient
  ) => Promise<PortalNotification[] | null>
  send: (
    subscription: DispatchSubscription,
    payload: PushPayload
  ) => Promise<PushSendResult>
  saveState: (subscriptionId: string, sentKeys: string[]) => Promise<void>
  deleteByIds: (ids: string[]) => Promise<void>
  now: () => number
  /** Orden de proceso; aleatorio en producción para que, si no cabe todo en una ejecución, nadie se quede siempre al final. */
  order: <T>(items: T[]) => T[]
}

export type PushDispatchSummary = {
  users: number
  sent: number
  removed: number
  skipped: number
  truncated: boolean
}

const CONCURRENCY = 4

/** Un usuario archivado, desactivado o sin rol válido no debe seguir recibiendo avisos. */
function isRecipientActive(recipient: PushRecipient | undefined): recipient is PushRecipient {
  if (!recipient) return false
  if (recipient.isActive === false) return false
  if (recipient.status?.toLowerCase() === 'archived') return false
  return recipient.role === 'client' || recipient.role === 'worker'
}

export async function runPushDispatch(
  deps: PushDispatchDeps,
  options: { deadlineAt: number }
): Promise<PushDispatchSummary> {
  const summary: PushDispatchSummary = {
    users: 0,
    sent: 0,
    removed: 0,
    skipped: 0,
    truncated: false,
  }

  const subscriptions = await deps.listSubscriptions()
  const byUser = new Map<string, DispatchSubscription[]>()
  for (const subscription of subscriptions) {
    const list = byUser.get(subscription.userId) ?? []
    list.push(subscription)
    byUser.set(subscription.userId, list)
  }

  const recipients = await deps.fetchRecipients([...byUser.keys()])
  const toDelete: string[] = []
  const queue: [string, DispatchSubscription[]][] = []

  for (const [userId, userSubscriptions] of byUser) {
    if (isRecipientActive(recipients.get(userId))) {
      queue.push([userId, userSubscriptions])
    } else {
      toDelete.push(...userSubscriptions.map((subscription) => subscription.id))
    }
  }

  async function processUser(userId: string, userSubscriptions: DispatchSubscription[]) {
    const recipient = recipients.get(userId)!
    summary.users += 1

    let notifications: PortalNotification[] | null
    try {
      notifications = await deps.loadNotifications(userId, recipient)
    } catch (error) {
      console.error('[push] calcular avisos falló', { userId, error })
      notifications = null
    }
    if (!notifications) {
      summary.skipped += userSubscriptions.length
      return
    }

    for (const subscription of userSubscriptions) {
      const selection = selectNotificationsToPush({
        notifications,
        preferences: subscription.preferences,
        sentKeys: subscription.sentKeys,
        baselined: subscription.baselined,
      })

      const payload = buildPushPayload(selection.toSend)
      if (payload) {
        const result = await deps.send(subscription, payload)
        if (result === 'gone') {
          toDelete.push(subscription.id)
          continue
        }
        if (result === 'error') {
          // Sin guardar lo enviado: se reintenta en la siguiente ejecución.
          summary.skipped += 1
          continue
        }
        summary.sent += 1
      }

      const unchanged =
        subscription.baselined &&
        selection.nextSentKeys.length === subscription.sentKeys.length &&
        selection.nextSentKeys.every((key, i) => key === subscription.sentKeys[i])
      if (!unchanged) {
        await deps.saveState(subscription.id, selection.nextSentKeys)
      }
    }
  }

  const pending = deps.order(queue)
  let next = 0
  async function worker() {
    while (next < pending.length) {
      if (deps.now() >= options.deadlineAt) {
        summary.truncated = true
        return
      }
      const [userId, userSubscriptions] = pending[next]!
      next += 1
      await processUser(userId, userSubscriptions)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  if (toDelete.length > 0) {
    await deps.deleteByIds(toDelete)
    summary.removed = toDelete.length
  }

  return summary
}
