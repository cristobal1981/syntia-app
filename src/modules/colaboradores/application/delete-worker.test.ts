import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { deleteWorkerForOwner } from '@/src/modules/colaboradores/application/delete-worker'

const { getWorkerGrant, deleteWorkerAccount, resolveDirectoryActorId } = vi.hoisted(() => ({
  getWorkerGrant: vi.fn(),
  deleteWorkerAccount: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
}))

vi.mock('@/src/modules/colaboradores/infrastructure/worker-grants.supabase', () => ({
  getWorkerGrant,
}))
vi.mock('@/src/modules/colaboradores/infrastructure/worker-repository.supabase', () => ({
  deleteWorkerAccount,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))

const clientA: PortalUser = { id: 'auth-a', email: 'a@example.com', name: 'Client A', role: 'client' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('deleteWorkerForOwner (IDOR guard)', () => {
  it('refuses a non-client actor outright', async () => {
    const worker: PortalUser = { id: 'w', email: 'w@example.com', name: 'W', role: 'worker' }

    const result = await deleteWorkerForOwner(worker, 'worker-1')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(deleteWorkerAccount).not.toHaveBeenCalled()
  })

  it("ATTACK: client A cannot delete client B's worker", async () => {
    resolveDirectoryActorId.mockResolvedValue('portal-client-a')
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'worker-of-b',
      owner_user_id: 'portal-client-b',
      allowed_sections: ['/tramites'],
      is_enabled: true,
    })

    const result = await deleteWorkerForOwner(clientA, 'worker-of-b')

    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(deleteWorkerAccount).not.toHaveBeenCalled()
  })

  it('allows a client to delete their own worker', async () => {
    resolveDirectoryActorId.mockResolvedValue('portal-client-a')
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'worker-of-a',
      owner_user_id: 'portal-client-a',
      allowed_sections: ['/tramites'],
      is_enabled: true,
    })

    const result = await deleteWorkerForOwner(clientA, 'worker-of-a')

    expect(result).toEqual({ ok: true })
    expect(deleteWorkerAccount).toHaveBeenCalledWith('worker-of-a')
  })
})
