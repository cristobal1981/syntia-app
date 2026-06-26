import type { TramiteTask, TramiteTicket } from '@/src/modules/tramites/domain/types'
import { compareTramiteModifiedAtDesc } from '@/src/modules/tramites/domain/parse-odoo-datetime'

export type TramiteListKind = 'tramite' | 'consulta'

export type TramiteListItem = {
  id: number
  name: string
  kind: TramiteListKind
  state?: string
  isClosed: boolean
  attachmentCount: number
  modifiedAt: string
}

export function mergeTramitesList(
  tasks: TramiteTask[],
  tickets: TramiteTicket[]
): TramiteListItem[] {
  const taskItems: TramiteListItem[] = tasks.map((task) => ({
    id: task.id,
    name: task.name,
    kind: 'tramite',
    state: task.state,
    isClosed: task.isClosed,
    attachmentCount: task.attachmentCount,
    modifiedAt: task.modifiedAt,
  }))

  const ticketItems: TramiteListItem[] = tickets.map((ticket) => ({
    id: ticket.id,
    name: ticket.name,
    kind: 'consulta',
    isClosed: ticket.isClosed,
    attachmentCount: ticket.attachmentCount,
    modifiedAt: ticket.modifiedAt,
  }))

  return [...taskItems, ...ticketItems].sort((a, b) =>
    compareTramiteModifiedAtDesc(a.modifiedAt, b.modifiedAt)
  )
}

export function getTramiteListRecordKind(
  item: TramiteListItem
): 'task' | 'ticket' {
  return item.kind === 'tramite' ? 'task' : 'ticket'
}

export function formatTramiteListItemKey(
  kind: TramiteListKind,
  id: number
): string {
  return `${kind}-${id}`
}

export function getTramiteListItemKey(item: TramiteListItem): string {
  return formatTramiteListItemKey(item.kind, item.id)
}
