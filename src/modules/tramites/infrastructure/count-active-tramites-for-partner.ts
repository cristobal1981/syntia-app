import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'
import {
  getCachedClientProjectIds,
  getCachedObligacionTaskIndex,
  getCachedTramitesTagId,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'
import {
  getTramitesTaskTagName,
  TRAMITES_FETCH_LIMIT,
} from '@/src/modules/tramites/infrastructure/tramites-env'

type OdooTaskStateRow = {
  id: number
  state?: string | false | null
}

export async function countActiveTramitesForPartner(
  partnerId: number
): Promise<number> {
  const tagName = getTramitesTaskTagName()

  const [projectIds, obligacionIndex, tagId] = await Promise.all([
    getCachedClientProjectIds(partnerId),
    getCachedObligacionTaskIndex(partnerId),
    tagName ? getCachedTramitesTagId(tagName) : Promise.resolve(null),
  ])

  if (!projectIds.length) {
    return 0
  }

  if (tagName && !tagId) {
    return 0
  }

  const excludedTaskIds = new Set(obligacionIndex.excludedTaskIds)
  const domain: unknown[] = [['project_id', 'in', projectIds]]
  if (tagId) {
    domain.push(['tag_ids', 'in', [tagId]])
  }

  const rows = await odooSearchRead<OdooTaskStateRow>('project.task', {
    domain,
    fields: ['id', 'state'],
    order: 'write_date desc, id desc',
    limit: TRAMITES_FETCH_LIMIT,
  })

  return rows.filter((row) => {
    if (excludedTaskIds.has(row.id)) return false
    const state =
      typeof row.state === 'string' && row.state ? row.state : undefined
    return !isTaskClosed(state)
  }).length
}
