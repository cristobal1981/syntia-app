import { getCachedTramitesSnapshot } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { mergeTramitesList } from '@/src/modules/tramites/domain/merge-tramites-list'

export async function countActiveTramitesAndConsultasForPartner(
  partnerId: number
): Promise<number> {
  const snapshot = await getCachedTramitesSnapshot(partnerId)
  const items = mergeTramitesList(snapshot.tasks, snapshot.tickets)
  return items.filter((item) => !item.isClosed).length
}
