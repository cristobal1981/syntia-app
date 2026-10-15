import type { ObligacionTaskIndexLeaf } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'

export type ObligacionNotificationLeaf = ObligacionTaskIndexLeaf & {
  attachmentCount: number
}

export type ObligacionNotificationSnapshot = {
  leaves: ObligacionNotificationLeaf[]
}
