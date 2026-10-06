export type PendingSignatureRequest = {
  id: number
  reference: string
  createDate?: string
  dueDate?: string
  signUrl: string
}

export type PendingSignaturesSnapshot = {
  requests: PendingSignatureRequest[]
}

export type PendingSignaturesResult =
  | { ok: true; data: PendingSignaturesSnapshot }
  | {
      ok: false
      error:
        | 'forbidden'
        | 'not_linked'
        | 'odoo_unavailable'
        | 'odoo_rate_limited'
    }

export type CompletedSignatureRequest = {
  id: number
  reference: string
  signedDate?: string
  documentAttachmentId?: number
}

export type SignatureHistorySnapshot = {
  requests: CompletedSignatureRequest[]
}

export type SignatureHistoryResult =
  | { ok: true; data: SignatureHistorySnapshot }
  | {
      ok: false
      error:
        | 'forbidden'
        | 'not_linked'
        | 'odoo_unavailable'
        | 'odoo_rate_limited'
    }
