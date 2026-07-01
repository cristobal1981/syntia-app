import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'

export type TramiteListKindParam = 'tramite' | 'consulta'

export type PortalRecordScope = 'tramite' | 'consulta' | 'obligacion' | 'firma'

export type PortalNotificationReason =
  | 'unread_chatter'
  | 'new_tramite'
  | 'status_change'
  | 'new_document'
  | 'new_firma'
  | 'firma_due_soon'

export type PortalNotification = {
  scope: PortalRecordScope
  recordId: number
  name: string
  reason: PortalNotificationReason
  latestDate: string
  recordKind?: PortalRecordKind
  listKind?: TramiteListKindParam
  latestMessageId?: number
  previousStateLabel?: string
  newStateLabel?: string
  isCloseEvent?: boolean
}

export type ChatterReadStateMap = Record<string, number>

export type PortalNotificationsCheckResult =
  | {
      ok: true
      unread: PortalNotification[]
      readState: ChatterReadStateMap
      pendingFirmaIds: number[]
      hasChanges: boolean
    }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'odoo_rate_limited' }

export type PortalMarkSeenResult =
  | { ok: true; readState: ChatterReadStateMap }
  | {
      ok: false
      error: 'forbidden' | 'not_linked' | 'not_found' | 'odoo_unavailable' | 'odoo_rate_limited'
    }

export type PortalAckNotificationResult =
  | { ok: true }
  | {
      ok: false
      error: 'forbidden' | 'not_linked' | 'not_found' | 'odoo_unavailable' | 'odoo_rate_limited'
    }

export function portalWatchStateKey(
  scope: PortalRecordScope,
  recordId: number
): string {
  return `${scope}:${recordId}`
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

export function scopeFromTramiteListKind(
  listKind: TramiteListKindParam
): 'tramite' | 'consulta' {
  return listKind
}

export function openParamFromListKind(
  listKind: TramiteListKindParam,
  recordId: number
): string {
  return `${listKind}-${recordId}`
}

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

export function parseObligacionOpenParam(
  value: string
): { recordId: number } | null {
  const match = /^task-(\d+)$/.exec(value)
  if (!match) return null

  const recordId = Number.parseInt(match[1] ?? '', 10)
  if (!Number.isInteger(recordId) || recordId <= 0) return null

  return { recordId }
}
