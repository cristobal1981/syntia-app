'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type {
  ChatterMarkSeenResult,
  ChatterNotificationsCheckResult,
  ChatterReadStateMap,
} from '@/src/modules/portal/domain/chatter-notifications-types'
import {
  chatterReadStateKey,
  listKindFromRecordKind,
} from '@/src/modules/portal/domain/chatter-notifications-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import {
  fetchChatterReadStateForUser,
  upsertChatterReadState,
  upsertChatterReadStateBatch,
} from '@/src/modules/portal/infrastructure/chatter-read-state.supabase'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { findUnreadChatterCandidatesForRecords } from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import {
  getOdooModelForRecordKind,
  verifyRecordBelongsToPartner,
} from '@/src/modules/portal/infrastructure/portal-record-access'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'
import { ensureTramitesListSeenInitialized } from '@/src/modules/tramites/application/tramites-list-seen-actions'
import { computeNewTramiteListItemKeys, getOpenTramiteListItemKeys } from '@/src/modules/tramites/domain/tramites-list-seen-state'
import { compareTramiteModifiedAtDesc } from '@/src/modules/tramites/domain/parse-odoo-datetime'
import {
  formatTramiteListItemKey,
  getTramiteListItemKey,
  getTramiteListRecordKind,
  mergeTramitesList,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import { fetchTramitesFromOdoo } from '@/src/modules/tramites/infrastructure/odoo-tramites-repository'

async function resolveClientAccess(): Promise<
  | { ok: true; partnerId: number; actorId: string }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' }
> {
  const session = await getSession()
  if (!session || session.user.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  const partnerId = await resolveClientOdooPartnerId(session.user)
  if (!partnerId) {
    return { ok: false, error: 'not_linked' }
  }

  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  const actorId = await resolveDirectoryActorId(session.user)
  return { ok: true, partnerId, actorId }
}

function readStateMapToObject(map: Map<string, number>): ChatterReadStateMap {
  return Object.fromEntries(map.entries())
}

export async function checkChatterNotificationsAction(): Promise<ChatterNotificationsCheckResult> {
  const access = await resolveClientAccess()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  try {
    const [snapshot, readState] = await Promise.all([
      fetchTramitesFromOdoo(access.partnerId),
      fetchChatterReadStateForUser(access.actorId),
    ])

    const items = mergeTramitesList(snapshot.tasks, snapshot.tickets)
    const seenState = await ensureTramitesListSeenInitialized(
      access.actorId,
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
        clientPartnerId: access.partnerId,
      }
    )

    if (bootstrapUpdates.length) {
      await upsertChatterReadStateBatch(access.actorId, bootstrapUpdates)
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
  } catch {
    return { ok: false, error: 'odoo_unavailable' }
  }
}

export async function markChatterConversationSeenAction(input: {
  kind: PortalRecordKind
  recordId: number
  lastSeenMessageId: number
}): Promise<ChatterMarkSeenResult> {
  const access = await resolveClientAccess()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const recordId = Number(input.recordId)
  const lastSeenMessageId = Number(input.lastSeenMessageId)
  if (
    !Number.isInteger(recordId) ||
    recordId <= 0 ||
    !Number.isInteger(lastSeenMessageId) ||
    lastSeenMessageId <= 0
  ) {
    return { ok: false, error: 'not_found' }
  }

  const belongs = await verifyRecordBelongsToPartner(
    input.kind,
    recordId,
    access.partnerId
  )
  if (!belongs) {
    return { ok: false, error: 'not_found' }
  }

  try {
    const readState = await fetchChatterReadStateForUser(access.actorId)
    const key = chatterReadStateKey(input.kind, recordId)
    const current = readState.get(key) ?? 0
    const next = Math.max(current, lastSeenMessageId)

    if (next > current) {
      await upsertChatterReadState(access.actorId, input.kind, recordId, next)
      readState.set(key, next)
    }

    return { ok: true, readState: readStateMapToObject(readState) }
  } catch {
    return { ok: false, error: 'odoo_unavailable' }
  }
}
