import type { PortalUser } from '@/src/modules/auth/domain/types'
import { countObligacionesInProgressForPartner } from '@/src/modules/obligaciones/infrastructure/count-obligaciones-in-progress-for-partner'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { countActiveTramitesForPartner } from '@/src/modules/tramites/infrastructure/count-active-tramites-for-partner'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export type ClientDashboardSnapshot = {
  activeTramites: number
  obligacionesInProgress: number
}

export type ClientDashboardSnapshotResult =
  | { ok: true; data: ClientDashboardSnapshot }
  | { ok: false; error: 'not_linked' | 'odoo_unavailable' | 'forbidden' }

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
    const [activeTramites, obligacionesInProgress] = await Promise.all([
      countActiveTramitesForPartner(partnerId),
      countObligacionesInProgressForPartner(partnerId),
    ])

    return {
      ok: true,
      data: {
        activeTramites,
        obligacionesInProgress,
      },
    }
  } catch {
    return { ok: false, error: 'odoo_unavailable' }
  }
}
