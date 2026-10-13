import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import {
  buildDirectoryScope,
  countClientsByAdvisorAction,
  listAdvisorOptionsAction,
  listClientsAction,
  listClientsPageAction,
  listGestoresAction,
  listGestoresPageAction,
  requireDirectorySession,
} from '@/src/modules/directory/application/directory-queries'

const {
  getSession,
  resolveDirectoryActorId,
  listGestores,
  listClients,
  listAdvisorOptions,
  listClientsPage,
  listGestoresPage,
  countClientsByAdvisor,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  listGestores: vi.fn(),
  listClients: vi.fn(),
  listAdvisorOptions: vi.fn(),
  listClientsPage: vi.fn(),
  listGestoresPage: vi.fn(),
  countClientsByAdvisor: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))
vi.mock('@/src/modules/directory/infrastructure/get-directory-repository', () => ({
  getDirectoryRepository: () => ({
    listGestores,
    listClients,
    listAdvisorOptions,
    listClientsPage,
    listGestoresPage,
    countClientsByAdvisor,
  }),
}))

function sessionFor(role: 'admin' | 'advisor' | 'client' | 'worker'): PortalSession {
  return {
    user: { id: `auth-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('requireDirectorySession', () => {
  it('throws "unauthorized" when there is no session', async () => {
    getSession.mockResolvedValue(null)

    await expect(requireDirectorySession()).rejects.toThrow('unauthorized')
  })

  it('returns the session as-is when one exists', async () => {
    const session = sessionFor('admin')
    getSession.mockResolvedValue(session)

    await expect(requireDirectorySession()).resolves.toBe(session)
  })
})

describe('buildDirectoryScope', () => {
  it('resolves userId via resolveDirectoryActorId — NOT the raw auth session id', async () => {
    const session = sessionFor('advisor')
    getSession.mockResolvedValue(session)
    resolveDirectoryActorId.mockResolvedValue('resolved-portal-id')

    const scope = await buildDirectoryScope()

    expect(resolveDirectoryActorId).toHaveBeenCalledWith(session.user)
    expect(scope).toEqual({ role: 'advisor', userId: 'resolved-portal-id' })
    expect(scope.userId).not.toBe(session.user.id)
  })

  it('propagates "unauthorized" when there is no session', async () => {
    getSession.mockResolvedValue(null)

    await expect(buildDirectoryScope()).rejects.toThrow('unauthorized')
    expect(resolveDirectoryActorId).not.toHaveBeenCalled()
  })
})

describe('listGestoresAction (admin-only, THROWS for non-admin)', () => {
  it.each(['advisor', 'client', 'worker'] as const)(
    'throws "forbidden" for role=%s',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role))

      await expect(listGestoresAction()).rejects.toThrow('forbidden')
      expect(listGestores).not.toHaveBeenCalled()
    }
  )

  it('returns the repository result for an admin', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listGestores.mockResolvedValue([{ id: 'g-1' }])

    await expect(listGestoresAction()).resolves.toEqual([{ id: 'g-1' }])
  })
})

describe('listClientsAction (blocks only role="client")', () => {
  it('throws "forbidden" for role=client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    resolveDirectoryActorId.mockResolvedValue('portal-client-1')

    await expect(listClientsAction()).rejects.toThrow('forbidden')
    expect(listClients).not.toHaveBeenCalled()
  })

  it.each(['admin', 'advisor'] as const)(
    'calls the repository with the resolved scope for role=%s',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role))
      resolveDirectoryActorId.mockResolvedValue(`portal-${role}-1`)
      listClients.mockResolvedValue([{ id: 'c-1' }])

      const result = await listClientsAction()

      expect(listClients).toHaveBeenCalledWith({ role, userId: `portal-${role}-1` })
      expect(result).toEqual([{ id: 'c-1' }])
    }
  )
})

describe('listAdvisorOptionsAction (admin-only, RETURNS [] for non-admin — does NOT throw)', () => {
  it.each(['advisor', 'client', 'worker'] as const)(
    'returns [] for role=%s instead of throwing',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role))

      await expect(listAdvisorOptionsAction()).resolves.toEqual([])
      expect(listAdvisorOptions).not.toHaveBeenCalled()
    }
  )

  it('returns the repository result for an admin', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listAdvisorOptions.mockResolvedValue([{ id: 'a-1', name: 'Ana' }])

    await expect(listAdvisorOptionsAction()).resolves.toEqual([{ id: 'a-1', name: 'Ana' }])
  })
})

describe('listClientsPageAction (blocks only role="client")', () => {
  it('throws "forbidden" for role=client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    resolveDirectoryActorId.mockResolvedValue('portal-client-1')

    await expect(listClientsPageAction({ page: 1, pageSize: 25 })).rejects.toThrow('forbidden')
    expect(listClientsPage).not.toHaveBeenCalled()
  })

  it.each(['admin', 'advisor'] as const)(
    'calls the repository with the resolved scope and params for role=%s',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role))
      resolveDirectoryActorId.mockResolvedValue(`portal-${role}-1`)
      listClientsPage.mockResolvedValue({ items: [{ id: 'c-1' }], totalCount: 1 })

      const result = await listClientsPageAction({ page: 2, pageSize: 25, search: 'ana' })

      expect(listClientsPage).toHaveBeenCalledWith(
        { role, userId: `portal-${role}-1` },
        { page: 2, pageSize: 25, search: 'ana' }
      )
      expect(result).toEqual({ items: [{ id: 'c-1' }], totalCount: 1 })
    }
  )
})

describe('listGestoresPageAction (admin-only, THROWS for non-admin)', () => {
  it.each(['advisor', 'client', 'worker'] as const)(
    'throws "forbidden" for role=%s',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role))

      await expect(listGestoresPageAction({ page: 1, pageSize: 25 })).rejects.toThrow('forbidden')
      expect(listGestoresPage).not.toHaveBeenCalled()
    }
  )

  it('calls the repository with the given params for an admin', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listGestoresPage.mockResolvedValue({ items: [{ id: 'g-1' }], totalCount: 1 })

    const result = await listGestoresPageAction({ page: 1, pageSize: 25, search: 'bob' })

    expect(listGestoresPage).toHaveBeenCalledWith({ page: 1, pageSize: 25, search: 'bob' })
    expect(result).toEqual({ items: [{ id: 'g-1' }], totalCount: 1 })
  })
})

describe('countClientsByAdvisorAction (admin-only, THROWS for non-admin)', () => {
  it.each(['advisor', 'client', 'worker'] as const)(
    'throws "forbidden" for role=%s',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role))

      await expect(countClientsByAdvisorAction()).rejects.toThrow('forbidden')
      expect(countClientsByAdvisor).not.toHaveBeenCalled()
    }
  )

  it('returns the repository result for an admin', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    countClientsByAdvisor.mockResolvedValue({ 'advisor-1': 3 })

    await expect(countClientsByAdvisorAction()).resolves.toEqual({ 'advisor-1': 3 })
  })
})
