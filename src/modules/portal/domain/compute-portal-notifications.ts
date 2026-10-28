import { tramites } from '@/content/tramites'
import { getObligacionStateBadge } from '@/src/modules/obligaciones/domain/map-obligacion-state'
import type { PendingSignatureRequest } from '@/src/modules/firmas/domain/types'
import { isSignatureDueSoon } from '@/src/modules/firmas/domain/signature-due-date'
import type {
  PortalNotification,
  PortalNotificationReason,
} from '@/src/modules/portal/domain/portal-notifications-types'
import type { ChatterReadStateMap } from '@/src/modules/portal/domain/portal-notifications-types'
import {
  chatterReadStateKey,
  listKindFromRecordKind,
  portalWatchStateKey,
} from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalRecordWatchStateEntry } from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import type { PortalRecordWatchStateUpsert } from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import { getTramiteListItemStateBadge } from '@/src/modules/tramites/domain/filter-tramites'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import { getTramiteListRecordKind } from '@/src/modules/tramites/domain/merge-tramites-list'
import { assigneeKeyFor, formatAssigneesLabel } from '@/src/modules/tramites/domain/format-assignees'
import { mapTaskStateLabel } from '@/src/modules/tramites/domain/map-task-state'
import { compareTramiteModifiedAtDesc } from '@/src/modules/tramites/domain/parse-odoo-datetime'

export type PortalWatchableRecord = {
  scope: 'tramite' | 'consulta' | 'obligacion'
  recordId: number
  name: string
  state?: string
  isClosed: boolean
  attachmentCount: number
  modifiedAt: string
  /** Huella de quién lo lleva (`assigneeKeyFor`); solo trámites y consultas, no obligaciones. */
  assigneeKey?: string
  /** Texto de quién lo lleva ahora, para el aviso; `undefined` si no hay nadie. */
  assigneeLabel?: string
}

function consultaStateKey(isClosed: boolean): string {
  return isClosed ? 'closed' : 'open'
}

function getWatchableStateKey(record: PortalWatchableRecord): string {
  if (record.scope === 'consulta') {
    return consultaStateKey(record.isClosed)
  }
  return record.state ?? ''
}

function getWatchableStateLabel(record: PortalWatchableRecord): string {
  if (record.scope === 'obligacion') {
    return getObligacionStateBadge(record.state).label
  }

  if (record.scope === 'consulta') {
    const item: TramiteListItem = {
      id: record.recordId,
      name: record.name,
      kind: 'consulta',
      isClosed: record.isClosed,
      attachmentCount: record.attachmentCount,
      modifiedAt: record.modifiedAt,
      createdAt: '',
      priority: 0,
      assignees: [],
      assignedNotifyPartnerIds: [],
    }
    return getTramiteListItemStateBadge(item).label
  }

  return mapTaskStateLabel(record.state) ?? '—'
}

function portalNotificationFromTramiteItem(
  item: TramiteListItem,
  reason: PortalNotification['reason'],
  extra?: Partial<PortalNotification>
): PortalNotification {
  const recordKind = getTramiteListRecordKind(item)
  return {
    scope: item.kind,
    recordId: item.id,
    name: item.name,
    reason,
    latestDate: item.modifiedAt,
    recordKind,
    listKind: listKindFromRecordKind(recordKind),
    ...extra,
  }
}

export function watchableFromTramiteListItem(
  item: TramiteListItem
): PortalWatchableRecord {
  return {
    scope: item.kind,
    recordId: item.id,
    name: item.name,
    state: item.state,
    isClosed: item.isClosed,
    attachmentCount: item.attachmentCount,
    modifiedAt: item.modifiedAt,
    // Lo heredado del padre no se vigila: si cambia el responsable del padre, avisa el padre una vez y no cada hija.
    ...(item.assigneesInherited
      ? {}
      : {
          assigneeKey: assigneeKeyFor(item.assignees),
          assigneeLabel: formatAssigneesLabel(item.assignees) ?? undefined,
        }),
  }
}

export function computeRecordWatchDeltas(input: {
  records: PortalWatchableRecord[]
  watchState: Map<string, PortalRecordWatchStateEntry>
  portalBaselineComplete: boolean
}): {
  notifications: PortalNotification[]
  watchUpdates: PortalRecordWatchStateUpsert[]
} {
  const notifications: PortalNotification[] = []
  const watchUpdates: PortalRecordWatchStateUpsert[] = []

  for (const record of input.records) {
    const key = portalWatchStateKey(record.scope, record.recordId)
    const previous = input.watchState.get(key)
    const stateKey = getWatchableStateKey(record)
    const stateLabel = getWatchableStateLabel(record)

    const currentUpsert: PortalRecordWatchStateUpsert = {
      scope: record.scope,
      recordId: record.recordId,
      lastState: stateKey,
      lastIsClosed: record.isClosed,
      lastAttachmentCount: record.attachmentCount,
      firmaDueSoonNotified: previous?.firmaDueSoonNotified ?? false,
      initialized: true,
      lastAssigneeKey: record.assigneeKey,
    }

    if (!previous?.initialized) {
      watchUpdates.push(currentUpsert)
      continue
    }

    if (previous.lastIsClosed && record.isClosed) {
      watchUpdates.push(currentUpsert)
      continue
    }

    if (!previous.lastIsClosed) {
      const stateChanged = previous.lastState !== stateKey
      let notifyStatus = false

      if (record.isClosed && !previous.lastIsClosed) {
        notifyStatus = true
        notifications.push({
          scope: record.scope,
          recordId: record.recordId,
          name: record.name,
          reason: 'status_change',
          latestDate: record.modifiedAt,
          previousStateLabel: getWatchableStateLabel({
            ...record,
            isClosed: false,
            state: previous.lastState,
          }),
          newStateLabel: stateLabel,
          isCloseEvent: true,
          ...(record.scope !== 'obligacion'
            ? {
                recordKind: record.scope === 'tramite' ? 'task' : 'ticket',
                listKind: record.scope,
              }
            : {}),
        })
      } else if (!record.isClosed && stateChanged) {
        notifyStatus = true
        // Una consulta solo tiene abierta/cerrada y aquí previous.lastIsClosed
        // es false, así que su estado anterior siempre es "en curso".
        const previousLabel =
          record.scope === 'consulta'
            ? tramites.taskStates.inProgress
            : record.scope === 'obligacion'
              ? getObligacionStateBadge(previous.lastState).label
              : mapTaskStateLabel(previous.lastState) ?? '—'

        notifications.push({
          scope: record.scope,
          recordId: record.recordId,
          name: record.name,
          reason: 'status_change',
          latestDate: record.modifiedAt,
          previousStateLabel: previousLabel,
          newStateLabel: stateLabel,
          ...(record.scope !== 'obligacion'
            ? {
                recordKind: record.scope === 'tramite' ? 'task' : 'ticket',
                listKind: record.scope,
              }
            : {}),
        })
      }

      currentUpsert.lastState = notifyStatus
        ? (previous.lastState ?? stateKey)
        : stateKey
      currentUpsert.lastIsClosed = notifyStatus
        ? previous.lastIsClosed
        : record.isClosed
      currentUpsert.lastAttachmentCount = record.attachmentCount

      // Cambio de responsable: solo si ya sabíamos quién lo llevaba (fila anterior
      // a la huella = se rellena sin avisar) y ahora lo lleva alguien. Quitar la
      // asignación no avisa. Mientras no se confirme, la huella vieja se conserva.
      const assigneeChanged =
        !record.isClosed &&
        record.assigneeKey !== undefined &&
        previous.lastAssigneeKey !== undefined &&
        previous.lastAssigneeKey !== record.assigneeKey &&
        Boolean(record.assigneeLabel)
      if (assigneeChanged) {
        notifications.push({
          scope: record.scope,
          recordId: record.recordId,
          name: record.name,
          reason: 'assignee_change',
          latestDate: record.modifiedAt,
          assigneeLabel: record.assigneeLabel,
          ...(record.scope !== 'obligacion'
            ? {
                recordKind: record.scope === 'tramite' ? 'task' : 'ticket',
                listKind: record.scope,
              }
            : {}),
        })
        currentUpsert.lastAssigneeKey = previous.lastAssigneeKey
      }
    }

    watchUpdates.push(currentUpsert)
  }

  return { notifications, watchUpdates }
}

export function computeFirmaWatchDeltas(input: {
  requests: PendingSignatureRequest[]
  watchState: Map<string, PortalRecordWatchStateEntry>
  portalBaselineComplete: boolean
}): {
  notifications: PortalNotification[]
  watchUpdates: PortalRecordWatchStateUpsert[]
} {
  const notifications: PortalNotification[] = []
  const watchUpdates: PortalRecordWatchStateUpsert[] = []

  for (const request of input.requests) {
    const key = portalWatchStateKey('firma', request.id)
    const previous = input.watchState.get(key)
    const dueSoon = isSignatureDueSoon(request.dueDate)
    const latestDate = request.dueDate ?? request.createDate ?? new Date().toISOString()

    // Sale de la ventana "vence pronto" (plazo ampliado o fecha corregida) →
    // se rearma, para volver a avisar si entra otra vez.
    const dueSoonNotified =
      dueSoon && (previous?.firmaDueSoonNotified || !previous?.initialized)

    const currentUpsert: PortalRecordWatchStateUpsert = {
      scope: 'firma',
      recordId: request.id,
      lastIsClosed: false,
      lastAttachmentCount: 0,
      firmaDueSoonNotified: dueSoonNotified,
      initialized: true,
    }

    if (!previous?.initialized) {
      if (input.portalBaselineComplete) {
        notifications.push({
          scope: 'firma',
          recordId: request.id,
          name: request.reference,
          reason: 'new_firma',
          latestDate: request.createDate ?? latestDate,
        })
      }
      if (dueSoon && input.portalBaselineComplete) {
        notifications.push({
          scope: 'firma',
          recordId: request.id,
          name: request.reference,
          reason: 'firma_due_soon',
          latestDate,
        })
        currentUpsert.firmaDueSoonNotified = true
      }
      watchUpdates.push(currentUpsert)
      continue
    }

    if (dueSoon && !previous.firmaDueSoonNotified) {
      notifications.push({
        scope: 'firma',
        recordId: request.id,
        name: request.reference,
        reason: 'firma_due_soon',
        latestDate,
      })
      currentUpsert.firmaDueSoonNotified = true
    }

    watchUpdates.push(currentUpsert)
  }

  return { notifications, watchUpdates }
}

export function mergeAndSortPortalNotifications(
  ...groups: PortalNotification[][]
): PortalNotification[] {
  // Un trámite recién creado con mensaje del gestor sin leer es ambas cosas
  // a la vez; se queda solo con "mensaje sin leer" (más accionable, gana en
  // REASON_PRIORITY) para no duplicar entrada en la campana de avisos.
  const unreadChatterTramiteIds = new Set(
    groups
      .flat()
      .filter((item) => item.reason === 'unread_chatter' && item.listKind === 'tramite')
      .map((item) => item.recordId)
  )

  const merged = groups.flat().filter((item) => {
    if (item.reason !== 'new_tramite') return true
    return !unreadChatterTramiteIds.has(item.recordId)
  })

  return merged.sort((a, b) =>
    compareTramiteModifiedAtDesc(a.latestDate, b.latestDate)
  )
}

export function portalNotificationKey(notification: PortalNotification): string {
  return `${notification.scope}:${notification.recordId}:${notification.reason}`
}

/** Cada poll devuelve el estado actual de estos motivos; el resto se acumula hasta ack. */
const POLL_SNAPSHOT_REASONS = new Set<PortalNotificationReason>([
  'unread_chatter',
  'new_tramite',
])

/** Incorpora deltas de cada poll y reconcilia snapshots de chatter/trámite nuevo. */
export function mergeAccumulatedPortalNotifications(
  existing: PortalNotification[],
  incoming: PortalNotification[]
): PortalNotification[] {
  const retained = existing.filter(
    (item) => !POLL_SNAPSHOT_REASONS.has(item.reason)
  )

  const byKey = new Map(
    retained.map((item) => [portalNotificationKey(item), item])
  )

  for (const item of incoming) {
    byKey.set(portalNotificationKey(item), item)
  }

  return mergeAndSortPortalNotifications([...byKey.values()])
}

/**
 * Una comprobación completa tarda segundos y puede empezar ANTES de que el usuario abra el chat:
 * su respuesta trae el aviso de mensaje que él acaba de marcar como visto (el servidor la calculó
 * con el «visto» anterior) y, al sustituir los avisos de chatter, lo volvía a pintar hasta la
 * siguiente comprobación completa. `readState` del cliente va por delante (nunca retrocede), así
 * que un aviso cuyo último mensaje ya está visto ahí se descarta. Un mensaje posterior sí avisa.
 */
export function dropChatterNotificationsAlreadyRead(
  items: PortalNotification[],
  readState: ChatterReadStateMap
): PortalNotification[] {
  if (!items.some((item) => item.reason === 'unread_chatter')) return items

  return items.filter((item) => {
    if (item.reason !== 'unread_chatter') return true
    if (!item.recordKind || !item.latestMessageId) return true
    return (readState[chatterReadStateKey(item.recordKind, item.recordId)] ?? 0) < item.latestMessageId
  })
}

/** Resultado de una comprobación completa sobre los avisos actuales, sin resucitar lo ya visto. */
export function reconcilePollNotifications(
  existing: PortalNotification[],
  incoming: PortalNotification[],
  readState: ChatterReadStateMap
): PortalNotification[] {
  return dropChatterNotificationsAlreadyRead(
    mergeAccumulatedPortalNotifications(existing, incoming),
    readState
  )
}

export function pruneResolvedFirmaNotifications(
  items: PortalNotification[],
  pendingFirmaIds: readonly number[]
): PortalNotification[] {
  if (!items.some((item) => item.scope === 'firma')) {
    return items
  }

  const pending = new Set(pendingFirmaIds)
  return items.filter(
    (item) => item.scope !== 'firma' || pending.has(item.recordId)
  )
}

export function portalNotificationFromTramiteListItem(
  item: TramiteListItem,
  reason: PortalNotification['reason'],
  extra?: Partial<PortalNotification>
): PortalNotification {
  return portalNotificationFromTramiteItem(item, reason, extra)
}

export function notificationMatchesTramiteRecord(
  item: PortalNotification,
  recordKind: 'task' | 'ticket',
  recordId: number
): boolean {
  return item.recordKind === recordKind && item.recordId === recordId
}

export function removePortalNotificationsByRecord(
  items: PortalNotification[],
  recordKind: 'task' | 'ticket',
  recordId: number,
  reason?: PortalNotification['reason']
): PortalNotification[] {
  const next = items.filter((item) => {
    if (!notificationMatchesTramiteRecord(item, recordKind, recordId)) return true
    if (!reason) return false
    return item.reason !== reason
  })
  return next.length === items.length ? items : next
}

export function removePortalNotificationsByScope(
  items: PortalNotification[],
  scope: PortalNotification['scope'],
  recordId: number,
  reason?: PortalNotification['reason']
): PortalNotification[] {
  const next = items.filter((item) => {
    if (item.scope !== scope || item.recordId !== recordId) return true
    if (!reason) return false
    return item.reason !== reason
  })
  return next.length === items.length ? items : next
}

/** Usado por `openNotification` — a diferencia de las dos funciones de arriba, compara por `scope`+`recordId`+`reason` exactos (no por `recordKind`, que `PortalNotification` no siempre trae). */
export function removeNotificationFromList(
  items: PortalNotification[],
  notification: PortalNotification
): PortalNotification[] {
  return items.filter(
    (item) =>
      !(
        item.scope === notification.scope &&
        item.recordId === notification.recordId &&
        item.reason === notification.reason
      )
  )
}
