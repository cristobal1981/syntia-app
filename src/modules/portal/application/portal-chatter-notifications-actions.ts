'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole, type PortalUser } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import {
  filterNotificationsForWorker,
  maskStatsForWorker,
} from '@/src/modules/colaboradores/application/mask-dashboard-for-worker'
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
import {
  isOdooApiConfigured,
  runWithOdooPriority,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
import {
  getPortalNewsFullCheckMaxAgeMs,
  isPortalNewsSignalEnabled,
} from '@/src/modules/portal/infrastructure/portal-chatter-env'
import { getMaxPortalEventSeqForPartner } from '@/src/modules/push/infrastructure/portal-events.supabase'
import {
  fetchWatchStateForUser,
  upsertWatchStateBatch,
} from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import { resolveWatchableAckStateFromSnapshots } from '@/src/modules/portal/infrastructure/resolve-watchable-ack-state'
import { verifyClientRecordAccess } from '@/src/modules/portal/infrastructure/portal-record-access'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

async function resolveClientAccess(): Promise<
  | { ok: true; partnerId: number; actorId: string; user: PortalUser }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' }
> {
  const session = await getSession()
  if (!session || !isClientOrWorkerRole(session.user.role)) {
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
  return { ok: true, partnerId, actorId, user: session.user }
}

function readStateMapToObject(map: Map<string, number>): ChatterReadStateMap {
  return Object.fromEntries(map.entries())
}

export async function checkPortalNotificationsAction(): Promise<PortalNotificationsCheckResult> {
  const access = await resolveClientAccess()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const result = await loadClientPortalNotifications({
    partnerId: access.partnerId,
    actorId: access.actorId,
    cache: false,
    persist: true,
  })

  if (access.user.role === 'worker' && result.ok) {
    const allowedSections = await getAllowedSectionsForWorker(access.user)
    return {
      ...result,
      stats: maskStatsForWorker(result.stats, allowedSections),
      unread: filterNotificationsForWorker(result.unread, allowedSections),
    }
  }

  return result
}

export type PortalNewsSignalResult =
  | { ok: true; mode: 'full' }
  | { ok: true; mode: 'events'; seq: number; fullCheckMaxAgeMs: number }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' }

/**
 * Señal barata para el sondeo de la campana: último evento del cliente, solo
 * Supabase (sin Odoo). Con `PORTAL_NEWS_SIGNAL` apagado responde `full` y el
 * cliente hace la comprobación completa en cada sondeo; si la consulta falla,
 * también (nunca se queda sin avisos por culpa de la señal).
 */
export async function checkPortalNewsSignalAction(): Promise<PortalNewsSignalResult> {
  if (!isPortalNewsSignalEnabled()) return { ok: true, mode: 'full' }

  const access = await resolveClientAccess()
  if (!access.ok) return { ok: false, error: access.error }

  try {
    const seq = await getMaxPortalEventSeqForPartner(access.partnerId)
    return { ok: true, mode: 'events', seq, fullCheckMaxAgeMs: getPortalNewsFullCheckMaxAgeMs() }
  } catch (error) {
    console.error('[portal news] señal de eventos falló', error)
    return { ok: true, mode: 'full' }
  }
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
  // Con prioridad: la comprobación de acceso lee de Odoo y, detrás de las peticiones de fondo,
  // el «visto» tardaba segundos en quitar el aviso de la campana.
  return runWithOdooPriority(() => markChatterConversationSeenActionImpl(input))
}

async function markChatterConversationSeenActionImpl(input: {
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

    if (input.reason === 'firma_due_soon' || input.reason === 'new_firma') {
      await upsertWatchStateBatch(access.actorId, [
        {
          scope: 'firma',
          recordId,
          lastIsClosed: false,
          lastAttachmentCount: 0,
          // Confirmar "nueva firma" no puede desarmar un aviso de "vence pronto"
          // ya confirmado: reaparecería en la campana.
          firmaDueSoonNotified:
            input.reason === 'firma_due_soon' ||
            (previous?.firmaDueSoonNotified ?? false),
          initialized: true,
        },
      ])
      return { ok: true }
    }

    if (input.reason === 'assignee_change') {
      const current = await resolveWatchableAckStateFromSnapshots(
        input.scope,
        recordId,
        access.partnerId
      )
      if (!current) {
        return { ok: false, error: 'not_found' }
      }

      // Solo se da por visto quién lo lleva: el estado y lo demás siguen como estaban.
      await upsertWatchStateBatch(access.actorId, [
        {
          scope: input.scope,
          recordId,
          lastState: previous?.lastState,
          lastIsClosed: previous?.lastIsClosed ?? current.lastIsClosed,
          lastAttachmentCount: previous?.lastAttachmentCount ?? current.lastAttachmentCount,
          firmaDueSoonNotified: previous?.firmaDueSoonNotified ?? false,
          initialized: true,
          lastAssigneeKey: current.lastAssigneeKey,
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
          // Confirmar el estado no da por visto un cambio de responsable pendiente.
          lastAssigneeKey: previous?.lastAssigneeKey,
        },
      ])
      return { ok: true }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'odoo_unavailable' }
  }
}
