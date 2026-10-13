import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalRole, PortalUser } from '@/src/modules/auth/domain/types'
import { getClientDashboardSnapshot } from '@/src/modules/portal/application/get-client-dashboard-snapshot'

const {
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  countActiveTramitesAndConsultasForPartner,
  countObligacionesInProgressForPartner,
  countPendingSignaturesForPartner,
  nextObligacionForPartner,
  getAllowedSectionsForWorker,
} = vi.hoisted(() => ({
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  countActiveTramitesAndConsultasForPartner: vi.fn(),
  countObligacionesInProgressForPartner: vi.fn(),
  countPendingSignaturesForPartner: vi.fn(),
  nextObligacionForPartner: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
}))

vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
  resolveOdooErrorCode: (error: unknown) =>
    error instanceof Error && error.message === 'RATE_LIMITED'
      ? 'odoo_rate_limited'
      : 'odoo_unavailable',
}))
vi.mock(
  '@/src/modules/tramites/infrastructure/count-active-tramites-and-consultas-for-partner',
  () => ({ countActiveTramitesAndConsultasForPartner })
)
vi.mock(
  '@/src/modules/obligaciones/infrastructure/count-obligaciones-in-progress-for-partner',
  () => ({ countObligacionesInProgressForPartner, nextObligacionForPartner })
)
vi.mock('@/src/modules/firmas/infrastructure/count-pending-signatures-for-partner', () => ({
  countPendingSignaturesForPartner,
}))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))

function userFor(role: PortalRole): PortalUser {
  return { id: `u-${role}`, email: `${role}@example.com`, name: role, role }
}

beforeEach(() => {
  vi.resetAllMocks()
  resolveClientOdooPartnerId.mockResolvedValue(123)
  isOdooApiConfigured.mockReturnValue(true)
  countActiveTramitesAndConsultasForPartner.mockResolvedValue(1)
  countObligacionesInProgressForPartner.mockResolvedValue(2)
  countPendingSignaturesForPartner.mockResolvedValue(3)
  nextObligacionForPartner.mockResolvedValue(null)
  getAllowedSectionsForWorker.mockResolvedValue(new Set())
})

describe('getClientDashboardSnapshot', () => {
  it('rejects admin/advisor roles before resolving any Odoo partner id', async () => {
    for (const role of ['admin', 'advisor'] as const) {
      const result = await getClientDashboardSnapshot(userFor(role))
      expect(result).toEqual({ ok: false, error: 'forbidden' })
    }
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
  })

  it('returns not_linked when the user has no Odoo partner id, without checking Odoo config', async () => {
    resolveClientOdooPartnerId.mockResolvedValue(null)

    const result = await getClientDashboardSnapshot(userFor('client'))

    expect(result).toEqual({ ok: false, error: 'not_linked' })
    expect(isOdooApiConfigured).not.toHaveBeenCalled()
  })

  it('returns odoo_unavailable when the Odoo API is not configured, without hitting any counters', async () => {
    isOdooApiConfigured.mockReturnValue(false)

    const result = await getClientDashboardSnapshot(userFor('client'))

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(countActiveTramitesAndConsultasForPartner).not.toHaveBeenCalled()
  })

  it('maps the four counters to their matching fields for a client, unmasked', async () => {
    countActiveTramitesAndConsultasForPartner.mockResolvedValue(5)
    countObligacionesInProgressForPartner.mockResolvedValue(7)
    countPendingSignaturesForPartner.mockResolvedValue(9)
    nextObligacionForPartner.mockResolvedValue({ name: 'IVA', deadline: '2026-11-20' })

    const result = await getClientDashboardSnapshot(userFor('client'))

    expect(result).toEqual({
      ok: true,
      data: {
        activeTramitesAndConsultas: 5,
        obligacionesInProgress: 7,
        pendingSignatures: 9,
        nextObligacion: { name: 'IVA', deadline: '2026-11-20' },
      },
    })
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })

  it('masks stats for a worker based on their allowed sections', async () => {
    countActiveTramitesAndConsultasForPartner.mockResolvedValue(5)
    countObligacionesInProgressForPartner.mockResolvedValue(7)
    countPendingSignaturesForPartner.mockResolvedValue(9)
    nextObligacionForPartner.mockResolvedValue({ name: 'IVA', deadline: '2026-11-20' })
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))

    const result = await getClientDashboardSnapshot(userFor('worker'))

    expect(result).toEqual({
      ok: true,
      data: {
        activeTramitesAndConsultas: 5,
        obligacionesInProgress: 0,
        pendingSignatures: 0,
        nextObligacion: null,
      },
    })
  })

  it('maps a generic Odoo failure to odoo_unavailable', async () => {
    countActiveTramitesAndConsultasForPartner.mockRejectedValue(new Error('boom'))

    const result = await getClientDashboardSnapshot(userFor('client'))

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })

  it('maps a rate-limited Odoo failure to odoo_rate_limited', async () => {
    countActiveTramitesAndConsultasForPartner.mockRejectedValue(new Error('RATE_LIMITED'))

    const result = await getClientDashboardSnapshot(userFor('client'))

    expect(result).toEqual({ ok: false, error: 'odoo_rate_limited' })
  })
})
