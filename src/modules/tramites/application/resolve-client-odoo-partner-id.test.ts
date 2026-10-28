import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'

const { resolveDirectoryActorId, getCachedClientOdooPartnerId } = vi.hoisted(() => ({
  resolveDirectoryActorId: vi.fn(),
  getCachedClientOdooPartnerId: vi.fn(),
}))

vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({ resolveDirectoryActorId }))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  getCachedClientOdooPartnerId,
}))

import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

const user: PortalUser = { id: 'auth-1', email: 'a@b.es', name: 'A', role: 'client' }

beforeEach(() => {
  vi.resetAllMocks()
  resolveDirectoryActorId.mockResolvedValue('actor-1')
  getCachedClientOdooPartnerId.mockResolvedValue(77)
})

describe('resolveClientOdooPartnerId', () => {
  it('sin actor conocido lo resuelve y busca el partner con él', async () => {
    expect(await resolveClientOdooPartnerId(user)).toBe(77)

    expect(resolveDirectoryActorId).toHaveBeenCalledTimes(1)
    expect(getCachedClientOdooPartnerId).toHaveBeenCalledWith('actor-1')
  })

  it('con actor conocido no vuelve a resolverlo', async () => {
    expect(await resolveClientOdooPartnerId(user, 'actor-9')).toBe(77)

    expect(resolveDirectoryActorId).not.toHaveBeenCalled()
    expect(getCachedClientOdooPartnerId).toHaveBeenCalledWith('actor-9')
  })

  it('un cliente sin partner enlazado devuelve null', async () => {
    getCachedClientOdooPartnerId.mockResolvedValue(null)

    expect(await resolveClientOdooPartnerId(user, 'actor-9')).toBeNull()
  })
})
