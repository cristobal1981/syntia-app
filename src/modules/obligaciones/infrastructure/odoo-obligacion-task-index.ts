import { getObligacionesParentPrefix } from '@/src/modules/obligaciones/infrastructure/obligaciones-env'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

export type ObligacionTaskIndexLeaf = {
  state?: string
}

export type ObligacionTaskIndex = {
  /** Raíces, periodos y hojas del árbol obligaciones (exclusión en trámites). */
  excludedTaskIds: number[]
  leafTasks: ObligacionTaskIndexLeaf[]
}

type OdooIdRow = {
  id: number
}

type OdooLeafRow = {
  id: number
  state?: string | false | null
}

export async function buildObligacionTaskIndex(
  projectIds: number[]
): Promise<ObligacionTaskIndex> {
  if (!projectIds.length) {
    return { excludedTaskIds: [], leafTasks: [] }
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
    return { excludedTaskIds: [], leafTasks: [] }
  }

  const periodRows = await odooSearchRead<OdooIdRow>('project.task', {
    domain: [['parent_id', 'in', rootIds]],
    fields: ['id'],
    order: 'name asc, id asc',
    limit: 200,
  })

  const periodIds = periodRows.map((row) => row.id)
  if (!periodIds.length) {
    return { excludedTaskIds: rootIds, leafTasks: [] }
  }

  const leafRows = await odooSearchRead<OdooLeafRow>('project.task', {
    domain: [['parent_id', 'in', periodIds]],
    fields: ['id', 'state'],
    order: 'name asc, id asc',
    limit: 200,
  })

  const leafIds = leafRows.map((row) => row.id)
  const leafTasks = leafRows.map((row) => ({
    state: typeof row.state === 'string' && row.state ? row.state : undefined,
  }))

  return {
    excludedTaskIds: [...rootIds, ...periodIds, ...leafIds],
    leafTasks,
  }
}
