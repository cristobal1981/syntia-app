export type TramiteTask = {
  id: number
  name: string
  stageName?: string
  dateDeadline?: string
  projectName?: string
}

export type TramiteTicket = {
  id: number
  name: string
  stageName?: string
  createDate?: string
}

export type TramitesSnapshot = {
  tasks: TramiteTask[]
  tickets: TramiteTicket[]
  odooPartnerId: number | null
  tagFilterActive: boolean
}

export type TramitesErrorCode =
  | 'forbidden'
  | 'not_linked'
  | 'odoo_unavailable'

export type TramitesResult =
  | { ok: true; data: TramitesSnapshot }
  | { ok: false; error: TramitesErrorCode }
