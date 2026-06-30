export type PendingSignatureRequest = {
  id: number
  reference: string
  createDate?: string
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
