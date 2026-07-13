import { getObligacionesParentPrefix } from '@/src/modules/obligaciones/infrastructure/obligaciones-env'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { parseOdooDateTime } from '@/src/modules/tramites/domain/parse-odoo-datetime'

export type ObligacionTaskIndexLeaf = {
  id: number
  name: string
  state?: string
  modifiedAt: string
}

export type ObligacionTaskIndex = {
  /** Raíces, periodos y hojas del árbol obligaciones (exclusión en trámites). */
  excludedTaskIds: number[]
  leaves: ObligacionTaskIndexLeaf[]
}

type OdooIdRow = {
  id: number
}

type OdooLeafRow = {
  id: number
  name: string
  state?: string | false | null
  write_date?: string | false | null
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

  const periodRows = await odooSearchRead<OdooIdRow>('project.task', {
    domain: [['parent_id', 'in', rootIds]],
    fields: ['id'],
    order: 'name asc, id asc',
    limit: 200,
  })

  const periodIds = periodRows.map((row) => row.id)
  if (!periodIds.length) {
    return { excludedTaskIds: rootIds, leaves: [] }
  }

  const leafRows = await odooSearchRead<OdooLeafRow>('project.task', {
    domain: [['parent_id', 'in', periodIds]],
    fields: ['id', 'name', 'state', 'write_date'],
    order: 'name asc, id asc',
    limit: 200,
  })

  const leaves: ObligacionTaskIndexLeaf[] = leafRows.map((row) => ({
    id: row.id,
    name: typeof row.name === 'string' ? row.name : `Obligación ${row.id}`,
    state: typeof row.state === 'string' && row.state ? row.state : undefined,
    modifiedAt: parseOdooDateTime(row.write_date) ?? new Date().toISOString(),
  }))

  const leafIds = leaves.map((leaf) => leaf.id)

  return {
    excludedTaskIds: [...rootIds, ...periodIds, ...leafIds],
    leaves,
  }
}
