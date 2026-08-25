import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { listWorkersForOwner } from '@/src/modules/colaboradores/application/list-workers'

const { createSupabaseAdminClient, resolveDirectoryActorId, listWorkerGrantsForOwner } =
  vi.hoisted(() => ({
    createSupabaseAdminClient: vi.fn(),
    resolveDirectoryActorId: vi.fn(),
    listWorkerGrantsForOwner: vi.fn(),
  }))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))
vi.mock('@/src/modules/colaboradores/infrastructure/worker-grants.supabase', () => ({
  listWorkerGrantsForOwner,
}))

const owner: PortalUser = { id: 'auth-owner', email: 'owner@x.com', name: 'Owner', role: 'client' }

function grant(overrides: Record<string, unknown> = {}) {
  return {
    worker_user_id: 'w1',
    owner_user_id: 'portal-owner',
    allowed_sections: ['/tramites'],
    is_enabled: true,
    ...overrides,
  }
}

function workerUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w1',
    email: 'w1@x.com',
    role: 'worker',
    status: 'active',
    is_active: true,
    odoo_user_id: null,
    ...overrides,
  }
}

function workerProfile(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    first_name: 'Worker',
    first_surname: 'One',
    second_surname: '',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  resolveDirectoryActorId.mockResolvedValue('portal-owner')
})

describe('listWorkersForOwner', () => {
  it('returns [] immediately, without touching Supabase at all, when the owner has no grants', async () => {
    listWorkerGrantsForOwner.mockResolvedValue([])

    const result = await listWorkersForOwner(owner)

    expect(result).toEqual([])
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('queries users/profiles scoped to exactly the worker ids from this owner\'s grants', async () => {
    listWorkerGrantsForOwner.mockResolvedValue([grant({ worker_user_id: 'w1' })])
    const usersIn = vi.fn().mockResolvedValue({ data: [workerUser()], error: null })
    const profilesIn = vi.fn().mockResolvedValue({ data: [workerProfile('w1')], error: null })
    createSupabaseAdminClient.mockReturnValue({
      from: (table: string) => ({
        select: () => ({ in: table === 'users' ? usersIn : profilesIn }),
      }),
    })

    await listWorkersForOwner(owner)

    expect(usersIn).toHaveBeenCalledWith('id', ['w1'])
    expect(profilesIn).toHaveBeenCalledWith('user_id', ['w1'])
  })

  it('silently drops a grant whose worker_user_id has no matching users row (orphaned grant)', async () => {
    listWorkerGrantsForOwner.mockResolvedValue([grant({ worker_user_id: 'orphan' })])
    createSupabaseAdminClient.mockReturnValue({
      from: () => ({ select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) }),
    })

    const result = await listWorkersForOwner(owner)

    expect(result).toEqual([])
  })

  it('carries the grant\'s is_enabled and allowedSections through to the WorkerRecord', async () => {
    listWorkerGrantsForOwner.mockResolvedValue([
      grant({ worker_user_id: 'w1', is_enabled: false, allowed_sections: ['/documentos'] }),
    ])
    createSupabaseAdminClient.mockReturnValue({
      from: (table: string) => ({
        select: () => ({
          in: () =>
            Promise.resolve({
              data: table === 'users' ? [workerUser()] : [workerProfile('w1')],
              error: null,
            }),
        }),
      }),
    })

    const [result] = await listWorkersForOwner(owner)

    expect(result.isEnabled).toBe(false)
    expect(result.allowedSections).toEqual(['/documentos'])
  })

  it('sorts the resulting list alphabetically by name', async () => {
    listWorkerGrantsForOwner.mockResolvedValue([
      grant({ worker_user_id: 'w-zeta' }),
      grant({ worker_user_id: 'w-alpha' }),
    ])
    createSupabaseAdminClient.mockReturnValue({
      from: (table: string) => ({
        select: () => ({
          in: () =>
            Promise.resolve({
              data:
                table === 'users'
                  ? [workerUser({ id: 'w-zeta' }), workerUser({ id: 'w-alpha' })]
                  : [
                      workerProfile('w-zeta', { first_name: 'Zeta' }),
                      workerProfile('w-alpha', { first_name: 'Alpha' }),
                    ],
              error: null,
            }),
        }),
      }),
    })

    const result = await listWorkersForOwner(owner)

    expect(result.map((w) => w.id)).toEqual(['w-alpha', 'w-zeta'])
  })

  it('throws on a users-table DB error', async () => {
    listWorkerGrantsForOwner.mockResolvedValue([grant()])
    createSupabaseAdminClient.mockReturnValue({
      from: (table: string) => ({
        select: () => ({
          in: () =>
            Promise.resolve(
              table === 'users'
                ? { data: null, error: { message: 'boom' } }
                : { data: [], error: null }
            ),
        }),
      }),
    })

    await expect(listWorkersForOwner(owner)).rejects.toThrow('boom')
  })
})
