import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { ObligacionesSnapshot } from '@/src/modules/obligaciones/domain/types'

const { resolveClientOdooPartnerId, isOdooApiConfigured, fetchObligacionesFromOdoo } = vi.hoisted(
  () => ({
    resolveClientOdooPartnerId: vi.fn(),
    isOdooApiConfigured: vi.fn(),
    fetchObligacionesFromOdoo: vi.fn(),
  })
)

vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/src/modules/portal/infrastructure/odoo-json-client')
  >('@/src/modules/portal/infrastructure/odoo-json-client')
  return { ...actual, isOdooApiConfigured }
})
vi.mock('@/src/modules/obligaciones/infrastructure/odoo-obligaciones-repository', () => ({
  fetchObligacionesFromOdoo,
}))

import { getObligacionesForClient } from '@/src/modules/obligaciones/application/get-obligaciones-for-client'

function userWithRole(role: PortalUser['role']): PortalUser {
  return { id: `u-${role}`, email: `${role}@example.com`, name: role, role }
}

const snapshot: ObligacionesSnapshot = { years: [] }

beforeEach(() => {
  vi.resetAllMocks()
  isOdooApiConfigured.mockReturnValue(true)
  resolveClientOdooPartnerId.mockResolvedValue(42)
  fetchObligacionesFromOdoo.mockResolvedValue(snapshot)
})

describe('getObligacionesForClient — authorization gate', () => {
  it.each(['client', 'worker'] as const)('allows role=%s through to the data fetch', async (role) => {
    const result = await getObligacionesForClient(userWithRole(role))
    expect(result).toEqual({ ok: true, data: snapshot })
  })

  it.each(['advisor', 'admin'] as const)(
    'SECURITY: rejects role=%s with "forbidden" BEFORE touching Odoo at all',
    async (role) => {
      const result = await getObligacionesForClient(userWithRole(role))
      expect(result).toEqual({ ok: false, error: 'forbidden' })
      expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
      expect(fetchObligacionesFromOdoo).not.toHaveBeenCalled()
    }
  )
})

describe('getObligacionesForClient — partner linking', () => {
  it('returns "not_linked" when the user has no Odoo partner id, without calling Odoo', async () => {
    resolveClientOdooPartnerId.mockResolvedValue(null)
    const result = await getObligacionesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'not_linked' })
    expect(fetchObligacionesFromOdoo).not.toHaveBeenCalled()
  })
})

describe('getObligacionesForClient — Odoo configuration/errors', () => {
  it('returns "odoo_unavailable" when the Odoo API is not configured, without calling fetchObligacionesFromOdoo', async () => {
    isOdooApiConfigured.mockReturnValue(false)
    const result = await getObligacionesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(fetchObligacionesFromOdoo).not.toHaveBeenCalled()
  })

  it('maps a thrown ODOO_NOT_CONFIGURED error to "odoo_unavailable"', async () => {
    fetchObligacionesFromOdoo.mockRejectedValue(new Error('ODOO_NOT_CONFIGURED'))
    const result = await getObligacionesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })

  it('any other thrown error is resolved via resolveOdooErrorCode (rate-limit message -> odoo_rate_limited)', async () => {
    fetchObligacionesFromOdoo.mockRejectedValue(new Error('ODOO_RATE_LIMITED'))
    const result = await getObligacionesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_rate_limited' })
  })

  it('a generic thrown error falls back to "odoo_unavailable"', async () => {
    fetchObligacionesFromOdoo.mockRejectedValue(new Error('something else entirely'))
    const result = await getObligacionesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })
})
