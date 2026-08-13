import type {
  PortalAttachment,
  PortalRecordKind,
} from '@/src/modules/portal/domain/portal-record-types'

export type PortalChatterAttachmentRef = {
  id: number
  name: string
  mimetype?: string
  fileSize?: number
}

export function portalAttachmentFromChatterRef(
  ref: PortalChatterAttachmentRef
): PortalAttachment {
  return {
    id: ref.id,
    name: ref.name,
    mimetype: ref.mimetype,
    fileSize: ref.fileSize,
  }
}

export type PortalChatterParentPreview = {
  authorName: string
  snippet: string
}

export type PortalChatterMessage = {
  id: number
  bodyHtml: string
  date: string
  authorName: string
  authorPartnerId?: number
  isFromClient: boolean
  parentId?: number
  parentPreview?: PortalChatterParentPreview
  attachments?: PortalChatterAttachmentRef[]
}

export type PortalChatterMessagesPageResult =
  | { ok: true; messages: PortalChatterMessage[]; hasMore: boolean }
  | {
      ok: false
      error: 'forbidden' | 'not_linked' | 'not_found' | 'odoo_unavailable' | 'odoo_rate_limited'
    }

export type PortalChatterPostResult =
  | { ok: true; message: PortalChatterMessage; attachmentCount?: number }
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
        | 'invalid_parent'
        | 'invalid_attachment'
        | 'attachment_too_large'
        | 'too_many_attachments'
    }

export type PortalChatterUploadFile = {
  name: string
  mimetype: string
  dataBase64: string
}

export type ListRecordMessagesInput = {
  kind: PortalRecordKind
  recordId: number
  beforeId?: number
}

export type ListNewerRecordMessagesInput = {
  kind: PortalRecordKind
  recordId: number
  afterId: number
}

export type PostRecordMessageInput = {
  kind: PortalRecordKind
  recordId: number
  body: string
  parentId?: number
  files?: PortalChatterUploadFile[]
  /** res.partner ids del asignado (desde lista de trámites, sin Odoo extra en envío). */
  notifyPartnerIds?: number[]
}
