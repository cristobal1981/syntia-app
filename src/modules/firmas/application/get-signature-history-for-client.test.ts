import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { SignatureHistorySnapshot } from '@/src/modules/firmas/domain/types'

const { resolveClientOdooPartnerId, isOdooApiConfigured, getCachedSignatureHistorySnapshot } =
  vi.hoisted(() => ({
    resolveClientOdooPartnerId: vi.fn(),
    isOdooApiConfigured: vi.fn(),
    getCachedSignatureHistorySnapshot: vi.fn(),
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
  getCachedSignatureHistorySnapshot,
}))

import { getSignatureHistoryForClient } from '@/src/modules/firmas/application/get-signature-history-for-client'

function userWithRole(role: PortalUser['role']): PortalUser {
  return { id: `u-${role}`, email: `${role}@example.com`, name: role, role }
}

const snapshot: SignatureHistorySnapshot = { requests: [] }

beforeEach(() => {
  vi.resetAllMocks()
  isOdooApiConfigured.mockReturnValue(true)
  resolveClientOdooPartnerId.mockResolvedValue(42)
  getCachedSignatureHistorySnapshot.mockResolvedValue(snapshot)
})

describe('getSignatureHistoryForClient — authorization gate', () => {
  it.each(['client', 'worker'] as const)('allows role=%s through to the data fetch', async (role) => {
    const result = await getSignatureHistoryForClient(userWithRole(role))
    expect(result).toEqual({ ok: true, data: snapshot })
  })

  it.each(['advisor', 'admin'] as const)(
    'SECURITY: rejects role=%s with "forbidden" BEFORE touching Odoo at all',
    async (role) => {
      const result = await getSignatureHistoryForClient(userWithRole(role))
      expect(result).toEqual({ ok: false, error: 'forbidden' })
      expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
      expect(getCachedSignatureHistorySnapshot).not.toHaveBeenCalled()
    }
  )
})

describe('getSignatureHistoryForClient — partner linking', () => {
  it('returns "not_linked" when the user has no Odoo partner id', async () => {
    resolveClientOdooPartnerId.mockResolvedValue(null)
    const result = await getSignatureHistoryForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'not_linked' })
    expect(getCachedSignatureHistorySnapshot).not.toHaveBeenCalled()
  })
})

describe('getSignatureHistoryForClient — Odoo configuration/errors', () => {
  it('returns "odoo_unavailable" when the Odoo API is not configured', async () => {
    isOdooApiConfigured.mockReturnValue(false)
    const result = await getSignatureHistoryForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(getCachedSignatureHistorySnapshot).not.toHaveBeenCalled()
  })

  it('a rate-limit error is resolved via resolveOdooErrorCode to "odoo_rate_limited"', async () => {
    getCachedSignatureHistorySnapshot.mockRejectedValue(new Error('ODOO_RATE_LIMITED'))
    const result = await getSignatureHistoryForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_rate_limited' })
  })

  it('a generic thrown error falls back to "odoo_unavailable"', async () => {
    getCachedSignatureHistorySnapshot.mockRejectedValue(new Error('something else'))
    const result = await getSignatureHistoryForClient(userWithRole('client'))
    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })
})
