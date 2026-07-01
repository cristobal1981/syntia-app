import { tramites } from '@/content/tramites'
import { getObligacionStateBadge } from '@/src/modules/obligaciones/domain/map-obligacion-state'
import type { PendingSignatureRequest } from '@/src/modules/firmas/domain/types'
import { isSignatureDueSoon } from '@/src/modules/firmas/domain/signature-due-date'
import type { PortalNotification } from '@/src/modules/portal/domain/portal-notifications-types'
import {
  listKindFromRecordKind,
  portalWatchStateKey,
} from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalRecordWatchStateEntry } from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import type { PortalRecordWatchStateUpsert } from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import { getTramiteListItemStateBadge } from '@/src/modules/tramites/domain/filter-tramites'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import { getTramiteListRecordKind } from '@/src/modules/tramites/domain/merge-tramites-list'
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
    }
    return getTramiteListItemStateBadge(item).label
  }

  return mapTaskStateLabel(record.state) ?? '—'
}

function tramiteListItemFromWatchable(record: PortalWatchableRecord): TramiteListItem {
  return {
    id: record.recordId,
    name: record.name,
    kind: record.scope === 'consulta' ? 'consulta' : 'tramite',
    state: record.state,
    isClosed: record.isClosed,
    attachmentCount: record.attachmentCount,
    modifiedAt: record.modifiedAt,
  }
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
      const documentIncreased =
        record.attachmentCount > previous.lastAttachmentCount
      let notifyStatus = false
      let notifyDocument = false

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
        const previousLabel =
          record.scope === 'consulta'
            ? previous.lastState === 'closed'
              ? tramites.taskStates.done
              : tramites.taskStates.inProgress
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

      if (!record.isClosed && documentIncreased) {
        notifyDocument = true
        notifications.push({
          scope: record.scope,
          recordId: record.recordId,
          name: record.name,
          reason: 'new_document',
          latestDate: record.modifiedAt,
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
      currentUpsert.lastAttachmentCount = notifyDocument
        ? previous.lastAttachmentCount
        : record.attachmentCount
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

    const dueSoonNotified =
      dueSoon && (previous?.firmaDueSoonNotified || !previous?.initialized)
        ? true
        : previous?.firmaDueSoonNotified ?? false

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
  const newTramiteIds = new Set(
    groups
      .flat()
      .filter((item) => item.reason === 'new_tramite')
      .map((item) => item.recordId)
  )

  const merged = groups.flat().filter((item) => {
    if (item.reason !== 'unread_chatter') return true
    if (item.listKind !== 'tramite') return true
    return !newTramiteIds.has(item.recordId)
  })

  return merged.sort((a, b) =>
    compareTramiteModifiedAtDesc(a.latestDate, b.latestDate)
  )
}

export function portalNotificationKey(notification: PortalNotification): string {
  return `${notification.scope}:${notification.recordId}:${notification.reason}`
}

/** Mantiene novedades hasta ack/dismiss; incorpora deltas de cada poll. */
export function mergeAccumulatedPortalNotifications(
  existing: PortalNotification[],
  incoming: PortalNotification[]
): PortalNotification[] {
  if (!incoming.length) {
    return existing
  }

  const byKey = new Map(
    existing.map((item) => [portalNotificationKey(item), item])
  )

  for (const item of incoming) {
    byKey.set(portalNotificationKey(item), item)
  }

  return mergeAndSortPortalNotifications([...byKey.values()])
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
