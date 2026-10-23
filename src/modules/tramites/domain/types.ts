/** Prioridad de Odoo: 0 baja, 1 media, 2 alta, 3 urgente. */
export type TramitePriority = 0 | 1 | 2 | 3

/** Persona del equipo a la que está asignado un trámite o consulta. */
export type TramiteAssignee = {
  /** `res.users` en Odoo. */
  userId: number
  name: string
}

export type TramiteTask = {
  id: number
  name: string
  state?: string
  stateLabel?: string
  attachmentCount: number
  isClosed: boolean
  modifiedAt: string
  /** Fecha de creación en Odoo (ISO); vacía si no se pudo leer. */
  createdAt: string
  priority: TramitePriority
  /** Quién lo lleva (puede haber varios, o ninguno). */
  assignees: TramiteAssignee[]
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
  createdAt: string
  priority: TramitePriority
  assignees: TramiteAssignee[]
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
