import type {
  ObligacionPeriod,
  ObligacionTask,
  ObligacionYear,
  ObligacionesSnapshot,
} from '@/src/modules/obligaciones/domain/types'
import { sortObligacionPeriodRows } from '@/src/modules/obligaciones/domain/sort-obligacion-periods'
import { getObligacionesParentPrefix } from '@/src/modules/obligaciones/infrastructure/obligaciones-env'
import { countAttachmentsByRecordIds } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import {
  isOdooApiConfigured,
  mapOdooMany2OneLabel,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooProjectRow = {
  id: number
  name: string
}

type OdooTaskRow = {
  id: number
  name: string
  parent_id?: [number, string] | false | null
  date_deadline?: string | false | null
  stage_id?: [number, string] | false | null
  state?: string | false | null
}

function extractYearFromRootName(name: string): number | null {
  const bracketMatch = name.match(/\[(\d{4})\]/)
  if (bracketMatch) {
    return Number.parseInt(bracketMatch[1], 10)
  }

  const trailingYear = name.match(/(\d{4})\s*$/)
  if (trailingYear) {
    return Number.parseInt(trailingYear[1], 10)
  }

  return null
}

function mapTaskRow(
  row: OdooTaskRow,
  attachmentCounts: Map<number, number>
): ObligacionTask {
  const state =
    typeof row.state === 'string' && row.state ? row.state : undefined

  return {
    id: row.id,
    name: row.name,
    state,
    stageName: mapOdooMany2OneLabel(row.stage_id),
    dateDeadline:
      typeof row.date_deadline === 'string' ? row.date_deadline : undefined,
    attachmentCount: attachmentCounts.get(row.id) ?? 0,
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

async function listRootObligacionTasks(
  projectIds: number[],
  parentPrefix: string
): Promise<OdooTaskRow[]> {
  if (!projectIds.length) return []

  return odooSearchRead<OdooTaskRow>('project.task', {
    domain: [
      ['project_id', 'in', projectIds],
      ['name', '=like', `${parentPrefix}%`],
      ['parent_id', '=', false],
    ],
    fields: ['name', 'parent_id'],
    order: 'name desc, id desc',
    limit: 20,
  })
}

async function listChildTasks(parentIds: number[]): Promise<OdooTaskRow[]> {
  if (!parentIds.length) return []

  return odooSearchRead<OdooTaskRow>('project.task', {
    domain: [['parent_id', 'in', parentIds]],
    fields: ['name', 'parent_id', 'date_deadline', 'stage_id', 'state'],
    order: 'name asc, id asc',
    limit: 200,
  })
}

type ObligacionTreeParts = {
  rootIds: number[]
  periodIds: number[]
  leafIds: number[]
  years: ObligacionYear[]
}

async function buildObligacionTree(
  partnerId: number
): Promise<ObligacionTreeParts> {
  const parentPrefix = getObligacionesParentPrefix()

  const projects = await listClientProjects(partnerId)
  const projectIds = projects.map((project) => project.id)
  const roots = await listRootObligacionTasks(projectIds, parentPrefix)
  const rootIds = roots.map((root) => root.id)

  const periodRows = await listChildTasks(rootIds)
  const periodIds: number[] = []
  const periodsByRoot = new Map<number, OdooTaskRow[]>()

  for (const row of periodRows) {
    const parentId = Array.isArray(row.parent_id) ? row.parent_id[0] : undefined
    if (!parentId) continue

    periodIds.push(row.id)
    const siblings = periodsByRoot.get(parentId) ?? []
    siblings.push(row)
    periodsByRoot.set(parentId, siblings)
  }

  const leafRows = await listChildTasks(periodIds)
  const leafIds = leafRows.map((leaf) => leaf.id)
  const attachmentCounts = await countAttachmentsByRecordIds(
    'project.task',
    leafIds
  )

  const leavesByPeriod = new Map<number, ObligacionTask[]>()
  for (const row of leafRows) {
    const parentId = Array.isArray(row.parent_id) ? row.parent_id[0] : undefined
    if (!parentId) continue

    const tasks = leavesByPeriod.get(parentId) ?? []
    tasks.push(mapTaskRow(row, attachmentCounts))
    leavesByPeriod.set(parentId, tasks)
  }

  const years: ObligacionYear[] = roots
    .map((root) => {
      const year = extractYearFromRootName(root.name)
      const periodRowsForRoot = sortObligacionPeriodRows(
        periodsByRoot.get(root.id) ?? []
      )

      const periods: ObligacionPeriod[] = periodRowsForRoot.map((periodRow) => ({
        key: String(periodRow.id),
        label: periodRow.name,
        tasks: leavesByPeriod.get(periodRow.id) ?? [],
      }))

      return {
        year: year ?? 0,
        label: root.name,
        periods,
      }
    })
    .sort((a, b) => b.year - a.year)

  return {
    rootIds,
    periodIds,
    leafIds: [...rootIds, ...periodIds, ...leafIds],
    years,
  }
}

export async function collectObligacionTaskIds(
  partnerId: number
): Promise<Set<number>> {
  if (!isOdooApiConfigured()) {
    return new Set()
  }

  const tree = await buildObligacionTree(partnerId)
  return new Set(tree.leafIds)
}

export async function fetchObligacionesFromOdoo(
  partnerId: number
): Promise<ObligacionesSnapshot> {
  if (!isOdooApiConfigured()) {
    throw new Error('ODOO_NOT_CONFIGURED')
  }

  const tree = await buildObligacionTree(partnerId)
  return { years: tree.years }
}
