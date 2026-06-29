import {
  getTramitesTaskTagName,
} from '@/src/modules/tramites/infrastructure/tramites-env'
import { odooCall, odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooProjectRow = {
  id: number
}

type OdooTagRow = {
  id: number
}

function parseOdooCreatedId(result: number | number[] | undefined): number | null {
  if (typeof result === 'number' && result > 0) return result
  if (Array.isArray(result) && typeof result[0] === 'number' && result[0] > 0) {
    return result[0]
  }
  return null
}

async function resolveClientProjectId(partnerId: number): Promise<number | null> {
  const rows = await odooSearchRead<OdooProjectRow>('project.project', {
    domain: [['partner_id', '=', partnerId]],
    fields: ['id'],
    order: 'write_date desc, id desc',
    limit: 1,
  })

  return rows[0]?.id ?? null
}

async function resolveTaskTagId(tagName: string): Promise<number | null> {
  const rows = await odooSearchRead<OdooTagRow>('project.tags', {
    domain: [['name', '=', tagName]],
    fields: ['id'],
    limit: 1,
  })

  return rows[0]?.id ?? null
}

export async function createPartnerTask(input: {
  partnerId: number
  name: string
  description?: string
}): Promise<number> {
  const projectId = await resolveClientProjectId(input.partnerId)
  if (!projectId) {
    throw new Error('ODOO_CLIENT_PROJECT_NOT_FOUND')
  }

  const tagName = getTramitesTaskTagName()
  const tagId = tagName ? await resolveTaskTagId(tagName) : null

  const vals: Record<string, unknown> = {
    name: input.name,
    project_id: projectId,
    ...(input.description ? { description: input.description } : {}),
    ...(tagId ? { tag_ids: [[6, 0, [tagId]]] } : {}),
  }

  const created = await odooCall<number | number[]>('project.task', 'create', {
    vals_list: [vals],
  })

  const taskId = parseOdooCreatedId(created)
  if (!taskId) {
    throw new Error('ODOO_TASK_CREATE_FAILED')
  }

  return taskId
}
