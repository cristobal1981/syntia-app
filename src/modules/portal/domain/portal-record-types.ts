export type PortalRecordKind = 'task' | 'ticket'

export type PortalAttachment = {
  id: number
  name: string
  mimetype?: string
  fileSize?: number
  createDate?: string
}

export type PortalRecordAttachmentsResult =
  | { ok: true; attachments: PortalAttachment[] }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'not_found' | 'odoo_unavailable' }

export type PortalAttachmentDownloadResult =
  | { ok: true; filename: string; mimetype: string; dataBase64: string }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'not_found' | 'odoo_unavailable' }

export type PortalAttachmentsZipResult =
  | { ok: true; filename: string; mimetype: string; dataBase64: string }
  | {
      ok: false
      error:
        | 'forbidden'
        | 'not_linked'
        | 'not_found'
        | 'odoo_unavailable'
        | 'no_attachments'
    }
