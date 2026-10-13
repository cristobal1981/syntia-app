import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import { formatObligacionPeriodLabel } from '@/src/modules/obligaciones/domain/format-obligacion-period-label'
import { getObligacionesParentPrefix } from '@/src/modules/obligaciones/infrastructure/obligaciones-env'
import {
  mapOdooMany2OneId,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
import { parseOdooDateTime } from '@/src/modules/tramites/domain/parse-odoo-datetime'

export type ObligacionTaskIndexLeaf = {
  id: number
  name: string
  /** "Modelo 111 · Trimestre 2" — sin el nombre del cliente, listo para UI. */
  displayLabel: string
  state?: string
  modifiedAt: string
  deadline?: string
}

export type ObligacionTaskIndex = {
  /** Raíces, periodos y hojas del árbol obligaciones (exclusión en trámites). */
  excludedTaskIds: number[]
  leaves: ObligacionTaskIndexLeaf[]
}

type OdooIdRow = {
  id: number
}

type OdooPeriodRow = {
  id: number
  name: string
}

type OdooLeafRow = {
  id: number
  name: string
  parent_id?: [number, string] | false | null
  state?: string | false | null
  write_date?: string | false | null
  date_deadline?: string | false | null
}

export async function buildObligacionTaskIndex(
  projectIds: number[]
): Promise<ObligacionTaskIndex> {
  if (!projectIds.length) {
    return { excludedTaskIds: [], leaves: [] }
  }

  const parentPrefix = getObligacionesParentPrefix()

  const roots = await odooSearchRead<OdooIdRow>('project.task', {
    domain: [
      ['project_id', 'in', projectIds],
      ['name', '=like', `${parentPrefix}%`],
      ['parent_id', '=', false],
    ],
    fields: ['id'],
    order: 'name desc, id desc',
    limit: 20,
  })

  const rootIds = roots.map((row) => row.id)
  if (!rootIds.length) {
    return { excludedTaskIds: [], leaves: [] }
  }

  const periodRows = await odooSearchRead<OdooPeriodRow>('project.task', {
    domain: [['parent_id', 'in', rootIds]],
    fields: ['id', 'name'],
    order: 'name asc, id asc',
    limit: 200,
  })

  const periodIds = periodRows.map((row) => row.id)
  if (!periodIds.length) {
    return { excludedTaskIds: rootIds, leaves: [] }
  }

  const periodNameById = new Map(periodRows.map((row) => [row.id, row.name]))

  const leafRows = await odooSearchRead<OdooLeafRow>('project.task', {
    domain: [['parent_id', 'in', periodIds]],
    fields: ['id', 'name', 'parent_id', 'state', 'write_date', 'date_deadline'],
    order: 'name asc, id asc',
    limit: 200,
  })

  const leaves: ObligacionTaskIndexLeaf[] = leafRows.map((row) => {
    const name = typeof row.name === 'string' ? row.name : `Obligación ${row.id}`
    const periodId = mapOdooMany2OneId(row.parent_id)
    const periodContainer = periodId !== undefined ? periodNameById.get(periodId) : undefined
    const modelLabel = formatObligacionModelLabel(name)
    const periodLabel = periodContainer
      ? formatObligacionPeriodLabel(periodContainer, name).label
      : undefined

    return {
      id: row.id,
      name,
      displayLabel: periodLabel ? `${modelLabel} · ${periodLabel}` : modelLabel,
      state: typeof row.state === 'string' && row.state ? row.state : undefined,
      modifiedAt: parseOdooDateTime(row.write_date) ?? new Date().toISOString(),
      deadline: parseOdooDateTime(row.date_deadline) || undefined,
    }
  })

  const leafIds = leaves.map((leaf) => leaf.id)

  return {
    excludedTaskIds: [...rootIds, ...periodIds, ...leafIds],
    leaves,
  }
}
