import type { PortalUser } from '@/src/modules/auth/domain/types'
import { countPendingSignaturesForPartner } from '@/src/modules/firmas/infrastructure/count-pending-signatures-for-partner'
import { countObligacionesInProgressForPartner } from '@/src/modules/obligaciones/infrastructure/count-obligaciones-in-progress-for-partner'
import { isOdooApiConfigured, resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { countActiveTramitesAndConsultasForPartner } from '@/src/modules/tramites/infrastructure/count-active-tramites-and-consultas-for-partner'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export type ClientDashboardSnapshot = {
  activeTramitesAndConsultas: number
  obligacionesInProgress: number
  pendingSignatures: number
}

export type ClientDashboardSnapshotResult =
  | { ok: true; data: ClientDashboardSnapshot }
  | { ok: false; error: 'not_linked' | 'odoo_unavailable' | 'odoo_rate_limited' | 'forbidden' }

export async function getClientDashboardSnapshot(
  user: PortalUser
): Promise<ClientDashboardSnapshotResult> {
  if (user.role !== 'client') {
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
    const [activeTramitesAndConsultas, obligacionesInProgress, pendingSignatures] =
      await Promise.all([
        countActiveTramitesAndConsultasForPartner(partnerId),
        countObligacionesInProgressForPartner(partnerId),
        countPendingSignaturesForPartner(partnerId),
      ])

    return {
      ok: true,
      data: {
        activeTramitesAndConsultas,
        obligacionesInProgress,
        pendingSignatures,
      },
    }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
