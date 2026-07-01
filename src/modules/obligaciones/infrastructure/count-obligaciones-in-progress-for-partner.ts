import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'
import { getCachedObligacionTaskIndex } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

export async function countObligacionesInProgressForPartner(
  partnerId: number
): Promise<number> {
  const index = await getCachedObligacionTaskIndex(partnerId)

  return index.leaves.filter((leaf) => !isTaskClosed(leaf.state)).length
}
