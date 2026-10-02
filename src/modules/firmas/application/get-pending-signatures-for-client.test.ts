import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { PendingSignaturesSnapshot } from '@/src/modules/firmas/domain/types'

const { resolveClientOdooPartnerId, isOdooApiConfigured, getCachedPendingSignaturesSnapshot } =
  vi.hoisted(() => ({
    resolveClientOdooPartnerId: vi.fn(),
    isOdooApiConfigured: vi.fn(),
    getCachedPendingSignaturesSnapshot: vi.fn(),
  }))

vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/src/modules/portal/infrastructure/odoo-json-client')
  >('@/src/modules/portal/infrastructure/odoo-json-client')
  return { ...actual, isOdooApiConfigured }
})
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  getCachedPendingSignaturesSnapshot,
}))

import { getPendingSignaturesForClient } from '@/src/modules/firmas/application/get-pending-signatures-for-client'

function userWithRole(role: PortalUser['role']): PortalUser {
  return { id: `u-${role}`, email: `${role}@example.com`, name: role, role }
}

const snapshot: PendingSignaturesSnapshot = { requests: [] }

beforeEach(() => {
  vi.resetAllMocks()
  isOdooApiConfigured.mockReturnValue(true)
  resolveClientOdooPartnerId.mockResolvedValue(42)
  getCachedPendingSignaturesSnapshot.mockResolvedValue(snapshot)
})

describe('getPendingSignaturesForClient — authorization gate', () => {
  it.each(['client', 'worker'] as const)('allows role=%s through to the data fetch', async (role) => {
    const result = await getPendingSignaturesForClient(userWithRole(role))
    expect(result).toEqual({ ok: true, data: snapshot })
  })

  it.each(['advisor', 'admin'] as const)(
    'SECURITY: rejects role=%s with "forbidden" BEFORE touching Odoo at all',
    async (role) => {
      const result = await getPendingSignaturesForClient(userWithRole(role))
      expect(result).toEqual({ ok: false, error: 'forbidden' })
      expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
      expect(getCachedPendingSignaturesSnapshot).not.toHaveBeenCalled()
    }
  )
})

describe('getPendingSignaturesForClient — partner linking', () => {
  it('returns "not_linked" when the user has no Odoo partner id', async () => {
    resolveClientOdooPartnerId.mockResolvedValue(null)
    const result = await getPendingSignaturesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'not_linked' })
    expect(getCachedPendingSignaturesSnapshot).not.toHaveBeenCalled()
  })
})

describe('getPendingSignaturesForClient — Odoo configuration/errors', () => {
  it('returns "odoo_unavailable" when the Odoo API is not configured', async () => {
    isOdooApiConfigured.mockReturnValue(false)
    const result = await getPendingSignaturesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(getCachedPendingSignaturesSnapshot).not.toHaveBeenCalled()
  })

  // UNLIKE getObligacionesForClient/getTramitesForClient, this gate has no
  // explicit `error.message === 'ODOO_NOT_CONFIGURED'` special case in its
  // catch block — it relies entirely on resolveOdooErrorCode's fallback.
  // Pin that down so a future "harmonizing" refactor can't silently change
  // this gate's behavior without a test noticing.
  it('a thrown ODOO_NOT_CONFIGURED error still resolves to "odoo_unavailable", via the generic fallback (not a special case)', async () => {
    getCachedPendingSignaturesSnapshot.mockRejectedValue(new Error('ODOO_NOT_CONFIGURED'))
    const result = await getPendingSignaturesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })

  it('a rate-limit error is resolved via resolveOdooErrorCode to "odoo_rate_limited"', async () => {
    getCachedPendingSignaturesSnapshot.mockRejectedValue(new Error('ODOO_RATE_LIMITED'))
    const result = await getPendingSignaturesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_rate_limited' })
  })

  it('a generic thrown error falls back to "odoo_unavailable"', async () => {
    getCachedPendingSignaturesSnapshot.mockRejectedValue(new Error('something else'))
    const result = await getPendingSignaturesForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })
})
