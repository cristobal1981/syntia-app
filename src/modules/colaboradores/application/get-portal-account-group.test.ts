import { describe, expect, it, vi, beforeEach } from 'vitest'

import { resolvePortalAccountGroup } from '@/src/modules/colaboradores/application/get-portal-account-group'

const { getWorkerGrant, listWorkerGrantsForOwner } = vi.hoisted(() => ({
  getWorkerGrant: vi.fn(),
  listWorkerGrantsForOwner: vi.fn(),
}))

vi.mock('@/src/modules/colaboradores/infrastructure/worker-grants.supabase', () => ({
  getWorkerGrant,
  listWorkerGrantsForOwner,
}))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('resolvePortalAccountGroup', () => {
  it('returns just [actorId] when the actor is neither an owner nor a worker', async () => {
    getWorkerGrant.mockResolvedValue(null)
    listWorkerGrantsForOwner.mockResolvedValue([])

    expect(await resolvePortalAccountGroup('solo-1')).toEqual(['solo-1'])
    expect(listWorkerGrantsForOwner).toHaveBeenCalledWith('solo-1')
  })

  it('when called with the titular id, returns the titular plus every one of their workers', async () => {
    getWorkerGrant.mockResolvedValue(null)
    listWorkerGrantsForOwner.mockResolvedValue([
      { worker_user_id: 'worker-1', owner_user_id: 'owner-1' },
      { worker_user_id: 'worker-2', owner_user_id: 'owner-1' },
    ])

    const group = await resolvePortalAccountGroup('owner-1')

    expect(group.sort()).toEqual(['owner-1', 'worker-1', 'worker-2'].sort())
  })

  it('when called with a WORKER id, resolves through the owner and returns the whole family, including the worker itself', async () => {
    getWorkerGrant.mockResolvedValue({ worker_user_id: 'worker-1', owner_user_id: 'owner-1' })
    listWorkerGrantsForOwner.mockResolvedValue([
      { worker_user_id: 'worker-1', owner_user_id: 'owner-1' },
      { worker_user_id: 'worker-2', owner_user_id: 'owner-1' },
    ])

    const group = await resolvePortalAccountGroup('worker-1')

    expect(listWorkerGrantsForOwner).toHaveBeenCalledWith('owner-1')
    expect(group.sort()).toEqual(['owner-1', 'worker-1', 'worker-2'].sort())
  })

  it('never returns duplicate ids', async () => {
    getWorkerGrant.mockResolvedValue({ worker_user_id: 'worker-1', owner_user_id: 'owner-1' })
    listWorkerGrantsForOwner.mockResolvedValue([
      { worker_user_id: 'worker-1', owner_user_id: 'owner-1' },
    ])

    const group = await resolvePortalAccountGroup('worker-1')

    expect(group).toHaveLength(2)
    expect(new Set(group).size).toBe(2)
  })
})
