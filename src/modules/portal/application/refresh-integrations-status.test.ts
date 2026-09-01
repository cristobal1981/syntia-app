import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { refreshIntegrationsStatusAction } from '@/src/modules/portal/application/refresh-integrations-status'

const { getSession, getIntegrationsStatusForRole } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getIntegrationsStatusForRole: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/portal/application/get-integrations-status', () => ({
  getIntegrationsStatusForRole,
}))

function sessionFor(role: 'admin' | 'advisor' | 'client' | 'worker'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('refreshIntegrationsStatusAction', () => {
  it('returns unauthorized with no session', async () => {
    getSession.mockResolvedValue(null)

    const result = await refreshIntegrationsStatusAction()

    expect(result).toEqual({ ok: false, error: 'unauthorized' })
    expect(getIntegrationsStatusForRole).not.toHaveBeenCalled()
  })

  it.each(['client', 'worker'] as const)(
    'returns unauthorized for role=%s even WITH a valid session — this action is staff-only',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role))

      const result = await refreshIntegrationsStatusAction()

      expect(result).toEqual({ ok: false, error: 'unauthorized' })
      expect(getIntegrationsStatusForRole).not.toHaveBeenCalled()
    }
  )

  it.each(['admin', 'advisor'] as const)(
    'returns ok:true with the integrations for role=%s',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role))
      getIntegrationsStatusForRole.mockResolvedValue([
        { id: 'odoo', name: 'Odoo', status: 'connected', liveCheck: true },
      ])

      const result = await refreshIntegrationsStatusAction()

      expect(getIntegrationsStatusForRole).toHaveBeenCalledWith(role)
      expect(result).toEqual({
        ok: true,
        integrations: [{ id: 'odoo', name: 'Odoo', status: 'connected', liveCheck: true }],
      })
    }
  )
})
