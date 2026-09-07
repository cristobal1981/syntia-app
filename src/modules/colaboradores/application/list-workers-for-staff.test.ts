import { describe, expect, it, vi, beforeEach } from 'vitest'

import { listWorkersForStaff } from '@/src/modules/colaboradores/application/list-workers-for-staff'

const {
  createSupabaseAdminClient,
  listAllWorkerGrants,
  listWorkerGrantsForOwners,
  buildDirectoryScope,
  listClients,
} = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  listAllWorkerGrants: vi.fn(),
  listWorkerGrantsForOwners: vi.fn(),
  buildDirectoryScope: vi.fn(),
  listClients: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))
vi.mock('@/src/modules/colaboradores/infrastructure/worker-grants.supabase', () => ({
  listAllWorkerGrants,
  listWorkerGrantsForOwners,
}))
vi.mock('@/src/modules/directory/application/directory-queries', () => ({
  buildDirectoryScope,
}))
vi.mock('@/src/modules/directory/infrastructure/get-directory-repository', () => ({
  getDirectoryRepository: () => ({ listClients }),
}))

function grant(overrides: Record<string, unknown> = {}) {
  return {
    worker_user_id: 'w1',
    owner_user_id: 'owner1',
    allowed_sections: { '/tramites': 'write' },
    is_enabled: true,
    ...overrides,
  }
}

function userRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    email: `${id}@example.com`,
    role: 'client',
    status: 'active',
    is_active: true,
    odoo_user_id: null,
    ...overrides,
  }
}

function personProfile(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    first_name: 'Nombre',
    first_surname: 'Apellido',
    second_surname: '',
    company_name: null,
    ...overrides,
  }
}

function companyProfile(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    first_name: '',
    first_surname: '',
    second_surname: '',
    company_name: 'Empresa SL',
    ...overrides,
  }
}

function mockSupabase(users: unknown[], profiles: unknown[]) {
  createSupabaseAdminClient.mockReturnValue({
    from: (table: string) => ({
      select: () => ({
        in: () =>
          Promise.resolve({
            data: table === 'users' ? users : profiles,
            error: null,
          }),
      }),
    }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listWorkersForStaff — access control', () => {
  it.each(['client', 'worker'] as const)(
    'throws "forbidden" for role=%s without touching either grants source',
    async (role) => {
      buildDirectoryScope.mockResolvedValue({ role, userId: 'u1' })

      await expect(listWorkersForStaff()).rejects.toThrow('forbidden')
      expect(listAllWorkerGrants).not.toHaveBeenCalled()
      expect(listWorkerGrantsForOwners).not.toHaveBeenCalled()
    }
  )
})

describe('listWorkersForStaff — admin scope', () => {
  it('uses listAllWorkerGrants (unscoped) and never calls listClients', async () => {
    buildDirectoryScope.mockResolvedValue({ role: 'admin', userId: 'admin-1' })
    listAllWorkerGrants.mockResolvedValue([])

    const result = await listWorkersForStaff()

    expect(result).toEqual([])
    expect(listAllWorkerGrants).toHaveBeenCalledTimes(1)
    expect(listClients).not.toHaveBeenCalled()
    expect(listWorkerGrantsForOwners).not.toHaveBeenCalled()
  })
})

describe('listWorkersForStaff — advisor scope', () => {
  it('scopes grants to the owners returned by listClients(scope), NOT all workers', async () => {
    buildDirectoryScope.mockResolvedValue({ role: 'advisor', userId: 'advisor-1' })
    listClients.mockResolvedValue([{ id: 'owner1' }, { id: 'owner2' }])
    listWorkerGrantsForOwners.mockResolvedValue([])

    await listWorkersForStaff()

    expect(listClients).toHaveBeenCalledWith({ role: 'advisor', userId: 'advisor-1' })
    expect(listWorkerGrantsForOwners).toHaveBeenCalledWith(['owner1', 'owner2'])
    expect(listAllWorkerGrants).not.toHaveBeenCalled()
  })

  it("never leaks a worker whose owner isn't in the advisor's own client list", async () => {
    buildDirectoryScope.mockResolvedValue({ role: 'advisor', userId: 'advisor-1' })
    listClients.mockResolvedValue([{ id: 'owner1' }])
    // El repositorio scoped ya filtra por owner — simulamos que el asesor
    // solo tiene grants de su propio cliente.
    listWorkerGrantsForOwners.mockResolvedValue([
      grant({ worker_user_id: 'w1', owner_user_id: 'owner1' }),
    ])
    mockSupabase(
      [userRow('w1'), userRow('owner1')],
      [personProfile('w1'), personProfile('owner1')]
    )

    const result = await listWorkersForStaff()

    expect(result).toHaveLength(1)
    expect(result[0].ownerId).toBe('owner1')
  })
})

describe('listWorkersForStaff — mapping (shared by both scopes)', () => {
  beforeEach(() => {
    buildDirectoryScope.mockResolvedValue({ role: 'admin', userId: 'admin-1' })
  })

  it('returns [] immediately, without touching Supabase at all, when there are no grants', async () => {
    listAllWorkerGrants.mockResolvedValue([])

    const result = await listWorkersForStaff()

    expect(result).toEqual([])
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('queries users/profiles scoped to the union of worker AND owner ids', async () => {
    listAllWorkerGrants.mockResolvedValue([
      grant({ worker_user_id: 'w1', owner_user_id: 'owner1' }),
    ])
    const usersIn = vi.fn().mockResolvedValue({
      data: [userRow('w1'), userRow('owner1')],
      error: null,
    })
    const profilesIn = vi.fn().mockResolvedValue({
      data: [personProfile('w1'), personProfile('owner1')],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({
      from: (table: string) => ({
        select: () => ({ in: table === 'users' ? usersIn : profilesIn }),
      }),
    })

    await listWorkersForStaff()

    expect(usersIn).toHaveBeenCalledWith('id', expect.arrayContaining(['w1', 'owner1']))
    expect(profilesIn).toHaveBeenCalledWith(
      'user_id',
      expect.arrayContaining(['w1', 'owner1'])
    )
  })

  it('drops a grant when the worker user row is missing', async () => {
    listAllWorkerGrants.mockResolvedValue([
      grant({ worker_user_id: 'ghost', owner_user_id: 'owner1' }),
    ])
    mockSupabase([userRow('owner1')], [personProfile('owner1')])

    const result = await listWorkersForStaff()

    expect(result).toEqual([])
  })

  it('drops a grant when the owner user row is missing', async () => {
    listAllWorkerGrants.mockResolvedValue([
      grant({ worker_user_id: 'w1', owner_user_id: 'ghost' }),
    ])
    mockSupabase([userRow('w1')], [personProfile('w1')])

    const result = await listWorkersForStaff()

    expect(result).toEqual([])
  })

  it('resolves the owner name from the person profile fields', async () => {
    listAllWorkerGrants.mockResolvedValue([
      grant({ worker_user_id: 'w1', owner_user_id: 'owner1' }),
    ])
    mockSupabase(
      [userRow('w1'), userRow('owner1')],
      [
        personProfile('w1', { first_name: 'Ana', first_surname: 'García' }),
        personProfile('owner1', { first_name: 'Carlos', first_surname: 'Ruiz' }),
      ]
    )

    const [result] = await listWorkersForStaff()

    expect(result.name).toBe('Ana García')
    expect(result.ownerName).toBe('Carlos Ruiz')
    expect(result.ownerId).toBe('owner1')
    expect(result.ownerEmail).toBe('owner1@example.com')
  })

  it('resolves the owner name from company_name when the owner profile is a company', async () => {
    listAllWorkerGrants.mockResolvedValue([
      grant({ worker_user_id: 'w1', owner_user_id: 'owner1' }),
    ])
    mockSupabase(
      [userRow('w1'), userRow('owner1')],
      [personProfile('w1'), companyProfile('owner1')]
    )

    const [result] = await listWorkersForStaff()

    expect(result.ownerName).toBe('Empresa SL')
  })

  it("carries the grant's is_enabled and allowedSections through", async () => {
    listAllWorkerGrants.mockResolvedValue([
      grant({
        worker_user_id: 'w1',
        owner_user_id: 'owner1',
        is_enabled: false,
        allowed_sections: { '/documentos': 'read' },
      }),
    ])
    mockSupabase(
      [userRow('w1'), userRow('owner1')],
      [personProfile('w1'), personProfile('owner1')]
    )

    const [result] = await listWorkersForStaff()

    expect(result.isEnabled).toBe(false)
    expect(result.allowedSections).toEqual({ '/documentos': 'read' })
  })

  it('sorts by owner name first, then by worker name', async () => {
    listAllWorkerGrants.mockResolvedValue([
      grant({ worker_user_id: 'w1', owner_user_id: 'owner-zeta' }),
      grant({ worker_user_id: 'w2', owner_user_id: 'owner-alpha' }),
    ])
    mockSupabase(
      [userRow('w1'), userRow('w2'), userRow('owner-zeta'), userRow('owner-alpha')],
      [
        personProfile('w1', { first_name: 'Worker', first_surname: 'One' }),
        personProfile('w2', { first_name: 'Worker', first_surname: 'Two' }),
        personProfile('owner-zeta', { first_name: 'Zeta', first_surname: 'Owner' }),
        personProfile('owner-alpha', { first_name: 'Alpha', first_surname: 'Owner' }),
      ]
    )

    const result = await listWorkersForStaff()

    expect(result.map((w) => w.ownerId)).toEqual(['owner-alpha', 'owner-zeta'])
  })

  it('throws on a users-table DB error', async () => {
    listAllWorkerGrants.mockResolvedValue([grant()])
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

    await expect(listWorkersForStaff()).rejects.toThrow('boom')
  })
})
