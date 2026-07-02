'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type {
  PortalAckNotificationResult,
  PortalMarkSeenResult,
  PortalNotificationsCheckResult,
  ChatterReadStateMap,
  PortalNotificationReason,
  PortalRecordScope,
} from '@/src/modules/portal/domain/portal-notifications-types'
import {
  chatterReadStateKey,
  portalWatchStateKey,
} from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import { loadClientPortalNotifications } from '@/src/modules/portal/application/load-client-portal-notifications'
import {
  fetchChatterReadStateForUser,
  upsertChatterReadState,
} from '@/src/modules/portal/infrastructure/chatter-read-state.supabase'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import {
  fetchWatchStateForUser,
  upsertWatchStateBatch,
} from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import { resolveWatchableAckStateFromSnapshots } from '@/src/modules/portal/infrastructure/resolve-watchable-ack-state'
import { verifyClientRecordAccess } from '@/src/modules/portal/infrastructure/portal-record-access'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

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

export async function checkPortalNotificationsAction(): Promise<PortalNotificationsCheckResult> {
  const access = await resolveClientAccess()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  return loadClientPortalNotifications({
    partnerId: access.partnerId,
    actorId: access.actorId,
    cache: false,
  })
}

/** @deprecated Use checkPortalNotificationsAction */
export async function checkChatterNotificationsAction(): Promise<PortalNotificationsCheckResult> {
  return checkPortalNotificationsAction()
}

export async function markChatterConversationSeenAction(input: {
  kind: PortalRecordKind
  recordId: number
  lastSeenMessageId: number
}): Promise<PortalMarkSeenResult> {
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

  const belongs = await verifyClientRecordAccess(
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

export async function ackPortalNotificationAction(input: {
  scope: PortalRecordScope
  recordId: number
  reason: PortalNotificationReason
  attachmentCount?: number
}): Promise<PortalAckNotificationResult> {
  const access = await resolveClientAccess()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const recordId = Number(input.recordId)
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return { ok: false, error: 'not_found' }
  }

  if (input.scope === 'tramite' || input.scope === 'consulta') {
    const kind: PortalRecordKind = input.scope === 'tramite' ? 'task' : 'ticket'
    const belongs = await verifyClientRecordAccess(
      kind,
      recordId,
      access.partnerId
    )
    if (!belongs) {
      return { ok: false, error: 'not_found' }
    }
  }

  if (input.scope === 'obligacion') {
    const belongs = await verifyClientRecordAccess(
      'task',
      recordId,
      access.partnerId
    )
    if (!belongs) {
      return { ok: false, error: 'not_found' }
    }
  }

  try {
    const watchState = await fetchWatchStateForUser(access.actorId)
    const key = portalWatchStateKey(input.scope, recordId)
    const previous = watchState.get(key)

    if (input.reason === 'new_document') {
      const attachmentCount = Number(input.attachmentCount)
      if (!Number.isInteger(attachmentCount) || attachmentCount < 0) {
        return { ok: false, error: 'not_found' }
      }

      await upsertWatchStateBatch(access.actorId, [
        {
          scope: input.scope,
          recordId,
          lastState: previous?.lastState,
          lastIsClosed: previous?.lastIsClosed ?? false,
          lastAttachmentCount: attachmentCount,
          firmaDueSoonNotified: previous?.firmaDueSoonNotified ?? false,
          initialized: true,
        },
      ])
      return { ok: true }
    }

    if (input.reason === 'firma_due_soon' || input.reason === 'new_firma') {
      await upsertWatchStateBatch(access.actorId, [
        {
          scope: 'firma',
          recordId,
          lastIsClosed: false,
          lastAttachmentCount: 0,
          firmaDueSoonNotified: input.reason === 'firma_due_soon',
          initialized: true,
        },
      ])
      return { ok: true }
    }

    if (input.reason === 'status_change') {
      const current = await resolveWatchableAckStateFromSnapshots(
        input.scope,
        recordId,
        access.partnerId
      )
      if (!current) {
        return { ok: false, error: 'not_found' }
      }

      await upsertWatchStateBatch(access.actorId, [
        {
          scope: input.scope,
          recordId,
          lastState: current.lastState,
          lastIsClosed: current.lastIsClosed,
          lastAttachmentCount: current.lastAttachmentCount,
          firmaDueSoonNotified: previous?.firmaDueSoonNotified ?? false,
          initialized: true,
        },
      ])
      return { ok: true }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'odoo_unavailable' }
  }
}
