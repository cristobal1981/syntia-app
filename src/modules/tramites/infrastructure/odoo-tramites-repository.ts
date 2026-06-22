import type {
  TramiteTask,
  TramiteTicket,
  TramitesSnapshot,
} from '@/src/modules/tramites/domain/types'
import { isTaskClosed, mapTaskStateLabel } from '@/src/modules/tramites/domain/map-task-state'
import { collectObligacionTaskIds } from '@/src/modules/obligaciones/infrastructure/odoo-obligaciones-repository'
import {
  getOdooTicketsModel,
  getTicketClosedField,
  getTramitesTaskTagName,
  TRAMITES_FETCH_LIMIT,
} from '@/src/modules/tramites/infrastructure/tramites-env'
import { countAttachmentsByRecordIds } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import {
  isOdooApiConfigured,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooProjectRow = {
  id: number
  name: string
}

type OdooTagRow = {
  id: number
  name: string
}

type OdooTaskRow = {
  id: number
  name: string
  state?: string | false | null
}

type OdooTicketRow = {
  id: number
  name: string
  close_date?: string | false | null
  [key: string]: unknown
}

function mapTask(
  row: OdooTaskRow,
  attachmentCounts: Map<number, number>
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
  }
}

function mapTicket(
  row: OdooTicketRow,
  attachmentCounts: Map<number, number>,
  closedField: string
): TramiteTicket {
  const closedValue = row[closedField]
  const isClosed =
    typeof closedValue === 'string'
      ? closedValue.length > 0
      : closedValue === true

  return {
    id: row.id,
    name: row.name,
    attachmentCount: attachmentCounts.get(row.id) ?? 0,
    isClosed,
  }
}

async function listClientProjects(partnerId: number): Promise<OdooProjectRow[]> {
  return odooSearchRead<OdooProjectRow>('project.project', {
    domain: [['partner_id', '=', partnerId]],
    fields: ['name'],
    order: 'write_date desc',
    limit: 20,
  })
}

async function resolveTaskTagId(tagName: string): Promise<number | null> {
  const rows = await odooSearchRead<OdooTagRow>('project.tags', {
    domain: [['name', '=', tagName]],
    fields: ['name'],
    limit: 1,
  })

  return rows[0]?.id ?? null
}

async function listProjectTasks(
  projectIds: number[],
  tagId: number | null,
  excludedTaskIds: Set<number>
): Promise<TramiteTask[]> {
  const domain: unknown[] = [['project_id', 'in', projectIds]]
  if (tagId) {
    domain.push(['tag_ids', 'in', [tagId]])
  }

  const rows = await odooSearchRead<OdooTaskRow>('project.task', {
    domain,
    fields: ['name', 'state'],
    order: 'write_date desc, id desc',
    limit: TRAMITES_FETCH_LIMIT,
  })

  const filteredRows = rows.filter((row) => !excludedTaskIds.has(row.id))
  const attachmentCounts = await countAttachmentsByRecordIds(
    'project.task',
    filteredRows.map((row) => row.id)
  )

  return filteredRows.map((row) => mapTask(row, attachmentCounts))
}

async function listPartnerTickets(partnerId: number): Promise<TramiteTicket[]> {
  const model = getOdooTicketsModel()
  const closedField = getTicketClosedField()
  const rows = await odooSearchRead<OdooTicketRow>(model, {
    domain: [['partner_id', '=', partnerId]],
    fields: ['name', closedField],
    order: 'create_date desc, id desc',
    limit: TRAMITES_FETCH_LIMIT,
  })

  const attachmentCounts = await countAttachmentsByRecordIds(
    model,
    rows.map((row) => row.id)
  )

  return rows.map((row) => mapTicket(row, attachmentCounts, closedField))
}

export async function fetchTramitesFromOdoo(
  partnerId: number
): Promise<TramitesSnapshot> {
  if (!isOdooApiConfigured()) {
    throw new Error('ODOO_NOT_CONFIGURED')
  }

  const tagName = getTramitesTaskTagName()
  const excludedTaskIds = await collectObligacionTaskIds(partnerId)
  const projects = await listClientProjects(partnerId)
  const projectIds = projects.map((project) => project.id)

  let tasks: TramiteTask[] = []
  let tagFilterActive = false

  if (projectIds.length) {
    const tagId = tagName ? await resolveTaskTagId(tagName) : null
    tagFilterActive = Boolean(tagName && tagId)
    if (!tagName || tagId) {
      tasks = await listProjectTasks(projectIds, tagId, excludedTaskIds)
    }
  }

  const tickets = await listPartnerTickets(partnerId)

  return {
    tasks,
    tickets,
    tagFilterActive,
  }
}
