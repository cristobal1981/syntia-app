import type {
  TramiteTask,
  TramiteTicket,
  TramitesSnapshot,
} from '@/src/modules/tramites/domain/types'
import { isTaskClosed, mapTaskStateLabel } from '@/src/modules/tramites/domain/map-task-state'
import { parseOdooDateTime } from '@/src/modules/tramites/domain/parse-odoo-datetime'
import {
  getCachedClientProjectIds,
  getCachedObligacionTaskIndex,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import {
  getOdooTicketsModel,
  getTicketClosedField,
  TRAMITES_FETCH_LIMIT,
  TRAMITES_SHOW_IN_SYNTIA_FIELD,
} from '@/src/modules/tramites/infrastructure/tramites-env'
import { countAttachmentsByRecordIds } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import { resolveOdooPartnerIdsByUserIds } from '@/src/modules/portal/infrastructure/odoo-advisor-partner'
import {
  isOdooApiConfigured,
  mapOdooMany2OneId,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooTaskRow = {
  id: number
  name: string
  state?: string | false | null
  write_date?: string | false | null
  user_ids?: number[] | false | null
}

type OdooTaskIdRow = {
  id: number
}

type OdooTicketRow = {
  id: number
  name: string
  close_date?: string | false | null
  write_date?: string | false | null
  create_date?: string | false | null
  user_id?: [number, string] | false | null
  [key: string]: unknown
}

function mapOdooUserIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is number => typeof id === 'number' && id > 0)
}

function mapAssignedNotifyPartnerIds(
  odooUserIds: number[],
  partnerByUserId: Map<number, number>
): number[] {
  const partnerIds = new Set<number>()
  for (const userId of odooUserIds) {
    const partnerId = partnerByUserId.get(userId)
    if (partnerId && partnerId > 0) partnerIds.add(partnerId)
  }
  return [...partnerIds]
}

function mapTask(
  row: OdooTaskRow,
  attachmentCounts: Map<number, number>,
  partnerByUserId: Map<number, number>
): TramiteTask {
  const state =
    typeof row.state === 'string' && row.state ? row.state : undefined

  return {
    id: row.id,
    name: row.name,
    state,
    stateLabel: mapTaskStateLabel(state),
    attachmentCount: attachmentCounts.get(row.id) ?? 0,
    isClosed: isTaskClosed(state),
    modifiedAt: parseOdooDateTime(row.write_date),
    assignedNotifyPartnerIds: mapAssignedNotifyPartnerIds(
      mapOdooUserIds(row.user_ids),
      partnerByUserId
    ),
  }
}

function ticketModifiedAt(row: OdooTicketRow): string {
  return (
    parseOdooDateTime(row.write_date) || parseOdooDateTime(row.create_date)
  )
}

function mapTicket(
  row: OdooTicketRow,
  attachmentCounts: Map<number, number>,
  closedField: string,
  partnerByUserId: Map<number, number>
): TramiteTicket {
  const closedValue = row[closedField]
  const isClosed =
    typeof closedValue === 'string'
      ? closedValue.length > 0
      : closedValue === true
  const assigneeUserId = mapOdooMany2OneId(row.user_id)

  return {
    id: row.id,
    name: row.name,
    attachmentCount: attachmentCounts.get(row.id) ?? 0,
    isClosed,
    modifiedAt: ticketModifiedAt(row),
    assignedNotifyPartnerIds: mapAssignedNotifyPartnerIds(
      assigneeUserId ? [assigneeUserId] : [],
      partnerByUserId
    ),
  }
}

async function listClientProjectIds(partnerId: number): Promise<number[]> {
  return getCachedClientProjectIds(partnerId)
}

async function collectExcludedObligacionTaskIds(
  partnerId: number
): Promise<Set<number>> {
  const index = await getCachedObligacionTaskIndex(partnerId)
  return new Set(index.excludedTaskIds)
}

/**
 * Tareas con x_studio_mostrar_en_syntia + todas sus subtareas (child_of).
 * Excluye el árbol de obligaciones (filtro por nombre, independiente del flag).
 */
async function listProjectTaskRows(
  projectIds: number[],
  excludedTaskIds: Set<number>
): Promise<OdooTaskRow[]> {
  const flagged = await odooSearchRead<OdooTaskIdRow>('project.task', {
    domain: [
      ['project_id', 'in', projectIds],
      [TRAMITES_SHOW_IN_SYNTIA_FIELD, '=', true],
    ],
    fields: ['id'],
    order: 'id desc',
    limit: TRAMITES_FETCH_LIMIT,
  })

  const flaggedIds = flagged
    .map((row) => row.id)
    .filter((id) => !excludedTaskIds.has(id))

  if (!flaggedIds.length) {
    return []
  }

  const rows = await odooSearchRead<OdooTaskRow>('project.task', {
    domain: [
      ['project_id', 'in', projectIds],
      ['id', 'child_of', flaggedIds],
    ],
    fields: ['name', 'state', 'write_date', 'user_ids'],
    order: 'write_date desc, id desc',
    limit: TRAMITES_FETCH_LIMIT,
  })

  return rows.filter((row) => !excludedTaskIds.has(row.id))
}

async function listProjectTasks(
  projectIds: number[],
  excludedTaskIds: Set<number>
): Promise<TramiteTask[]> {
  const filteredRows = await listProjectTaskRows(projectIds, excludedTaskIds)
  const assigneeUserIds = filteredRows.flatMap((row) => mapOdooUserIds(row.user_ids))
  const partnerByUserId = await resolveOdooPartnerIdsByUserIds(assigneeUserIds)
  const attachmentCounts = await countAttachmentsByRecordIds(
    'project.task',
    filteredRows.map((row) => row.id)
  )

  return filteredRows.map((row) => mapTask(row, attachmentCounts, partnerByUserId))
}

async function listPartnerTicketRows(partnerId: number): Promise<OdooTicketRow[]> {
  const model = getOdooTicketsModel()
  const closedField = getTicketClosedField()
  return odooSearchRead<OdooTicketRow>(model, {
    domain: [['partner_id', '=', partnerId]],
    fields: ['name', closedField, 'write_date', 'create_date', 'user_id'],
    order: 'write_date desc, id desc',
    limit: TRAMITES_FETCH_LIMIT,
  })
}

async function listPartnerTickets(partnerId: number): Promise<TramiteTicket[]> {
  const model = getOdooTicketsModel()
  const closedField = getTicketClosedField()
  const rows = await listPartnerTicketRows(partnerId)
  const assigneeUserIds = rows
    .map((row) => mapOdooMany2OneId(row.user_id))
    .filter((id): id is number => typeof id === 'number' && id > 0)
  const partnerByUserId = await resolveOdooPartnerIdsByUserIds(assigneeUserIds)

  const attachmentCounts = await countAttachmentsByRecordIds(
    model,
    rows.map((row) => row.id)
  )

  return rows.map((row) => mapTicket(row, attachmentCounts, closedField, partnerByUserId))
}

export type TramiteRecordRef = {
  kind: 'task' | 'ticket'
  recordId: number
  name: string
}

export async function listTramiteRecordRefsForPartner(
  partnerId: number
): Promise<TramiteRecordRef[]> {
  if (!isOdooApiConfigured()) {
    throw new Error('ODOO_NOT_CONFIGURED')
  }

  const excludedTaskIds = await collectExcludedObligacionTaskIds(partnerId)
  const projectIds = await listClientProjectIds(partnerId)

  const refs: TramiteRecordRef[] = []

  if (projectIds.length) {
    const taskRows = await listProjectTaskRows(projectIds, excludedTaskIds)
    for (const row of taskRows) {
      refs.push({ kind: 'task', recordId: row.id, name: row.name })
    }
  }

  const ticketRows = await listPartnerTicketRows(partnerId)
  for (const row of ticketRows) {
    refs.push({ kind: 'ticket', recordId: row.id, name: row.name })
  }

  return refs
}

export async function fetchTramitesFromOdoo(
  partnerId: number
): Promise<TramitesSnapshot> {
  if (!isOdooApiConfigured()) {
    throw new Error('ODOO_NOT_CONFIGURED')
  }

  const excludedTaskIds = await collectExcludedObligacionTaskIds(partnerId)
  const projectIds = await listClientProjectIds(partnerId)

  const tasks = projectIds.length
    ? await listProjectTasks(projectIds, excludedTaskIds)
    : []

  const tickets = await listPartnerTickets(partnerId)

  return {
    tasks,
    tickets,
    tagFilterActive: true,
  }
}
