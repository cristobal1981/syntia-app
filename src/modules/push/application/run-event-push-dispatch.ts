import { pushCategoryForReason, buildPushPayload } from '@/src/modules/push/domain/push-dispatch'
import {
  collapseEvents,
  eventToNotification,
  previewsFromEvents,
  type PortalEventRow,
} from '@/src/modules/push/domain/portal-event'
import {
  isRecipientActive,
  MAX_CONSECUTIVE_REJECTIONS,
  type PushDispatchSummary,
} from '@/src/modules/push/application/run-push-dispatch'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import { filterNotificationsForWorker } from '@/src/modules/colaboradores/application/mask-dashboard-for-worker'
import type {
  DispatchSubscription,
  PushRecipient,
} from '@/src/modules/push/infrastructure/push-subscriptions.supabase'
import { chatterReadStateKey } from '@/src/modules/portal/domain/portal-notifications-types'
import type { PushPayload } from '@/src/modules/push/domain/push-dispatch'
import type { PushSendResult } from '@/src/modules/push/infrastructure/web-push-sender'

export type EventPushDispatchDeps = {
  acquireLock: () => Promise<boolean>
  releaseLock: () => Promise<void>
  listSubscriptions: () => Promise<DispatchSubscription[]>
  fetchRecipients: (userIds: string[]) => Promise<Map<string, PushRecipient>>
  /** Cliente de Odoo de cada usuario. */
  fetchPartnerIds: (userIds: string[]) => Promise<Map<string, number>>
  getMaxEventSeq: () => Promise<number>
  /** Eventos posteriores a `afterSeq` guardados antes de `receivedBefore`, de más antiguo a más nuevo. */
  listMatureEvents: (
    afterSeq: number,
    receivedBefore: Date,
    limit: number
  ) => Promise<PortalEventRow[]>
  /** Secciones de un colaborador, o `null` si no se pudieron leer. */
  loadAllowedSections: (recipient: PushRecipient) => Promise<Set<WorkerSectionHref> | null>
  /** Hasta qué mensaje ha leído el usuario en cada registro (`chatterReadStateKey`). */
  fetchReadState: (userId: string) => Promise<Map<string, number>>
  send: (subscription: DispatchSubscription, payload: PushPayload) => Promise<PushSendResult>
  saveFailureCount: (subscriptionId: string, failureCount: number) => Promise<void>
  advanceCursors: (subscriptionIds: string[], seq: number) => Promise<void>
  deleteByIds: (ids: string[]) => Promise<void>
  now: () => number
  /** Orden de proceso; aleatorio en producción para que, si no cabe todo, nadie se quede siempre al final. */
  order: <T>(items: T[]) => T[]
}

const CONCURRENCY = 4

/** Un mensaje que el usuario ya leyó en el portal (o en otro dispositivo) no vuelve a avisar. */
function isMessageAlreadyRead(event: PortalEventRow, readState: Map<string, number>): boolean {
  if (event.kind !== 'message' || event.messageId === null) return false
  const kind = event.scope === 'consulta' ? 'ticket' : 'task'
  return (readState.get(chatterReadStateKey(kind, event.recordId)) ?? 0) >= event.messageId
}

/** Un evento espera este tiempo antes de enviarse, para agrupar los que llegan seguidos. */
export const EVENT_QUIET_MS = 30_000

/** Un aviso que no se entrega en una hora deja de interesar (mismo plazo que el TTL del push). */
export const EVENT_MAX_AGE_MS = 3_600_000

/** Eventos que se leen por ejecución; si hay más, el resto va en la siguiente. */
export const EVENT_BATCH_SIZE = 2000

/**
 * Manda los push de los eventos que Odoo ha ido enviando, sin consultar Odoo.
 * Cada dispositivo guarda hasta qué evento ha procesado (`lastEventSeq`): un
 * dispositivo sin foto inicial parte del último evento sin mandar nada, y uno
 * cuyo envío falla no avanza para reintentar en la siguiente ejecución.
 */
export async function runEventPushDispatch(
  deps: EventPushDispatchDeps,
  options: { deadlineAt: number }
): Promise<PushDispatchSummary> {
  const summary: PushDispatchSummary = {
    users: 0,
    sent: 0,
    removed: 0,
    skipped: 0,
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
  deps: EventPushDispatchDeps,
  options: { deadlineAt: number },
  summary: PushDispatchSummary
): Promise<void> {
  const toDelete: string[] = []
  const rejectedForGood: string[] = []

  const subscriptions = await deps.listSubscriptions()
  const byUser = new Map<string, DispatchSubscription[]>()
  for (const subscription of subscriptions) {
    const list = byUser.get(subscription.userId) ?? []
    list.push(subscription)
    byUser.set(subscription.userId, list)
  }

  const recipients = await deps.fetchRecipients([...byUser.keys()])
  const active = new Map<string, DispatchSubscription[]>()
  for (const [userId, userSubscriptions] of byUser) {
    if (isRecipientActive(recipients.get(userId))) {
      active.set(userId, userSubscriptions)
    } else {
      toDelete.push(...userSubscriptions.map((subscription) => subscription.id))
    }
  }

  const all = [...active.values()].flat()

  // Sin foto inicial: parte del último evento, sin mandar lo anterior.
  const unbaselined = all.filter((subscription) => subscription.lastEventSeq === null)
  if (unbaselined.length > 0) {
    await deps.advanceCursors(
      unbaselined.map((subscription) => subscription.id),
      await deps.getMaxEventSeq()
    )
  }

  const ready = all.filter((subscription) => subscription.lastEventSeq !== null)
  if (ready.length > 0) {
    await processEvents(deps, options, summary, active, recipients, ready, toDelete, rejectedForGood)
  }

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

async function processEvents(
  deps: EventPushDispatchDeps,
  options: { deadlineAt: number },
  summary: PushDispatchSummary,
  active: Map<string, DispatchSubscription[]>,
  recipients: Map<string, PushRecipient>,
  ready: DispatchSubscription[],
  toDelete: string[],
  rejectedForGood: string[]
): Promise<void> {
  const startedAt = deps.now()
  const minCursor = Math.min(...ready.map((subscription) => subscription.lastEventSeq!))
  const events = await deps.listMatureEvents(
    minCursor,
    new Date(startedAt - EVENT_QUIET_MS),
    EVENT_BATCH_SIZE
  )
  if (events.length === 0) return

  const processedUpTo = events[events.length - 1]!.seq
  if (events.length >= EVENT_BATCH_SIZE) summary.truncated = true

  const partnerByUser = await deps.fetchPartnerIds([...active.keys()])
  const eventsByPartner = new Map<number, PortalEventRow[]>()
  for (const event of events) {
    const list = eventsByPartner.get(event.partnerId) ?? []
    list.push(event)
    eventsByPartner.set(event.partnerId, list)
  }

  const advance: string[] = []
  const oldest = startedAt - EVENT_MAX_AGE_MS

  async function processSubscription(
    subscription: DispatchSubscription,
    partnerEvents: PortalEventRow[],
    sections: Set<WorkerSectionHref> | null,
    readState: Map<string, number>
  ) {
    const cursor = subscription.lastEventSeq!
    const fresh = partnerEvents.filter(
      (event) =>
        event.seq > cursor &&
        !event.byClient &&
        Date.parse(event.receivedAt) >= oldest &&
        !isMessageAlreadyRead(event, readState)
    )

    const pairs = collapseEvents(fresh).map((event) => ({
      event,
      notification: eventToNotification(event),
    }))

    // Un colaborador solo recibe lo de las secciones que su titular le dio.
    let allowed = pairs
    if (sections) {
      const permitted = new Set(
        filterNotificationsForWorker(
          pairs.map((pair) => pair.notification),
          sections
        )
      )
      allowed = pairs.filter((pair) => permitted.has(pair.notification))
    }

    const toSend = allowed.filter(({ notification }) => {
      const category = pushCategoryForReason(notification.reason)
      return category !== null && subscription.preferences[category]
    })

    const payload = buildPushPayload(
      toSend.map(({ notification }) => notification),
      previewsFromEvents(toSend.map(({ event }) => event))
    )

    if (payload) {
      const result = await deps.send(subscription, payload)
      if (result === 'gone') {
        toDelete.push(subscription.id)
        return
      }
      if (result === 'rejected') {
        const failures = subscription.failureCount + 1
        summary.skipped += 1
        await deps.saveFailureCount(subscription.id, failures)
        if (failures >= MAX_CONSECUTIVE_REJECTIONS) rejectedForGood.push(subscription.id)
        return
      }
      if (result === 'error') {
        // Sin avanzar: se reintenta en la siguiente ejecución.
        summary.skipped += 1
        return
      }
      summary.sent += 1
      if (subscription.failureCount > 0) await deps.saveFailureCount(subscription.id, 0)
    }

    advance.push(subscription.id)
  }

  async function processUser(userId: string, userSubscriptions: DispatchSubscription[]) {
    const pending = userSubscriptions.filter(
      (subscription) => subscription.lastEventSeq !== null && subscription.lastEventSeq < processedUpTo
    )
    if (pending.length === 0) return
    summary.users += 1

    const partnerId = partnerByUser.get(userId)
    const partnerEvents = partnerId === undefined ? [] : (eventsByPartner.get(partnerId) ?? [])

    let sections: Set<WorkerSectionHref> | null = null
    const recipient = recipients.get(userId)!
    if (partnerEvents.length > 0 && recipient.role === 'worker') {
      try {
        sections = await deps.loadAllowedSections(recipient)
      } catch (error) {
        console.error('[push] leer secciones del colaborador falló', { userId, error })
      }
      if (!sections) {
        summary.skipped += pending.length
        return
      }
    }

    // Solo si hay mensajes que comprobar; si falla, se avisa igualmente (mejor un aviso de más).
    let readState = new Map<string, number>()
    if (partnerEvents.some((event) => event.kind === 'message')) {
      try {
        readState = await deps.fetchReadState(userId)
      } catch (error) {
        console.error('[push] leer el estado de lectura falló', { userId, error })
      }
    }

    for (const subscription of pending) {
      // Un fallo en un dispositivo no debe tumbar la ejecución ni a los demás.
      try {
        await processSubscription(subscription, partnerEvents, sections, readState)
      } catch (error) {
        console.error('[push] procesar dispositivo falló', {
          subscriptionId: subscription.id,
          error,
        })
        summary.skipped += 1
      }
    }
  }

  const queue = deps.order([...active.entries()])
  let next = 0
  async function worker() {
    while (next < queue.length) {
      if (deps.now() >= options.deadlineAt) {
        summary.truncated = true
        return
      }
      const [userId, userSubscriptions] = queue[next]!
      next += 1
      await processUser(userId, userSubscriptions)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  try {
    await deps.advanceCursors(advance, processedUpTo)
  } catch (error) {
    // Sin avanzar se reenviaría lo mismo en la siguiente ejecución: se registra
    // y se deja que lo reintente el siguiente pulso.
    console.error('[push] avanzar cursores falló', error)
  }
}
