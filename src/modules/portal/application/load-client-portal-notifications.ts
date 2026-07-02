import {

  computeFirmaWatchDeltas,

  computeRecordWatchDeltas,

  mergeAndSortPortalNotifications,

  portalNotificationFromTramiteListItem,

  watchableFromTramiteListItem,

  type PortalWatchableRecord,

} from '@/src/modules/portal/domain/compute-portal-notifications'

import type {

  PortalNotificationsCheckResult,

  ChatterReadStateMap,

} from '@/src/modules/portal/domain/portal-notifications-types'

import {

  chatterReadStateKey,

  listKindFromRecordKind,

} from '@/src/modules/portal/domain/portal-notifications-types'

import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'

import { resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'

import {
  getCachedObligacionNotificationSnapshotSafe,
  getCachedPendingSignaturesSnapshotSafe,
  getCachedTramitesSnapshotSafe,
  getCachedUnreadChatterCandidates,
  getFreshObligacionNotificationSnapshotSafe,
  getFreshPendingSignaturesSnapshotSafe,
  getFreshTramitesSnapshotSafe,
  getFreshUnreadChatterCandidates,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

import { getOdooModelForRecordKind } from '@/src/modules/portal/infrastructure/portal-record-access'

import {

  fetchChatterReadStateForUser,

  upsertChatterReadStateBatch,

} from '@/src/modules/portal/infrastructure/chatter-read-state.supabase'

import {

  fetchWatchStateForUser,

  upsertWatchStateBatch,

} from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'

import { ensureTramitesListSeenInitialized } from '@/src/modules/tramites/application/tramites-list-seen-actions'

import {

  formatTramiteListItemKey,

  getTramiteListItemKey,

  getTramiteListRecordKind,

  mergeTramitesList,

} from '@/src/modules/tramites/domain/merge-tramites-list'

import {

  computeNewTramiteListItemKeys,

  getOpenTramiteListItemKeys,

} from '@/src/modules/tramites/domain/tramites-list-seen-state'



function readStateMapToObject(map: Map<string, number>): ChatterReadStateMap {

  return Object.fromEntries(map.entries())

}



function obligacionWatchables(

  leaves: Array<{

    id: number

    name: string

    state?: string

    modifiedAt: string

    attachmentCount: number

  }>

): PortalWatchableRecord[] {

  return leaves.map((leaf) => ({

    scope: 'obligacion',

    recordId: leaf.id,

    name: leaf.name,

    state: leaf.state,

    isClosed: isTaskClosed(leaf.state),

    attachmentCount: leaf.attachmentCount,

    modifiedAt: leaf.modifiedAt,

  }))

}



export async function loadClientPortalNotifications(input: {

  partnerId: number

  actorId: string

  /** `false` en poll: lecturas Odoo sin `unstable_cache`. Por defecto cacheado (SSR). */
  cache?: boolean

}): Promise<PortalNotificationsCheckResult> {

  try {

    const useCache = input.cache !== false

    const loadTramitesSnapshot = useCache
      ? getCachedTramitesSnapshotSafe
      : getFreshTramitesSnapshotSafe

    const loadObligacionSnapshot = useCache
      ? getCachedObligacionNotificationSnapshotSafe
      : getFreshObligacionNotificationSnapshotSafe

    const loadFirmasSnapshot = useCache
      ? getCachedPendingSignaturesSnapshotSafe
      : getFreshPendingSignaturesSnapshotSafe

    const loadUnreadChatter = useCache
      ? getCachedUnreadChatterCandidates
      : getFreshUnreadChatterCandidates

    const [

      tramitesResult,

      obligResult,

      firmasResult,

      readState,

      watchState,

    ] = await Promise.all([

      loadTramitesSnapshot(input.partnerId),

      loadObligacionSnapshot(input.partnerId),

      loadFirmasSnapshot(input.partnerId),

      fetchChatterReadStateForUser(input.actorId),

      fetchWatchStateForUser(input.actorId),

    ])



    const tramitesSnap = tramitesResult.data

    const obligSnap = obligResult.data

    const firmasSnap = firmasResult.data



    const items = mergeTramitesList(tramitesSnap.tasks, tramitesSnap.tickets)

    const seenState = await ensureTramitesListSeenInitialized(

      input.actorId,

      getOpenTramiteListItemKeys(items)

    )



    const portalBaselineComplete = seenState.initialized



    const openItems = items.filter((item) => !item.isClosed)

    const refs = openItems.map((item) => ({

      kind: getTramiteListRecordKind(item),

      recordId: item.id,

      name: item.name,

    }))



    const taskRecords = refs

      .filter((ref) => ref.kind === 'task')

      .map((ref) => ({ recordId: ref.recordId }))

    const ticketRecords = refs

      .filter((ref) => ref.kind === 'ticket')

      .map((ref) => ({ recordId: ref.recordId }))



    const groups = []

    if (taskRecords.length) {

      groups.push({

        resModel: getOdooModelForRecordKind('task'),

        recordKind: 'task' as const,

        records: taskRecords,

      })

    }

    if (ticketRecords.length) {

      groups.push({

        resModel: getOdooModelForRecordKind('ticket'),

        recordKind: 'ticket' as const,

        records: ticketRecords,

      })

    }



    let chatterUnread: Awaited<

      ReturnType<typeof getCachedUnreadChatterCandidates>

    >['unread'] = []

    let bootstrapUpdates: Awaited<

      ReturnType<typeof getCachedUnreadChatterCandidates>

    >['bootstrapUpdates'] = []



    if (groups.length) {

      try {

        const chatterResult = await loadUnreadChatter({
          partnerId: input.partnerId,
          groups,
          readState,
          clientPartnerId: input.partnerId,
        })

        chatterUnread = chatterResult.unread

        bootstrapUpdates = chatterResult.bootstrapUpdates

      } catch {

        // Chatter es opcional en el tick; no tumbar el resto de novedades.

      }

    }



    if (bootstrapUpdates.length) {

      await upsertChatterReadStateBatch(input.actorId, bootstrapUpdates)

      for (const update of bootstrapUpdates) {

        readState.set(

          chatterReadStateKey(update.recordKind, update.recordId),

          update.lastSeenMessageId

        )

      }

    }



    const refByKey = new Map(

      refs.map((ref) => [chatterReadStateKey(ref.kind, ref.recordId), ref])

    )



    const unreadChatterWithMeta = chatterUnread

      .map((item) => {

        const ref = refByKey.get(chatterReadStateKey(item.recordKind, item.recordId))

        if (!ref) return null

        return {

          scope: listKindFromRecordKind(item.recordKind),

          recordId: item.recordId,

          name: ref.name,

          reason: 'unread_chatter' as const,

          latestDate: item.latestDate,

          recordKind: item.recordKind,

          listKind: listKindFromRecordKind(item.recordKind),

          latestMessageId: item.latestMessageId,

        }

      })

      .filter((item): item is NonNullable<typeof item> => item !== null)



    const newTramiteKeys = new Set(computeNewTramiteListItemKeys(items, seenState))



    const unreadChatterFiltered = unreadChatterWithMeta.filter((item) => {

      if (item.listKind !== 'tramite') return true

      return !newTramiteKeys.has(

        formatTramiteListItemKey('tramite', item.recordId)

      )

    })



    const newTramiteNotifications = items

      .filter(

        (item) =>

          item.kind === 'tramite' &&

          !item.isClosed &&

          newTramiteKeys.has(getTramiteListItemKey(item))

      )

      .map((item) =>

        portalNotificationFromTramiteListItem(item, 'new_tramite')

      )



    const tramiteWatchables = items.map(watchableFromTramiteListItem)

    const obligWatchables = obligacionWatchables(obligSnap.leaves)



    const recordDeltas = computeRecordWatchDeltas({

      records: [...tramiteWatchables, ...obligWatchables],

      watchState,

      portalBaselineComplete,

    })



    const firmaDeltas = computeFirmaWatchDeltas({

      requests: firmasSnap.requests,

      watchState,

      portalBaselineComplete,

    })



    const watchUpdates = [...recordDeltas.watchUpdates, ...firmaDeltas.watchUpdates]

    if (watchUpdates.length) {

      await upsertWatchStateBatch(input.actorId, watchUpdates)

    }



    const allUnread = mergeAndSortPortalNotifications(

      unreadChatterFiltered,

      newTramiteNotifications,

      recordDeltas.notifications,

      firmaDeltas.notifications

    )



    const odooErrors = [

      tramitesResult.odooError,

      obligResult.odooError,

      firmasResult.odooError,

    ].filter((error): error is NonNullable<typeof error> => Boolean(error))



    const allOdooFailed =

      tramitesResult.odooError &&

      obligResult.odooError &&

      firmasResult.odooError &&

      items.length === 0 &&

      obligSnap.leaves.length === 0 &&

      firmasSnap.requests.length === 0



    if (allOdooFailed) {

      const rateLimited = odooErrors.every((error) => error === 'odoo_rate_limited')

      return {

        ok: false,

        error: rateLimited ? 'odoo_rate_limited' : 'odoo_unavailable',

      }

    }



    return {

      ok: true,

      unread: allUnread,

      readState: readStateMapToObject(readState),

      pendingFirmaIds: firmasSnap.requests.map((request) => request.id),

      hasChanges:
        bootstrapUpdates.length > 0 ||
        watchUpdates.length > 0 ||
        newTramiteNotifications.length > 0 ||
        recordDeltas.notifications.length > 0 ||
        firmaDeltas.notifications.length > 0,

    }

  } catch (error) {

    return { ok: false, error: resolveOdooErrorCode(error) }

  }

}


