export type TramiteTask = {
  id: number
  name: string
  state?: string
  stateLabel?: string
  attachmentCount: number
  isClosed: boolean
  modifiedAt: string
}

export type TramiteTicket = {
  id: number
  name: string
  attachmentCount: number
  isClosed: boolean
  modifiedAt: string
}

export type TramitesSnapshot = {
  tasks: TramiteTask[]
  tickets: TramiteTicket[]
  tagFilterActive: boolean
}

export type TramitesErrorCode =
  | 'forbidden'
  | 'not_linked'
  | 'odoo_unavailable'
  | 'odoo_rate_limited'

export type TramitesResult =
  | { ok: true; data: TramitesSnapshot }
  | { ok: false; error: TramitesErrorCode }
