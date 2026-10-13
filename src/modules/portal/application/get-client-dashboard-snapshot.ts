import { isClientOrWorkerRole, type PortalUser } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import { maskStatsForWorker } from '@/src/modules/colaboradores/application/mask-dashboard-for-worker'
import { countPendingSignaturesForPartner } from '@/src/modules/firmas/infrastructure/count-pending-signatures-for-partner'
import {
  countObligacionesInProgressForPartner,
  nextObligacionForPartner,
  type NextObligacion,
} from '@/src/modules/obligaciones/infrastructure/count-obligaciones-in-progress-for-partner'
import { isOdooApiConfigured, resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { countActiveTramitesAndConsultasForPartner } from '@/src/modules/tramites/infrastructure/count-active-tramites-and-consultas-for-partner'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export type ClientDashboardSnapshot = {
  activeTramitesAndConsultas: number
  obligacionesInProgress: number
  pendingSignatures: number
  nextObligacion: NextObligacion | null
}

export type ClientDashboardSnapshotResult =
  | { ok: true; data: ClientDashboardSnapshot }
  | { ok: false; error: 'not_linked' | 'odoo_unavailable' | 'odoo_rate_limited' | 'forbidden' }

export async function getClientDashboardSnapshot(
  user: PortalUser
): Promise<ClientDashboardSnapshotResult> {
  if (!isClientOrWorkerRole(user.role)) {
    return { ok: false, error: 'forbidden' }
  }

  const partnerId = await resolveClientOdooPartnerId(user)
  if (!partnerId) {
    return { ok: false, error: 'not_linked' }
  }

  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  try {
    const [
      activeTramitesAndConsultas,
      obligacionesInProgress,
      pendingSignatures,
      nextObligacion,
    ] = await Promise.all([
      countActiveTramitesAndConsultasForPartner(partnerId),
      countObligacionesInProgressForPartner(partnerId),
      countPendingSignaturesForPartner(partnerId),
      nextObligacionForPartner(partnerId),
    ])

    const data = {
      activeTramitesAndConsultas,
      obligacionesInProgress,
      pendingSignatures,
      nextObligacion,
    }

    if (user.role === 'worker') {
      const allowedSections = await getAllowedSectionsForWorker(user)
      return { ok: true, data: maskStatsForWorker(data, allowedSections) }
    }

    return { ok: true, data }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
