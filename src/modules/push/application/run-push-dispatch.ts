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
  /** Extracto del mensaje del chatter, o `null` si no se pudo leer. */
  loadMessagePreview: (messageId: number) => Promise<string | null>
  saveState: (subscriptionId: string, sentKeys: string[]) => Promise<void>
  saveFailureCount: (subscriptionId: string, failureCount: number) => Promise<void>
  deleteByIds: (ids: string[]) => Promise<void>
  /** `false` si ya hay otra ejecución en marcha. */
  acquireLock: () => Promise<boolean>
  releaseLock: () => Promise<void>
  now: () => number
  /** Orden de proceso; aleatorio en producción para que, si no cabe todo en una ejecución, nadie se quede siempre al final. */
  order: <T>(items: T[]) => T[]
}

export type PushDispatchSummary = {
  users: number
  sent: number
  removed: number
  skipped: number
  /** Envíos que el servicio de push rechazó (clave, petición o tamaño): suman también a `skipped`. */
  rejected: number
  /** Envíos que fallaron por algo transitorio (red, 429, 5xx): suman también a `skipped`. */
  failed: number
  truncated: boolean
  /** Otra ejecución tenía el cerrojo: esta no ha hecho nada. */
  locked: boolean
}

const CONCURRENCY = 4

/** Envíos seguidos rechazados tras los que se da de baja el dispositivo. */
export const MAX_CONSECUTIVE_REJECTIONS = 10

/** Un usuario archivado, desactivado o sin rol válido no debe seguir recibiendo avisos. */
export function isRecipientActive(recipient: PushRecipient | undefined): recipient is PushRecipient {
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
    rejected: 0,
    failed: 0,
    truncated: false,
    locked: false,
  }

  if (!(await deps.acquireLock())) {
    summary.locked = true
    return summary
  }

  try {
    await runLocked(deps, options, summary)
  } finally {
    await deps.releaseLock()
  }
  return summary
}

async function runLocked(
  deps: PushDispatchDeps,
  options: { deadlineAt: number },
  summary: PushDispatchSummary
): Promise<void> {
  // Un mensaje se lee de Odoo una sola vez por ejecución aunque lo reciban
  // varios dispositivos.
  const previewCache = new Map<number, Promise<string | null>>()
  function previewFor(messageId: number): Promise<string | null> {
    let cached = previewCache.get(messageId)
    if (!cached) {
      cached = deps.loadMessagePreview(messageId).catch((error) => {
        console.error('[push] leer el mensaje falló', { messageId, error })
        return null
      })
      previewCache.set(messageId, cached)
    }
    return cached
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
  const rejectedForGood: string[] = []
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
      // Un fallo en un dispositivo (p. ej. al guardar el estado) no debe
      // tumbar la ejecución entera ni a los demás usuarios.
      try {
        await processSubscription(subscription, notifications)
      } catch (error) {
        console.error('[push] procesar dispositivo falló', {
          subscriptionId: subscription.id,
          error,
        })
        summary.skipped += 1
      }
    }
  }

  async function processSubscription(
    subscription: DispatchSubscription,
    notifications: PortalNotification[]
  ) {
    const selection = selectNotificationsToPush({
      notifications,
      preferences: subscription.preferences,
      sentKeys: subscription.sentKeys,
      baselined: subscription.baselined,
    })

    // Solo un aviso suelto de chatter muestra el texto del mensaje.
    const previews = new Map<number, string>()
    const only = selection.toSend.length === 1 ? selection.toSend[0]! : null
    if (only?.reason === 'unread_chatter' && only.latestMessageId !== undefined) {
      const preview = await previewFor(only.latestMessageId)
      if (preview) previews.set(only.latestMessageId, preview)
    }

    const payload = buildPushPayload(selection.toSend, previews)
    if (payload) {
      const result = await deps.send(subscription, payload)
      if (result === 'gone') {
        toDelete.push(subscription.id)
        return
      }
      if (result === 'rejected') {
        const failures = subscription.failureCount + 1
        summary.skipped += 1
        summary.rejected += 1
        await deps.saveFailureCount(subscription.id, failures)
        if (failures >= MAX_CONSECUTIVE_REJECTIONS) rejectedForGood.push(subscription.id)
        return
      }
      if (result === 'error') {
        // Sin guardar lo enviado: se reintenta en la siguiente ejecución.
        summary.skipped += 1
        summary.failed += 1
        return
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

  if (rejectedForGood.length > 0) {
    if (summary.sent > 0) {
      toDelete.push(...rejectedForGood)
    } else {
      // Si ningún envío de esta ejecución ha salido bien, lo más probable es un
      // fallo del servidor (p. ej. clave VAPID mal puesta) y no de los
      // dispositivos: no se da de baja a nadie.
      console.error('[push] todos los envíos rechazados: revisar las claves VAPID', {
        devices: rejectedForGood.length,
      })
    }
  }

  if (toDelete.length > 0) {
    try {
      await deps.deleteByIds(toDelete)
      summary.removed = toDelete.length
    } catch (error) {
      console.error('[push] borrar suscripciones falló', error)
    }
  }
}
