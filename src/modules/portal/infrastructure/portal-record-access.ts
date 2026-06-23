import { getOdooTicketsModel, getTicketClosedField } from '@/src/modules/tramites/infrastructure/tramites-env'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooTaskAccessRow = {
  id: number
  project_id?: [number, string] | false | null
}

type OdooProjectAccessRow = {
  id: number
  partner_id?: [number, string] | false | null
}

type OdooTicketAccessRow = {
  id: number
  partner_id?: [number, string] | false | null
}

export async function verifyTaskBelongsToPartner(
  taskId: number,
  partnerId: number
): Promise<boolean> {
  const tasks = await odooSearchRead<OdooTaskAccessRow>('project.task', {
    domain: [['id', '=', taskId]],
    fields: ['project_id'],
    limit: 1,
  })

  const task = tasks[0]
  const projectId = Array.isArray(task?.project_id) ? task.project_id[0] : undefined
  if (!projectId) return false

  const projects = await odooSearchRead<OdooProjectAccessRow>('project.project', {
    domain: [['id', '=', projectId]],
    fields: ['partner_id'],
    limit: 1,
  })

  const project = projects[0]
  const projectPartnerId = Array.isArray(project?.partner_id)
    ? project.partner_id[0]
    : undefined
  return projectPartnerId === partnerId
}

export async function verifyTicketBelongsToPartner(
  ticketId: number,
  partnerId: number
): Promise<boolean> {
  const model = getOdooTicketsModel()
  const tickets = await odooSearchRead<OdooTicketAccessRow>(model, {
    domain: [['id', '=', ticketId]],
    fields: ['partner_id'],
    limit: 1,
  })

  const ticket = tickets[0]
  const ticketPartnerId = Array.isArray(ticket?.partner_id)
    ? ticket.partner_id[0]
    : undefined
  return ticketPartnerId === partnerId
}

export async function verifyRecordBelongsToPartner(
  kind: 'task' | 'ticket',
  recordId: number,
  partnerId: number
): Promise<boolean> {
  if (kind === 'task') {
    return verifyTaskBelongsToPartner(recordId, partnerId)
  }
  return verifyTicketBelongsToPartner(recordId, partnerId)
}

export function getOdooModelForRecordKind(kind: 'task' | 'ticket'): string {
  return kind === 'task' ? 'project.task' : getOdooTicketsModel()
}

export async function canClientReplyOnRecord(
  kind: 'task' | 'ticket',
  recordId: number
): Promise<boolean> {
  if (kind === 'task') {
    return true
  }

  const model = getOdooTicketsModel()
  const closedField = getTicketClosedField()
  const tickets = await odooSearchRead<Record<string, unknown>>(model, {
    domain: [['id', '=', recordId]],
    fields: [closedField],
    limit: 1,
  })

  const ticket = tickets[0]
  if (!ticket) return false

  const closedValue = ticket[closedField]
  if (closedValue === false || closedValue === null || closedValue === undefined) {
    return true
  }

  if (typeof closedValue === 'string') {
    return closedValue.trim().length === 0
  }

  return false
}
