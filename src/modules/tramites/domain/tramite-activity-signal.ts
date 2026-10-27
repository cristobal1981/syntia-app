import { tramites } from '@/content/tramites'
import { portal } from '@/content/portal'
import type { PortalNotification } from '@/src/modules/portal/domain/portal-notifications-types'
import { notificationMatchesTramiteRecord } from '@/src/modules/portal/domain/compute-portal-notifications'
import { portalNotificationTypeLabel } from '@/src/modules/portal/ui/portal-notification-item-meta'
import {
  getTramiteListItemKey,
  getTramiteListRecordKind,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import { getTramiteListItemStateBadge } from '@/src/modules/tramites/domain/filter-tramites'
import { compareTramiteModifiedAtDesc } from '@/src/modules/tramites/domain/parse-odoo-datetime'
import { scopeFromTramiteListKind } from '@/src/modules/portal/domain/portal-notifications-types'

export type TramiteActivitySignal = {
  label: string
  reason: PortalNotification['reason']
  isChangesRequested: boolean
  extraCount: number
  timestamp: string
}

/** Orden de prioridad: primero lo que más necesita acción del cliente. */
const REASON_PRIORITY: Record<PortalNotification['reason'], number> = {
  status_change: 0,
  unread_chatter: 1,
  new_tramite: 2,
  assignee_change: 3,
  new_firma: 4,
  firma_due_soon: 5,
}

function isChangesRequestedNotification(notification: PortalNotification): boolean {
  return (
    notification.reason === 'status_change' &&
    notification.newStateLabel === tramites.taskStates.changesRequested
  )
}

function signalLabel(notification: PortalNotification): string {
  return portalNotificationTypeLabel(notification, portal.notifications)
}

/**
 * Resume todas las notificaciones activas de UN trámite/consulta en una
 * sola señal (la más relevante primero), para pintarla como texto normal
 * en la fila de la tabla — nunca un icono suelto sin foco de teclado.
 */
export function getTramiteActivitySignal(
  item: TramiteListItem,
  unreadNotifications: PortalNotification[],
  newItemKeys: readonly string[] = []
): TramiteActivitySignal | null {
  const recordKind = getTramiteListRecordKind(item)
  const signals = unreadNotifications.filter((notification) =>
    notificationMatchesTramiteRecord(notification, recordKind, item.id)
  )

  if (
    newItemKeys.includes(getTramiteListItemKey(item)) &&
    !signals.some((signal) => signal.reason === 'new_tramite')
  ) {
    signals.push({
      scope: scopeFromTramiteListKind(item.kind),
      recordId: item.id,
      name: item.name,
      reason: 'new_tramite',
      latestDate: item.modifiedAt,
    })
  }

  if (!signals.length) return null

  const sorted = [...signals].sort(
    (a, b) => REASON_PRIORITY[a.reason] - REASON_PRIORITY[b.reason]
  )
  const primary = sorted[0]!
  const timestamp = sorted.reduce(
    (latest, signal) =>
      compareTramiteModifiedAtDesc(signal.latestDate, latest) < 0
        ? signal.latestDate
        : latest,
    primary.latestDate
  )

  return {
    label: signalLabel(primary),
    reason: primary.reason,
    isChangesRequested: isChangesRequestedNotification(primary),
    extraCount: sorted.length - 1,
    timestamp,
  }
}

/**
 * Orden de la lista: primero los trámites en «Requiere tu atención» (los que el
 * cliente tiene que atender), luego los que tienen alguna señal activa y al
 * final el resto. Dentro de cada grupo van primero los de prioridad más alta y,
 * a igual prioridad, los más recientes (el resto, en su orden habitual de más
 * modificado primero). La prioridad no salta de grupo: una consulta urgente sin
 * novedades no tapa lo que el cliente tiene que atender.
 */
export function sortTramiteListByActivity(
  items: TramiteListItem[],
  unreadNotifications: PortalNotification[],
  newItemKeys: readonly string[] = []
): TramiteListItem[] {
  const changesRequested: TramiteListItem[] = []
  const withSignal: { item: TramiteListItem; timestamp: string }[] = []
  const withoutSignal: TramiteListItem[] = []

  for (const item of items) {
    if (getTramiteListItemStateBadge(item).variant === 'changesRequested') {
      changesRequested.push(item)
      continue
    }
    const signal = getTramiteActivitySignal(item, unreadNotifications, newItemKeys)
    if (signal) {
      withSignal.push({ item, timestamp: signal.timestamp })
    } else {
      withoutSignal.push(item)
    }
  }

  changesRequested.sort(
    (a, b) =>
      b.priority - a.priority || compareTramiteModifiedAtDesc(a.modifiedAt, b.modifiedAt)
  )
  withSignal.sort(
    (a, b) =>
      b.item.priority - a.item.priority || compareTramiteModifiedAtDesc(a.timestamp, b.timestamp)
  )
  // Orden estable: a igual prioridad se conserva el orden de llegada (más modificado primero).
  withoutSignal.sort((a, b) => b.priority - a.priority)

  return [
    ...changesRequested,
    ...withSignal.map((entry) => entry.item),
    ...withoutSignal,
  ]
}
