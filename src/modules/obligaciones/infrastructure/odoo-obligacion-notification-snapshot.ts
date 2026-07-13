import type { ObligacionTaskIndexLeaf } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'
import { buildObligacionTaskIndex } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'
import { countAttachmentsByRecordIds } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import { fetchClientProjectIds } from '@/src/modules/portal/infrastructure/odoo-client-projects'

export type ObligacionNotificationLeaf = ObligacionTaskIndexLeaf & {
  attachmentCount: number
}

export type ObligacionNotificationSnapshot = {
  leaves: ObligacionNotificationLeaf[]
}

export async function buildObligacionNotificationSnapshot(
  partnerId: number
): Promise<ObligacionNotificationSnapshot> {
  const projectIds = await fetchClientProjectIds(partnerId)
  const index = await buildObligacionTaskIndex(projectIds)
  const leafIds = index.leaves.map((leaf) => leaf.id)

  if (!leafIds.length) {
    return { leaves: [] }
  }

  const attachmentCounts = await countAttachmentsByRecordIds(
    'project.task',
    leafIds
  )

  return {
    leaves: index.leaves.map((leaf) => ({
      ...leaf,
      attachmentCount: attachmentCounts.get(leaf.id) ?? 0,
    })),
  }
}
