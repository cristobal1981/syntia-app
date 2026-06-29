import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'

export type TramiteListKindParam = 'tramite' | 'consulta'

export type PortalNotificationReason = 'unread_chatter' | 'new_tramite'

export type ChatterUnreadNotification = {
  recordKind: PortalRecordKind
  recordId: number
  name: string
  listKind: TramiteListKindParam
  reason: PortalNotificationReason
  latestMessageId?: number
  latestDate: string
}

export type ChatterReadStateMap = Record<string, number>

export type ChatterNotificationsCheckResult =
  | {
      ok: true
      unread: ChatterUnreadNotification[]
      readState: ChatterReadStateMap
    }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'odoo_rate_limited' }

export type ChatterMarkSeenResult =
  | { ok: true; readState: ChatterReadStateMap }
  | {
      ok: false
      error: 'forbidden' | 'not_linked' | 'not_found' | 'odoo_unavailable' | 'odoo_rate_limited'
    }

export function chatterReadStateKey(
  recordKind: PortalRecordKind,
  recordId: number
): string {
  return `${recordKind}:${recordId}`
}

export function listKindFromRecordKind(
  recordKind: PortalRecordKind
): TramiteListKindParam {
  return recordKind === 'task' ? 'tramite' : 'consulta'
}

export function recordKindFromListKind(
  listKind: TramiteListKindParam
): PortalRecordKind {
  return listKind === 'tramite' ? 'task' : 'ticket'
}

export function openParamFromListKind(
  listKind: TramiteListKindParam,
  recordId: number
): string {
  return `${listKind}-${recordId}`
}

/** Compatibilidad con enlaces antiguos `incidencia-{id}`. */
export function parseTramiteOpenParam(
  value: string
): { kind: TramiteListKindParam; recordId: number } | null {
  const match = /^(tramite|consulta|incidencia)-(\d+)$/.exec(value)
  if (!match) return null

  const rawKind = match[1]
  const kind: TramiteListKindParam =
    rawKind === 'tramite' ? 'tramite' : 'consulta'
  const recordId = Number.parseInt(match[2] ?? '', 10)
  if (!Number.isInteger(recordId) || recordId <= 0) return null

  return { kind, recordId }
}
