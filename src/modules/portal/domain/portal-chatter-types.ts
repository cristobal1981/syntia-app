import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'

export type PortalChatterMessage = {
  id: number
  bodyHtml: string
  date: string
  authorName: string
  authorPartnerId?: number
  isFromClient: boolean
}

export type PortalChatterMessagesPageResult =
  | { ok: true; messages: PortalChatterMessage[]; hasMore: boolean }
  | {
      ok: false
      error: 'forbidden' | 'not_linked' | 'not_found' | 'odoo_unavailable' | 'odoo_rate_limited'
    }

export type PortalChatterPostResult =
  | { ok: true; message: PortalChatterMessage }
  | {
      ok: false
      error:
        | 'forbidden'
        | 'not_linked'
        | 'not_found'
        | 'odoo_unavailable'
        | 'odoo_rate_limited'
        | 'invalid_body'
        | 'read_only'
    }

export type ListRecordMessagesInput = {
  kind: PortalRecordKind
  recordId: number
  beforeId?: number
}

export type PostRecordMessageInput = {
  kind: PortalRecordKind
  recordId: number
  body: string
}
