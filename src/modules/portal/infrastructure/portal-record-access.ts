import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import {
  getCachedObligacionTaskIndex,
  getCachedTramitesSnapshot,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { getOdooTicketsModel, getTicketClosedField } from '@/src/modules/tramites/infrastructure/tramites-env'

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

async function isTaskInClientCachedSnapshot(
  taskId: number,
  partnerId: number
): Promise<boolean> {
  const [tramites, obligIndex] = await Promise.all([
    getCachedTramitesSnapshot(partnerId),
    getCachedObligacionTaskIndex(partnerId),
  ])

  if (tramites.tasks.some((task) => task.id === taskId)) {
    return true
  }

  return obligIndex.leaves.some((leaf) => leaf.id === taskId)
}

async function isTicketInClientCachedSnapshot(
  ticketId: number,
  partnerId: number
): Promise<boolean> {
  const tramites = await getCachedTramitesSnapshot(partnerId)
  return tramites.tickets.some((ticket) => ticket.id === ticketId)
}

/** Evita verify Odoo cuando el registro ya está en snapshot cacheado del cliente. */
export async function verifyClientRecordAccess(
  kind: 'task' | 'ticket',
  recordId: number,
  partnerId: number
): Promise<boolean> {
  const inSnapshot =
    kind === 'task'
      ? await isTaskInClientCachedSnapshot(recordId, partnerId)
      : await isTicketInClientCachedSnapshot(recordId, partnerId)

  if (inSnapshot) {
    return true
  }

  return verifyRecordBelongsToPartner(kind, recordId, partnerId)
}

/**
 * Un `project.task` es la sección `/tramites` o la sección `/obligaciones`
 * indistintamente — Odoo no lo distingue por modelo, solo por en qué
 * snapshot cacheado del cliente aparece. Necesario para que un colaborador
 * con, p. ej., solo `/obligaciones` concedida no pueda descargar adjuntos de
 * un trámite ajeno a su grant conociendo el `recordId`. Reutiliza los
 * mismos snapshots cacheados que `verifyClientRecordAccess`, así que no
 * añade llamadas a Odoo.
 */
export async function resolveTaskWorkerSection(
  taskId: number,
  partnerId: number
): Promise<WorkerSectionHref | null> {
  const [tramites, obligIndex] = await Promise.all([
    getCachedTramitesSnapshot(partnerId),
    getCachedObligacionTaskIndex(partnerId),
  ])

  if (tramites.tasks.some((task) => task.id === taskId)) {
    return '/tramites'
  }
  if (obligIndex.leaves.some((leaf) => leaf.id === taskId)) {
    return '/obligaciones'
  }
  return null
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
