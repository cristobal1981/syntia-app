import { pushNotifications } from '@/content/push-notifications'
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

const MAX_BODY_NAMES = 3

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

function titleForReason(reason: PortalNotificationReason): string {
  const copy = pushNotifications.payload
  switch (reason) {
    case 'unread_chatter':
      return copy.chatterTitle
    case 'new_tramite':
      return copy.newTramiteTitle
    case 'new_firma':
      return copy.firmaTitle
    case 'firma_due_soon':
      return copy.firmaDueTitle
    default:
      return copy.statusTitle
  }
}

/** Un aviso suelto lleva a su registro; varios se resumen en uno que lleva al inicio. */
export function buildPushPayload(notifications: PortalNotification[]): PushPayload | null {
  if (notifications.length === 0) return null

  if (notifications.length === 1) {
    const [only] = notifications
    return {
      title: titleForReason(only.reason),
      body: only.name,
      url: pushUrlForNotification(only),
      tag: pushKeyForNotification(only),
    }
  }

  const names = [...new Set(notifications.map((n) => n.name))]
  const shown = names.slice(0, MAX_BODY_NAMES).join(', ')
  const rest = names.length - MAX_BODY_NAMES
  return {
    title: pushNotifications.payload.summaryTitle(notifications.length),
    body: rest > 0 ? `${shown} y ${rest} más` : shown,
    url: '/dashboard',
    tag: 'syntia-summary',
  }
}
