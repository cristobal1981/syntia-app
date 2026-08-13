import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'
import { getCachedObligacionTaskIndex } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

export async function countObligacionesInProgressForPartner(
  partnerId: number
): Promise<number> {
  const index = await getCachedObligacionTaskIndex(partnerId)

  return index.leaves.filter((leaf) => !isTaskClosed(leaf.state)).length
}

export type NextObligacion = { name: string; deadline: string }

/** Obligación abierta con la fecha límite más próxima, o null si no hay ninguna con plazo. */
export async function nextObligacionForPartner(
  partnerId: number
): Promise<NextObligacion | null> {
  const index = await getCachedObligacionTaskIndex(partnerId)

  const withDeadline = index.leaves
    .filter(
      (leaf): leaf is typeof leaf & { deadline: string } =>
        !isTaskClosed(leaf.state) && Boolean(leaf.deadline)
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline))

  const next = withDeadline[0]
  return next ? { name: next.name, deadline: next.deadline } : null
}
