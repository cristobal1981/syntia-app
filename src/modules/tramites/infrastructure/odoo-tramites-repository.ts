import type {
  TramiteTask,
  TramiteTicket,
  TramitesSnapshot,
} from '@/src/modules/tramites/domain/types'
import {
  getOdooTicketsModel,
  getTramitesTaskTagName,
} from '@/src/modules/tramites/infrastructure/tramites-env'
import {
  isOdooApiConfigured,
  mapOdooMany2OneLabel,
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
  date_deadline?: string | false | null
  stage_id?: [number, string] | false | null
  project_id?: [number, string] | false | null
}

type OdooTicketRow = {
  id: number
  name: string
  stage_id?: [number, string] | false | null
  create_date?: string | false | null
}

function mapTask(row: OdooTaskRow): TramiteTask {
  return {
    id: row.id,
    name: row.name,
    stageName: mapOdooMany2OneLabel(row.stage_id),
    dateDeadline:
      typeof row.date_deadline === 'string' ? row.date_deadline : undefined,
    projectName: mapOdooMany2OneLabel(row.project_id),
  }
}

function mapTicket(row: OdooTicketRow): TramiteTicket {
  return {
    id: row.id,
    name: row.name,
    stageName: mapOdooMany2OneLabel(row.stage_id),
    createDate:
      typeof row.create_date === 'string' ? row.create_date : undefined,
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
  tagId: number | null
): Promise<TramiteTask[]> {
  const domain: unknown[] = [['project_id', 'in', projectIds]]
  if (tagId) {
    domain.push(['tag_ids', 'in', [tagId]])
  }

  const rows = await odooSearchRead<OdooTaskRow>('project.task', {
    domain,
    fields: ['name', 'date_deadline', 'stage_id', 'project_id'],
    order: 'date_deadline asc, id desc',
    limit: 100,
  })

  return rows.map(mapTask)
}

async function listPartnerTickets(partnerId: number): Promise<TramiteTicket[]> {
  const model = getOdooTicketsModel()
  const rows = await odooSearchRead<OdooTicketRow>(model, {
    domain: [['partner_id', '=', partnerId]],
    fields: ['name', 'stage_id', 'create_date'],
    order: 'create_date desc, id desc',
    limit: 100,
  })

  return rows.map(mapTicket)
}

export async function fetchTramitesFromOdoo(
  partnerId: number
): Promise<TramitesSnapshot> {
  if (!isOdooApiConfigured()) {
    throw new Error('ODOO_NOT_CONFIGURED')
  }

  const tagName = getTramitesTaskTagName()
  const projects = await listClientProjects(partnerId)
  const projectIds = projects.map((project) => project.id)

  let tasks: TramiteTask[] = []
  let tagFilterActive = false

  if (projectIds.length) {
    const tagId = tagName ? await resolveTaskTagId(tagName) : null
    tagFilterActive = Boolean(tagName && tagId)
    if (!tagName || tagId) {
      tasks = await listProjectTasks(projectIds, tagId)
    }
  }

  const tickets = await listPartnerTickets(partnerId)

  return {
    tasks,
    tickets,
    odooPartnerId: partnerId,
    tagFilterActive,
  }
}
