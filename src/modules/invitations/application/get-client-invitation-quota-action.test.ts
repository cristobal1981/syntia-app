import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ getSession: vi.fn(), count: vi.fn() }))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession: m.getSession }))
vi.mock('@/src/modules/invitations/infrastructure/client-invitations.supabase', () => ({
  countInvitationsByInviter: m.count,
}))

import { getClientInvitationQuotaAction } from '@/src/modules/invitations/application/get-client-invitation-quota-action'
import { MAX_INVITATIONS_PER_CLIENT } from '@/src/modules/invitations/domain/invitation-rules'

const session = (role = 'client') => ({
  user: { id: 'u-1', email: 'yo@tena.es', name: 'Yo', role },
  expiresAt: Date.now() + 100000,
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  m.getSession.mockResolvedValue(session())
})

describe('getClientInvitationQuotaAction', () => {
  it('devuelve el máximo y lo que queda', async () => {
    m.count.mockResolvedValue(2)

    expect(await getClientInvitationQuotaAction()).toEqual({
      ok: true,
      max: MAX_INVITATIONS_PER_CLIENT,
      remaining: MAX_INVITATIONS_PER_CLIENT - 2,
    })
    expect(m.count).toHaveBeenCalledWith('u-1')
  })

  it('solo para clientes', async () => {
    m.getSession.mockResolvedValue(session('worker'))

    expect(await getClientInvitationQuotaAction()).toEqual({ ok: false, error: 'forbidden' })
    expect(m.count).not.toHaveBeenCalled()
  })

  it('un fallo de la base de datos es unavailable', async () => {
    m.count.mockRejectedValue(new Error('db down'))

    expect(await getClientInvitationQuotaAction()).toEqual({ ok: false, error: 'unavailable' })
  })
})
