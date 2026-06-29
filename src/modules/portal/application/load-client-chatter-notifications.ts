import type {
  ChatterNotificationsCheckResult,
  ChatterReadStateMap,
} from '@/src/modules/portal/domain/chatter-notifications-types'
import {
  chatterReadStateKey,
  listKindFromRecordKind,
} from '@/src/modules/portal/domain/chatter-notifications-types'
import { resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { getCachedTramitesSnapshot } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { findUnreadChatterCandidatesForRecords } from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import { getOdooModelForRecordKind } from '@/src/modules/portal/infrastructure/portal-record-access'
import {
  fetchChatterReadStateForUser,
  upsertChatterReadStateBatch,
} from '@/src/modules/portal/infrastructure/chatter-read-state.supabase'
import { ensureTramitesListSeenInitialized } from '@/src/modules/tramites/application/tramites-list-seen-actions'
import {
  formatTramiteListItemKey,
  getTramiteListItemKey,
  getTramiteListRecordKind,
  mergeTramitesList,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import { compareTramiteModifiedAtDesc } from '@/src/modules/tramites/domain/parse-odoo-datetime'
import {
  computeNewTramiteListItemKeys,
  getOpenTramiteListItemKeys,
} from '@/src/modules/tramites/domain/tramites-list-seen-state'

function readStateMapToObject(map: Map<string, number>): ChatterReadStateMap {
  return Object.fromEntries(map.entries())
}

export async function loadClientChatterNotifications(input: {
  partnerId: number
  actorId: string
}): Promise<ChatterNotificationsCheckResult> {
  try {
    const [snapshot, readState] = await Promise.all([
      getCachedTramitesSnapshot(input.partnerId),
      fetchChatterReadStateForUser(input.actorId),
    ])

    const items = mergeTramitesList(snapshot.tasks, snapshot.tickets)
    const seenState = await ensureTramitesListSeenInitialized(
      input.actorId,
      getOpenTramiteListItemKeys(items)
    )
    const refs = items.map((item) => ({
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

    const { unread, bootstrapUpdates } = await findUnreadChatterCandidatesForRecords(
      {
        groups,
        readState,
        clientPartnerId: input.partnerId,
      }
    )

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

    const unreadWithMeta = unread
      .map((item) => {
        const ref = refByKey.get(chatterReadStateKey(item.recordKind, item.recordId))
        if (!ref) return null
        return {
          recordKind: item.recordKind,
          recordId: item.recordId,
          name: ref.name,
          listKind: listKindFromRecordKind(item.recordKind),
          reason: 'unread_chatter' as const,
          latestMessageId: item.latestMessageId,
          latestDate: item.latestDate,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    const newTramiteKeys = new Set(computeNewTramiteListItemKeys(items, seenState))

    const unreadChatterWithMeta = unreadWithMeta.filter((item) => {
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
      .map((item) => ({
        recordKind: 'task' as const,
        recordId: item.id,
        name: item.name,
        listKind: 'tramite' as const,
        reason: 'new_tramite' as const,
        latestDate: item.modifiedAt,
      }))

    const allUnread = [...unreadChatterWithMeta, ...newTramiteNotifications].sort(
      (a, b) => compareTramiteModifiedAtDesc(a.latestDate, b.latestDate)
    )

    return {
      ok: true,
      unread: allUnread,
      readState: readStateMapToObject(readState),
    }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
