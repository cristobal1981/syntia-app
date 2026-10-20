export type TramiteTask = {
  id: number
  name: string
  state?: string
  stateLabel?: string
  attachmentCount: number
  isClosed: boolean
  modifiedAt: string
  /** Tarea padre (subtarea de), si la tiene; puede no estar en la lista. */
  parentId?: number
  /** res.partner ids de user_ids asignados (para notificar en chatter). */
  assignedNotifyPartnerIds: number[]
}

export type TramiteTicket = {
  id: number
  name: string
  attachmentCount: number
  isClosed: boolean
  modifiedAt: string
  assignedNotifyPartnerIds: number[]
}

export type TramitesSnapshot = {
  tasks: TramiteTask[]
  tickets: TramiteTicket[]
  tagFilterActive: boolean
}

type TramitesErrorCode =
  | 'forbidden'
  | 'not_linked'
  | 'odoo_unavailable'
  | 'odoo_rate_limited'

export type TramitesResult =
  | { ok: true; data: TramitesSnapshot }
  | { ok: false; error: TramitesErrorCode }
