import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'

export type ChatterUnreadNotification = {
  recordKind: PortalRecordKind
  recordId: number
  name: string
  listKind: 'tramite' | 'incidencia'
  latestMessageId: number
  latestDate: string
}

export type ChatterReadStateMap = Record<string, number>

export type ChatterNotificationsCheckResult =
  | {
      ok: true
      unread: ChatterUnreadNotification[]
      readState: ChatterReadStateMap
    }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' }

export type ChatterMarkSeenResult =
  | { ok: true; readState: ChatterReadStateMap }
  | {
      ok: false
      error: 'forbidden' | 'not_linked' | 'not_found' | 'odoo_unavailable'
    }

export function chatterReadStateKey(
  recordKind: PortalRecordKind,
  recordId: number
): string {
  return `${recordKind}:${recordId}`
}

export function listKindFromRecordKind(
  recordKind: PortalRecordKind
): 'tramite' | 'incidencia' {
  return recordKind === 'task' ? 'tramite' : 'incidencia'
}

export function recordKindFromListKind(
  listKind: 'tramite' | 'incidencia'
): PortalRecordKind {
  return listKind === 'tramite' ? 'task' : 'ticket'
}

export function openParamFromListKind(
  listKind: 'tramite' | 'incidencia',
  recordId: number
): string {
  return `${listKind}-${recordId}`
}
