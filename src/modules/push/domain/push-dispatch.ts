import { pushNotifications } from '@/content/push-notifications'
import { tramites } from '@/content/tramites'
import {
  openParamFromListKind,
  type PortalNotification,
  type PortalNotificationReason,
} from '@/src/modules/portal/domain/portal-notifications-types'
import type { PushPreferences } from '@/src/modules/push/domain/push-subscription'

/** Cuántas claves de avisos ya enviados se conservan por dispositivo. */
export const MAX_SENT_KEYS = 200

/** Tipos de aviso que se pueden mandar por push; el resto no se manda. */
export function pushCategoryForReason(
  reason: PortalNotificationReason
): keyof PushPreferences | null {
  switch (reason) {
    case 'unread_chatter':
      return 'chatter'
    case 'new_tramite':
    case 'status_change':
      return 'status'
    case 'new_firma':
    case 'firma_due_soon':
      return 'firmas'
    case 'new_document':
      return 'documents'
    default:
      return null
  }
}

/** Clave estable de un aviso: cambia si llega un mensaje o estado nuevo. */
export function pushKeyForNotification(notification: PortalNotification): string {
  return [
    notification.reason,
    notification.scope,
    notification.recordId,
    notification.latestMessageId ?? notification.latestDate,
  ].join(':')
}

export type PushSelection = {
  toSend: PortalNotification[]
  nextSentKeys: string[]
}

/**
 * Decide qué avisos mandar a un dispositivo. Sin `baselined`, lo pendiente se
 * da por enviado y no se manda nada (primera ejecución tras activar el push).
 * Después solo salen los avisos de tipos activados cuya clave no se envió ya.
 * Lo no enviado por tener el tipo apagado también se marca como visto, para
 * que activar ese tipo más tarde no mande de golpe lo antiguo.
 */
export function selectNotificationsToPush(input: {
  notifications: PortalNotification[]
  preferences: PushPreferences
  sentKeys: string[]
  baselined: boolean
}): PushSelection {
  const sent = new Set(input.sentKeys)
  const toSend: PortalNotification[] = []
  const currentKeys: string[] = []

  for (const notification of input.notifications) {
    const category = pushCategoryForReason(notification.reason)
    if (!category) continue

    const key = pushKeyForNotification(notification)
    currentKeys.push(key)

    if (!input.baselined || sent.has(key)) continue
    if (input.preferences[category]) toSend.push(notification)
  }

  const merged = [...input.sentKeys]
  for (const key of currentKeys) {
    if (!sent.has(key)) {
      sent.add(key)
      merged.push(key)
    }
  }

  return { toSend, nextSentKeys: merged.slice(-MAX_SENT_KEYS) }
}

export type PushPayload = {
  title: string
  body: string
  url: string
  tag: string
}

/** Ruta a la que lleva un aviso, la misma que al abrirlo dentro de la app. */
export function pushUrlForNotification(notification: PortalNotification): string {
  if (notification.scope === 'firma') return '/firmas'
  if (notification.scope === 'obligacion') {
    return `/obligaciones?open=${encodeURIComponent(`task-${notification.recordId}`)}&tab=documents`
  }
  if (notification.listKind) {
    const open = openParamFromListKind(notification.listKind, notification.recordId)
    return `/tramites?open=${encodeURIComponent(open)}&tab=conversation`
  }
  return '/dashboard'
}

function plainPreviewFor(
  notification: PortalNotification,
  previews: ReadonlyMap<number, string>
): string | undefined {
  return notification.latestMessageId !== undefined
    ? previews.get(notification.latestMessageId)
    : undefined
}

function buildSinglePayload(
  notification: PortalNotification,
  previews: ReadonlyMap<number, string>
): PushPayload {
  const copy = pushNotifications.payload
  const base = {
    url: pushUrlForNotification(notification),
    tag: pushKeyForNotification(notification),
  }

  switch (notification.reason) {
    case 'unread_chatter':
      return {
        ...base,
        title: copy.chatterTitle(notification.name),
        body: plainPreviewFor(notification, previews) ?? copy.chatterBodyFallback,
      }
    case 'new_tramite':
      return {
        ...base,
        title: copy.newTramiteTitle(notification.name),
        body: copy.newTramiteBody,
      }
    case 'new_firma':
      return { ...base, title: copy.firmaTitle, body: notification.name }
    case 'firma_due_soon':
      return { ...base, title: copy.firmaDueTitle, body: notification.name }
    case 'new_document':
      return {
        ...base,
        title: copy.documentTitle(notification.name, notification.groupedCount),
        body: copy.documentBody,
      }
    default: {
      const newState = notification.newStateLabel
      return {
        ...base,
        title: copy.statusTitle(notification.name, newState),
        body:
          newState === tramites.taskStates.changesRequested
            ? copy.statusBodyChangesRequested
            : notification.previousStateLabel
              ? copy.statusBodyFrom(notification.previousStateLabel)
              : copy.statusBodyFallback,
      }
    }
  }
}

function summaryBody(notifications: PortalNotification[]): string {
  const parts = pushNotifications.payload.summaryParts
  const counts = { messages: 0, statuses: 0, newTramites: 0, firmas: 0, documents: 0 }
  for (const notification of notifications) {
    switch (pushCategoryForReason(notification.reason)) {
      case 'chatter':
        counts.messages += 1
        break
      case 'firmas':
        counts.firmas += 1
        break
      case 'documents':
        counts.documents += notification.groupedCount ?? 1
        break
      default:
        if (notification.reason === 'new_tramite') counts.newTramites += 1
        else counts.statuses += 1
    }
  }

  const pieces: string[] = []
  if (counts.messages) pieces.push(parts.messages(counts.messages))
  if (counts.statuses) pieces.push(parts.statuses(counts.statuses))
  if (counts.newTramites) pieces.push(parts.newTramites(counts.newTramites))
  if (counts.firmas) pieces.push(parts.firmas(counts.firmas))
  if (counts.documents) pieces.push(parts.documents(counts.documents))
  return pieces.join(' · ')
}

/**
 * Un aviso suelto dice qué ha pasado y en qué trámite (con el extracto del
 * mensaje si lo hay); varios se resumen con el recuento por tipo y llevan al
 * inicio. `previews` es el texto de cada mensaje por id; sin él se usa un
 * texto genérico.
 */
export function buildPushPayload(
  notifications: PortalNotification[],
  previews: ReadonlyMap<number, string> = new Map()
): PushPayload | null {
  if (notifications.length === 0) return null
  if (notifications.length === 1) {
    return buildSinglePayload(notifications[0]!, previews)
  }

  return {
    title: pushNotifications.payload.summaryTitle(notifications.length),
    body: summaryBody(notifications),
    url: '/dashboard',
    tag: 'syntia-summary',
  }
}
