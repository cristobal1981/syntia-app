import type { PortalRecordScope } from '@/src/modules/portal/domain/portal-notifications-types'
import {
  getCachedObligacionNotificationSnapshot,
  getCachedTramitesSnapshot,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { watchableFromTramiteListItem } from '@/src/modules/portal/domain/compute-portal-notifications'
import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'
import { mergeTramitesList } from '@/src/modules/tramites/domain/merge-tramites-list'

function consultaStateKey(isClosed: boolean): string {
  return isClosed ? 'closed' : 'open'
}

function watchableStateKey(
  scope: PortalRecordScope,
  state: string | undefined,
  isClosed: boolean
): string {
  if (scope === 'consulta') {
    return consultaStateKey(isClosed)
  }
  return state ?? ''
}

export type ResolvedWatchableAckState = {
  lastState: string
  lastIsClosed: boolean
  lastAttachmentCount: number
}

export async function resolveWatchableAckStateFromSnapshots(
  scope: PortalRecordScope,
  recordId: number,
  partnerId: number
): Promise<ResolvedWatchableAckState | null> {
  if (scope === 'tramite' || scope === 'consulta') {
    const snapshot = await getCachedTramitesSnapshot(partnerId)
    const item = mergeTramitesList(snapshot.tasks, snapshot.tickets).find(
      (entry) => entry.kind === scope && entry.id === recordId
    )
    if (!item) return null

    const watchable = watchableFromTramiteListItem(item)
    return {
      lastState: watchableStateKey(
        watchable.scope,
        watchable.state,
        watchable.isClosed
      ),
      lastIsClosed: watchable.isClosed,
      lastAttachmentCount: watchable.attachmentCount,
    }
  }

  if (scope === 'obligacion') {
    const snapshot = await getCachedObligacionNotificationSnapshot(partnerId)
    const leaf = snapshot.leaves.find((entry) => entry.id === recordId)
    if (!leaf) return null

    return {
      lastState: leaf.state ?? '',
      lastIsClosed: isTaskClosed(leaf.state),
      lastAttachmentCount: leaf.attachmentCount,
    }
  }

  return null
}
