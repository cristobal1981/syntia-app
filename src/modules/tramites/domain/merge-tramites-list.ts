import type { TramiteTask, TramiteTicket } from '@/src/modules/tramites/domain/types'

export type TramiteListKind = 'tramite' | 'incidencia'

export type TramiteListItem = {
  id: number
  name: string
  kind: TramiteListKind
  state?: string
  isClosed: boolean
  attachmentCount: number
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
  }))

  const ticketItems: TramiteListItem[] = tickets.map((ticket) => ({
    id: ticket.id,
    name: ticket.name,
    kind: 'incidencia',
    isClosed: ticket.isClosed,
    attachmentCount: ticket.attachmentCount,
  }))

  return [...taskItems, ...ticketItems]
}

export function getTramiteListRecordKind(
  item: TramiteListItem
): 'task' | 'ticket' {
  return item.kind === 'tramite' ? 'task' : 'ticket'
}

export function getTramiteListItemKey(item: TramiteListItem): string {
  return `${item.kind}-${item.id}`
}
